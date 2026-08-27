import { Skeleton } from "@/components/ui/skeleton";

export default function WatchLoading() {
  return (
    <div className="flex flex-col animate-in fade-in duration-200">
      {/* Banner Ad Skeleton */}
      <div className="w-full max-w-4xl mx-auto mb-4 px-2">
        <Skeleton className="w-full h-20 sm:h-24 rounded-xl" />
      </div>

      {/* Video Player Skeleton */}
      <div className="relative w-full bg-muted/40 aspect-video max-h-[70vh] flex items-center justify-center overflow-hidden rounded-b-xl border-b border-border/40">
        <div className="flex flex-col items-center gap-3 text-muted-foreground/50">
          <div className="w-16 h-16 rounded-full bg-muted/60 animate-pulse flex items-center justify-center">
            <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-muted-foreground/40 border-b-8 border-b-transparent ml-1" />
          </div>
          <span className="text-xs font-medium tracking-wide">Loading Media Player...</span>
        </div>
      </div>

      {/* Main Content Info Skeleton */}
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Left / Top Details */}
          <div className="md:col-span-3 space-y-5">
            {/* Title & Metadata */}
            <div className="space-y-3">
              <Skeleton className="h-8 sm:h-10 w-3/4 max-w-lg rounded-lg" />
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>

            {/* Action Buttons Row Skeleton */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <Skeleton className="h-11 w-36 rounded-lg" />
              <Skeleton className="h-11 w-32 rounded-lg" />
              <Skeleton className="h-11 w-28 rounded-lg" />
              <Skeleton className="h-11 w-24 rounded-lg" />
            </div>

            {/* Description Lines */}
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-11/12 rounded" />
              <Skeleton className="h-4 w-4/5 rounded" />
            </div>
          </div>

          {/* Right Poster Skeleton */}
          <div className="hidden md:block md:col-span-1">
            <Skeleton className="aspect-[2/3] w-full rounded-xl" />
          </div>
        </div>

        {/* Cast Section Skeleton */}
        <div className="space-y-4 pt-4 border-t border-border/40">
          <Skeleton className="h-6 w-32 rounded" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square w-full rounded-full" />
                <Skeleton className="h-3 w-3/4 mx-auto rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
