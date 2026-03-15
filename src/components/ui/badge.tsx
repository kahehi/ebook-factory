import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none badge-dot",
  {
    variants: {
      variant: {
        default:
          "border border-violet-500/30 bg-violet-500/10 text-violet-300",
        secondary:
          "border border-zinc-600/40 bg-zinc-700/30 text-zinc-300",
        destructive:
          "border border-red-500/30 bg-red-500/10 text-red-300",
        outline:
          "border border-zinc-700/60 text-zinc-300",
        // Status variants
        draft:
          "border border-zinc-600/30 bg-zinc-700/20 text-zinc-400",
        planning:
          "border border-blue-500/30 bg-blue-500/10 text-blue-300",
        generating:
          "border border-violet-500/30 bg-violet-500/10 text-violet-300",
        qa_review:
          "border border-amber-500/30 bg-amber-500/10 text-amber-300",
        qa_fixing:
          "border border-orange-500/30 bg-orange-500/10 text-orange-300",
        completed:
          "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        archived:
          "border border-zinc-700/30 bg-zinc-800/40 text-zinc-500",
        // Severity variants
        low:
          "border border-sky-500/30 bg-sky-500/10 text-sky-300",
        medium:
          "border border-amber-500/30 bg-amber-500/10 text-amber-300",
        high:
          "border border-orange-500/30 bg-orange-500/10 text-orange-300",
        critical:
          "border border-red-500/30 bg-red-500/10 text-red-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
