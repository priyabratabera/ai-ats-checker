"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      {children}
      <Toaster position="bottom-right" richColors />
    </TooltipProvider>
  );
}
