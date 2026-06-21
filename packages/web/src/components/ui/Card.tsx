import { cn } from "../../lib/utils.js";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-background p-4 shadow-sm transition-all duration-200", className)}
      {...props}
    />
  );
}
