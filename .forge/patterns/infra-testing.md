# PATTERN: Testing Pipeline (Vitest + Playwright)
# Use for: Automated testing baked into every build stage.
# Apply in: Stage 3+ (Vitest), Stage 7 post-complete (Playwright)

## Overview

Every ForgeBoard build includes automated tests. The Agent SDK writes tests during each stage and runs them as part of validation. This is NOT optional — tests are a build gate.

**Vitest** — unit + integration tests for server actions, Zod schemas, utilities, data transformations.
**Playwright** — end-to-end tests for critical user workflows in a real browser.

## When Tests Run

| Phase | Test Type | What It Validates | Blocks Build? |
|-------|----------|-------------------|---------------|
| After Stage 1 | Vitest (schema) | Zod schemas validate correctly, type exports work | Yes |
| After Stage 2 | Vitest (auth) | Auth middleware blocks unauthenticated, role checks work | Yes |
| After Stage 3 | Vitest (CRUD) | Server actions create/read/update/delete correctly, RLS enforced | Yes |
| After Stage 4 | Vitest (workflow) | Primary workflow state transitions, business rules | Yes |
| After Stage 5 | Vitest (events) | Event creation on state changes, timeline population | Yes |
| After Stage 6 | Vitest (automation) | Automation triggers fire, idempotency holds | Yes |
| After Stage 7 | Vitest (AI) | AI feature integration, prompt construction | Yes |
| Final gate | Playwright (E2E) | Full user workflows in real browser | Yes — must pass before project.status = completed |

## Vitest Setup

```typescript
// vitest.config.ts (created by Stage 1)
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/actions/**"],
      exclude: ["src/components/**", "src/**/*.d.ts"],
    },
    // Timeout per test — generous for DB operations
    testTimeout: 10000,
  },
})
```

```typescript
// tests/setup.ts
import { beforeAll, afterAll } from "vitest"

// Mock Supabase client for unit tests
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
        error: null,
      }),
    },
  })),
}))
```

## Vitest Test Patterns Per Stage

### Stage 1 — Schema Tests

```typescript
// tests/schemas/entities.test.ts
import { describe, it, expect } from "vitest"
import { ClaimSchema, ClaimInsertSchema } from "@/lib/schemas/claim"

describe("Claim Schema", () => {
  it("validates a complete claim", () => {
    const validClaim = {
      id: "uuid-here",
      title: "Water damage claim",
      status: "draft",
      amount: 5000,
      submitted_by: "user-uuid",
      created_at: new Date().toISOString(),
    }
    expect(() => ClaimSchema.parse(validClaim)).not.toThrow()
  })

  it("rejects claim with invalid status", () => {
    const invalid = { status: "nonexistent_status" }
    expect(() => ClaimSchema.parse(invalid)).toThrow()
  })

  it("rejects claim with negative amount", () => {
    const invalid = { amount: -100 }
    expect(() => ClaimInsertSchema.parse(invalid)).toThrow()
  })

  it("enforces required fields on insert", () => {
    expect(() => ClaimInsertSchema.parse({})).toThrow()
  })
})
```

### Stage 3 — CRUD Server Action Tests

```typescript
// tests/actions/claim-actions.test.ts
import { describe, it, expect, vi } from "vitest"
import { createClaim, updateClaim, deleteClaim } from "@/lib/actions/claims"

describe("Claim Server Actions", () => {
  it("createClaim returns success with valid input", async () => {
    const result = await createClaim({
      title: "Test claim",
      amount: 1000,
      description: "Test description",
    })
    expect(result.success).toBe(true)
  })

  it("createClaim returns error with empty title", async () => {
    const result = await createClaim({
      title: "",
      amount: 1000,
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it("updateClaim rejects invalid status transition", async () => {
    // Can't go from "draft" to "approved" directly
    const result = await updateClaim("claim-id", {
      status: "approved",
    })
    expect(result.success).toBe(false)
  })

  it("deleteClaim performs soft delete", async () => {
    const result = await deleteClaim("claim-id")
    expect(result.success).toBe(true)
    // Verify it sets archived_at, not actual DELETE
  })
})
```

### Stage 4 — Workflow Tests

