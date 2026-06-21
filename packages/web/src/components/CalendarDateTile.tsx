import { cn } from "../lib/utils.js";

type CalendarDateTileProps = {
  month: string;
  day: string;
  weekday: string;
  size?: "compact" | "large";
  className?: string;
};

export const CalendarDateTile = ({
  month,
  day,
  weekday,
  size = "compact",
  className,
}: CalendarDateTileProps) => {
  const large = size === "large";

  return (
    <div
      className={cn(
        "flex flex-shrink-0 flex-col overflow-hidden rounded-lg border-2 border-border bg-white text-slate-900 shadow-md shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-50 dark:text-slate-950",
        large ? "w-28" : "w-20 sm:w-24",
        className
      )}
    >
      <div
        className={cn(
          "bg-primary px-2 text-center font-bold uppercase tracking-[0.16em] text-primary-foreground",
          large ? "py-2 text-xs" : "py-2 text-[10px]"
        )}
      >
        {month}
      </div>
      <div
        className={cn(
          "flex flex-1 items-center justify-center bg-white font-black leading-none dark:bg-slate-50",
          large ? "h-20 text-5xl" : "text-3xl"
        )}
      >
        {day}
      </div>
      <div
        className={cn(
          "border-t border-slate-200 bg-slate-100 px-2 text-center font-bold uppercase tracking-[0.12em] text-slate-700",
          large ? "py-2 text-xs" : "py-1.5 text-[10px]"
        )}
      >
        {weekday}
      </div>
    </div>
  );
};
