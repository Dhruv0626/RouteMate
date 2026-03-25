import React from "react";

export const Skeleton = ({ className = "", ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-[var(--card-border)] ${className}`}
      {...props}
    />
  );
};

export const SkeletonCircle = ({ className = "", size = "h-12 w-12", ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-full bg-[var(--card-border)] ${size} ${className}`}
      {...props}
    />
  );
};

export const SkeletonText = ({ className = "", lines = 1, ...props }) => {
  return (
    <div className={`space-y-2 ${className}`} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
};

export const SkeletonCard = ({ className = "" }) => {
  return (
    <div className={`glass-card p-4 space-y-4 rounded-xl ${className}`}>
      <div className="flex items-center space-x-4">
        <SkeletonCircle size="h-12 w-12" />
        <SkeletonText lines={2} className="flex-1" />
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
};

export default Skeleton;
