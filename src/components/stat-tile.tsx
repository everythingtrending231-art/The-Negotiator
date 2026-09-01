"use client"

import { motion, type Variants } from "framer-motion"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

// Shared stat-tile grid for negotiator/business analytics and profile
// screens — a staggered fade-up entrance instead of the tiles just
// appearing on load, consistent with the customer-facing motion pass.
export function StatTileGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className={cn("grid gap-4", className)}>
      {children}
    </motion.div>
  )
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <motion.div variants={item}>
      <Card className="p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{label}</p>
        <p className="text-2xl font-black text-cobalt-600">{value}</p>
      </Card>
    </motion.div>
  )
}
