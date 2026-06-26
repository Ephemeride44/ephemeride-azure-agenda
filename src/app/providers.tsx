"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { CookiesProvider } from "react-cookie";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { UserRoleProvider } from "@/components/UserRoleProvider";
import { AuthDialogProvider } from "@/components/account/AuthDialogProvider";
import { OnboardingProvider } from "@/components/account/OnboardingProvider";
import { PushPromptProvider } from "@/components/account/PushPromptProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import PostHogProvider from "@/components/PostHogProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
      <PostHogProvider>
        <CookiesProvider>
          <TooltipProvider>
            <ThemeProvider>
              <Toaster />
              <Sonner />
              <UserRoleProvider>
                <PushPromptProvider>
                  <OnboardingProvider>
                    <AuthDialogProvider>{children}</AuthDialogProvider>
                  </OnboardingProvider>
                </PushPromptProvider>
              </UserRoleProvider>
              <ServiceWorkerRegister />
            </ThemeProvider>
          </TooltipProvider>
        </CookiesProvider>
      </PostHogProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
