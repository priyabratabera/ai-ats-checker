"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-lg px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors",
        "hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
        "data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm",
        "dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-slate-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("mt-4 focus-visible:outline-none", className)}
      {...props}
    />
  );
}
