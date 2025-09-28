# Estrategia de Pruebas - Proyecto Sion

## Visión General de Testing

### Pirámide de Pruebas

<lov-mermaid>
graph TD
    A[Pruebas Unitarias - 70%] --> B[Pruebas de Integración - 20%]
    B --> C[Pruebas E2E - 10%]
    
    A --> D[Componentes UI]
    A --> E[Servicios]
    A --> F[Hooks]
    A --> G[Utilidades]
    
    B --> H[Endpoints API]
    B --> I[Operaciones BD]
    B --> J[Flujo Autenticación]
    
    C --> K[Jornadas Usuario]
    C --> L[Flujos Críticos]
    C --> M[Testing Cross-browser]
</lov-mermaid>

## Configuración de Pruebas

### Stack de Testing
- **Jest**: Framework de pruebas principal
- **React Testing Library**: Testing de componentes React
- **MSW (Mock Service Worker)**: Simulación de APIs
- **Playwright**: Pruebas E2E
- **Supabase Test Client**: Testing de base de datos

### Configuración Jest
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Pruebas Unitarias

### 1. Testing de Componentes UI

#### Componente Button (✅ Implementado)
```typescript
// src/__tests__/components/ui/Button.test.tsx
describe('Componente Button', () => {
  test('renderiza con clases de variante correctas');
  test('maneja eventos de click apropiadamente');
  test('aplica clases de tamaño correctamente');
  test('respeta el estado deshabilitado');
});
```

#### Componente Header (✅ Implementado)
```typescript
// src/__tests__/components/Header.test.tsx
describe('Componente Header', () => {
  test('muestra enlaces de navegación');
  test('muestra imagen del logo');
  test('renderiza toggle de tema');
  test('se adapta al estado de autenticación');
});
```

#### Componentes Pendientes
```typescript
// src/__tests__/components/RegistrationModal.test.tsx
describe('Modal de Registro', () => {
  test('valida campos del formulario correctamente');
  test('envía formulario con datos correctos');
  test('muestra mensajes de error');
  test('maneja estados de carga');
});

// src/__tests__/components/EditUserModal.test.tsx
describe('Modal de Editar Usuario', () => {
  test('pre-llena formulario con datos del usuario');
  test('valida información actualizada');
  test('llama API de actualización correctamente');
});
```

### 2. Testing de Hooks

#### Hook useAuth (✅ Implementado)
```typescript
// src/__tests__/hooks/useAuth.test.tsx
describe('Hook useAuth', () => {
  test('inicializa con usuario nulo');
  test('maneja login exitoso');
  test('maneja login fallido');
  test('mantiene estado de sesión');
});
```

#### Hooks Pendientes
```typescript
// src/__tests__/hooks/useDashboardStats.test.ts
describe('Hook useDashboardStats', () => {
  test('obtiene datos del dashboard al montar');
  test('maneja estados de carga');
  test('procesa respuestas de error');
  test('refresca datos en intervalo');
});

// src/__tests__/hooks/useDiscipleshipAnalytics.test.ts
describe('Hook useDiscipleshipAnalytics', () => {
  test('carga todos los datos de discipulado');
  test('filtra por rango de fechas');
  test('maneja filtrado por zona');
  test('recarga datos bajo demanda');
});
```

### 3. Testing de Servicios

#### UserService (✅ Implementado)
```typescript
// src/__tests__/services/user.service.test.ts
describe('UserService', () => {
  test('obtiene todos los usuarios exitosamente');
  test('crea nuevo usuario');
  test('actualiza usuario existente');
  test('maneja errores de base de datos');
});
```

#### Servicios Pendientes
```typescript
// src/__tests__/services/discipleship-analytics.service.test.ts
describe('Servicio DiscipleshipAnalytics', () => {
  test('calcula estadísticas de grupos');
  test('genera datos de rendimiento por zona');
  test('rastrea métricas de multiplicación');
  test('crea tendencias semanales');
});

// src/__tests__/services/dashboard.service.test.ts
describe('Servicio Dashboard', () => {
  test('agrega estadísticas del dashboard');
  test('maneja filtrado por rango de fechas');
  test('procesa datos basados en roles');
});
```

### 4. Testing de Utilidades

#### Utilidades de Permisos (✅ Implementado)
```typescript
// src/__tests__/utils/permissions.test.ts
describe('Utilidades de Permisos', () => {
  test('valida permisos basados en roles');
  test('verifica derechos de acceso a rutas');
  test('maneja permisos inválidos');
});
```