```typescript
// tests/workflows/claim-workflow.test.ts
import { describe, it, expect } from "vitest"
import { submitClaim, reviewClaim, approveClaim } from "@/lib/actions/claims"

describe("Claim Workflow", () => {
  it("follows the full happy path: draft → submitted → in_review → approved", async () => {
    // Create
    const create = await createClaim({ title: "Test", amount: 500 })
    expect(create.success).toBe(true)

    // Submit
    const submit = await submitClaim(create.data.id)
    expect(submit.success).toBe(true)

    // Review
    const review = await reviewClaim(create.data.id)
    expect(review.success).toBe(true)

    // Approve
    const approve = await approveClaim(create.data.id)
    expect(approve.success).toBe(true)
  })

  it("blocks skipping steps: draft cannot go directly to approved", async () => {
    const create = await createClaim({ title: "Test", amount: 500 })
    const approve = await approveClaim(create.data.id)
    expect(approve.success).toBe(false)
    expect(approve.error).toContain("invalid state transition")
  })
})
```

### Stage 5 — Event Tests

```typescript
// tests/events/claim-events.test.ts
import { describe, it, expect } from "vitest"

describe("Claim Events", () => {
  it("creates an event when claim status changes", async () => {
    const claim = await createClaim({ title: "Test", amount: 500 })
    await submitClaim(claim.data.id)

    const events = await getEventsForEntity("claim", claim.data.id)
    expect(events.length).toBeGreaterThan(0)
    expect(events[0].event_type).toBe("claim.submitted")
  })

  it("event includes actor and metadata", async () => {
    const claim = await createClaim({ title: "Test", amount: 500 })
    await submitClaim(claim.data.id)

    const events = await getEventsForEntity("claim", claim.data.id)
    expect(events[0].actor_id).toBe("test-user-id")
    expect(events[0].metadata).toBeDefined()
  })
})
```

## Playwright Setup

```typescript
// playwright.config.ts (created by Stage 7)
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Sequential — tests depend on state
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: [["html", { open: "never" }], ["json", { outputFile: "e2e-results.json" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Start the app before running tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 30000,
  },
})
```

## Playwright E2E Test Pattern

```typescript
// e2e/critical-workflows.spec.ts
import { test, expect } from "@playwright/test"

test.describe("Critical User Workflows", () => {

  test("sign up → sign in → create entity → complete workflow", async ({ page }) => {
    // Sign up
    await page.goto("/sign-up")
    await page.fill('[name="email"]', "test@example.com")
    await page.fill('[name="password"]', "TestPassword123!")
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/dashboard/)

    // Create the primary entity
    await page.click('text=New Claim')
    await page.fill('[name="title"]', "E2E Test Claim")
    await page.fill('[name="amount"]', "5000")
    await page.fill('[name="description"]', "Automated test claim")
    await page.click('button[type="submit"]')

    // Verify it appears in the list
    await expect(page.locator('text=E2E Test Claim')).toBeVisible()

    // Submit the claim (state change)
    await page.click('text=E2E Test Claim')
    await page.click('text=Submit for Review')
    await expect(page.locator('text=Submitted')).toBeVisible()
  })

  test("navigation and layout", async ({ page }) => {
    await page.goto("/")
    // Verify sidebar nav
    await expect(page.locator('nav')).toBeVisible()
    // Verify responsive
    await page.setViewportSize({ width: 375, height: 667 })
    // Mobile layout should adjust
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
  })

  test("auth protection", async ({ page }) => {
    // Unauthenticated user should be redirected
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/sign-in/)
  })

  test("dark mode toggle", async ({ page }) => {
    await page.goto("/")
    await page.click('[data-testid="theme-toggle"]')
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test("empty states", async ({ page }) => {
    // New user with no data should see empty states
    await page.goto("/dashboard/claims")
    await expect(page.locator('text=No claims yet')).toBeVisible()
    await expect(page.locator('text=Create your first')).toBeVisible()
  })
})
```

## How the Build Worker Runs Tests

### Vitest (after each stage 1-7)

```python
# In the build worker, after stage passes coherence audit:

def run_vitest(build_dir: str, stage: int) -> tuple[bool, str]:
    """Run Vitest for the current stage's tests."""
    result = subprocess.run(
        ["npx", "vitest", "run", "--reporter=json",
         f"tests/stage-{stage}"],
        cwd=build_dir,
        capture_output=True,
        text=True,
        timeout=120,  # 2 min max for unit tests
    )
    
    output = result.stdout + result.stderr
    passed = result.returncode == 0
    
    # Parse results
    try:
        results = json.loads(result.stdout)
        total = results.get("numTotalTests", 0)
        passed_count = results.get("numPassedTests", 0)
        failed_count = results.get("numFailedTests", 0)
        summary = f"Vitest: {passed_count}/{total} passed, {failed_count} failed"
    except:
        summary = f"Vitest: {'PASSED' if passed else 'FAILED'}"
    
    return passed, summary + "\n" + output
```

