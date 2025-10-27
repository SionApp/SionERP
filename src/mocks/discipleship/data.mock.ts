import { User } from '@/types/user.types';
import {
  DiscipleshipHierarchy,
  DiscipleshipGroup,
  DiscipleshipMetrics,
  WeeklyLeaderReport,
  BiweeklyAuxiliaryReport,
  MonthlyGeneralReport,
  QuarterlyCoordinatorReport,
  ZonePerformance,
  LeaderPerformance,
  ChartData,
  TimeSeriesData,
  Alert,
  Goal,
} from '@/types/discipleship.types';

// Mock users for discipleship hierarchy - extended from real DB users
export const mockDiscipleshipUsers: User[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    first_name: 'David',
    last_name: 'Martínez',
    full_name: 'David Martínez',
    email: 'pastor@sion.church',
    phone: '+1234567890',
    address: 'Calle Principal 123',
    id_number: '12345678',
    role: 'pastor',
    is_active_member: true,
    is_active: true,
    whatsapp: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  // Add more mock users as needed for testing
];

export const mockGroups: DiscipleshipGroup[] = [
  {
    id: 'group-001',
    group_name: 'Célula Esperanza',
    leader_id: 'leader-001',
    supervisor_id: '00000000-0000-0000-0000-000000000008',
    meeting_location: 'Casa de María - Colonia Centro',
    meeting_address: 'Av. Bolívar Norte #45, Sector La Paz',
    latitude: 10.2547,
    longitude: -67.5926,
    meeting_day: 'Miércoles',
    meeting_time: '19:00',
    member_count: 12,
    active_members: 10,
    status: 'active',
    zone_name: 'Zona Norte',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z',
  },
  {
    id: 'group-002',
    group_name: 'Juventud Victoriosa',
    leader_id: 'leader-002',
    supervisor_id: '00000000-0000-0000-0000-000000000008',
    meeting_location: 'Centro Comunitario Norte',
    meeting_address: 'Calle Miranda #78, Centro Norte',
    latitude: 10.2612,
    longitude: -67.5889,
    meeting_day: 'Viernes',
    meeting_time: '18:30',
    member_count: 18,
    active_members: 15,
    status: 'multiplying',
    zone_name: 'Zona Norte',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z',
  },
  {
    id: 'group-003',
    group_name: 'Familia en Cristo',
    leader_id: 'leader-003',
    supervisor_id: '00000000-0000-0000-0000-000000000009',
    meeting_location: 'Parque Residencial',
    meeting_address: 'Urbanización Parque Residencial #23',
    latitude: 10.2489,
    longitude: -67.5945,
    meeting_day: 'Sábado',
    meeting_time: '16:00',
    member_count: 8,
    active_members: 7,
    status: 'active',
    zone_name: 'Zona Norte',
    created_at: '2024-03-10T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z',
  },
  {
    id: 'group-004',
    group_name: 'Guerreros de Fe',
    leader_id: 'leader-004',
    supervisor_id: '00000000-0000-0000-0000-000000000012',
    meeting_location: 'Casa de Oración Sur',
    meeting_address: 'Av. Sur #156, Las Delicias',
    latitude: 10.2145,
    longitude: -67.5934,
    meeting_day: 'Martes',
    meeting_time: '19:30',
    member_count: 14,
    active_members: 12,
    status: 'active',
    zone_name: 'Zona Sur',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z',
  },
  {
    id: 'group-005',
    group_name: 'Nueva Vida',
    leader_id: 'leader-005',
    supervisor_id: '00000000-0000-0000-0000-000000000012',
    meeting_location: 'Salon Comunal Sur',
    meeting_address: 'Calle Principal #89, El Limón',
    latitude: 10.2089,
    longitude: -67.5812,
    meeting_day: 'Jueves',
    meeting_time: '18:00',
    member_count: 6,
    active_members: 4,
    status: 'inactive',
    zone_name: 'Zona Sur',
    created_at: '2024-04-05T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z',
  },
];

export const mockHierarchy: DiscipleshipHierarchy[] = [
  {
    id: 'hier-001',
    user_id: '00000000-0000-0000-0000-000000000001',
    hierarchy_level: 5,
    zone_name: 'Toda la Ciudad',
    active_groups_assigned: 30,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z',
  },
  {
    id: 'hier-002',
    user_id: '00000000-0000-0000-0000-000000000002',
    hierarchy_level: 4,
    supervisor_id: '00000000-0000-0000-0000-000000000001',
    zone_name: 'Zona Norte',
    active_groups_assigned: 15,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z',
  },
  {
    id: 'hier-003',
    user_id: '00000000-0000-0000-0000-000000000003',
    hierarchy_level: 4,
    supervisor_id: '00000000-0000-0000-0000-000000000001',
    zone_name: 'Zona Sur',
    active_groups_assigned: 15,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z',
  },
];

