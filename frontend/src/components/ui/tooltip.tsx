"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-xs rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg",
          "dark:bg-slate-100 dark:text-slate-900",
          "transition-opacity duration-150 data-[state=delayed-open]:opacity-100 data-[state=closed]:opacity-0",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
