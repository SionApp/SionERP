import { supabase } from '@/integrations/supabase/client';
import { SettingsService } from '@/services/settings.service';
import type { UpdateUserPreferences, UserPreferences } from '@/types/settings.types';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState } from 'react';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setTheme, theme: currentTheme } = useTheme();

  // Aplicar tema con validación y protección contra errores
  const applyTheme = useCallback(
    (theme: string | null | undefined) => {
      if (!theme || !setTheme) return;

      try {
        // Limpiar espacios y convertir a minúsculas
        const cleanTheme = String(theme).trim().toLowerCase();

        // Validar que sea un tema válido
        const validThemes = ['light', 'dark', 'auto', 'system'];
        if (!validThemes.includes(cleanTheme)) {
          console.warn(`Invalid theme value: "${theme}", ignoring`);
          return;
        }

        // Aplicar tema con protección
        if (cleanTheme === 'auto') {
          setTheme('system');
        } else {
          setTheme(cleanTheme as 'light' | 'dark' | 'system');
        }
      } catch (error) {
        console.error('Error applying theme:', error);
        // No hacer nada, dejar el tema por defecto
      }
    },
    [setTheme]
  );

  // Cargar preferencias iniciales
  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await SettingsService.getUserPreferences();
      setPreferences(data);

      // Aplicar tema inmediatamente (con validación y delay para asegurar que ThemeProvider esté listo)
      if (data?.theme && setTheme) {
        // Pequeño delay para asegurar que setTheme esté disponible
        setTimeout(() => {
          applyTheme(data.theme);
        }, 100);
      }
    } catch (err: unknown) {
      console.error('Error loading preferences:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar preferencias');
    } finally {
      setLoading(false);
    }
  }, [applyTheme, setTheme]);

  // Actualizar una preferencia individual
  const updatePreference = useCallback(
    async <K extends keyof UpdateUserPreferences>(
      key: K,
      value: UpdateUserPreferences[K]
    ): Promise<boolean> => {
      try {
        const updatedPrefs = await SettingsService.updateUserPreferences({ [key]: value });
        setPreferences(updatedPrefs);

        // Si es el tema, aplicarlo inmediatamente
        if (key === 'theme' && value) {
          applyTheme(String(value));
        }

        return true;
      } catch (err: unknown) {
        console.error(`Error updating preference ${key}:`, err);
        setError(err instanceof Error ? err.message : 'Error al actualizar preferencia');
        return false;
      }
    },
    [applyTheme]
  );

  // Actualizar múltiples preferencias
  const updatePreferences = useCallback(
    async (updates: UpdateUserPreferences): Promise<boolean> => {
      try {
        const updatedPrefs = await SettingsService.updateUserPreferences(updates);
        setPreferences(updatedPrefs);

        // Si incluye tema, aplicarlo
        if (updates.theme) {
          applyTheme(String(updates.theme));
        }

        return true;
      } catch (err: unknown) {
        console.error('Error updating preferences:', err);
        setError(err instanceof Error ? err.message : 'Error al actualizar preferencias');
        return false;
      }
    },
    [applyTheme]
  );

  // Cargar preferencias al montar (esperar a que ThemeProvider esté listo)
  useEffect(() => {
    // Solo cargar preferencias si setTheme está disponible
    if (!setTheme) {
      return;
    }

    // Esperar a que el tema esté disponible (indica que ThemeProvider está listo)
    if (currentTheme === undefined) {
      // ThemeProvider aún no está listo, esperar un poco más
      const timer = setTimeout(() => {
        if (setTheme) {
          loadPreferences();
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // ThemeProvider está listo, cargar preferencias
      loadPreferences();
    }
  }, [currentTheme, setTheme, loadPreferences]);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('user-preferences-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_preferences',
            filter: `user_id=eq.${user.id}`,
          },
          payload => {
            const newPrefs = payload.new as UserPreferences;
            setPreferences(newPrefs);

            // Aplicar tema si cambió (con validación)
            if (newPrefs.theme) {
              applyTheme(String(newPrefs.theme));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, [applyTheme]);

  return {
    preferences,
    loading,
    error,
    updatePreference,
    updatePreferences,
    refreshPreferences: loadPreferences,
  };
};

export default usePreferences;
