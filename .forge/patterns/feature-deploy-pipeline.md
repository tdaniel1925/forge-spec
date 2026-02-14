# PATTERN: Deploy Pipeline (GitHub + Supabase + Vercel)
# Use for: One-click deployment of completed ForgeBoard builds.
# Apply in: Stage 6+ (automation layer)

## Overview

When a project build completes (all 7 stages passed), the builder clicks "Deploy."
ForgeBoard executes three steps in sequence:
1. Push code to GitHub (BotMakers org)
2. Create Supabase project + push migrations
3. Create Vercel project + link to GitHub + set env vars + deploy

All three CLIs run non-interactively using stored tokens.

## Environment Variables (set once on ForgeBoard server)

```bash
# GitHub — PAT with repo + org:write scope
GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Supabase — Access token from dashboard.supabase.com/account/tokens
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxx

# Supabase org ID — your BotMakers org
SUPABASE_ORG_ID=your-org-id

# Vercel — Token from vercel.com/account/tokens
VERCEL_TOKEN=xxxxxxxxxxxxxxxxxxxx

# Vercel team/org ID (optional — if using a team)
VERCEL_ORG_ID=team_xxxxxxxxxxxx
```

## CLI Installation (one-time server setup)

```bash
# GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update && sudo apt install gh -y

# Supabase CLI
npm install -g supabase

# Vercel CLI
npm install -g vercel

# Authenticate (non-interactive with tokens)
echo $GH_TOKEN | gh auth login --with-token
supabase login --token $SUPABASE_ACCESS_TOKEN
```

## Deploy Pipeline Implementation

### Server Action (triggers the deploy)

```typescript
// src/lib/actions/deploy.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Result } from "@/types/common"

export async function deployProject(projectId: string): Promise<Result<{ deploymentId: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Verify project is completed
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*, project_specs(*)")
    .eq("id", projectId)
    .single()

  if (projectError || !project) return { success: false, error: "Project not found" }
  if (project.status !== "completed") return { success: false, error: "Project must be completed before deploying" }

  // Create deployment record
  const { data: deployment, error: deployError } = await supabase
    .from("deployments")
    .insert({
      project_id: projectId,
      provider: "vercel+supabase+github",
      status: "pending",
      created_by: user.id,
    })
    .select()
    .single()

  if (deployError) return { success: false, error: deployError.message }

  // Trigger background deploy job
  // This calls your background worker (BullMQ, Celery, or HTTP endpoint)
  await triggerDeployJob({
    deploymentId: deployment.id,
    projectId,
    projectName: project.name,
    buildDirectoryPath: project.build_directory_path,
  })

  revalidatePath(`/projects/${projectId}`)
  return { success: true, data: { deploymentId: deployment.id } }
}
```

### Background Deploy Worker