### Playwright (final gate after Stage 7)

```python
def run_playwright(build_dir: str) -> tuple[bool, str]:
    """Run Playwright E2E tests as the final quality gate."""
    
    # Install Playwright browsers if needed
    subprocess.run(
        ["npx", "playwright", "install", "chromium"],
        cwd=build_dir,
        capture_output=True,
        timeout=120,
    )
    
    # Run tests
    result = subprocess.run(
        ["npx", "playwright", "test", "--reporter=json"],
        cwd=build_dir,
        capture_output=True,
        text=True,
        timeout=300,  # 5 min max for E2E
    )
    
    output = result.stdout + result.stderr
    passed = result.returncode == 0
    
    # Parse results
    try:
        results = json.loads(result.stdout)
        specs = results.get("suites", [])
        total = sum(s.get("specs", 0) for s in specs)
        summary = f"Playwright: {total} specs, {'ALL PASSED' if passed else 'FAILURES DETECTED'}"
    except:
        summary = f"Playwright: {'PASSED' if passed else 'FAILED'}"
    
    return passed, summary + "\n" + output
```

## Test File Organization

```
project/
├── tests/                          ← Vitest
│   ├── setup.ts                    ← Global mocks
│   ├── stage-1/                    ← Schema tests (written in Stage 1)
│   │   └── schemas.test.ts
│   ├── stage-2/                    ← Auth tests (written in Stage 2)
│   │   └── auth.test.ts
│   ├── stage-3/                    ← CRUD tests (written in Stage 3)
│   │   ├── claim-actions.test.ts
│   │   ├── user-actions.test.ts
│   │   └── ...per entity
│   ├── stage-4/                    ← Workflow tests (written in Stage 4)
│   │   └── primary-workflow.test.ts
│   ├── stage-5/                    ← Event tests (written in Stage 5)
│   │   └── event-creation.test.ts
│   ├── stage-6/                    ← Automation tests (written in Stage 6)
│   │   └── automations.test.ts
│   └── stage-7/                    ← AI feature tests (written in Stage 7)
│       └── ai-integration.test.ts
├── e2e/                            ← Playwright (written in Stage 7)
│   ├── critical-workflows.spec.ts
│   ├── auth.spec.ts
│   └── navigation.spec.ts
├── vitest.config.ts
└── playwright.config.ts
```

## Stage Prompt Additions

Each stage prompt should include a testing requirement. Add to the stage prompt template:

```
TESTING REQUIREMENT:
After building the main code for this stage, write Vitest tests in tests/stage-{N}/.
Tests must cover:
- Happy path for every function/action created in this stage
- At least one error/edge case per function
- Input validation (Zod rejects bad input)
- State transition validation (if applicable)

The tests will be run automatically after this stage completes.
If tests fail, you will receive the errors and must fix them.
```

For Stage 7 specifically, add:

```
E2E TESTING REQUIREMENT:
After completing the AI features, write Playwright E2E tests in e2e/.
Tests must cover:
- The primary user workflow end-to-end (from Gate 2 primary workflow)
- Auth protection (unauthenticated redirects)
- Navigation and layout (sidebar, responsive)
- Dark mode toggle
- Empty states
- At least one complete create → update → state change flow

The Playwright tests are the FINAL quality gate. The project is not marked
complete until they pass.
```

## Package Dependencies

Added to package.json by Stage 1:

```json
{
  "devDependencies": {
    "vitest": "^3.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vite-tsconfig-paths": "^5.0.0",
    "@vitest/coverage-v8": "^3.0.0",
    "@playwright/test": "^1.50.0"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

## Coherence Report Addition

The coherence audit after each stage should now include:

```
## Test Results
- Vitest: X/Y tests passed (stage-{N})
- Test coverage: Z% of new code
- [PASS/FAIL]
```

After Stage 7:

```
## Test Results
- Vitest: X/Y tests passed (all stages)
- Playwright: X/Y specs passed
- [PASS/FAIL] — Final quality gate
```
