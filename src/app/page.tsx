"use client"

import Link from "next/link"
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion"
import { useRef } from "react"
import NegotiatorMark from "@/components/negotiator-mark"

const SPRING = { type: "spring" as const, stiffness: 260, damping: 24 }

function Squiggle({ className, flip = false, parallax = 0 }: { className?: string; flip?: boolean; parallax?: number }) {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, parallax])
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      style={{ transform: flip ? "scaleX(-1)" : undefined, y }}
      aria-hidden="true"
    >
      <motion.path
        d="M20 170 C 20 120, 90 140, 90 90 C 90 50, 40 60, 40 30"
        fill="none"
        stroke="#123FA9"
        strokeWidth="16"
        strokeLinecap="round"
        pathLength={1}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      />
    </motion.svg>
  )
}

const badgeVariant: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: SPRING },
}

function ValueBadge({ label }: { label: string }) {
  return (
    <motion.span
      variants={badgeVariant}
      whileHover={{ y: -3, borderColor: "#123FA9", backgroundColor: "#123FA9", color: "#fff" }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="inline-flex items-center px-4 py-2 rounded-pill text-sm font-bold border-2 border-cobalt-600 text-cobalt-600 cursor-default"
    >
      {label}
    </motion.span>
  )
}

const STEPS = [
  { n: "01", title: "You ask", body: "Tell us what you're trying to buy, book, or get — takes about two minutes." },
  { n: "02", title: "We negotiate", body: "Your Negotiator works the business directly, by phone, on your behalf." },
  { n: "03", title: "You decide", body: "Review the confirmed offer and accept, decline, or ask for another round." },
]

const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}

const heroItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

const stepStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
}

const stepItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

