import { BarChart3, Bell, DollarSign, MapPin, UserPlus, Users } from 'lucide-react';
import { MobileDashboardScreen } from '@/components/mobile/screens/DashboardScreen';
import { MobileDiscipleshipOverview } from '@/components/mobile/screens/DiscipleshipScreen';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { MobileSectionHeader } from '@/components/mobile/MobileSectionHeader';
import { MobileStatTile } from '@/components/mobile/MobileStatTile';
import { MobileListItem } from '@/components/mobile/MobileListItem';

/**
 * Preview pública de componentes mobile.
 * Equivalente a mobile-preview.vue en daas.
 * Sin auth, sin dependencias externas — data mockeada.
 */
export default function MobilePreviewPage() {
  const mockStats = {
    totalUsers: 128,
    newRegistrations: 12,
    totalGroups: 34,
    alertsCount: 3,
  };

  const mockModules = [
    {
      key: 'discipleship',
      title: 'Discipulado',
      subtitle: 'Grupos y multiplicación',
      to: '/dashboard/discipleship',
    },
    { key: 'users', title: 'Miembros', subtitle: 'Gestión de miembros', to: '/dashboard/users' },
    { key: 'zones', title: 'Zonas', subtitle: 'Mapa de zonas', to: '/dashboard/zones' },
    {
      key: 'events',
      title: 'Eventos',
      subtitle: 'Calendario',
      to: '/dashboard/events',
      badge: '3',
    },
  ];

  const mockActions = [
    {
      label: 'Miembros',
      icon: <Users className="w-5 h-5" />,
      to: '/dashboard/users',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Grupos',
      icon: <BarChart3 className="w-5 h-5" />,
      to: '/dashboard/discipleship',
      color: 'from-emerald-500 to-green-500',
    },
    {
      label: 'Zonas',
      icon: <MapPin className="w-5 h-5" />,
      to: '/dashboard/zones',
      color: 'from-violet-500 to-purple-500',
    },
    {
      label: 'Nuevo',
      icon: <UserPlus className="w-5 h-5" />,
      to: '/dashboard/register-user',
      color: 'from-orange-500 to-amber-500',
    },
  ];

  const mockActivity = [
    {
      id: '1',
      action: 'Nuevo miembro registrado',
      user: 'Admin',
      time: '2 min',
      type: 'success' as const,
    },
    {
      id: '2',
      action: 'Grupo multiplicado',
      user: 'Pastor Juan',
      time: '1 h',
      type: 'warning' as const,
    },
    { id: '3', action: 'Alerta de zona', user: 'Sistema', time: '3 h', type: 'danger' as const },
  ];

  const mockDiscActivities = [
    {
      id: 'd1',
      title: 'Grupo "G12 Norte" se multiplicó',
      description: 'Nuevo grupo creado con 8 miembros',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      color: 'bg-emerald-500',
    },
    {
      id: 'd2',
      title: 'Reporte de Pastor Marcos',
      description: 'Entregó reporte de 12 discípulos',
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      color: 'bg-blue-500',
    },
    {
      id: 'd3',
      title: 'Alerta: grupo sin reuniones',
      description: 'Grupo "Jóvenes Oeste" no reporta desde hace 15 días',
      timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
      color: 'bg-red-500',
    },
  ];

  const discStats = {
    totalGroups: 34,
    totalMembers: 312,
    multiplications: 8,
    alertsCount: 2,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ════════════════════════════════════════════════════════
         SECTION 1 — Primitive Components
      ════════════════════════════════════════════════════════ */}
      <div className="max-w-md mx-auto border-x border-border min-h-screen">
        <MobileScreen title="Dashboard — Light variant" subtitle="Subtítulo opcional">
          {/* StatTile showcase */}
          <MobileSectionHeader title="MobileStatTile — Variantes" />
          <div className="flex gap-2 px-4 pb-4 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <MobileStatTile label="Default" value={100} />
            <MobileStatTile label="Loading" value={0} loading />
            <MobileStatTile label="Alert" value={3} alert />
            <MobileStatTile
              label="Con icono"
              value="$1.2k"
              icon={<DollarSign className="w-4 h-4" />}
              tone="primary"
            />
            <MobileStatTile label="Success" value={99} tone="success" />
            <MobileStatTile label="Warning" value={7} tone="warning" />
            <MobileStatTile label="Danger" value={1} tone="danger" />
          </div>

          {/* ListItem with accent */}
          <MobileSectionHeader title="MobileListItem — Acents" />
          <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
            <MobileListItem title="Item normal" subtitle="Sin accent bar" />
            <MobileListItem title="Accent primary" subtitle="Severidad primary" accent="primary" />
            <MobileListItem title="Accent success" subtitle="Severidad success" accent="success" />
            <MobileListItem title="Accent warning" subtitle="Severidad warning" accent="warning" />
            <MobileListItem title="Accent danger" subtitle="Severidad danger" accent="danger" />
          </div>

          {/* SectionHeader with to */}
          <MobileSectionHeader title="SectionHeader con link" to="/test" />
          <MobileSectionHeader
            title="SectionHeader custom action"
            action={<Bell className="w-4 h-4" />}
          />
        </MobileScreen>

        {/* ════════════════════════════════════════════════════════
           SECTION 2 — Brand variant
        ════════════════════════════════════════════════════════ */}
        <MobileScreen title="Brand variant" variant="brand" subtitle="Header primary">
          <div className="px-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Header con bg-primary, texto blanco. Ideal para home/hero screens.
            </p>
          </div>
        </MobileScreen>

        {/* ════════════════════════════════════════════════════════
           SECTION 3 — Dashboard
        ════════════════════════════════════════════════════════ */}
        <MobileDashboardScreen
          firstName="Preview"
          roleLabel="Admin · Vista previa"
          stats={mockStats}
          actions={mockActions}
          modules={mockModules}
          activity={mockActivity}
          loading={false}
          onNavigate={() => {}}
          onActivityClick={() => {}}
        />

        {/* ════════════════════════════════════════════════════════
           SECTION 4 — Discipleship Overview
        ════════════════════════════════════════════════════════ */}
        <MobileScreen title="Discipulado — Overview">
          <MobileDiscipleshipOverview
            firstName="Preview"
            stats={discStats}
            statsLoading={false}
            activities={mockDiscActivities}
            activityLoading={false}
            canManageGroups
            onGoToTab={() => {}}
          />
        </MobileScreen>

        {/* ════════════════════════════════════════════════════════
           SECTION 5 — Empty / Loading states
        ════════════════════════════════════════════════════════ */}
        <MobileScreen title="Loading states">
          <MobileSectionHeader title="StatTiles cargando" />
          <div className="flex gap-2 px-4 pb-4 overflow-x-auto snap-x">
            <MobileStatTile label="Grupos" value={0} loading />
            <MobileStatTile label="Miembros" value={0} loading />
            <MobileStatTile label="Alertas" value={0} loading />
          </div>

          <MobileSectionHeader title="Sin actividad" />
          <MobileDiscipleshipOverview
            firstName="Preview"
            stats={{ totalGroups: 0, totalMembers: 0, multiplications: 0, alertsCount: 0 }}
            statsLoading={false}
            activities={[]}
            activityLoading={false}
            canManageGroups={false}
            onGoToTab={() => {}}
          />
        </MobileScreen>
      </div>
    </div>
  );
}
