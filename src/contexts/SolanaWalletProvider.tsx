import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { ReactNode, useContext } from "react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { SOLANA_RPC } from "@/config";
import { FarcasterMiniappContext } from "./farcaster-miniapp";
import { FarcasterSolanaProviders } from "./farcaster-solana-provider";

require("@solana/wallet-adapter-react-ui/styles.css");

export const SolanaWalletProvider = ({ children }: { children: ReactNode }) => {
  const { isFarcasterMiniApp, sdk } = useContext(FarcasterMiniappContext)!;
  const endpoint = SOLANA_RPC;

  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

  if (isFarcasterMiniApp && sdk) {
    return <FarcasterSolanaProviders>{children}</FarcasterSolanaProviders>;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
