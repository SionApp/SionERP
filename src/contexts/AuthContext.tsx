import { supabase } from '@/integrations/supabase/client';
import { UserService } from '@/services/user.service';
import { User as UserType } from '@/types/user.types';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { fetchPermissions, invalidatePermissionsCache } from '@/lib/permissions';

/** Info de una sesión federada activa (acceso BonDev) — ver
 *  FederatedBanner.tsx y Can.tsx, que la usan para el banner y el gating. */
export interface FederatedInfo {
  operatorName: string;
  expiresAt: Date;
  mode: 'read' | 'edit';
}

interface AuthContextType {
  user: User | null;
  currentUser: UserType | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signUp: (email: string, password: string, userData?: UserType) => Promise<{ error?: AuthError }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isLoadingCurrentUser: boolean;
  currentUserLoaded: boolean;
  refreshCurrentUser: () => Promise<void>;
  ensureCurrentUserLoaded: () => Promise<void>;
  /** true si no hay sesión de Supabase pero SÍ una cookie de acceso federado
   *  válida (BonDev, modo lectura) — ver components/ProtectedRoute.tsx y
   *  hooks/usePermissions.ts, que la tratan como una autenticación alternativa. */
  isFederatedReadOnly: boolean;
  federatedInfo: FederatedInfo | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(false);
  const [currentUserLoaded, setCurrentUserLoaded] = useState(false);
  const [isFederatedReadOnly, setIsFederatedReadOnly] = useState(false);
  const [federatedInfo, setFederatedInfo] = useState<FederatedInfo | null>(null);

  // Chequea si hay una sesión federada (BonDev, cookie httpOnly) cuando NO
  // hay sesión de Supabase — es la única forma de saber si el visitante es
  // un operador de soporte de BonDev en vez de simplemente "no logueado".
  // No lanza: sin cookie válida, el backend devuelve el permissions fallback
  // normal (member/0/false) y esto queda en isFederatedReadOnly=false, el
  // flujo de "no autenticado -> /login" sigue igual que siempre.
  const checkFederatedSession = async () => {
    try {
      const perms = await fetchPermissions();
      if (perms.is_federated) {
        setIsFederatedReadOnly(true);
        setFederatedInfo({
          operatorName: perms.federated_operator_name || 'BonDev',
          expiresAt: perms.federated_expires_at ? new Date(perms.federated_expires_at) : new Date(),
          mode: perms.federated_mode === 'edit' ? 'edit' : 'read',
        });
      }
    } catch {
      // sin sesión federada tampoco — visitante genuinamente no autenticado
    }
  };

  // Función para cargar los datos completos del usuario actual (solo si no se han cargado)
  const loadCurrentUser = async (authUser: User | null, forceRefresh = false) => {
    if (authUser && (!currentUserLoaded || forceRefresh)) {
      setIsLoadingCurrentUser(true);
      try {
        const userData = await UserService.getCurrentUser();

        setCurrentUser(userData);
        setCurrentUserLoaded(true);
      } catch (error) {
        // En caso de error, establecemos currentUser como null
        setCurrentUser(null);
        setCurrentUserLoaded(false);
      } finally {
        setIsLoadingCurrentUser(false);
      }
    } else if (!authUser) {
      setCurrentUser(null);
      setCurrentUserLoaded(false);
      setIsLoadingCurrentUser(false);
    }
  };

  // Función para refrescar el usuario actual
  const refreshCurrentUser = async () => {
    if (user) {
      await loadCurrentUser(user, true); // forceRefresh = true
    }
  };

  // Función para cargar el usuario actual solo si es necesario
  const ensureCurrentUserLoaded = async () => {
    if (user && !currentUserLoaded && !isLoadingCurrentUser) {
      await loadCurrentUser(user);
    }
  };

  useEffect(() => {
    // Evita que el listener de abajo baje isLoading antes de que el chequeo
    // de sesión federada de getSession().then() termine — Supabase dispara
    // un evento INITIAL_SESSION (session=null) que puede llegar antes o
    // después de que getSession() resuelva; sólo el bootstrap inicial
    // necesita esperar al chequeo federado, los eventos post-bootstrap
    // (login/logout reales) no.
    let bootstrapped = false;

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Solo invalidar permisos en cambios reales de auth, no en refreshes silenciosos
      if (event !== 'TOKEN_REFRESHED') {
        invalidatePermissionsCache();
      }

      if (session?.user && event === 'SIGNED_IN') {
        // Un login real de Supabase gana sobre cualquier estado federado previo.
        setIsFederatedReadOnly(false);
        setFederatedInfo(null);
        setIsLoading(false);
        loadCurrentUser(session.user);
      } else if (!session?.user) {
        setCurrentUser(null);
        setCurrentUserLoaded(false);
        if (bootstrapped) {
          setIsLoading(false);
        }
        // si !bootstrapped: dejamos que getSession().then() decida
        // isLoading después de chequear la sesión federada.
      } else {
        setIsLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setIsLoading(false);
        loadCurrentUser(session.user);
      } else {
        setCurrentUser(null);
        setCurrentUserLoaded(false);
        // Sin sesión de Supabase: puede ser un visitante genuinamente no
        // autenticado, o un operador de BonDev con la cookie de acceso
        // federado. Sólo lo sabemos preguntándole al backend — por eso
        // isLoading se mantiene true hasta que esto resuelva: si lo
        // bajáramos antes, ProtectedRoute podría redirigir a /login antes
        // de saber que en realidad había una sesión federada válida.
        await checkFederatedSession();
        setIsLoading(false);
      }
      bootstrapped = true;
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, userData?: UserType) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData,
      },
    });
    return { error };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Session may already be invalid server-side (e.g. after db reset)
    }
    // Force-clear all Supabase tokens from localStorage regardless of signOut result.
    // Needed when the GoTrue server rejects signOut (e.g. token invalid after db reset)
    // — in that case the JS client skips _removeSession() and the JWT stays in storage.
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => localStorage.removeItem(k));
    invalidatePermissionsCache();
    setCurrentUser(null);
    setCurrentUserLoaded(false);
  };

  const value = {
    user,
    currentUser,
    session,
    login,
    signUp,
    logout,
    isLoading,
    isLoadingCurrentUser,
    currentUserLoaded,
    refreshCurrentUser,
    ensureCurrentUserLoaded,
    isFederatedReadOnly,
    federatedInfo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
