interface SkeletonLoaderProps {
  className?: string;
}

export function SkeletonLoader({ className = '' }: SkeletonLoaderProps) {
  return <div className={`animate-pulse rounded-lg bg-iron-800 ${className}`} />;
}

export function GameCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <SkeletonLoader className="aspect-video w-full" />
      <SkeletonLoader className="h-4 w-3/4" />
      <SkeletonLoader className="h-4 w-1/3" />
    </div>
  );
}

export function HeroSkeleton() {
  return <SkeletonLoader className="h-[420px] w-full rounded-2xl" />;
}
