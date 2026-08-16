import { lazy, ComponentType } from "react";

/**
 * Enhanced React.lazy wrapper that automatically retries and handles stale chunk deployments
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (firstError: any) {
      try {
        await new Promise((r) => setTimeout(r, 200));
        return await componentImport();
      } catch (retryError: any) {
        const isChunkError =
          retryError?.message?.includes("Failed to fetch dynamically imported module") ||
          retryError?.message?.includes("Importing a module script failed") ||
          retryError?.message?.includes("Loading chunk");

        if (isChunkError) {
          const lastReload = sessionStorage.getItem("chunk_retry_timestamp");
          const now = Date.now();
          if (!lastReload || now - parseInt(lastReload, 10) > 3000) {
            sessionStorage.setItem("chunk_retry_timestamp", now.toString());
            window.location.reload();
            return new Promise(() => {});
          }
        }
        throw retryError;
      }
    }
  });
}