export const mockMetrics: DiscipleshipMetrics[] = [
  {
    id: 'metric-001',
    group_id: 'group-001',
    week_date: '2024-09-15',
    attendance: 10,
    new_visitors: 2,
    returning_visitors: 1,
    testimonies_count: 3,
    prayer_requests: 5,
    spiritual_temperature: 8,
    leader_notes:
      'Excelente ambiente de adoración. Dos personas expresaron interés en el bautismo.',
    created_at: '2024-09-15T20:00:00Z',
    updated_at: '2024-09-15T20:00:00Z',
  },
  {
    id: 'metric-002',
    group_id: 'group-002',
    week_date: '2024-09-13',
    attendance: 15,
    new_visitors: 3,
    returning_visitors: 2,
    testimonies_count: 4,
    prayer_requests: 7,
    spiritual_temperature: 9,
    leader_notes: 'Grupo muy activo. Planeando multiplicación para octubre.',
    created_at: '2024-09-13T19:30:00Z',
    updated_at: '2024-09-13T19:30:00Z',
  },
];

// Mock reports data
export const mockWeeklyReports: WeeklyLeaderReport[] = [
  {
    groupId: 'group-001',
    weekDate: '2024-09-15',
    attendance: {
      members: 10,
      newVisitors: 2,
      returningVisitors: 1,
    },
    spiritualHealth: {
      testimonies: 3,
      prayerRequests: ['Sanidad para María', 'Trabajo para Juan', 'Salvación familia López'],
      spiritualTemperature: 8,
      groupMorale: 'excellent',
    },
    followUp: {
      visitorsContacted: 2,
      membersCared: ['Ana (enfermedad)', 'Pedro (problema familiar)'],
      upcomingEvents: ['Retiro juvenil - Oct 15', 'Evangelismo barrial - Oct 22'],
    },
    concerns: ['Necesitamos más sillas', 'Algunos jóvenes llegando tarde'],
    blessings: [
      'Dos sanidades instantáneas',
      'Nueva familia comprometida',
      'Ofrenda especial para misiones',
    ],
  },
];

// Performance data for charts
export const mockZonePerformance: ZonePerformance[] = [
  {
    zoneName: 'Zona Norte',
    totalGroups: 15,
    totalMembers: 180,
    growthRate: 12.5,
    healthScore: 8.2,
    supervisor: 'María González',
  },
  {
    zoneName: 'Zona Sur',
    totalGroups: 12,
    totalMembers: 144,
    growthRate: 8.3,
    healthScore: 7.8,
    supervisor: 'Carlos Rodríguez',
  },
  {
    zoneName: 'Zona Este',
    totalGroups: 8,
    totalMembers: 96,
    growthRate: 15.7,
    healthScore: 8.9,
    supervisor: 'Ana López',
  },
  {
    zoneName: 'Zona Oeste',
    totalGroups: 10,
    totalMembers: 120,
    growthRate: 6.2,
    healthScore: 7.1,
    supervisor: 'Luis Fernández',
  },
];

export const mockLeaderPerformance: LeaderPerformance[] = [
  {
    leaderId: 'leader-001',
    leaderName: 'Roberto Silva',
    groupName: 'Célula Esperanza',
    attendance: 85,
    retention: 92,
    growth: 25,
    spiritualHealth: 8.5,
    consistencyScore: 95,
  },
  {
    leaderId: 'leader-002',
    leaderName: 'Carmen Torres',
    groupName: 'Juventud Victoriosa',
    attendance: 92,
    retention: 88,
    growth: 40,
    spiritualHealth: 9.2,
    consistencyScore: 98,
  },
  {
    leaderId: 'leader-003',
    leaderName: 'Miguel Herrera',
    groupName: 'Familia en Cristo',
    attendance: 78,
    retention: 85,
    growth: 12,
    spiritualHealth: 7.8,
    consistencyScore: 87,
  },
];

