import React from "react";
import { clsx } from "clsx";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={clsx(
        "skeleton-pixel rounded-xl",
        className
      )}
      {...props}
    />
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <Skeleton className="w-6 h-6 rounded-lg shrink-0" />
            <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
              <Skeleton className="h-2.5 w-1/3 rounded-md" />
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <Skeleton className="h-5 w-16 rounded-lg" />
            <Skeleton className="h-3 w-10 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const TreemapSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Category Bar Skeleton */}
      <div className="skeleton-card bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-3.5 w-64 rounded-md" />
          </div>
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-full rounded-2xl" />
        <div className="flex flex-wrap gap-4 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-3 h-3 rounded-full shrink-0" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Directory Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 border-2 border-slate-100 shadow-duo-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
        ))}
      </div>

      {/* Heavy Files List Skeleton */}
      <div className="skeleton-card bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-3.5 w-4/5 rounded-md" />
                  <Skeleton className="h-2.5 w-1/3 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-4 w-16 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-4 border-2 border-slate-100 shadow-duo-sm flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton className="h-4 w-1/2 rounded-md" />
              <Skeleton className="h-3 w-3/4 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const AppCatalogSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-duo flex flex-col justify-between space-y-4"
        >
          <div className="flex items-start gap-3.5">
            <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
              <Skeleton className="h-3 w-full rounded-md" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

/** Matches the OS Tweaks casual view: header card, one or two preset cards
 * with a checklist grid, and a DNS-switcher bar. */
export const TweaksSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Card Skeleton */}
      <div className="skeleton-card bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-40 rounded-md" />
            <Skeleton className="h-5 w-64 rounded-md" />
            <Skeleton className="h-3 w-72 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-16 w-full md:w-44 rounded-2xl shrink-0" />
      </div>

      {/* Preset Card Skeletons (essential + secondary preset) */}
      {Array.from({ length: 2 }).map((_, cardIdx) => (
        <div
          key={cardIdx}
          className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton className="h-4 w-56 rounded-md" />
              <Skeleton className="h-3 w-full max-w-md rounded-md" />
            </div>
            <Skeleton className="h-10 w-44 rounded-2xl shrink-0" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ))}

      {/* DNS Switcher Bar Skeleton */}
      <div className="bg-white rounded-2xl p-4 border-2 border-slate-100 shadow-duo-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-40 rounded-md" />
            <Skeleton className="h-3 w-56 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-9 w-full sm:w-40 rounded-xl shrink-0" />
      </div>
    </div>
  );
};

export const VitalsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo space-y-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-1/3 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-2xl" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </div>
        ))}
      </div>
      <div className="skeleton-card bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-3.5 w-1/2 rounded-md" />
                  <Skeleton className="h-2.5 w-1/4 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
