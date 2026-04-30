import { supabase } from '@/integrations/supabase/client';
import { UserService } from '@/services/user.service';
import { User as UserType } from '@/types/user.types';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { invalidatePermissionsCache } from '@/lib/permissions';

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
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // El trigger handle_new_user() actualiza automáticamente el estado de la invitación
      // cuando se crea un usuario, así que no necesitamos hacer nada aquí
      // Esto evita cargar todas las invitaciones en cada SIGNED_IN event

      // Solo resetear el estado del usuario actual, no cargar automáticamente
      if (!session?.user) {
        setCurrentUser(null);
        setCurrentUserLoaded(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // No cargar automáticamente el usuario actual
      if (!session?.user) {
        setCurrentUser(null);
        setCurrentUserLoaded(false);
      }
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
    await supabase.auth.signOut();
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
