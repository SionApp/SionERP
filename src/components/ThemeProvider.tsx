import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';
import { useEffect, useState } from 'react';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [isReady, setIsReady] = useState(false);

  // Limpiar localStorage de valores inválidos antes de montar ThemeProvider
  useEffect(() => {
    try {
      const storageKey = props.storageKey || 'sion-theme';
      const storedTheme = localStorage.getItem(storageKey);

      if (storedTheme) {
        const cleanTheme = String(storedTheme).trim().toLowerCase();
        const validThemes = ['light', 'dark', 'system'];

        // Si el valor almacenado es inválido o tiene espacios, limpiarlo
        if (
          !validThemes.includes(cleanTheme) ||
          cleanTheme.includes(' ') ||
          cleanTheme.length === 0
        ) {
          console.warn(`Invalid theme in localStorage: "${storedTheme}", clearing it`);
          localStorage.removeItem(storageKey);
        } else if (cleanTheme !== storedTheme) {
          // Si necesita limpieza, actualizarlo
          localStorage.setItem(storageKey, cleanTheme);
        }
      }
    } catch (error) {
      console.error('Error cleaning theme from localStorage:', error);
    } finally {
      setIsReady(true);
    }
  }, [props.storageKey]);

  // Asegurar que defaultTheme sea válido y no tenga espacios
  const safeDefaultTheme = props.defaultTheme
    ? String(props.defaultTheme).trim().toLowerCase()
    : 'dark';

  // Validar que sea un tema válido
  const validThemes = ['light', 'dark', 'system'];
  const finalTheme =
    validThemes.includes(safeDefaultTheme) &&
    !safeDefaultTheme.includes(' ') &&
    safeDefaultTheme.length > 0
      ? safeDefaultTheme
      : 'dark';

  const safeProps = {
    ...props,
    defaultTheme: finalTheme,
    storageKey: props.storageKey || 'sion-theme',
  };

  // No renderizar ThemeProvider hasta que localStorage esté limpio
  if (!isReady) {
    return <>{children}</>;
  }

  try {
    return <NextThemesProvider {...safeProps}>{children}</NextThemesProvider>;
  } catch (error) {
    console.error('ThemeProvider error:', error);
    // Fallback: renderizar sin ThemeProvider si hay error crítico
    return <>{children}</>;
  }
}
