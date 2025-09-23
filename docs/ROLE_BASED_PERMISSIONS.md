# Role-Based Permissions System

## Overview
The Sion Church Management System implements a hierarchical role-based access control (RBAC) system with four distinct user roles and comprehensive audit logging.

## User Roles

### 1. Pastor (Admin Level)
- **Access**: Full system access
- **Permissions**: 
  - View, edit, delete all users (except other pastors)
  - Generate all types of reports
  - Manage system settings
  - Access audit logs
  - Assign roles to users

### 2. Staff (Limited Admin)
- **Access**: Administrative access excluding pastor management
- **Permissions**:
  - View, edit, delete supervisors and servers
  - Generate reports
  - Access audit logs
  - Cannot modify pastor accounts

### 3. Supervisor (User Management)
- **Access**: Limited to user management
- **Permissions**:
  - View and edit supervisors and servers
  - Create new server accounts
  - Cannot generate reports
  - Cannot access audit logs

### 4. Server (Basic User)
- **Access**: Read-only access to own data
- **Permissions**:
  - View own profile
  - Edit own basic information
  - Submit requests to supervisor
  - Cannot access other users' data

## Implementation Strategy

### 1. Database Level (Supabase RLS)
```sql
-- Example policy for hierarchical access
CREATE POLICY "Role-based user access" ON public.users 
FOR SELECT USING (
  auth.uid() = id OR -- Users can see themselves
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() AND (
      u.role = 'pastor' OR -- Pastors see all
      (u.role = 'staff' AND role != 'pastor') OR -- Staff see non-pastors
      (u.role = 'supervisor' AND role IN ('supervisor', 'server')) -- Supervisors see equals/below
    )
  )
);
```

### 2. Backend Level (Go Echo Middleware)
```go
func RoleMiddleware(allowedRoles ...string) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            userRole := getUserRoleFromContext(c)
            
            if !contains(allowedRoles, userRole) {
                return echo.NewHTTPError(http.StatusForbidden, "Insufficient permissions")
            }
            
            return next(c)
        }
    }
}

// Usage in routes
e.GET("/admin/users", getUsersHandler, RoleMiddleware("pastor", "staff"))
e.POST("/users", createUserHandler, RoleMiddleware("pastor", "staff", "supervisor"))
```

### 3. Frontend Level (React Context API)
```typescript
interface AuthContextType {
  user: User | null;
  role: UserRole;
  hasPermission: (resource: string, action: string) => boolean;
  canAccessRoute: (route: string) => boolean;
}

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Usage in components
const { hasPermission, role } = useAuth();

if (hasPermission('users', 'delete')) {
  // Show delete button
}
```

## Route Protection

### Protected Routes Configuration
```typescript
const roleRoutes = {
  pastor: ['/admin', '/users', '/reports', '/audit-logs'],
  staff: ['/users', '/reports'],
  supervisor: ['/users/create', '/users/edit'],
  server: ['/profile']
};

const ProtectedRoute = ({ children, requiredRole }: {
  children: ReactNode;
  requiredRole: UserRole[];
}) => {
  const { role } = useAuth();
  
  if (!requiredRole.includes(role)) {
    return <Navigate to="/unauthorized" />;
  }
  
  return <>{children}</>;
};
```

## Permission Matrix

| Resource | Pastor | Staff | Supervisor | Server |
|----------|--------|-------|------------|--------|
| **Users** |
| Create Users | ✅ | ✅ | ✅ (Servers only) | ❌ |
| View All Users | ✅ | ✅ (Non-pastors) | ✅ (Supervisors/Servers) | ❌ |
| Edit Users | ✅ | ✅ (Non-pastor/staff) | ✅ (Supervisors/Servers) | ✅ (Self only) |
| Delete Users | ✅ (Non-pastors) | ✅ (Non-pastor/staff) | ✅ (Servers only) | ❌ |
| **Reports** |
| Generate Reports | ✅ | ✅ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ❌ | ❌ |
| **System** |
| Audit Logs | ✅ | ✅ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ |
| Role Assignment | ✅ | ❌ | ❌ | ❌ |

## Security Features

### 1. Role Hierarchy Enforcement
- Strict hierarchy: Pastor > Staff > Supervisor > Server
- Users cannot modify accounts at their level or above
- Pastor accounts are protected from deletion

### 2. Audit Logging
- All user modifications are logged
- Includes before/after states
- Tracks who made changes and when
- Only accessible to pastor and staff roles

### 3. Session Management
- JWT-based authentication
- Role information embedded in tokens
- Automatic token refresh
- Session invalidation on role changes

## Testing Requirements

### Unit Tests
```typescript
describe('Role Permissions', () => {
  test('Pastor can view all users', () => {
    const pastor = createUser({ role: 'pastor' });
    expect(hasPermission(pastor, 'users', 'view')).toBe(true);
  });
  
  test('Server cannot delete users', () => {
    const server = createUser({ role: 'server' });
    expect(hasPermission(server, 'users', 'delete')).toBe(false);
  });
  
  test('Staff cannot modify pastor accounts', () => {
    const staff = createUser({ role: 'staff' });
    const pastor = createUser({ role: 'pastor' });
    expect(canModifyUser(staff, pastor)).toBe(false);
  });
});
```

### Integration Tests
```typescript
describe('Role-based API Access', () => {
  test('Staff can access user list endpoint', async () => {
    const token = generateToken({ role: 'staff' });
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
  });
  
  test('Server cannot access admin endpoints', async () => {
    const token = generateToken({ role: 'server' });
    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
  });
});
```

## Implementation Checklist

### Database Setup
- [x] Create user_role enum
- [x] Update users table with role column
- [x] Implement RLS policies
- [x] Create audit logging system
- [x] Add user_permissions table

### Backend Implementation
- [ ] Create role middleware
- [ ] Implement permission checking functions
- [ ] Add route protection
- [ ] Create audit logging service
- [ ] Add role validation

### Frontend Implementation
- [ ] Create AuthContext with role management
- [ ] Implement protected routes
- [ ] Add permission-based UI rendering
- [ ] Create role-specific dashboards
- [ ] Add audit log viewer (pastor/staff only)

### Testing
- [ ] Unit tests for permission functions
- [ ] Integration tests for API endpoints
- [ ] E2E tests for role workflows
- [ ] Security testing for privilege escalation
- [ ] Performance testing for permission queries

## Deployment Considerations

### Environment Configuration
- Separate role configurations for dev/staging/prod
- Secure secret management for JWT signing
- Database connection pooling for performance
- Monitoring and alerting for permission failures

### Migration Strategy
- Gradual rollout of role-based features
- Data migration for existing users
- Backup and rollback procedures
- User training and documentation