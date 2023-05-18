import React from "react";
import { useRouter } from "next/router";
import type { AppProps } from "next/app";

import analytics from "@/lib/analytics";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  if (typeof window !== "undefined") {
    // @ts-ignore
    window.Analytics = analytics;
    analytics.page(); // initial page
  }

  return (
    <Analytics>
      <Component {...pageProps} />
    </Analytics>
  );
}

function Analytics({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  React.useEffect(() => {
    function handleRouteChange(url: string) {
      analytics.page();
    }

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  return <>{children}</>;
}
