"use client";

// Importing "@farcaster/mini-app-solana" causes side-effect, so it should ONLY be
// imported inside the miniapp context
import { FarcasterSolanaProvider } from "@farcaster/mini-app-solana";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import type { ReactNode } from "react";

import { SOLANA_RPC } from "@/config";

export function FarcasterSolanaProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <FarcasterSolanaProvider endpoint={SOLANA_RPC}>
      <WalletModalProvider>{children}</WalletModalProvider>
    </FarcasterSolanaProvider>
  );
}