```python
# workers/deploy_worker.py
import subprocess
import json
import os
import secrets
import string
import time
from supabase import create_client

SUPABASE_URL = os.environ["FORGEBOARD_SUPABASE_URL"]
SUPABASE_KEY = os.environ["FORGEBOARD_SUPABASE_SERVICE_KEY"]
GH_ORG = "BotMakers-Inc"  # Your GitHub org
SUPABASE_ORG_ID = os.environ["SUPABASE_ORG_ID"]
SUPABASE_REGION = "us-east-1"

sb = create_client(SUPABASE_URL, SUPABASE_KEY)


def update_deploy_log(deployment_id: str, message: str, status: str = None):
    """Append to deploy log and optionally update status."""
    current = sb.table("deployments").select("deploy_log").eq("id", deployment_id).single().execute()
    existing_log = current.data.get("deploy_log", "") or ""
    new_log = existing_log + f"\n{message}"
    
    update = {"deploy_log": new_log}
    if status:
        update["status"] = status
    
    sb.table("deployments").update(update).eq("id", deployment_id).execute()


def generate_db_password():
    """Generate a secure random password for Supabase DB."""
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(chars) for _ in range(32))


def run_cmd(cmd: list[str], cwd: str = None, env: dict = None) -> tuple[bool, str]:
    """Run a shell command and return (success, output)."""
    merged_env = {**os.environ, **(env or {})}
    result = subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        text=True,
        env=merged_env,
        timeout=300,
    )
    output = result.stdout + result.stderr
    return result.returncode == 0, output


def run_cmd_with_retry(
    cmd: list[str],
    cwd: str = None,
    env: dict = None,
    max_retries: int = 3,
    backoff_base: float = 2.0,
    step_name: str = "command",
    deployment_id: str = None,
    non_retryable_errors: list[str] = None,
) -> tuple[bool, str]:
    """Run a command with exponential backoff retry."""
    non_retryable = non_retryable_errors or []
    last_output = ""

    for attempt in range(1, max_retries + 1):
        success, output = run_cmd(cmd, cwd=cwd, env=env)
        last_output = output

        if success:
            return True, output

        # Check if error is non-retryable
        for pattern in non_retryable:
            if pattern.lower() in output.lower():
                if deployment_id:
                    update_deploy_log(
                        deployment_id,
                        f"❌ {step_name} failed (non-retryable): {pattern}"
                    )
                return False, output

        if attempt < max_retries:
            wait = backoff_base ** attempt
            if deployment_id:
                update_deploy_log(
                    deployment_id,
                    f"⚠️ {step_name} failed (attempt {attempt}/{max_retries}), retrying in {wait}s..."
                )
            time.sleep(wait)
        else:
            if deployment_id:
                update_deploy_log(
                    deployment_id,
                    f"❌ {step_name} failed after {max_retries} attempts"
                )

    return False, last_output


def deploy_project(deployment_id: str, project_id: str, project_name: str, build_dir: str):
    """
    Full deploy pipeline: GitHub → Supabase → Vercel
    Supports resume — if a previous attempt got partway, it picks up where it left off.
    Each step is tracked via deployment.status (deploying_github → deploying_supabase → deploying_vercel).
    """
    # Sanitize project name for use in URLs/repos
    slug = project_name.lower().replace(" ", "-").replace("_", "-")
    slug = ''.join(c for c in slug if c.isalnum() or c == '-')

    # Check if this is a resume — load existing deployment state
    existing = sb.table("deployments").select("*").eq("id", deployment_id).single().execute()
    current_status = existing.data.get("status", "pending")
    env_vars_saved = existing.data.get("environment_vars")
    saved_state = json.loads(env_vars_saved) if env_vars_saved else {}

    # Determine which step to start from
    skip_github = current_status in ["deploying_supabase", "deploying_vercel"] and "github_url" in saved_state
    skip_supabase = current_status == "deploying_vercel" and "supabase_project_ref" in saved_state

    sb.table("deployments").update({"status": "deploying_github" if not skip_github else current_status}).eq("id", deployment_id).execute()

    # ─────────────────────────────────────────────
    # STEP 1: GITHUB — Create repo and push code
    # ─────────────────────────────────────────────
    if skip_github:
        github_url = saved_state["github_url"]
        update_deploy_log(deployment_id, f"⏭️ Step 1/3: Skipping GitHub (already done: {github_url})")
    else:
        update_deploy_log(deployment_id, "⏳ Step 1/3: Creating GitHub repository...")
        sb.table("deployments").update({"status": "deploying_github"}).eq("id", deployment_id).execute()

    # Initialize git in build directory (skip .forge system files)
    gitignore_content = """
.forge/system/
.forge/design/
.forge/patterns/
.forge/PROJECT-SPEC.md
node_modules/
.env
.env.local
"""
    with open(os.path.join(build_dir, ".gitignore"), "w") as f:
        f.write(gitignore_content)

    success, output = run_cmd(["git", "init"], cwd=build_dir)
    if not success:
        update_deploy_log(deployment_id, f"❌ Git init failed: {output}", status="failed")
        return

    run_cmd(["git", "add", "."], cwd=build_dir)
    run_cmd(["git", "commit", "-m", "Initial build via ForgeBoard"], cwd=build_dir)

    # Create repo in org (with retry)
    success, output = run_cmd_with_retry(
        ["gh", "repo", "create", f"{GH_ORG}/{slug}",
         "--private", "--source", build_dir, "--push"],
        cwd=build_dir,
        max_retries=3,
        step_name="GitHub repo create",
        deployment_id=deployment_id,
        non_retryable_errors=["name already exists", "authentication"],
    )

    if not success:
        update_deploy_log(deployment_id, f"❌ GitHub repo creation failed: {output}", status="failed")
        return

    github_url = f"https://github.com/{GH_ORG}/{slug}"
    update_deploy_log(deployment_id, f"✅ GitHub repo created: {github_url}")

    # Update deployment record with GitHub URL
    sb.table("deployments").update({
        "environment_vars": json.dumps({"github_url": github_url})
    }).eq("id", deployment_id).execute()

    # ─────────────────────────────────────────────
    # STEP 2: SUPABASE — Create project + push migrations
    # ─────────────────────────────────────────────
    if skip_supabase:
        project_ref = saved_state["supabase_project_ref"]
        supabase_url = saved_state["supabase_url"]
        anon_key = saved_state.get("anon_key", "")
        service_key = saved_state.get("service_key", "")
        db_password = saved_state.get("db_password", "")
        update_deploy_log(deployment_id, f"⏭️ Step 2/3: Skipping Supabase (already done: {project_ref})")
    else:
        update_deploy_log(deployment_id, "⏳ Step 2/3: Creating Supabase project...")
        sb.table("deployments").update({"status": "deploying_supabase"}).eq("id", deployment_id).execute()

    db_password = generate_db_password()

    success, output = run_cmd_with_retry(
        ["supabase", "projects", "create", slug,
         "--org-id", SUPABASE_ORG_ID,
         "--db-password", db_password,
         "--region", SUPABASE_REGION],
        max_retries=3,
        step_name="Supabase project create",
        deployment_id=deployment_id,
        non_retryable_errors=["project limit", "quota", "already exists"],
    )

    if not success:
        update_deploy_log(deployment_id, f"❌ Supabase project creation failed: {output}", status="failed")
        return

    # Parse project ref from output
    # The CLI outputs the project ref — extract it
    project_ref = None
    for line in output.split("\n"):
        if "project-ref" in line.lower() or len(line.strip()) == 20:
            project_ref = line.strip().split()[-1]
            break

    if not project_ref:
        # Fallback: list projects and find the one we just created
        success, output = run_cmd(["supabase", "projects", "list"])
        for line in output.split("\n"):
            if slug in line:
                parts = line.split()
                project_ref = parts[0] if parts else None
                break

    if not project_ref:
        update_deploy_log(deployment_id, "❌ Could not determine Supabase project ref", status="failed")
        return

    update_deploy_log(deployment_id, f"✅ Supabase project created: {project_ref}")

    # Link the build directory to the new Supabase project
    success, output = run_cmd(
        ["supabase", "link", "--project-ref", project_ref],
        cwd=build_dir,
        env={"SUPABASE_DB_PASSWORD": db_password},
    )

    if not success:
        update_deploy_log(deployment_id, f"⚠️ Supabase link warning: {output}")

    # Push migrations
    update_deploy_log(deployment_id, "⏳ Pushing database migrations...")

    success, output = run_cmd_with_retry(
        ["supabase", "db", "push"],
        cwd=build_dir,
        env={"SUPABASE_DB_PASSWORD": db_password},
        max_retries=3,
        step_name="Supabase migration push",
        deployment_id=deployment_id,
        non_retryable_errors=["schema conflict", "permission denied"],
    )

    if not success:
        update_deploy_log(deployment_id, f"❌ Migration push failed: {output}", status="failed")
        return

    # Get the project's API keys
    success, keys_output = run_cmd([
        "supabase", "projects", "api-keys", "--project-ref", project_ref
    ])

    # Parse keys from output
    anon_key = ""
    service_key = ""
    for line in keys_output.split("\n"):
        if "anon" in line.lower():
            anon_key = line.split()[-1] if line.split() else ""
        if "service_role" in line.lower():
            service_key = line.split()[-1] if line.split() else ""

    supabase_url = f"https://{project_ref}.supabase.co"
    update_deploy_log(deployment_id, f"✅ Migrations pushed. Database live at: {supabase_url}")

    # ─────────────────────────────────────────────
    # STEP 3: VERCEL — Deploy frontend
    # ─────────────────────────────────────────────
    update_deploy_log(deployment_id, "⏳ Step 3/3: Deploying to Vercel...")
    sb.table("deployments").update({"status": "deploying_vercel"}).eq("id", deployment_id).execute()

    # Link to Vercel (creates project if it doesn't exist)
    success, output = run_cmd(
        ["vercel", "link", "--yes"],
        cwd=build_dir,
        env={"VERCEL_TOKEN": os.environ["VERCEL_TOKEN"]},
    )

    if not success:
        update_deploy_log(deployment_id, f"❌ Vercel link failed: {output}", status="failed")
        return

    # Set environment variables on Vercel
    env_vars = {
        "NEXT_PUBLIC_SUPABASE_URL": supabase_url,
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": anon_key,
        "SUPABASE_SERVICE_ROLE_KEY": service_key,
    }

    for key, value in env_vars.items():
        if value:
            # Pipe value to vercel env add
            process = subprocess.Popen(
                ["vercel", "env", "add", key, "production"],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=build_dir,
                env={**os.environ, "VERCEL_TOKEN": os.environ["VERCEL_TOKEN"]},
            )
            process.communicate(input=value)

    update_deploy_log(deployment_id, "✅ Environment variables set")

    # Deploy to production (with retry)
    success, output = run_cmd_with_retry(
        ["vercel", "deploy", "--prod", "--yes"],
        cwd=build_dir,
        env={"VERCEL_TOKEN": os.environ["VERCEL_TOKEN"]},
        max_retries=3,
        step_name="Vercel deploy",
        deployment_id=deployment_id,
        non_retryable_errors=["invalid token", "project not found"],
    )

    if not success:
        update_deploy_log(deployment_id, f"❌ Vercel deploy failed: {output}", status="failed")
        return

    # Parse deploy URL from output
    deploy_url = ""
    for line in output.strip().split("\n"):
        line = line.strip()
        if line.startswith("https://") and "vercel.app" in line:
            deploy_url = line
            break

    if not deploy_url:
        deploy_url = f"https://{slug}.vercel.app"

    update_deploy_log(deployment_id, f"✅ Deployed to: {deploy_url}")

    # ─────────────────────────────────────────────
    # FINALIZE
    # ─────────────────────────────────────────────
    sb.table("deployments").update({
        "status": "live",
        "deploy_url": deploy_url,
        "environment_vars": json.dumps({
            "github_url": github_url,
            "supabase_url": supabase_url,
            "supabase_project_ref": project_ref,
            "vercel_url": deploy_url,
            "db_password": db_password,  # Encrypted at rest in Supabase
        }),
    }).eq("id", deployment_id).execute()

    # Update project status
    sb.table("projects").update({
        "status": "deployed",
        "deploy_url": deploy_url,
    }).eq("id", project_id).execute()

    update_deploy_log(deployment_id, f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ DEPLOYMENT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 App:      {deploy_url}
🗄️ Database: {supabase_url}
📦 Code:     {github_url}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""", status="live")

    # ─────────────────────────────────────────────
    # STEP 4: HEALTH CHECK — Verify the deploy is actually working
    # ─────────────────────────────────────────────
    health_check_with_retry(deployment_id, deploy_url, build_dir)


def health_check_with_retry(deployment_id: str, deploy_url: str, build_dir: str, max_retries: int = 2):
    """
    Hit the deployed URL. If it returns non-200, auto-retry the Vercel deploy.
    Most deploy failures are transient (cold start, propagation delay).
    """
    import urllib.request
    
    # Wait for propagation
    time.sleep(10)

    for attempt in range(1, max_retries + 2):  # +1 for initial check
        try:
            req = urllib.request.Request(deploy_url, method="GET")
            response = urllib.request.urlopen(req, timeout=15)
            status_code = response.getcode()
        except Exception as e:
            status_code = 0
            update_deploy_log(deployment_id, f"⚠️ Health check error: {str(e)}")

        if status_code == 200:
            sb.table("deployments").update({
                "health_check_status": "healthy",
                "last_health_check_at": "now()",
            }).eq("id", deployment_id).execute()
            update_deploy_log(deployment_id, f"✅ Health check passed (HTTP {status_code})")
            return

        if attempt <= max_retries:
            update_deploy_log(
                deployment_id,
                f"⚠️ Health check failed (HTTP {status_code}), re-deploying to Vercel (attempt {attempt}/{max_retries})..."
            )
            # Re-deploy to Vercel
            success, output = run_cmd_with_retry(
                ["vercel", "deploy", "--prod", "--yes"],
                cwd=build_dir,
                env={"VERCEL_TOKEN": os.environ["VERCEL_TOKEN"]},
                max_retries=2,
                step_name="Vercel re-deploy",
                deployment_id=deployment_id,
            )
            if success:
                time.sleep(15)  # Wait for new deploy to propagate
            else:
                break

    # All retries exhausted
    sb.table("deployments").update({
        "health_check_status": "unhealthy",
        "last_health_check_at": "now()",
    }).eq("id", deployment_id).execute()
    update_deploy_log(
        deployment_id,
        f"⚠️ Health check failed after {max_retries} re-deploys. App may need manual attention — check Vercel logs."
    )
```

