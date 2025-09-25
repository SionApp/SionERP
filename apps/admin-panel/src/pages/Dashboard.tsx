import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Users, UserPlus, Activity, Settings, Shield, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useDashboardStats } from "../hooks/useDashboardStats";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats } = useDashboardStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-6 space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/70 p-8 text-primary-foreground shadow-[var(--shadow-primary)]">
        <div className="absolute inset-0 bg-[var(--glass-background)] backdrop-blur-sm"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Bienvenido de vuelta, {user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Admin'}
              </h1>
              <p className="text-primary-foreground/80 text-lg font-medium">
                Sistema de Gestión Sion - Panel de Control
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-primary-foreground/70 font-medium">Último acceso</p>
                <p className="font-semibold text-primary-foreground">Hace 2 minutos</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/30">
                <Activity className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards con Glass Morphism */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Total Usuarios",
            value: stats.totalUsers,
            change: "+12%",
            icon: Users,
            color: "from-blue-500 to-cyan-500",
            description: "Usuarios registrados"
          },
          {
            title: "Nuevos Registros",
            value: stats.newRegistrations,
            change: "+24%",
            icon: UserPlus,
            color: "from-emerald-500 to-green-500",
            description: "Últimos 7 días"
          },
          {
            title: "Roles Activos",
            value: stats.activeRoles,
            change: "100%",
            icon: Shield,
            color: "from-purple-500 to-pink-500",
            description: "Tipos configurados"
          },
          {
            title: "Sistema Online",
            value: `${stats.systemActivity}%`,
            change: "+2%",
            icon: Target,
            color: "from-orange-500 to-red-500",
            description: "Uptime del sistema"
          }
        ].map((stat, index) => (
          <Card key={index} className="relative overflow-hidden border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)] hover:shadow-[var(--shadow-accent)] transition-all duration-300 hover:scale-105">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`}></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} shadow-lg`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                  {stat.change}
                </span>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)]">
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Acciones Rápidas
            </CardTitle>
            <CardDescription>
              Accede rápidamente a las funciones más utilizadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => navigate("/usuarios")} 
              className="w-full justify-start bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:from-primary/20 hover:to-accent/20 transition-all duration-300"
              variant="outline"
            >
              <Users className="mr-2 h-4 w-4" />
              Gestionar Usuarios
            </Button>
            <Button 
              onClick={() => navigate("/transmisiones")} 
              className="w-full justify-start bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:from-primary/20 hover:to-accent/20 transition-all duration-300"
              variant="outline"
            >
              <Activity className="mr-2 h-4 w-4" />
              Transmisiones en Vivo
            </Button>
            <Button 
              onClick={() => navigate("/configuracion")} 
              className="w-full justify-start bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:from-primary/20 hover:to-accent/20 transition-all duration-300"
              variant="outline"
            >
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)]">
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Actividad Reciente
            </CardTitle>
            <CardDescription>
              Últimas acciones realizadas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center p-3 rounded-lg bg-gradient-to-r from-accent/20 to-transparent border border-border/30">
                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-full mr-3 shadow-lg"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Nuevo usuario registrado</p>
                  <p className="text-xs text-muted-foreground">Hace 2 horas</p>
                </div>
              </div>
              <div className="flex items-center p-3 rounded-lg bg-gradient-to-r from-accent/20 to-transparent border border-border/30">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mr-3 shadow-lg"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Transmisión iniciada</p>
                  <p className="text-xs text-muted-foreground">Hace 4 horas</p>
                </div>
              </div>
              <div className="flex items-center p-3 rounded-lg bg-gradient-to-r from-accent/20 to-transparent border border-border/30">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full mr-3 shadow-lg"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Configuración actualizada</p>
                  <p className="text-xs text-muted-foreground">Hace 1 día</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;