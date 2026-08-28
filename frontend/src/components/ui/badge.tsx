import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
        success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
        warning: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        danger: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export function severityToBadgeVariant(severity: "low" | "medium" | "high"): BadgeProps["variant"] {
  if (severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "neutral";
}

export function priorityToBadgeVariant(priority: "low" | "medium" | "high"): BadgeProps["variant"] {
  if (priority === "high") return "danger";
  if (priority === "medium") return "warning";
  return "brand";
}
