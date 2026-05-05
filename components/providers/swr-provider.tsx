"use client";

import type { PropsWithChildren } from "react";
import { SWRConfig } from "swr";

export function SwrProvider({ children }: PropsWithChildren) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 15_000,
        focusThrottleInterval: 15_000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}

