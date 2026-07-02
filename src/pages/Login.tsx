import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PLATFORM_NAME } from '@/lib/branding';
import { SettingsService, type PublicBranding } from '@/services/settings.service';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Ingresa un email válido')
    .max(255, 'El email es muy largo'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(100, 'La contraseña es muy larga'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [branding, setBranding] = useState<PublicBranding | null>(null);
  const navigate = useNavigate();
  const { login, user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    SettingsService.getPublicBranding().then(setBranding);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Redirect authenticated users
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const { error } = await login(data.email, data.password);

      if (!error) {
        // Success! Navigation will happen automatically via useEffect
        // when user state updates
      } else {
        // Handle specific errors
        if (error.message?.includes('Invalid login credentials')) {
          setError('root', {
            message: 'Email o contraseña incorrectos',
          });
        } else if (error.message?.includes('Email not confirmed')) {
          setError('root', {
            message: 'Por favor confirma tu email antes de iniciar sesión',
          });
        } else {
          setError('root', {
            message: 'Error al iniciar sesión. Intenta de nuevo.',
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('root', {
        message: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Panel visual: JETRO uniéndose con la marca de la iglesia (solo desktop) ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-[#2547c9] items-center justify-center p-12">
        {/* Marca de agua: el ícono de JETRO de fondo, grande y sutil */}
        <img
          src="/icon-512x512.png"
          alt=""
          aria-hidden="true"
          className="absolute -right-24 -bottom-24 h-[32rem] w-[32rem] object-contain opacity-[0.08] rotate-6 select-none pointer-events-none"
        />

        <div className="relative z-10 flex flex-col items-center gap-8 text-center">
          {branding?.logo_url ? (
            <div className="flex items-center gap-5">
              <div className="h-24 w-24 rounded-2xl bg-white shadow-2xl flex items-center justify-center p-3">
                <img
                  src="/icon-512x512.png"
                  alt={PLATFORM_NAME}
                  className="h-full w-full object-contain rounded-lg"
                />
              </div>
              <span className="text-white/50 text-3xl font-thin">+</span>
              <div className="h-24 w-24 rounded-2xl bg-white shadow-2xl flex items-center justify-center p-3">
                <img
                  src={branding.logo_url}
                  alt={branding.church_name}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="h-28 w-28 rounded-2xl bg-white shadow-2xl flex items-center justify-center p-4">
              <img
                src="/icon-512x512.png"
                alt={PLATFORM_NAME}
                className="h-full w-full object-contain rounded-xl"
              />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-white text-2xl font-bold tracking-tight">
              {branding?.church_name ? `${PLATFORM_NAME} × ${branding.church_name}` : PLATFORM_NAME}
            </p>
            <p className="text-white/70 text-sm max-w-xs">
              {branding?.church_name
                ? `${PLATFORM_NAME} potencia la gestión de ${branding.church_name}`
                : 'Sistema de gestión y discipulado para iglesias'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Panel de login ── */}
      <div className="flex-1 flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <p className="text-center text-xs font-semibold tracking-widest text-muted-foreground/70 uppercase lg:hidden">
              {PLATFORM_NAME}
            </p>
            <div className="flex items-center justify-center mb-2 lg:hidden">
              {branding?.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt={branding.church_name}
                  className="h-14 w-14 rounded-xl object-contain shadow-md"
                />
              ) : (
                <LogIn className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Dashboard Administrativo
            </CardTitle>
            <CardDescription className="text-center">
              {branding?.church_name || 'Iglesia Evangélica Pentecostal Sion'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {errors.root && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.root.message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@iglesiasion.com"
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Iniciando Sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                ¿No tienes cuenta?{' '}
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Registrarse
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
