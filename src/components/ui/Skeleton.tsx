interface Props {
  className?: string;
}

function Bone({ className = "" }: Props) {
  return (
    <div
      className={`bg-gray-100 rounded animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <Bone className="h-3 w-24" />
      <Bone className="h-7 w-16" />
      <Bone className="h-3 w-32" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-100">
      <Bone className="size-2 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Bone className="h-3 w-48" />
        <Bone className="h-3 w-32" />
      </div>
      <Bone className="h-5 w-20 rounded-full" />
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export default Bone;
