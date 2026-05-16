import { Skeleton } from "../ui/Skeleton";

export default function ChatPageSkeleton() {
  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden">
      <aside className="hidden md:flex w-[280px] h-full border-r border-white/10 flex-col p-4 gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-4 w-24 mt-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
        <Skeleton className="h-4 w-28 mt-6" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={`s-${i}`} className="h-9 w-full rounded-xl" />
        ))}
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <div className="h-16 md:h-20 border-b border-white/10 px-6 flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
        <div className="flex-1 p-6 md:p-12 max-w-4xl mx-auto w-full space-y-6">
          <div className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <Skeleton className="h-24 flex-1 rounded-2xl" />
          </div>
          <div className="flex gap-3 justify-end">
            <Skeleton className="h-16 w-2/3 rounded-2xl" />
          </div>
        </div>
        <div className="p-4 border-t border-white/10">
          <Skeleton className="h-14 w-full max-w-4xl mx-auto rounded-2xl" />
        </div>
      </main>
    </div>
  );
}