#### Utilidades Pendientes
```typescript
// src/__tests__/lib/validations.test.ts
describe('Utilidades de Validación', () => {
  test('valida esquemas de entrada de usuario');
  test('sanitiza datos de formulario');
  test('maneja errores de validación');
});

// src/__tests__/lib/formatters.test.ts
describe('Utilidades de Formato', () => {
  test('formatea fechas correctamente');
  test('procesa datos numéricos');
  test('maneja localización');
});
```

## Pruebas de Integración

### 1. Flujo de Autenticación
```typescript
// src/__tests__/integration/auth.test.tsx
describe('Integración de Autenticación', () => {
  test('flujo completo de registro');
  test('login con credenciales válidas');
  test('logout y limpieza de sesión');
  test('redirección de rutas protegidas');
  test('control de acceso basado en roles');
});
```

### 2. Gestión de Usuarios
```typescript
// src/__tests__/integration/user-management.test.tsx
describe('Integración de Gestión de Usuarios', () => {
  test('crear usuario end-to-end');
  test('editar usuario con cambios de rol');
  test('generación de log de auditoría');
  test('actualizaciones en cascada de permisos');
});
```

### 3. Módulo de Discipulado
```typescript
// src/__tests__/integration/discipleship.test.tsx
describe('Integración de Discipulado', () => {
  test('flujo de trabajo de creación de grupo');
  test('proceso de envío de métricas');
  test('pipeline de generación de reportes');
  test('validación de jerarquía');
});
```

## Pruebas E2E (End-to-End)

### 1. Jornadas Críticas de Usuario
```typescript
// e2e/tests/critical-flows.spec.ts
describe('Jornadas Críticas de Usuario', () => {
  test('admin crea y gestiona usuarios');
  test('líder envía métricas semanales');
  test('supervisor revisa reportes');
  test('pastor accede al panel de análisis');
});
```

### 2. Compatibilidad Cross-Browser
```typescript
// e2e/tests/cross-browser.spec.ts
describe('Testing Cross-Browser', () => {
  test('funcionalidad en Chrome');
  test('funcionalidad en Firefox');
  test('funcionalidad en Safari');
  test('comportamiento responsivo móvil');
});
```

## Estrategia de Mocking

### 1. Mocking de API con MSW
```typescript
// src/mocks/handlers.ts
export const handlers = [
  rest.get('/api/users', (req, res, ctx) => {
    return res(ctx.json(mockUsers));
  }),
  
  rest.post('/api/users', (req, res, ctx) => {
    return res(ctx.json({ success: true }));
  }),
  
  rest.get('/api/discipleship/analytics', (req, res, ctx) => {
    return res(ctx.json(mockAnalytics));
  }),
];
```

### 2. Mocking de Supabase
```typescript
// src/mocks/supabase.ts
export const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockResolvedValue({ data: [], error: null }),
    insert: jest.fn().mockResolvedValue({ data: [], error: null }),
    update: jest.fn().mockResolvedValue({ data: [], error: null }),
    delete: jest.fn().mockResolvedValue({ data: [], error: null }),
  })),
  auth: {
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
    getSession: jest.fn(),
  },
};
```

## Gestión de Datos de Prueba

### 1. Funciones Factory
```typescript
// src/test-utils/factories.ts
export const crearUsuario = (overrides?: Partial<User>): User => ({
  id: '1',
  first_name: 'Prueba',
  last_name: 'Usuario',
  full_name: 'Prueba Usuario',
  email: 'prueba@ejemplo.com',
  role: 'server',
  phone: '1234567890',
  id_number: '12345678',
  address: 'Dirección de Prueba',
  is_active: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
});

export const crearGrupoDiscipulado = (overrides?: Partial<DiscipleshipGroup>): DiscipleshipGroup => ({
  id: '1',
  group_name: 'Grupo de Prueba',
  leader_id: '1',
  zone_name: 'Zona de Prueba',
  member_count: 10,
  active_members: 8,
  status: 'active',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
});
```

### 2. Utilidades de Prueba
```typescript
// src/test-utils/render.tsx
export const renderizarConProveedores = (
  ui: React.ReactElement,
  opciones?: {
    estadoInicial?: Partial<AuthState>;
    ruta?: string;
  }
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialState={opciones?.estadoInicial}>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...opciones });
};
```

## Objetivos de Cobertura

