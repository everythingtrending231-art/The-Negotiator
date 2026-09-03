import { resolveFeedbackToken } from "@/server/services/feedback"
import SiteHeader from "@/components/site-header"
import FeedbackStateCard from "@/app/feedback/[token]/feedback-state-card"
import FeedbackForm from "@/app/feedback/[token]/feedback-form"

export default async function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const feedback = await resolveFeedbackToken(token)

  if (!feedback) {
    return (
      <div className="min-h-screen bg-cream px-4">
        <SiteHeader />
        <div className="flex items-center justify-center px-4 pt-16">
          <FeedbackStateCard
            title="This link isn't valid"
            body="It may be mistyped, or this isn't a feedback link we recognize."
          />
        </div>
      </div>
    )
  }

  if (feedback.submittedAt) {
    return (
      <div className="min-h-screen bg-cream px-4">
        <SiteHeader />
        <div className="flex items-center justify-center px-4 pt-16">
          <FeedbackStateCard
            title="Thanks — you already told us!"
            body="We've already got your feedback for this negotiation."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream px-4 pb-16">
      <SiteHeader />
      <FeedbackForm token={token} caseRef={feedback.case.publicRef} />
    </div>
  )
}
