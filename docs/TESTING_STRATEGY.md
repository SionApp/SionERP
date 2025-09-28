# Estrategia de Testing - Proyecto Sion

## Visión General de Testing

### Pirámide de Testing

<lov-mermaid>
graph TD
    A[Unit Tests - 70%] --> B[Integration Tests - 20%]
    B --> C[E2E Tests - 10%]
    
    A --> D[Componentes UI]
    A --> E[Servicios]
    A --> F[Hooks]
    A --> G[Utilidades]
    
    B --> H[API Endpoints]
    B --> I[Database Operations]
    B --> J[Authentication Flow]
    
    C --> K[User Journeys]
    C --> L[Critical Workflows]
    C --> M[Cross-browser Testing]
</lov-mermaid>

## Configuración de Testing

### Stack de Testing
- **Jest**: Framework de testing principal
- **React Testing Library**: Testing de componentes React
- **MSW (Mock Service Worker)**: Mocking de APIs
- **Playwright**: Testing E2E
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

## Tests Unitarios

### 1. Testing de Componentes UI

#### Componente Button (✅ Implementado)
```typescript
// src/__tests__/components/ui/Button.test.tsx
describe('Button Component', () => {
  test('renders with correct variant classes');
  test('handles click events properly');
  test('applies size classes correctly');
  test('respects disabled state');
});
```

#### Componente Header (✅ Implementado)
```typescript
// src/__tests__/components/Header.test.tsx
describe('Header Component', () => {
  test('displays navigation links');
  test('shows logo image');
  test('renders theme toggle');
  test('adapts to authentication state');
});
```

#### Componentes Pendientes
```typescript
// src/__tests__/components/RegistrationModal.test.tsx
describe('RegistrationModal', () => {
  test('validates form fields correctly');
  test('submits form with correct data');
  test('displays error messages');
  test('handles loading states');
});

// src/__tests__/components/EditUserModal.test.tsx
describe('EditUserModal', () => {
  test('pre-fills form with user data');
  test('validates updated information');
  test('calls update API correctly');
});
```

### 2. Testing de Hooks

#### Hook useAuth (✅ Implementado)
```typescript
// src/__tests__/hooks/useAuth.test.tsx
describe('useAuth Hook', () => {
  test('initializes with null user');
  test('handles successful login');
  test('handles failed login');
  test('maintains session state');
});
```

#### Hooks Pendientes
```typescript
// src/__tests__/hooks/useDashboardStats.test.ts
describe('useDashboardStats Hook', () => {
  test('fetches dashboard data on mount');
  test('handles loading states');
  test('processes error responses');
  test('refreshes data on interval');
});

// src/__tests__/hooks/useDiscipleshipAnalytics.test.ts
describe('useDiscipleshipAnalytics Hook', () => {
  test('loads all discipleship data');
  test('filters by date range');
  test('handles zone filtering');
  test('refetches on demand');
});
```

### 3. Testing de Servicios

#### UserService (✅ Implementado)
```typescript
// src/__tests__/services/user.service.test.ts
describe('UserService', () => {
  test('fetches all users successfully');
  test('creates new user');
  test('updates existing user');
  test('handles database errors');
});
```

#### Servicios Pendientes
```typescript
// src/__tests__/services/discipleship-analytics.service.test.ts
describe('DiscipleshipAnalyticsService', () => {
  test('calculates group statistics');
  test('generates zone performance data');
  test('tracks multiplication metrics');
  test('creates weekly trends');
});

// src/__tests__/services/dashboard.service.test.ts
describe('DashboardService', () => {
  test('aggregates dashboard statistics');
  test('handles date range filtering');
  test('processes role-based data');
});
```

### 4. Testing de Utilidades

#### Permissions Utils (✅ Implementado)
```typescript
// src/__tests__/utils/permissions.test.ts
describe('Permission Utils', () => {
  test('validates role-based permissions');
  test('checks route access rights');
  test('handles invalid permissions');
});
```

#### Utilidades Pendientes
```typescript
// src/__tests__/lib/validations.test.ts
describe('Validation Utils', () => {
  test('validates user input schemas');
  test('sanitizes form data');
  test('handles validation errors');
});

// src/__tests__/lib/formatters.test.ts
describe('Formatter Utils', () => {
  test('formats dates correctly');
  test('processes numerical data');
  test('handles localization');
});
```

## Tests de Integración

### 1. Authentication Flow
```typescript
// src/__tests__/integration/auth.test.tsx
describe('Authentication Integration', () => {
  test('complete sign-up flow');
  test('login with valid credentials');
  test('logout and session cleanup');
  test('protected route redirection');
  test('role-based access control');
});
```

### 2. User Management
```typescript
// src/__tests__/integration/user-management.test.tsx
describe('User Management Integration', () => {
  test('create user end-to-end');
  test('edit user with role changes');
  test('audit log generation');
  test('permission cascade updates');
});
```

### 3. Discipleship Module
```typescript
// src/__tests__/integration/discipleship.test.tsx
describe('Discipleship Integration', () => {
  test('group creation workflow');
  test('metrics submission process');
  test('report generation pipeline');
  test('hierarchy validation');
});
```

## Tests E2E (End-to-End)

