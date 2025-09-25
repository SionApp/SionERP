# MÓDULO DE DISCIPULADO - ARQUITECTURA Y ESPECIFICACIONES

## 1. VISIÓN GENERAL

El módulo de discipulado es un sistema jerárquico de 5 niveles que permite el seguimiento, reporte y gestión de células de discipulado en la iglesia. Cada nivel tiene responsabilidades específicas y formularios diferenciados.

## 2. JERARQUÍA DE ROLES

### Nivel 1: Líder de Grupo
- **Responsabilidad**: Dirigir célula de discipulado semanal
- **Reporta a**: Supervisor Auxiliar
- **Formulario Semanal**:
  - Asistencia (miembros + visitantes)
  - Testimonios y experiencias
  - Necesidades de oración
  - Ambiente espiritual del grupo
  - Seguimiento a nuevos visitantes

### Nivel 2: Supervisor Auxiliar  
- **Responsabilidad**: Supervisar 3-5 grupos de líderes
- **Reporta a**: Supervisor General
- **Reporte Quincenal**:
  - Consolidación de grupos bajo supervisión
  - Casos que requieren atención pastoral
  - Estadísticas de crecimiento
  - Líderes que necesitan apoyo

### Nivel 3: Supervisor General
- **Responsabilidad**: Gestionar zona geográfica (10-15 grupos)
- **Reporta a**: Coordinador
- **Reporte Mensual**:
  - Análisis de zona completa
  - Planes de multiplicación de grupos
  - Identificación de nuevos líderes
  - Estrategias de crecimiento zonal

### Nivel 4: Coordinador
- **Responsabilidad**: Estrategia general del ministerio
- **Reporta a**: Pastor
- **Reporte Trimestral**:
  - Metas anuales y progreso
  - Análisis de tendencias generales
  - Propuestas de nuevas estrategias
  - Capacitación y desarrollo de liderazgo

### Nivel 5: Pastor
- **Responsabilidad**: Visión y dirección pastoral
- **Dashboard Ejecutivo**:
  - Métricas generales del ministerio
  - Indicadores de salud espiritual
  - Decisiones estratégicas
  - Aprobación de iniciativas

## 3. ARQUITECTURA DE BASE DE DATOS

### 3.1 Tablas Core (Siempre necesarias)

```sql
-- Ya existe, solo refinamos
users 
  ├─ Campos básicos: id, email, first_name, last_name, phone, role
  ├─ Campos iglesia: baptized, baptism_date, is_active_member
  ├─ discipleship_level (1-5) - Nuevo campo para jerarquía
  └─ active_groups_count - Para supervisores

-- Nueva tabla para extensiones modulares
user_profiles
  ├─ user_id (FK)
  ├─ module_name (enum: 'discipleship', 'events', 'finance')
  ├─ profile_data (JSONB) - campos específicos del módulo
  └─ Permite múltiples perfiles por usuario
```

### 3.2 Tablas Específicas del Módulo de Discipulado

```sql
discipleship_hierarchy
  ├─ id, user_id, hierarchy_level (1-5)
  ├─ supervisor_id (self-referential)
  ├─ zone_name, territory
  ├─ active_groups_assigned
  └─ created_at, updated_at

discipleship_groups
  ├─ id, group_name, leader_id
  ├─ supervisor_id (nivel 2)
  ├─ meeting_location, meeting_day, meeting_time
  ├─ member_count, active_members
  ├─ status (active/inactive/multiplying)
  └─ zone_id

discipleship_reports
  ├─ id, reporter_id, supervisor_id
  ├─ report_level (1-5), report_type
  ├─ period_start, period_end
  ├─ report_data (JSONB) - campos específicos por nivel
  ├─ status (draft/submitted/approved/needs_attention)
  └─ submitted_at, approved_at

discipleship_metrics
  ├─ id, group_id, week_date
  ├─ attendance, new_visitors, returning_visitors
  ├─ testimonies_count, prayer_requests
  ├─ spiritual_temperature (1-10)
  └─ leader_notes
```

## 4. SISTEMA DE MOCKS

### 4.1 Estructura de Archivos
```
src/mocks/discipleship/
├── data/
│   ├── users.mock.ts           # 50+ usuarios de prueba
│   ├── groups.mock.ts          # 30+ grupos diversos
│   ├── reports.mock.ts         # Reportes históricos
│   ├── metrics.mock.ts         # Métricas semanales
│   └── hierarchy.mock.ts       # Estructura jerárquica
├── services/
│   ├── auth.service.mock.ts    # Autenticación simulada
│   ├── groups.service.mock.ts  # CRUD de grupos
│   ├── reports.service.mock.ts # Gestión de reportes
│   └── metrics.service.mock.ts # Estadísticas y métricas
├── types/
│   ├── hierarchy.types.ts      # Tipos de jerarquía
│   ├── reports.types.ts        # Tipos de reportes
│   └── metrics.types.ts        # Tipos de métricas
└── utils/
    ├── permissions.ts          # Lógica de permisos
    ├── filters.ts              # Filtros de datos
    └── calculations.ts         # Cálculos estadísticos
```

### 4.2 Datos Mock Realistas

**Usuarios de Prueba por Nivel**:
- Pastor: 1 usuario (acceso total)
- Coordinadores: 2 usuarios (estrategia general)
- Supervisores Generales: 4 usuarios (zonas geográficas)
- Supervisores Auxiliares: 12 usuarios (grupos pequeños)
- Líderes: 30+ usuarios (células individuales)