export default function HomePage() {
  const heroRef = useRef(null)
  const reduceMotion = useReducedMotion()

  return (
    <div ref={heroRef} className="min-h-screen w-full relative overflow-hidden flex flex-col bg-cream">
      {/* decorative marks — traced on load, drift slightly on scroll rather
          than sitting as static clip-art */}
      <Squiggle className="absolute -top-6 -left-10 w-40 h-40 opacity-60" parallax={-60} />
      <Squiggle className="absolute bottom-24 -right-10 w-52 h-52 opacity-40" flip parallax={90} />

      {/* top bar */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex items-center justify-between px-6 sm:px-14 pt-8"
      >
        <div className="flex items-center gap-2.5">
          <NegotiatorMark size={40} />
          <span className="font-black text-xl tracking-tight text-cobalt-600">The Negotiator</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="hidden sm:inline text-base italic font-serif text-ink-soft">
            You ask. We negotiate.
          </span>
          <Link
            href="/login"
            className="text-sm font-bold text-cobalt-600 opacity-80 hover:opacity-100 hover:underline underline-offset-4 transition-opacity"
          >
            Sign in
          </Link>
        </div>
      </motion.header>

      {/* main split hero */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-14 px-6 sm:px-14 py-16 max-w-7xl mx-auto w-full">
        {/* left: copy + CTAs */}
        <motion.section variants={heroStagger} initial="hidden" animate="show" className="flex-1 max-w-xl">
          <motion.span
            variants={heroItem}
            className="inline-block px-4 py-1.5 rounded-pill text-xs font-bold uppercase tracking-wide mb-6 bg-amber-500 text-ink"
          >
            #DontAcceptTheFirstOffer
          </motion.span>

          <motion.h1 variants={heroItem} className="font-black text-display-lg text-cobalt-600 mb-5">
            Don&apos;t take
            <br />
            the first price.
          </motion.h1>

          <motion.p variants={heroItem} className="text-lg leading-relaxed mb-8 text-ink-soft max-w-md">
            Tell us what you&apos;re trying to buy, book, or get. Your Negotiator goes
            to work on it — you decide when the offer comes back.
          </motion.p>

          <motion.div variants={heroItem} className="flex flex-wrap gap-4 mb-8">
            <Link href="/request">
              <motion.span
                animate={reduceMotion ? undefined : { scale: [1, 1.06, 1, 1.04, 1] }}
                transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
                whileHover={{
                  scale: 1,
                  y: -3,
                  boxShadow: "0 16px 40px -12px rgba(18,63,169,0.35)",
                  transition: { type: "spring", stiffness: 400, damping: 22 },
                }}
                whileTap={{ scale: 0.96, transition: { type: "spring", stiffness: 500, damping: 25 } }}
                className="inline-flex px-7 py-4 rounded-pill font-bold text-white text-base bg-cobalt-600 shadow-card"
              >
                Negotiate This For Me
              </motion.span>
            </Link>
            <a href="#how-it-works">
              <motion.span
                whileHover={{ backgroundColor: "#123FA9", color: "#ffffff" }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="inline-flex px-7 py-4 rounded-pill font-bold text-base border-2 border-cobalt-600 text-cobalt-600"
              >
                See how it works
              </motion.span>
            </a>
          </motion.div>

          <motion.div variants={heroItem} className="flex flex-wrap gap-3">
            <motion.div variants={heroStagger} initial="hidden" animate="show" className="flex flex-wrap gap-3">
              <ValueBadge label="Lower Price" />
              <ValueBadge label="Better Terms" />
              <ValueBadge label="Added Value" />
            </motion.div>
          </motion.div>
        </motion.section>

        {/* right: framed mark + floating proof cards */}
        <section className="flex-1 flex items-center justify-center w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...SPRING, delay: 0.25 }}
            className="relative w-full"
          >
            {/* main framed panel — a slow idle drift, not a static tile */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="rounded-panel p-10 sm:p-14 flex items-center justify-center aspect-square bg-cobalt-600 shadow-panel"
            >
              <NegotiatorMark size={180} onDark />
            </motion.div>

            {/* floating status card — process, not a promised outcome;
                pinned at a slight angle like a note stuck to the panel */}
            <motion.div
              initial={{ opacity: 0, y: 16, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: -3 }}
              transition={{ ...SPRING, delay: 0.7 }}
              whileHover={{ rotate: 0, scale: 1.03 }}
              className="absolute -top-6 -left-6 sm:-left-10 bg-white rounded-2xl shadow-panel px-5 py-4 max-w-[220px] border-4 border-cream"
            >
              <p className="text-xs font-bold uppercase tracking-wide mb-1 text-amber-600">In progress</p>
              <p className="text-sm font-bold text-ink">We&apos;re negotiating with the business now</p>
            </motion.div>

            {/* floating negotiator identity card */}
            <motion.div
              initial={{ opacity: 0, y: 16, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: 2.5 }}
              transition={{ ...SPRING, delay: 0.85 }}
              whileHover={{ rotate: 0, scale: 1.03 }}
              className="absolute -bottom-6 -right-4 sm:-right-8 bg-white rounded-2xl shadow-panel px-5 py-3 flex items-center gap-3 border-4 border-cream"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 bg-amber-500 animate-pulse-ring">
                A
              </div>
              <div>
                <p className="text-xs text-ink-muted">Your Negotiator</p>
                <p className="text-sm font-bold text-ink">Amara is on it</p>
              </div>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* how it works — revealed on scroll, not dumped in on page load,
          so it reads as a distinct beat instead of hero overflow */}
      <section id="how-it-works" className="relative z-10 px-6 sm:px-14 py-16 border-t border-cobalt-100">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="font-black text-display-sm text-cobalt-600 mb-10 text-center"
          >
            How it works
          </motion.h2>
          <motion.div
            variants={stepStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid sm:grid-cols-3 gap-8 sm:gap-6 relative"
          >
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                variants={stepItem}
                className={"relative text-center sm:text-left" + (i === 1 ? " sm:mt-8" : i === 2 ? " sm:mt-16" : "")}
              >
                <div className="inline-flex w-12 h-12 rounded-full items-center justify-center bg-amber-500 text-ink font-black text-sm mb-4 shadow-card">
                  {step.n}
                </div>
                <h3 className="font-bold text-lg text-ink mb-1">{step.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{step.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* footer */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 px-6 sm:px-14 pb-8 pt-6 border-t border-cobalt-100">
        <span className="text-xs font-bold text-cobalt-600">© The Negotiator</span>
        <span className="text-xs text-ink-muted">
          Every negotiation handled by someone who does this for a living.
        </span>
      </footer>
    </div>
  )
}
