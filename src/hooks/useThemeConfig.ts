import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";
import { useEffect } from "react";

export interface ThemeConfig {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  radius: string;
  fontFamily: string;
  fontSize: string;
  darkMode: boolean;
}

export const defaultTheme: ThemeConfig = {
  primary: "16 90% 55%",
  primaryForeground: "0 0% 100%",
  secondary: "220 14% 96%",
  secondaryForeground: "220 20% 20%",
  background: "0 0% 97%",
  foreground: "220 20% 10%",
  card: "0 0% 100%",
  cardForeground: "220 20% 10%",
  muted: "220 14% 96%",
  mutedForeground: "220 10% 46%",
  accent: "16 90% 55%",
  accentForeground: "0 0% 100%",
  border: "220 13% 91%",
  radius: "0.75rem",
  fontFamily: "Inter",
  fontSize: "16",
  darkMode: false,
};

// Theme presets
export const themePresets: Record<string, ThemeConfig> = {
  default: { ...defaultTheme },
  dark: {
    ...defaultTheme,
    background: "220 20% 8%",
    foreground: "0 0% 95%",
    card: "220 20% 12%",
    cardForeground: "0 0% 95%",
    muted: "220 15% 18%",
    mutedForeground: "220 10% 60%",
    secondary: "220 15% 18%",
    secondaryForeground: "0 0% 90%",
    border: "220 15% 22%",
    darkMode: true,
  },
  modern: {
    ...defaultTheme,
    primary: "250 80% 60%",
    accent: "250 80% 60%",
    background: "240 5% 96%",
    card: "0 0% 100%",
    radius: "1rem",
    fontFamily: "Poppins",
  },
  minimal: {
    ...defaultTheme,
    primary: "0 0% 15%",
    primaryForeground: "0 0% 100%",
    accent: "0 0% 15%",
    accentForeground: "0 0% 100%",
    background: "0 0% 100%",
    foreground: "0 0% 10%",
    card: "0 0% 98%",
    border: "0 0% 90%",
    radius: "0.25rem",
    fontFamily: "Inter",
  },
  warm: {
    ...defaultTheme,
    primary: "25 95% 53%",
    accent: "25 95% 53%",
    background: "35 30% 96%",
    card: "35 40% 99%",
    border: "35 20% 88%",
    fontFamily: "Nunito",
  },
};

function applyThemeToDOM(config: ThemeConfig) {
  const root = document.documentElement;
  root.style.setProperty("--primary", config.primary);
  root.style.setProperty("--primary-foreground", config.primaryForeground);
  root.style.setProperty("--secondary", config.secondary);
  root.style.setProperty("--secondary-foreground", config.secondaryForeground);
  root.style.setProperty("--background", config.background);
  root.style.setProperty("--foreground", config.foreground);
  root.style.setProperty("--card", config.card);
  root.style.setProperty("--card-foreground", config.cardForeground);
  root.style.setProperty("--muted", config.muted);
  root.style.setProperty("--muted-foreground", config.mutedForeground);
  root.style.setProperty("--accent", config.accent);
  root.style.setProperty("--accent-foreground", config.accentForeground);
  root.style.setProperty("--border", config.border);
  root.style.setProperty("--input", config.border);
  root.style.setProperty("--ring", config.primary);
  root.style.setProperty("--radius", config.radius);
  root.style.fontSize = `${config.fontSize}px`;
  
  if (config.fontFamily && config.fontFamily !== "Inter") {
    root.style.fontFamily = `'${config.fontFamily}', sans-serif`;
  }
}

export function useThemeConfig() {
  const query = useQuery({
    queryKey: ["theme-config"],
    queryFn: async (): Promise<ThemeConfig> => {
      const { data, error } = await supabase
        .from("theme_config")
        .select("config")
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch theme config:", error);
        return defaultTheme;
      }

      if (!data?.config) return defaultTheme;

      return { ...defaultTheme, ...(data.config as Partial<ThemeConfig>) };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) {
      applyThemeToDOM(query.data);
    }
  }, [query.data]);

  return query;
}

export { applyThemeToDOM };
