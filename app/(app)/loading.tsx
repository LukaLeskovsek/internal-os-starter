import { Skeleton } from "@/components/ui/skeleton";

// Shown while a page loads: a calm placeholder instead of a blank screen.
export default function Loading() {
  return (
    <div>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-9 w-64" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