### 1. Critical User Journeys
```typescript
// e2e/tests/critical-flows.spec.ts
describe('Critical User Journeys', () => {
  test('admin creates and manages users');
  test('leader submits weekly metrics');
  test('supervisor reviews reports');
  test('pastor accesses analytics dashboard');
});
```

### 2. Cross-Browser Compatibility
```typescript
// e2e/tests/cross-browser.spec.ts
describe('Cross-Browser Testing', () => {
  test('functionality in Chrome');
  test('functionality in Firefox');
  test('functionality in Safari');
  test('mobile responsive behavior');
});
```

## Mocking Strategy

### 1. API Mocking con MSW
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

### 2. Supabase Mocking
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

## Test Data Management

### 1. Factory Functions
```typescript
// src/test-utils/factories.ts
export const createUser = (overrides?: Partial<User>): User => ({
  id: '1',
  first_name: 'Test',
  last_name: 'User',
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'server',
  phone: '1234567890',
  id_number: '12345678',
  address: 'Test Address',
  is_active: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
});

export const createDiscipleshipGroup = (overrides?: Partial<DiscipleshipGroup>): DiscipleshipGroup => ({
  id: '1',
  group_name: 'Test Group',
  leader_id: '1',
  zone_name: 'Test Zone',
  member_count: 10,
  active_members: 8,
  status: 'active',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
});
```

### 2. Test Utilities
```typescript
// src/test-utils/render.tsx
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: {
    initialState?: Partial<AuthState>;
    route?: string;
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
        <AuthProvider initialState={options?.initialState}>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};
```

## Coverage Goals

### Por Módulo
| Módulo | Coverage Goal | Status |
|--------|---------------|--------|
| **Components** | 85% | 🟡 In Progress |
| **Hooks** | 90% | 🟡 In Progress |
| **Services** | 95% | 🟡 In Progress |
| **Utils** | 95% | 🟡 In Progress |
| **Integration** | 80% | ❌ Pending |
| **E2E** | Critical Flows | ❌ Pending |

### Métricas de Calidad
- **Line Coverage**: > 80%
- **Branch Coverage**: > 80%
- **Function Coverage**: > 85%
- **Statement Coverage**: > 80%

## Automation y CI/CD

### 1. GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run unit tests
        run: pnpm test:unit --coverage
      
      - name: Run integration tests
        run: pnpm test:integration
      
      - name: Run E2E tests
        run: pnpm test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### 2. Pre-commit Hooks
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

## Performance Testing

### 1. Load Testing
```typescript
// src/__tests__/performance/load.test.ts
describe('Performance Tests', () => {
  test('dashboard loads within 3 seconds');
  test('user list handles 1000+ records');
  test('analytics calculations complete quickly');
});
```

### 2. Memory Leak Detection
```typescript
// src/__tests__/performance/memory.test.ts
describe('Memory Tests', () => {
  test('no memory leaks in user navigation');
  test('proper cleanup of subscriptions');
  test('efficient data structure usage');
});
```

## Cronograma de Implementación

<lov-mermaid>
gantt
    title Testing Implementation Timeline
    dateFormat  YYYY-MM-DD
    section Unit Tests
    Components Core          :done, comp1, 2024-01-01, 2024-01-07
    Hooks Implementation     :active, hooks1, 2024-01-08, 2024-01-14
    Services Testing         :services1, after hooks1, 7d
    Utils Testing           :utils1, after services1, 5d
    
    section Integration Tests
    Auth Integration        :auth1, after utils1, 5d
    User Management         :user1, after auth1, 7d
    Discipleship Module     :disc1, after user1, 10d
    
    section E2E Tests
    Critical Flows          :e2e1, after disc1, 14d
    Cross-browser          :browser1, after e2e1, 7d
    
    section Setup & Automation
    CI/CD Pipeline         :ci1, 2024-01-08, 2024-01-15
    Performance Tests      :perf1, after browser1, 7d
</lov-mermaid>

## Best Practices

### 1. Test Organization
- Organizar tests por funcionalidad, no por tipo
- Usar nombres descriptivos para test cases
- Agrupar tests relacionados en describe blocks
- Mantener tests independientes entre sí

### 2. Test Writing Guidelines
- Seguir patrón AAA (Arrange, Act, Assert)
- Un test, una responsabilidad
- Usar datos de prueba realistas
- Mock solo dependencias externas

### 3. Mantenimiento de Tests
- Actualizar tests junto con código
- Refactorizar tests duplicados
- Revisar coverage regularmente
- Eliminar tests obsoletos

## Herramientas de Debugging

### 1. Test Debugging
```typescript
// src/test-utils/debug.ts
export const debugComponent = (component: ReactWrapper) => {
  console.log(component.debug());
  console.log('Props:', component.props());
  console.log('State:', component.state());
};
```

### 2. Visual Testing
```typescript
// Storybook integration for visual regression testing
export default {
  title: 'Components/Button',
  component: Button,
  parameters: {
    chromatic: { disableSnapshot: false },
  },
};
```

## Métricas y Reportes

### 1. Coverage Reports
- HTML reports para análisis detallado
- JSON reports para integración CI/CD
- Badge de coverage en README

### 2. Test Results Dashboard
- Tiempo de ejecución por test suite
- Historial de fallos
- Tendencias de coverage
- Performance metrics

Esta estrategia de testing asegura calidad, mantenibilidad y confianza en el código del Proyecto Sion.