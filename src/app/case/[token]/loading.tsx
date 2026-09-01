import { Skeleton } from "@/components/ui/skeleton"
import SiteHeader from "@/components/site-header"

export default function CaseLoading() {
  return (
    <div className="min-h-screen bg-cream px-4 pb-16">
      <SiteHeader />
      <div className="max-w-2xl mx-auto pt-6 space-y-5">
        <div className="bg-white rounded-panel shadow-card p-6 sm:p-7 space-y-4">
          <Skeleton className="h-4 w-24 bg-cream" />
          <Skeleton className="h-8 w-64 max-w-full bg-cream" />
          <Skeleton className="h-3.5 w-full bg-cream" />
        </div>
        <Skeleton className="h-56 w-full rounded-panel bg-cobalt-100" />
        <div className="bg-white rounded-panel shadow-card p-6 sm:p-7 space-y-3">
          <Skeleton className="h-4 w-32 bg-cream" />
          <Skeleton className="h-4 w-full bg-cream" />
          <Skeleton className="h-4 w-3/4 bg-cream" />
        </div>
      </div>
    </div>
  )
}
