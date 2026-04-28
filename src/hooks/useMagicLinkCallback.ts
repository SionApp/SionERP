import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para manejar el callback del magic link de Supabase
 * Cuando el usuario hace clic en el link de invitación, Supabase redirige
 * al frontend con un token en la URL que necesita ser procesado
 */
export function useMagicLinkCallback() {
  useEffect(() => {
    // Verificar si hay un token en la URL (viene del magic link)
    const handleMagicLink = async () => {
      // Obtener la URL actual
      const url = new URL(window.location.href);
      
      // Verificar si hay un token de magic link
      // Supabase puede enviar el token como:
      // 1. Hash (#/confirm?token=xxx) - modo legacy
      // 2. Query param (?token=xxx o ?access_token=xxx)
      // 3. O procesarlo automáticamente
      
      const hash = window.location.hash;
      const searchParams = url.searchParams;
      
      // Verificar si viene del magic link (tiene token en URL)
      const hasToken = hash.includes('token') || 
                       searchParams.has('token') || 
                       searchParams.has('access_token') ||
                       searchParams.has('type') ||
                       hash.includes('confirm');
      
      if (hasToken) {
        console.log('Magic link callback detected, processing...');
        
        // Limpiar la URL (remover el token)
        // Solo si no estamos en localhost (para desarrollo)
        if (window.location.hash || window.location.search.includes('token')) {
          // Dejar que Supabase procese el token primero
          // Luego de un momento, limpiar la URL
          setTimeout(() => {
            // Solo limpiar si ya se procesó (hay sesión)
            if (window.location.hash || window.location.search.includes('token')) {
              // Mantener el hash para no perder el estado
              console.log('Magic link processed, session should be established');
            }
          }, 2000);
        }
      }
    };

    // Verificar al montar
    handleMagicLink();

    // Also listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
      
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in via magic link');
        // Redirect to dashboard if we're on login/register page
        const path = window.location.pathname;
        if (path === '/' || path === '/login' || path === '/register') {
          window.location.href = '/dashboard';
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}

export default useMagicLinkCallback;