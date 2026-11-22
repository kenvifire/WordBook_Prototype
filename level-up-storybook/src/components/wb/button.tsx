import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const wbButton = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-ink px-6 py-2.5 font-bold transition-transform disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-block hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5",
        secondary: "bg-secondary text-secondary-foreground shadow-soft hover:-translate-x-0.5 hover:-translate-y-0.5",
        ghost: "bg-transparent text-foreground hover:bg-muted",
      },
      size: { md: "", sm: "min-h-11 px-4 text-sm", lg: "px-8 text-lg" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface WbButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof wbButton> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, WbButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(wbButton({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";
