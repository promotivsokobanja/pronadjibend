export default function BandCardSkeleton() {
  return (
    <div className="h-full animate-pulse rounded-2xl">
      <div className="mb-3 aspect-[10/11] rounded-2xl bg-slate-200 shadow-sm" />
      <div className="space-y-2.5 pl-1">
        <div className="h-5 w-4/5 max-w-[220px] rounded-md bg-slate-200" />
        <div className="h-4 w-3/5 max-w-[160px] rounded-md bg-slate-200/80" />
        <div className="flex flex-wrap gap-2 pt-1">
          <div className="h-6 w-16 rounded-full bg-slate-100" />
          <div className="h-6 w-20 rounded-full bg-slate-100" />
          <div className="h-6 w-[4.5rem] rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