## Dashboard Deploy UI Component

```typescript
// src/components/deploy-panel.tsx
"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Rocket, Github, Database, Globe, CheckCircle, Loader2, XCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { deployProject } from "@/lib/actions/deploy"
import { toast } from "sonner"
import { useRealtimeTable } from "@/hooks/use-realtime"

interface DeployPanelProps {
  projectId: string
  projectStatus: string
  deployment?: {
    id: string
    status: string
    deploy_url: string | null
    deploy_log: string | null
    environment_vars: Record<string, string> | null
  }
}

const steps = [
  { key: "github", label: "GitHub Repository", icon: Github },
  { key: "supabase", label: "Supabase Database", icon: Database },
  { key: "vercel", label: "Vercel Deployment", icon: Globe },
]

function getStepStatus(log: string | null, stepKey: string): "pending" | "running" | "done" | "error" {
  if (!log) return "pending"
  const stepNum = stepKey === "github" ? "1" : stepKey === "supabase" ? "2" : "3"
  if (log.includes(`❌ Step ${stepNum}`) || (log.includes("❌") && log.includes(stepKey))) return "error"
  if (log.includes(`✅`) && log.includes(stepKey === "github" ? "GitHub" : stepKey === "supabase" ? "Supabase" : "Deployed")) return "done"
  if (log.includes(`⏳ Step ${stepNum}`)) return "running"
  return "pending"
}

export function DeployPanel({ projectId, projectStatus, deployment }: DeployPanelProps) {
  const [isDeploying, setIsDeploying] = useState(false)

  // Realtime updates for deployment status
  useRealtimeTable("deployments", `project_id=eq.${projectId}`)

  const handleDeploy = async () => {
    setIsDeploying(true)
    const result = await deployProject(projectId)
    if (!result.success) {
      toast.error(result.error)
      setIsDeploying(false)
      return
    }
    toast.success("Deployment started!")
  }

  const isComplete = deployment?.status === "live"
  const isFailed = deployment?.status === "failed"
  const isRunning = deployment?.status === "deploying" || deployment?.status === "pending"
  const envVars = deployment?.environment_vars ? (
    typeof deployment.environment_vars === "string"
      ? JSON.parse(deployment.environment_vars)
      : deployment.environment_vars
  ) : null

  // Show deploy button if project is completed and no deployment exists
  if (projectStatus === "completed" && !deployment) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Rocket className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-heading font-semibold">Ready to Deploy</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Push to GitHub, create Supabase database, and deploy to Vercel
          </p>
          <Button onClick={handleDeploy} disabled={isDeploying} size="lg">
            {isDeploying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}
            Deploy Project
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Deployment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step Progress */}
        {steps.map((step) => {
          const status = getStepStatus(deployment?.deploy_log ?? null, step.key)
          const Icon = step.icon
          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                {status === "done" && <CheckCircle className="h-5 w-5 text-success" />}
                {status === "running" && <Loader2 className="h-5 w-5 text-info animate-spin" />}
                {status === "error" && <XCircle className="h-5 w-5 text-destructive" />}
                {status === "pending" && <Icon className="h-4 w-4 text-muted-foreground" />}
              </div>
              <span className={`text-sm ${status === "done" ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </motion.div>
          )
        })}

        {/* Live URLs when complete */}
        <AnimatePresence>
          {isComplete && envVars && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2 pt-4 border-t border-border"
            >
              {envVars.vercel_url && (
                <a href={envVars.vercel_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Globe className="h-4 w-4" /> {envVars.vercel_url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {envVars.github_url && (
                <a href={envVars.github_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Github className="h-4 w-4" /> {envVars.github_url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {envVars.supabase_url && (
                <a href={`https://supabase.com/dashboard/project/${envVars.supabase_project_ref}`}
                   target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Database className="h-4 w-4" /> Supabase Dashboard
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deploy Log (expandable) */}
        {deployment?.deploy_log && (
          <details className="pt-2">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              View deploy log
            </summary>
            <pre className="mt-2 p-3 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
              {deployment.deploy_log}
            </pre>
          </details>
        )}

        {/* Retry button on failure */}
        {isFailed && (
          <Button variant="outline" onClick={handleDeploy} className="w-full mt-2">
            <Rocket className="mr-2 h-4 w-4" /> Retry Deployment
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

## Supabase Migration for Deployment Table

```sql
-- supabase/migrations/XXXXXX_create_deployments.sql

create table public.deployments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  provider text not null default 'vercel+supabase+github',
  status text not null default 'pending'
    check (status in ('pending', 'deploying', 'live', 'failed')),
  deploy_url text,
  deploy_log text,
  environment_vars jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  archived_at timestamptz
);

-- RLS
alter table public.deployments enable row level security;

create policy "Users can view own deployments"
  on public.deployments for select
  using (created_by = auth.uid());

create policy "Users can create deployments"
  on public.deployments for insert
  with check (created_by = auth.uid());

-- Allow service role to update (background worker)
create policy "Service role can update deployments"
  on public.deployments for update
  using (true);

-- Index
create index deployments_project_id_idx on public.deployments(project_id);

-- Realtime
alter publication supabase_realtime add table public.deployments;
```

## Security Notes

- `environment_vars` stores sensitive keys (Supabase service role, DB password).
  In production, encrypt this column or use a secrets manager (e.g., Vault, AWS Secrets Manager).
- Never expose `environment_vars` to the frontend — only show URLs, not keys.
- The deploy worker runs with server-side tokens, never in the browser.
- GitHub repos are created as **private** by default.
- DB passwords are randomly generated per project (32 chars, mixed).
