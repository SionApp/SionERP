import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MapPin,
  Users,
  Calendar,
  Clock,
  Phone,
  Mail,
  Home,
  AlertCircle,
  CheckCircle,
  Heart,
  Target,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationCenter } from '@/components/ui/notifications';
import { mockNotifications } from '@/mocks/discipleship/data.mock';

interface PersonalDashboardProps {
  title?: string;
  subtitle?: string;
}

const PersonalDashboard: React.FC<PersonalDashboardProps> = ({
  title = 'Mi Dashboard Personal',
  subtitle = 'Información sobre tu participación en el discipulado',
}) => {
  const { user } = useAuth();

  // Mock user data with discipleship information
  const userInfo = {
    zone: (user as any)?.zone_name || 'Zona Norte',
    group: (user as any)?.cell_group || 'Célula Esperanza',
    role: user?.role || 'member',
    supervisor: 'María González',
    leader: 'Roberto Silva',
    meetingDay: 'Miércoles',
    meetingTime: '19:00',
    meetingLocation: 'Casa de María - Colonia Centro',
    phone: '+58 414-567-8901',
    lastAttendance: '2024-09-18',
    nextMeeting: '2024-09-25',
  };

  const [notifications, setNotifications] = React.useState(mockNotifications);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getRoleInfo = () => {
    switch (userInfo.role) {
      case 'pastor':
        return { label: 'Pastor', color: 'bg-purple-600', level: 5 };
      case 'staff':
        return { label: 'Staff Pastoral', color: 'bg-blue-600', level: 4 };
      case 'supervisor':
        return { label: 'Supervisor', color: 'bg-green-600', level: 3 };
      case 'server':
        return { label: 'Servidor', color: 'bg-orange-600', level: 2 };
      default:
        return { label: 'Miembro', color: 'bg-gray-600', level: 1 };
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Info Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Mi Información de Discipulado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Section */}
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${(user as any)?.full_name || user?.email}`}
                  />
                  <AvatarFallback>
                    {((user as any)?.full_name || user?.email || 'U')
                      ?.split(' ')
                      .map((n: string) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">
                    {(user as any)?.full_name || user?.email}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`${roleInfo.color} text-white`}>
                      Nivel {roleInfo.level} - {roleInfo.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {user?.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {user?.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Zone and Group Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold">Mi Zona</h4>
                  </div>
                  <p className="text-lg font-medium">{userInfo.zone}</p>
                  <p className="text-sm text-muted-foreground">Supervisor: {userInfo.supervisor}</p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-5 h-5 text-red-600" />
                    <h4 className="font-semibold">Mi Grupo</h4>
                  </div>
                  <p className="text-lg font-medium">{userInfo.group}</p>
                  <p className="text-sm text-muted-foreground">Líder: {userInfo.leader}</p>
                </div>
              </div>

              {/* Meeting Info */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Información de Reuniones
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Día de reunión:</p>
                    <p className="font-medium">{userInfo.meetingDay}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Hora:</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {userInfo.meetingTime}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">Ubicación:</p>
                    <p className="font-medium flex items-center gap-1">
                      <Home className="w-4 h-4" />
                      {userInfo.meetingLocation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attendance Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-green-800 dark:text-green-400">
                      Última Asistencia
                    </h4>
                  </div>
                  <p className="text-green-700 dark:text-green-300">
                    {new Date(userInfo.lastAttendance).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-800 dark:text-blue-400">
                      Próxima Reunión
                    </h4>
                  </div>
                  <p className="text-blue-700 dark:text-blue-300">
                    {new Date(userInfo.nextMeeting).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3">Acciones Rápidas</h4>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" size="sm">
                    <Phone className="w-4 h-4 mr-2" />
                    Contactar Líder
                  </Button>
                  <Button variant="outline" size="sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    Ver Calendario
                  </Button>
                  <Button variant="outline" size="sm">
                    <MapPin className="w-4 h-4 mr-2" />
                    Ver Ubicación
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications */}
        <div className="space-y-6">
          <NotificationCenter
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onDismiss={handleDismiss}
            onAction={(id, url) => {
              console.log('Notification action:', { id, url });
              // Here you would handle navigation to the URL
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default PersonalDashboard;
