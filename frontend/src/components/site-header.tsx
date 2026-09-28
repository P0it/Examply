"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "홈" },
  { href: "/review", label: "복습" },
  { href: "/guide", label: "시험 가이드" },
]

// White top bar with the one soft shadow. Pages that need a focused header
// (study, review run) pass their own content as children instead of the nav.
export function SiteHeader({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-10 bg-card shadow-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-primary">
          Examply
        </Link>
        {children ?? (
          <nav className="flex items-center gap-1">
            {NAV.map(({ href, label }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative px-3 py-4 text-sm transition-colors",
                    active
                      ? "font-semibold text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-full after:bg-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        )}
      </div>
    </header>
  )
}
