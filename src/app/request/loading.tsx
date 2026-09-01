import { Skeleton } from "@/components/ui/skeleton"
import SiteHeader from "@/components/site-header"

export default function RequestLoading() {
  return (
    <div className="min-h-screen bg-cream px-4 pb-16">
      <SiteHeader />
      <div className="max-w-2xl mx-auto pt-8">
        <Skeleton className="h-9 w-72 mb-3 bg-cobalt-100" />
        <Skeleton className="h-5 w-96 max-w-full mb-8 bg-cobalt-100" />
        <div className="bg-white rounded-panel shadow-panel p-6 sm:p-9 space-y-5">
          <Skeleton className="h-24 w-full bg-cream" />
          <Skeleton className="h-11 w-full bg-cream" />
          <Skeleton className="h-11 w-full bg-cream" />
          <Skeleton className="h-12 w-full bg-cream" />
        </div>
      </div>
    </div>
  )
}