// Time series data for growth charts
export const mockGrowthData: TimeSeriesData[] = [
  { date: '2024-01', value: 250, comparison: 230 },
  { date: '2024-02', value: 265, comparison: 245 },
  { date: '2024-03', value: 280, comparison: 260 },
  { date: '2024-04', value: 295, comparison: 275 },
  { date: '2024-05', value: 315, comparison: 290 },
  { date: '2024-06', value: 335, comparison: 310 },
  { date: '2024-07', value: 350, comparison: 325 },
  { date: '2024-08', value: 370, comparison: 340 },
  { date: '2024-09', value: 385, comparison: 355 },
];

export const mockAttendanceData: TimeSeriesData[] = [
  { date: 'Ene', value: 89 },
  { date: 'Feb', value: 92 },
  { date: 'Mar', value: 87 },
  { date: 'Abr', value: 95 },
  { date: 'May', value: 91 },
  { date: 'Jun', value: 88 },
  { date: 'Jul', value: 93 },
  { date: 'Ago', value: 90 },
  { date: 'Sep', value: 94 },
];

// Alerts for dashboard
export const mockAlerts: Alert[] = [
  {
    id: 'alert-001',
    type: 'critical',
    message: 'Grupo "Nueva Vida" ha tenido asistencia baja por 3 semanas consecutivas',
    actionRequired: true,
    relatedGroup: 'group-005',
    relatedLeader: 'leader-005',
    created_at: '2024-09-20T10:00:00Z',
  },
  {
    id: 'alert-002',
    type: 'warning',
    message: 'Supervisor Auxiliar Patricia Jiménez no ha enviado reporte quincenal',
    actionRequired: true,
    relatedLeader: '00000000-0000-0000-0000-000000000008',
    created_at: '2024-09-19T15:30:00Z',
  },
  {
    id: 'alert-003',
    type: 'info',
    message: 'Grupo "Juventud Victoriosa" listo para multiplicación',
    actionRequired: false,
    relatedGroup: 'group-002',
    created_at: '2024-09-18T09:00:00Z',
  },
];

// Goals for coordinators and pastor
export const mockGoals: Goal[] = [
  {
    id: 'goal-001',
    description: 'Alcanzar 50 grupos activos',
    target: 50,
    current: 35,
    deadline: '2024-12-31',
    status: 'on_track',
  },
  {
    id: 'goal-002',
    description: 'Entrenar 20 nuevos líderes',
    target: 20,
    current: 12,
    deadline: '2024-11-30',
    status: 'behind',
  },
  {
    id: 'goal-003',
    description: 'Multiplicar 8 grupos',
    target: 8,
    current: 3,
    deadline: '2024-10-31',
    status: 'critical',
  },
];

// Chart data for various dashboards
export const mockGroupStatusData: ChartData[] = [
  { name: 'Activos', value: 28, color: '#22c55e' },
  { name: 'Multiplicando', value: 4, color: '#3b82f6' },
  { name: 'Necesitan Atención', value: 3, color: '#ef4444' },
  { name: 'Inactivos', value: 1, color: '#6b7280' },
];

export const mockSpiritualHealthData: ChartData[] = [
  { name: 'Excelente (9-10)', value: 12, color: '#10b981' },
  { name: 'Bueno (7-8)', value: 18, color: '#3b82f6' },
  { name: 'Regular (5-6)', value: 5, color: '#f59e0b' },
  { name: 'Necesita Atención (1-4)', value: 1, color: '#ef4444' },
];

// Mock notifications for discipleship system
export const mockNotifications = [
  {
    id: 'notif-001',
    type: 'success' as const,
    title: '¡Nuevo Grupo Asignado!',
    message: 'Has sido asignado como líder del grupo "Célula Esperanza" en la Zona Norte.',
    actionText: 'Ver Dashboard',
    actionUrl: '/dashboard/discipleship',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    read: false,
    relatedUser: {
      name: 'Pastor David Martínez',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=David Martínez',
    },
  },
  {
    id: 'notif-002',
    type: 'info' as const,
    title: 'Zona Asignada',
    message: 'Has sido asignado a la Zona Norte. Conoce a tu supervisor María González.',
    actionText: 'Ver Zona',
    actionUrl: '/dashboard/discipleship?tab=zones',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    read: false,
    relatedUser: {
      name: 'María González',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=María González',
    },
  },
  {
    id: 'notif-003',
    type: 'warning' as const,
    title: 'Reporte Pendiente',
    message: 'Recuerda enviar tu reporte semanal antes del domingo.',
    actionText: 'Enviar Reporte',
    actionUrl: '/dashboard/discipleship?tab=dashboard',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    read: true,
  },
];
