import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";

const cacheKey = (key: string) => `site-config:${key}`;

function readCache<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(cacheKey(key));
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(cacheKey(key), JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function useSiteConfig<T = Record<string, unknown>>(key: string, fallback: T): { config: T; isLoading: boolean } {
  const cached = readCache<T>(key);

  const { data, isLoading } = useQuery({
    queryKey: ["site-config", key],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("site_config")
          .select("value")
          .eq("key", key)
          .maybeSingle();
          
        if (error) {
          console.warn(`[useSiteConfig] Error for key "${key}", using fallback:`, error.message);
          return fallback;
        }
        
        const value = (data?.value ?? null) as T | null;
        if (value !== null) {
          writeCache(key, value);
          return value;
        } else {
          try {
            localStorage.removeItem(cacheKey(key));
          } catch {}
        }
      } catch (err) {
        console.warn(`[useSiteConfig] Exception for key "${key}", using fallback:`, err);
      }
      return fallback;
    },
    staleTime: 5 * 60 * 1000,
    initialData: cached ?? fallback,
  });

  return { config: (data as T) ?? cached ?? fallback, isLoading: isLoading && !cached };
}
