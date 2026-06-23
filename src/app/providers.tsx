"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CookiesProvider } from "react-cookie";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { UserRoleProvider } from "@/components/UserRoleProvider";
import PostHogProvider from "@/components/PostHogProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <PostHogProvider>
        <CookiesProvider>
          <TooltipProvider>
            <ThemeProvider>
              <Toaster />
              <Sonner />
              <UserRoleProvider>{children}</UserRoleProvider>
            </ThemeProvider>
          </TooltipProvider>
        </CookiesProvider>
      </PostHogProvider>
    </QueryClientProvider>
  );
}
