import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils.js";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-0",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm shadow-secondary/20 hover:-translate-y-0.5 hover:bg-secondary/90 active:translate-y-0",
        ghost: "hover:bg-muted/80",
        destructive:
          "bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700",
        outline:
          "border border-border bg-background/70 hover:-translate-y-0.5 hover:bg-muted/70 active:translate-y-0",
      },
      size: {
        default: "h-10 px-4 text-sm",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = ({ className, variant, size, ...props }: ButtonProps) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
};
