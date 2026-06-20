import { cn } from "../../lib/utils.js";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-background p-4", className)}
      {...props}
    />
  );
}
