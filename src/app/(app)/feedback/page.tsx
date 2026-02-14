'use client'

// Feedback page - View and create feedback

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { createFeedback } from '@/lib/actions/feedback'

export default function FeedbackPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
    feedback_type: 'spec_quality' as const,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: err } = await createFeedback({
      rating: formData.rating,
      comment: formData.comment,
      feedback_type: formData.feedback_type,
      spec_project_id: null,
    })

    if (err) {
      setError(err)
    } else {
      setSuccess(true)
      setFormData({ rating: 5, comment: '', feedback_type: 'spec_quality' })
      setTimeout(() => setSuccess(false), 3000)
    }

    setLoading(false)
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-normal text-neutral-900 dark:text-neutral-100 mb-2">
            Feedback
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Help us improve ForgeSpec with your feedback
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="feedback_type" required>
                Feedback Type
              </Label>
              <Select
                id="feedback_type"
                value={formData.feedback_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    feedback_type: e.target.value as typeof formData.feedback_type,
                  })
                }
                disabled={loading}
              >
                <option value="spec_quality">Spec Quality</option>
                <option value="ui">User Interface</option>
                <option value="feature_request">Feature Request</option>
                <option value="bug">Bug Report</option>
                <option value="other">Other</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="rating" required>
                Rating (1-5)
              </Label>
              <Select
                id="rating"
                value={formData.rating.toString()}
                onChange={(e) =>
                  setFormData({ ...formData, rating: parseInt(e.target.value) })
                }
                disabled={loading}
              >
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Average</option>
                <option value="2">2 - Poor</option>
                <option value="1">1 - Very Poor</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="comment" required>
                Your Feedback
              </Label>
              <Textarea
                id="comment"
                value={formData.comment}
                onChange={(e) =>
                  setFormData({ ...formData, comment: e.target.value })
                }
                placeholder="Tell us what you think..."
                required
                disabled={loading}
                rows={6}
              />
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
                Thank you for your feedback!
              </div>
            )}

            <Button type="submit" disabled={loading || !formData.comment}>
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
