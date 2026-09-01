"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import LogoutButton from "@/components/logout-button"
import { cn } from "@/lib/utils"

export type PortalNavItem = {
  label: string
  href: string
}

// Shared header/nav shell for the three internal portals (Negotiator,
// Business, Admin) — replaces three independently hand-written,
// structurally identical layout files with one component that carries
// brand tokens and active-route highlighting.
export default function PortalShell({
  title,
  nav,
  sessionLabel,
  maxWidthClassName = "max-w-5xl",
  children,
}: {
  title: string
  nav: PortalNavItem[]
  sessionLabel: string
  maxWidthClassName?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-cobalt-100">
        <div className={cn("mx-auto px-4 py-4 flex items-center justify-between gap-4", maxWidthClassName)}>
          <nav className="flex items-center gap-5 text-sm font-bold overflow-x-auto">
            <span className="text-cobalt-600 whitespace-nowrap">{title}</span>
            {nav.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap transition-colors",
                    active ? "text-cobalt-600" : "text-ink-muted hover:text-ink"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-ink-muted hidden sm:inline">{sessionLabel}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div>{children}</div>
    </div>
  )
}
