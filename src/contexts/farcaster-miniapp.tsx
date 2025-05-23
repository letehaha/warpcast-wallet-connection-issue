"use client";

import { Context, ReactNode, createContext, useEffect, useState } from "react";

interface FarcasterMiniappContextValue {
  sdk: typeof import("@farcaster/frame-sdk").sdk | null;
  isFarcasterMiniApp: boolean;
}

export const FarcasterMiniappContext: Context<null | FarcasterMiniappContextValue> =
  createContext<null | FarcasterMiniappContextValue>(null);

export const FarcasterMiniappProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [contextValue, updateContextValue] =
    useState<FarcasterMiniappContextValue>({
      sdk: null,
      isFarcasterMiniApp: false,
    });

  useEffect(() => {
    const url = new URL(window.location.href);

    // Suggested patterns by Farcaster docs: https://miniapps.farcaster.xyz/docs/guides/publishing#hybrid--ssr-friendly-detection-
    // ?miniApp=true is used everywhere in our configs
    const isMini =
      url.pathname.startsWith("/mini") ||
      url.searchParams.get("miniApp") === "true";

    // ?miniApp=true it might not be sufficient because if user will be redirected
    // inside the mini-app, or will refresh the page – the query key disappears from
    // the URL.
    // Here we're checking for ReactNativeView and iframe – that's how
    // `sdk.isInMiniApp` partially works
    const isLikelyMini =
      typeof window !== "undefined" &&
      (window.ReactNativeWebView || window !== window.parent);

    if (isMini || isLikelyMini) {
      import("@farcaster/frame-sdk").then(async ({ sdk }) => {
        const result = await sdk.isInMiniApp();

        updateContextValue({ sdk, isFarcasterMiniApp: result });

        if (result) await sdk.actions.ready();
      });
    }
  }, []);

  return (
    <FarcasterMiniappContext.Provider value={contextValue}>
      {children}
    </FarcasterMiniappContext.Provider>
  );
};
