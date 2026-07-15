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
        "flex flex-shrink-0 flex-col overflow-hidden rounded-lg border-2 border-border bg-calendar-paper text-calendar-paper-foreground shadow-md shadow-slate-900/10",
        large ? "w-32" : "w-24",
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
          "flex flex-1 items-center justify-center bg-calendar-paper font-black leading-none",
          large ? "h-20 text-5xl" : "text-3xl"
        )}
      >
        {day}
      </div>
      <div
        className={cn(
          "border-t border-calendar-footer-border bg-calendar-footer px-2 text-center font-bold uppercase tracking-[0.12em] text-calendar-footer-foreground",
          large ? "py-2 text-[11px]" : "py-1.5 text-[9px]"
        )}
      >
        {weekday}
      </div>
    </div>
  );
};
