"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import NegotiatorMark from "@/components/negotiator-mark"

type CategoryField = { id: string; fieldName: string; fieldType: string; required: boolean }
type Category = { id: string; name: string; fields: CategoryField[] }

const requestSchema = z.object({
  email: z.string().email("Enter a valid email"),
  categoryId: z.string().min(1, "Choose a category"),
  description: z.string().min(10, "Tell us a bit more about what you need"),
  url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  targetPrice: z.string().optional(),
  maxBudget: z.string().optional(),
  quantity: z.string().optional(),
  desiredDate: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
})

type RequestFormValues = z.infer<typeof requestSchema>

export default function RequestForm({ categories }: { categories: Category[] }) {
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [categoryFieldValues, setCategoryFieldValues] = useState<Record<string, string>>({})
  const [detailsOpen, setDetailsOpen] = useState(false)

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      email: "",
      categoryId: "",
      description: "",
      url: "",
      targetPrice: "",
      maxBudget: "",
      quantity: "",
      desiredDate: "",
      location: "",
      notes: "",
    },
  })

  const selectedCategory = categories.find((category) => category.id === form.watch("categoryId"))

  async function onSubmit(values: RequestFormValues) {
    setServerError(null)
    const res = await fetch("/api/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        quantity: values.quantity ? Number(values.quantity) : undefined,
        categoryFieldValues,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setServerError(body?.error ?? "Something went wrong. Please try again.")
      return
    }

    const body = await res.json()
    setSubmitted(body.caseRef)
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-panel shadow-panel p-10 text-center animate-scale-in">
        <div className="mx-auto mb-6 flex items-center justify-center">
          <NegotiatorMark size={72} />
        </div>
        <p className="text-xs font-bold uppercase tracking-wide mb-2 text-amber-600">Request sent</p>
        <h2 className="font-black text-display-sm text-cobalt-600 mb-3">Check your email</h2>
        <p className="text-ink-soft max-w-sm mx-auto mb-8">
          Your negotiation ticket is <strong className="text-ink">{submitted}</strong>. We&apos;ve emailed you a
          link to track it — no password, no account, just click through whenever you want an update.
        </p>

        <div className="text-left max-w-xs mx-auto space-y-3 border-t border-cobalt-100 pt-6">
          {[
            { label: "Received", done: true },
            { label: "Your Negotiator is assigned", done: false },
            { label: "We negotiate on your behalf", done: false },
            { label: "You review the offer", done: false },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <span
                className={
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold " +
                  (step.done ? "bg-cobalt-600 text-white" : "border-2 border-cobalt-100 text-cobalt-100")
                }
              >
                {i + 1}
              </span>
              <span className={"text-sm " + (step.done ? "font-bold text-ink" : "text-ink-muted")}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="bg-white rounded-panel shadow-panel p-6 sm:p-9 space-y-7 animate-fade-up"
        style={{ animationDelay: "120ms" }}
      >
        <div className="space-y-5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Required</p>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-bold text-ink">
                  What are you trying to buy, book, or get?
                </FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder="Describe it — the more detail, the better." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="What kind of request is this?" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedCategory && selectedCategory.fields.length > 0 && (
            <div className="space-y-4 border-t border-dashed border-border pt-5">
              <p className="text-sm font-bold text-ink-muted">{selectedCategory.name} details</p>
              {selectedCategory.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={`cf-${field.id}`}>
                    {field.fieldName}
                    {field.required ? " *" : ""}
                  </Label>
                  <Input
                    id={`cf-${field.id}`}
                    value={categoryFieldValues[field.id] ?? ""}
                    onChange={(event) =>
                      setCategoryFieldValues((prev) => ({ ...prev, [field.id]: event.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Everything below is optional — collapsed by default so the form
            reads as three quick fields, not a wall of inputs, per docs
            §6's "keep required fields minimal" */}
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="border-t border-border pt-5">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between text-left group"
            >
              <span className="text-sm font-bold text-cobalt-600">
                Add more detail <span className="font-normal text-ink-muted">(optional, helps your Negotiator)</span>
              </span>
              <ChevronDown
                className={"h-4 w-4 text-cobalt-600 transition-transform duration-200 " + (detailsOpen ? "rotate-180" : "")}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target price ($)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxBudget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum budget ($)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="desiredDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desired date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link (listing, product, etc.)</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anything else we should know?</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? "Sending…" : "Negotiate This For Me"}
        </Button>
      </form>
    </Form>
  )
}
