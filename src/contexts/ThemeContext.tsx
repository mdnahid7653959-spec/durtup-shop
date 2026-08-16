import { createContext, useContext, ReactNode } from "react";
import { useThemeConfig, ThemeConfig, defaultTheme } from "@/hooks/useThemeConfig";
import { useLayoutConfig, SectionConfig, defaultSections } from "@/hooks/useLayoutConfig";

interface ThemeContextType {
  theme: ThemeConfig;
  sections: SectionConfig[];
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  sections: defaultSections,
  isLoading: true,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { data: theme, isLoading: themeLoading } = useThemeConfig();
  const { data: sections, isLoading: layoutLoading } = useLayoutConfig();

  return (
    <ThemeContext.Provider
      value={{
        theme: theme || defaultTheme,
        sections: sections || defaultSections,
        isLoading: themeLoading || layoutLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
