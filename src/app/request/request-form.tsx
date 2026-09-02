"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
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
type CategoryBusiness = { id: string; name: string; logoUrl: string | null; description: string | null }
type Category = { id: string; name: string; fields: CategoryField[]; businesses: CategoryBusiness[] }

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
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="bg-white rounded-panel shadow-panel p-10 text-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 }}
          className="mx-auto mb-6 flex items-center justify-center"
        >
          <NegotiatorMark size={72} />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs font-bold uppercase tracking-wide mb-2 text-amber-800"
        >
          Request sent
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="font-black text-display-sm text-cobalt-600 mb-3"
        >
          Check your email
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="text-ink-soft max-w-sm mx-auto mb-8"
        >
          Your negotiation ticket is <strong className="text-ink">{submitted}</strong>. We&apos;ve emailed you a
          link to track it — no password, no account, just click through whenever you want an update.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.55 } } }}
          className="text-left max-w-xs mx-auto space-y-3 border-t border-cobalt-100 pt-6"
        >
          {[
            { label: "Received", done: true },
            { label: "Your Negotiator is assigned", done: false },
            { label: "We negotiate on your behalf", done: false },
            { label: "You review the offer", done: false },
          ].map((step, i) => (
            <motion.div
              key={step.label}
              variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
              className="flex items-center gap-3"
            >
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
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    )
  }

  return (
    <Form {...form}>
      <motion.form
        onSubmit={form.handleSubmit(onSubmit)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-panel shadow-panel p-6 sm:p-9 space-y-7"
      >
        <div className="space-y-5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Required</p>

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

          <AnimatePresence initial={false}>
            {selectedCategory && selectedCategory.businesses.length > 0 && (
              <motion.div
                key={`businesses-${selectedCategory.id}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="space-y-3">
                  <p className="text-sm font-bold text-ink-muted">
                    Businesses we work with in {selectedCategory.name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategory.businesses.map((business) => (
                      <div
                        key={business.id}
                        title={business.description ?? undefined}
                        className="inline-flex items-center gap-2 rounded-pill border border-border bg-white px-3 py-2"
                      >
                        {business.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={business.logoUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-cobalt-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {business.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="text-sm font-semibold text-ink">{business.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

          <AnimatePresence initial={false}>
            {selectedCategory && selectedCategory.fields.length > 0 && (
              <motion.div
                key={selectedCategory.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="space-y-4 border-t border-dashed border-border pt-5">
                  <p className="text-sm font-bold text-ink-muted">{selectedCategory.name} details</p>
                  {selectedCategory.fields.map((field, i) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i, duration: 0.25 }}
                      className="space-y-2"
                    >
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
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
              <motion.span animate={{ rotate: detailsOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <ChevronDown className="h-4 w-4 text-cobalt-600" />
              </motion.span>
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

        {serverError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-destructive"
          >
            {serverError}
          </motion.p>
        )}

        <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 22 }}>
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="w-full overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={form.formState.isSubmitting ? "sending" : "idle"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {form.formState.isSubmitting ? "Sending…" : "Negotiate This For Me"}
              </motion.span>
            </AnimatePresence>
          </Button>
        </motion.div>
      </motion.form>
    </Form>
  )
}
