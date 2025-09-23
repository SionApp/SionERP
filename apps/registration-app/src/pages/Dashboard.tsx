import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Settings, Users, Calendar } from 'lucide-react';

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error('Error al cerrar sesión');
      } else {
        toast.success('Sesión cerrada exitosamente');
        navigate('/login');
      }
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-foreground">
              Sistema de Registro - Iglesia Sion
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-muted-foreground">
                Bienvenido, {user?.user_metadata?.first_name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Usuario Card */}
          <div className="bg-card rounded-lg p-6 border shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <UserIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">Mi Perfil</h3>
                <p className="text-muted-foreground">Gestiona tu información personal</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm">
                <span className="font-medium">Email:</span> {user?.email}
              </p>
              <p className="text-sm">
                <span className="font-medium">Nombre:</span> {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
              </p>
              <p className="text-sm">
                <span className="font-medium">Registrado:</span> {new Date(user?.created_at || '').toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Configuración Card */}
          <div className="bg-card rounded-lg p-6 border shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-secondary/10 rounded-full">
                <Settings className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">Configuración</h3>
                <p className="text-muted-foreground">Ajusta las preferencias del sistema</p>
              </div>
            </div>
            <div className="mt-4">
              <button className="w-full bg-secondary text-secondary-foreground py-2 px-4 rounded-md hover:bg-secondary/80 transition-colors">
                Abrir Configuración
              </button>
            </div>
          </div>

          {/* Usuarios Card */}
          <div className="bg-card rounded-lg p-6 border shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-accent/10 rounded-full">
                <Users className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">Usuarios</h3>
                <p className="text-muted-foreground">Gestiona usuarios del sistema</p>
              </div>
            </div>
            <div className="mt-4">
              <button className="w-full bg-accent text-accent-foreground py-2 px-4 rounded-md hover:bg-accent/80 transition-colors">
                Ver Usuarios
              </button>
            </div>
          </div>

          {/* Eventos Card */}
          <div className="bg-card rounded-lg p-6 border shadow-sm md:col-span-2 lg:col-span-3">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-muted/10 rounded-full">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">Eventos Recientes</h3>
                <p className="text-muted-foreground">Actividad reciente en el sistema</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/5 rounded-md">
                <span className="text-sm text-foreground">Usuario registrado exitosamente</span>
                <span className="text-xs text-muted-foreground">Hace 2 minutos</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/5 rounded-md">
                <span className="text-sm text-foreground">Sesión iniciada desde nueva ubicación</span>
                <span className="text-xs text-muted-foreground">Hace 1 hora</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/5 rounded-md">
                <span className="text-sm text-foreground">Perfil actualizado</span>
                <span className="text-xs text-muted-foreground">Hace 3 horas</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;