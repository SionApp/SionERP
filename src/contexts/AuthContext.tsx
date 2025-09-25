import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error?: any }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only set loading to false after we've processed auth state
        if (event === 'INITIAL_SESSION') {
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        console.error('Login error:', error);
        let message = 'Error al iniciar sesión';
        
        switch (error.message) {
          case 'Email not confirmed':
            message = 'Por favor confirma tu email antes de iniciar sesión';
            break;
          case 'Invalid login credentials':
            message = 'Credenciales inválidas. Verifica tu email y contraseña';
            break;
          case 'Too many requests':
            message = 'Demasiados intentos. Intenta de nuevo más tarde';
            break;
          default:
            message = error.message;
        }
        
        toast.error(message);
        return { error };
      }

      if (data.user) {
        toast.success('¡Bienvenido de vuelta!');
      }

      return { error: null };
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Error de conexión. Intenta de nuevo');
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: userData
        }
      });

      if (error) {
        console.error('Signup error:', error);
        let message = 'Error al registrarse';
        
        switch (error.message) {
          case 'User already registered':
            message = 'Este email ya está registrado. ¿Quieres iniciar sesión?';
            break;
          case 'Password should be at least 6 characters':
            message = 'La contraseña debe tener al menos 6 caracteres';
            break;
          case 'Signup requires a valid password':
            message = 'Por favor ingresa una contraseña válida';
            break;
          default:
            message = error.message;
        }
        
        toast.error(message);
        return { error };
      }

      if (data.user && !data.user.email_confirmed_at) {
        toast.success('¡Registro exitoso! Revisa tu email para confirmar tu cuenta.');
      } else if (data.user) {
        toast.success('¡Registro exitoso! Ya puedes iniciar sesión.');
      }

      return { error: null };
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Error de conexión. Intenta de nuevo');
      return { error };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        toast.error('Error al cerrar sesión');
      } else {
        toast.success('Sesión cerrada correctamente');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  const value = {
    user,
    session,
    login,
    signUp,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};