**Grupos de Discipulado**:
- 30+ grupos distribuidos en 4 zonas
- Datos históricos de 6 meses
- Métricas realistas de crecimiento
- Estados variados (creciendo, estable, necesita atención)

## 5. FORMULARIOS POR NIVEL

### Nivel 1: Líder - Reporte Semanal
```typescript
interface WeeklyLeaderReport {
  groupId: string;
  weekDate: Date;
  attendance: {
    members: number;
    newVisitors: number;
    returningVisitors: number;
  };
  spiritualHealth: {
    testimonies: number;
    prayerRequests: string[];
    spiritualTemperature: 1-10;
    groupMorale: 'excellent' | 'good' | 'fair' | 'needs_attention';
  };
  followUp: {
    visitorsContacted: number;
    membersCared: string[];
    upcomingEvents: string[];
  };
  concerns: string[];
  blessings: string[];
}
```

### Nivel 2: Supervisor Auxiliar - Reporte Quincenal
```typescript
interface BiweeklyAuxiliaryReport {
  supervisorId: string;
  periodStart: Date;
  periodEnd: Date;
  groupsOverview: {
    totalGroups: number;
    healthyGroups: number;
    groupsNeedingAttention: string[];
    newGroupsStarted: number;
  };
  leaderDevelopment: {
    trainingSessions: number;
    leadersNeedingSupport: string[];
    potentialNewLeaders: string[];
  };
  zoneMetrics: {
    totalAttendance: number;
    growthPercentage: number;
    newConversions: number;
  };
}
```

### Nivel 3: Supervisor General - Reporte Mensual
```typescript
interface MonthlyGeneralReport {
  supervisorId: string;
  zoneName: string;
  month: Date;
  zoneStatistics: {
    totalGroups: number;
    totalMembers: number;
    monthlyGrowth: number;
    multiplicationPlans: string[];
  };
  leadershipPipeline: {
    auxiliarySupervisors: number;
    trainingSupervisors: number;
    leadershipGaps: string[];
  };
  strategicInitiatives: {
    newGroupLocations: string[];
    communityOutreach: string[];
    specialEvents: string[];
  };
}
```

### Nivel 4: Coordinador - Reporte Trimestral
```typescript
interface QuarterlyCoordinatorReport {
  coordinatorId: string;
  quarter: number;
  year: number;
  ministryOverview: {
    totalZones: number;
    totalGroups: number;
    totalMembers: number;
    quarterlyGrowth: number;
  };
  strategicGoals: {
    annualTargets: Goals[];
    quarterProgress: number;
    adjustmentNeeded: boolean;
  };
  systemHealth: {
    leadershipStrength: 1-10;
    systemEfficiency: 1-10;
    memberSatisfaction: 1-10;
  };
}
```

### Nivel 5: Pastor - Dashboard Ejecutivo
```typescript
interface PastoralDashboard {
  timeframe: 'week' | 'month' | 'quarter' | 'year';
  keyMetrics: {
    totalGroups: number;
    totalMembers: number;
    growthRate: number;
    healthIndex: 1-10;
  };
  alerts: Alert[];
  approvalQueue: ApprovalItem[];
  strategicDecisions: Decision[];
}
```

## 6. FLUJO DE IMPLEMENTACIÓN

### Fase 1: Base de Datos y Usuarios
1. Migración de tablas core
2. Creación de usuarios de prueba
3. Configuración de jerarquía inicial

### Fase 2: Sistema Mock
1. Crear toda la estructura de mocks
2. Implementar servicios simulados
3. Datos realistas y consistentes

### Fase 3: Interfaces por Nivel
1. Dashboard pastoral (nivel 5)
2. Interfaz coordinador (nivel 4)
3. Supervisor general (nivel 3)
4. Supervisor auxiliar (nivel 2)
5. Líder de grupo (nivel 1)

### Fase 4: Reportes y Análisis
1. Gráficas y estadísticas
2. Sistema de alertas
3. Exportación de reportes
4. Flujo de aprobaciones

## 7. MÉTRICAS Y KPIs

### Métricas por Nivel
- **Líder**: Asistencia, visitantes, testimonios
- **Supervisor Auxiliar**: Crecimiento grupal, salud líderes
- **Supervisor General**: Multiplicación, desarrollo zonal
- **Coordinador**: Objetivos anuales, eficiencia sistema
- **Pastor**: ROI ministerial, salud general

### Dashboards Visuales
- Gráficas de crecimiento temporal
- Mapas de calor por zonas
- Indicadores de salud espiritual
- Embudo de conversión y retención
- Proyecciones y tendencias

## 8. CONSIDERACIONES TÉCNICAS

### Autenticación y Roles
- Integración con sistema actual de usuarios
- Permisos granulares por nivel
- Escalación automática de reportes

### Performance
- Datos mock optimizados
- Lazy loading de componentes
- Cacheo inteligente de métricas

### Responsive Design
- Mobile-first para líderes de campo
- Tablets para supervisores
- Desktop para coordinación y pastoral

## 9. ROADMAP DE TRANSICIÓN

### Fase Mock (Actual)
- Sistema completamente funcional con datos simulados
- Feedback de usuarios reales
- Refinamiento de UX/UI

### Fase Híbrida
- Migración gradual a backend real
- Mantenimiento de funcionalidad mock como fallback
- Testing A/B entre sistemas

### Fase Real
- Backend completo implementado
- Datos reales migrados
- Sistema mock como herramienta de desarrollo

Este documento será la guía maestra para todo el desarrollo del módulo de discipulado.