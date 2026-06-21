import { cn } from "../../lib/utils.js";
import type { HTMLAttributes } from "react";

export const Card = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-background/90 p-4 shadow-sm shadow-slate-900/5 transition-all duration-200 dark:shadow-black/20",
        className
      )}
      {...props}
    />
  );
};