### Por Módulo
| Módulo | Objetivo Cobertura | Estado |
|--------|-------------------|--------|
| **Componentes** | 85% | 🟡 En Progreso |
| **Hooks** | 90% | 🟡 En Progreso |
| **Servicios** | 95% | 🟡 En Progreso |
| **Utilidades** | 95% | 🟡 En Progreso |
| **Integración** | 80% | ❌ Pendiente |
| **E2E** | Flujos Críticos | ❌ Pendiente |

### Métricas de Calidad
- **Cobertura de Líneas**: > 80%
- **Cobertura de Ramas**: > 80%
- **Cobertura de Funciones**: > 85%
- **Cobertura de Declaraciones**: > 80%

## Automatización y CI/CD

### 1. Flujo de GitHub Actions
```yaml
# .github/workflows/test.yml
name: Suite de Pruebas

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Instalar dependencias
        run: pnpm install
      
      - name: Ejecutar pruebas unitarias
        run: pnpm test:unit --coverage
      
      - name: Ejecutar pruebas de integración
        run: pnpm test:integration
      
      - name: Ejecutar pruebas E2E
        run: pnpm test:e2e
      
      - name: Subir cobertura
        uses: codecov/codecov-action@v3
```

### 2. Hooks Pre-commit
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "pnpm test:unit"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "jest --findRelatedTests"
    ]
  }
}
```

## Testing de Rendimiento

### 1. Pruebas de Carga
```typescript
// src/__tests__/performance/load.test.ts
describe('Pruebas de Rendimiento', () => {
  test('dashboard carga en menos de 3 segundos');
  test('lista de usuarios maneja 1000+ registros');
  test('cálculos de análisis se completan rápidamente');
});
```

### 2. Detección de Memory Leaks
```typescript
// src/__tests__/performance/memory.test.ts
describe('Pruebas de Memoria', () => {
  test('no hay memory leaks en navegación de usuario');
  test('limpieza apropiada de suscripciones');
  test('uso eficiente de estructuras de datos');
});
```

## Cronograma de Implementación

<lov-mermaid>
gantt
    title Cronograma de Implementación de Testing
    dateFormat  YYYY-MM-DD
    section Pruebas Unitarias
    Componentes Core          :done, comp1, 2024-01-01, 2024-01-07
    Implementación Hooks     :active, hooks1, 2024-01-08, 2024-01-14
    Testing Servicios         :services1, after hooks1, 7d
    Testing Utilidades       :utils1, after services1, 5d
    
    section Pruebas Integración
    Integración Auth        :auth1, after utils1, 5d
    Gestión Usuarios        :user1, after auth1, 7d
    Módulo Discipulado     :disc1, after user1, 10d
    
    section Pruebas E2E
    Flujos Críticos          :e2e1, after disc1, 14d
    Cross-browser          :browser1, after e2e1, 7d
    
    section Setup y Automatización
    Pipeline CI/CD         :ci1, 2024-01-08, 2024-01-15
    Pruebas Rendimiento    :perf1, after browser1, 7d
</lov-mermaid>

## Mejores Prácticas

### 1. Organización de Pruebas
- Organizar pruebas por funcionalidad, no por tipo
- Usar nombres descriptivos para casos de prueba
- Agrupar pruebas relacionadas en bloques describe
- Mantener pruebas independientes entre sí

### 2. Guías de Escritura de Pruebas
- Seguir patrón AAA (Arrange, Act, Assert)
- Una prueba, una responsabilidad
- Usar datos de prueba realistas
- Mockear solo dependencias externas

### 3. Mantenimiento de Pruebas
- Actualizar pruebas junto con código
- Refactorizar pruebas duplicadas
- Revisar cobertura regularmente
- Eliminar pruebas obsoletas

## Herramientas de Debugging

### 1. Debugging de Pruebas
```typescript
// src/test-utils/debug.ts
export const debugComponente = (component: ReactWrapper) => {
  console.log(component.debug());
  console.log('Props:', component.props());
  console.log('State:', component.state());
};
```

### 2. Testing Visual
```typescript
// Integración con Storybook para pruebas de regresión visual
export default {
  title: 'Componentes/Button',
  component: Button,
  parameters: {
    chromatic: { disableSnapshot: false },
  },
};
```

## Métricas y Reportes

### 1. Reportes de Cobertura
- Reportes HTML para análisis detallado
- Reportes JSON para integración CI/CD
- Badge de cobertura en README

### 2. Dashboard de Resultados de Pruebas
- Tiempo de ejecución por suite de pruebas
- Historial de fallos
- Tendencias de cobertura
- Métricas de rendimiento

Esta estrategia de pruebas asegura calidad, mantenibilidad y confianza en el código del Proyecto Sion.