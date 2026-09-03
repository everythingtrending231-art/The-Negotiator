"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Star } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import FeedbackStateCard from "@/app/feedback/[token]/feedback-state-card"

function YesNoQuestion({
  question,
  value,
  onChange,
}: {
  question: string
  value: boolean | null
  onChange: (value: boolean) => void
}) {
  return (
    <div className="space-y-2">
      <p className="font-bold text-ink">{question}</p>
      <div className="flex gap-3">
        <Button
          type="button"
          size="sm"
          variant={value === true ? "default" : "outline"}
          onClick={() => onChange(true)}
        >
          Yes
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value === false ? "default" : "outline"}
          onClick={() => onChange(false)}
        >
          No
        </Button>
      </div>
    </div>
  )
}

function RatingQuestion({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  return (
    <div className="space-y-2">
      <p className="font-bold text-ink">How was your Negotiator?</p>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Negotiator rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => onChange(n)}
            className="p-0.5"
          >
            <Star
              size={32}
              className={value !== null && n <= value ? "fill-amber-500 text-amber-500" : "text-border"}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FeedbackForm({ token, caseRef }: { token: string; caseRef: string }) {
  const [savedMoney, setSavedMoney] = useState<boolean | null>(null)
  const [improvedDeal, setImprovedDeal] = useState<boolean | null>(null)
  const [negotiatorRating, setNegotiatorRating] = useState<number | null>(null)
  const [wouldUseAgain, setWouldUseAgain] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const canSubmit = savedMoney !== null && improvedDeal !== null && negotiatorRating !== null && wouldUseAgain !== null

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    const res = await fetch(`/api/feedback/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ savedMoney, improvedDeal, negotiatorRating, wouldUseAgain }),
    })
    setSubmitting(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? "Couldn't submit your feedback — please try again.")
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center px-4 pt-16">
        <FeedbackStateCard title="Thanks for the feedback!" body="We read every response — it helps us do better next time." />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-lg mx-auto pt-10 px-4"
    >
      <div className="bg-white rounded-panel shadow-card p-6 sm:p-8 space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800 mb-1">{caseRef}</p>
          <h1 className="font-black text-2xl text-cobalt-600">How did we do?</h1>
          <p className="text-sm text-ink-muted mt-1">Four quick questions — it takes less than a minute.</p>
        </div>

        <YesNoQuestion question="Did The Negotiator save you money?" value={savedMoney} onChange={setSavedMoney} />
        <YesNoQuestion question="Did The Negotiator improve the deal?" value={improvedDeal} onChange={setImprovedDeal} />
        <RatingQuestion value={negotiatorRating} onChange={setNegotiatorRating} />
        <YesNoQuestion question="Would you use The Negotiator again?" value={wouldUseAgain} onChange={setWouldUseAgain} />

        <Button disabled={!canSubmit || submitting} onClick={submit} className="w-full">
          {submitting ? "Sending…" : "Send feedback"}
        </Button>
      </div>
    </motion.div>
  )
}
