"use client";
import React, { ReactNode } from "react";
import { SolanaWalletProvider } from "@/contexts/SolanaWalletProvider";
import { QueryClientProvider, QueryClient } from "react-query";
import { FarcasterMiniappProvider } from "@/contexts/farcaster-miniapp";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <FarcasterMiniappProvider>
      <SolanaWalletProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </SolanaWalletProvider>
    </FarcasterMiniappProvider>
  );
}
