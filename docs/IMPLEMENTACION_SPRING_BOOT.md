# Guía Completa: Implementación con Java Spring Boot

## Índice
1. [Introducción](#introducción)
2. [Comparación Go vs Spring Boot](#comparación-go-vs-spring-boot)
3. [Setup del Proyecto](#setup-del-proyecto)
4. [Estructura de Directorios](#estructura-de-directorios)
5. [Configuración](#configuración)
6. [Modelos y Entidades](#modelos-y-entidades)
7. [Repositories](#repositories)
8. [Services](#services)
9. [Controllers](#controllers)
10. [Seguridad y JWT](#seguridad-y-jwt)
11. [Manejo de Errores](#manejo-de-errores)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Mejores Prácticas](#mejores-prácticas)

---

## Introducción

Este documento explica cómo migrar o reimplementar el backend actual (Go + Echo) a **Java Spring Boot**. Spring Boot es un framework empresarial robusto que ofrece:

- **Inyección de Dependencias** automática
- **JPA/Hibernate** para ORM
- **Spring Security** para autenticación/autorización
- **Validaciones** declarativas con anotaciones
- **Testing** integrado y maduro
- **Ecosistema** extenso de librerías

---

## Comparación Go vs Spring Boot

### Arquitectura Actual (Go)

```
apps/backend-go/
├── main.go              # Punto de entrada
├── config/
│   └── database.go      # Conexión DB manual
├── handlers/            # Lógica de negocio + routing
│   ├── auth.go
│   ├── users.go
│   └── dashboard.go
├── middleware/
│   └── auth.go          # JWT validation manual
├── models/
│   └── user.go          # Structs simples
└── routes/
    └── routes.go        # Setup de rutas
```

**Características:**
- ✅ Rendimiento alto
- ✅ Binario único, fácil deployment
- ❌ Código manual para DB, validaciones
- ❌ Sin ORM nativo
- ❌ Testing menos estructurado

### Arquitectura Spring Boot

```
backend-sion-spring/
├── src/main/java/com/iglesia/sion/
│   ├── BackendSionApplication.java     # Punto de entrada
│   ├── config/
│   │   ├── SecurityConfig.java         # Configuración de seguridad
│   │   └── JwtConfig.java
│   ├── controller/                     # API endpoints
│   │   ├── AuthController.java
│   │   ├── UserController.java
│   │   └── DashboardController.java
│   ├── service/                        # Lógica de negocio
│   │   ├── AuthService.java
│   │   ├── UserService.java
│   │   └── DashboardService.java
│   ├── repository/                     # Acceso a datos (JPA)
│   │   ├── UserRepository.java
│   │   └── AuditLogRepository.java
│   ├── model/                          # Entidades JPA
│   │   ├── User.java
│   │   ├── AuditLog.java
│   │   └── LiveStream.java
│   ├── dto/                            # Data Transfer Objects
│   │   ├── CreateUserRequest.java
│   │   ├── UpdateUserRequest.java
│   │   ├── LoginRequest.java
│   │   └── DashboardResponse.java
│   ├── security/                       # JWT y filtros
│   │   ├── JwtTokenProvider.java
│   │   ├── JwtAuthenticationFilter.java
│   │   └── UserPrincipal.java
│   └── exception/                      # Manejo de errores
│       ├── GlobalExceptionHandler.java
│       ├── ResourceNotFoundException.java
│       └── UnauthorizedException.java
└── src/main/resources/
    ├── application.yml                 # Configuración
    └── application-prod.yml
```

**Características:**
- ✅ Arquitectura en capas clara
- ✅ ORM (JPA/Hibernate) automático
- ✅ Validaciones declarativas
- ✅ Testing robusto
- ✅ Seguridad integrada (Spring Security)
- ❌ Mayor consumo de memoria
- ❌ Startup más lento

---

## Setup del Proyecto

### 1. Crear Proyecto con Spring Initializr

Visita [start.spring.io](https://start.spring.io) o usa CLI:

```bash
spring init \
  --dependencies=web,data-jpa,postgresql,security,validation,lombok \
  --build=maven \
  --java-version=17 \
  --package-name=com.iglesia.sion \
  --name=backend-sion-spring \
  backend-sion-spring
```

### 2. Estructura del `pom.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
    </parent>
    
    <groupId>com.iglesia</groupId>
    <artifactId>sion-backend</artifactId>
    <version>1.0.0</version>
    <name>Backend Sion Spring Boot</name>
    
    <properties>
        <java.version>17</java.version>
    </properties>
    
    <dependencies>
        <!-- Spring Boot Web -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        
        <!-- Spring Data JPA -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        
        <!-- Spring Security -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        
        <!-- Validation -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        
        <!-- PostgreSQL Driver -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        
        <!-- JWT -->
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>0.12.3</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>0.12.3</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>0.12.3</version>
            <scope>runtime</scope>
        </dependency>
        
        <!-- Lombok (reduce boilerplate) -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        
        <!-- Testing -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

### 3. Clase Principal

```java
package com.iglesia.sion;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing // Para campos @CreatedDate, @LastModifiedDate
public class BackendSionApplication {
    public static void main(String[] args) {
        SpringApplication.run(BackendSionApplication.class, args);
    }
}
```

---

## Estructura de Directorios

```
backend-sion-spring/
├── src/
│   ├── main/
│   │   ├── java/com/iglesia/sion/
│   │   │   ├── BackendSionApplication.java
│   │   │   ├── config/
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   ├── CorsConfig.java
│   │   │   │   └── JwtConfig.java
│   │   │   ├── controller/
│   │   │   │   ├── AuthController.java
│   │   │   │   ├── UserController.java
│   │   │   │   └── DashboardController.java
│   │   │   ├── service/
│   │   │   │   ├── AuthService.java
│   │   │   │   ├── UserService.java
│   │   │   │   └── DashboardService.java
│   │   │   ├── repository/
│   │   │   │   ├── UserRepository.java
│   │   │   │   ├── AuditLogRepository.java
│   │   │   │   └── LiveStreamRepository.java
│   │   │   ├── model/
│   │   │   │   ├── User.java
│   │   │   │   ├── AuditLog.java
│   │   │   │   ├── LiveStream.java
│   │   │   │   └── enums/
│   │   │   │       └── UserRole.java
│   │   │   ├── dto/
│   │   │   │   ├── request/
│   │   │   │   │   ├── CreateUserRequest.java
│   │   │   │   │   ├── UpdateUserRequest.java
│   │   │   │   │   └── LoginRequest.java
│   │   │   │   └── response/
│   │   │   │       ├── UserResponse.java
│   │   │   │       ├── DashboardStatsResponse.java
│   │   │   │       └── AuthResponse.java
│   │   │   ├── security/
│   │   │   │   ├── JwtTokenProvider.java
│   │   │   │   ├── JwtAuthenticationFilter.java
│   │   │   │   ├── UserPrincipal.java
│   │   │   │   └── CustomUserDetailsService.java
│   │   │   └── exception/
│   │   │       ├── GlobalExceptionHandler.java
│   │   │       ├── ResourceNotFoundException.java
│   │   │       ├── UnauthorizedException.java
│   │   │       └── BadRequestException.java
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       └── application-prod.yml
│   └── test/
│       └── java/com/iglesia/sion/
│           ├── service/
│           │   └── UserServiceTest.java
│           ├── controller/
│           │   └── UserControllerTest.java
│           └── repository/
│               └── UserRepositoryTest.java
├── Dockerfile
├── docker-compose.yml
└── pom.xml
```

---

## Configuración

### application.yml

```yaml
spring:
  application:
    name: backend-sion
  
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:postgres}
    username: ${DB_USER:postgres}
    password: ${DB_PASSWORD:password}
    driver-class-name: org.postgresql.Driver
  
  jpa:
    hibernate:
      ddl-auto: validate  # Usa 'validate' en producción, 'update' en dev
    show-sql: true
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.PostgreSQLDialect
  
  security:
    jwt:
      secret: ${JWT_SECRET:your-secret-key-min-256-bits}
      expiration: 86400000  # 24 horas en ms

server:
  port: ${PORT:8080}
  error:
    include-message: always
    include-binding-errors: always

logging:
  level:
    com.iglesia.sion: DEBUG
    org.springframework.security: DEBUG
```

### application-prod.yml

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
  
logging:
  level:
    com.iglesia.sion: INFO
    org.springframework.security: WARN
```

---

## Modelos y Entidades

### 1. User.java (Comparación con Go)

**Go (actual):**
```go
type User struct {
    ID           string     `json:"id" db:"id"`
    FirstName    string     `json:"first_name" db:"first_name"`
    LastName     string     `json:"last_name" db:"last_name"`
    Email        string     `json:"email" db:"email"`
    Role         string     `json:"role" db:"role"`
    PasswordHash string     `json:"-" db:"password_hash"`
    CreatedAt    time.Time  `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
}
```

**Spring Boot:**
```java
package com.iglesia.sion.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;
    
    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;
    
    @Column(name = "id_number", unique = true, length = 20)
    private String idNumber;
    
    @Column(unique = true, nullable = false, length = 255)
    private String email;
    
    @Column(length = 20)
    private String phone;
    
    @Column(columnDefinition = "TEXT")
    private String address;
    
    @Column(name = "baptism_date")
    private LocalDate baptismDate;
    
    @Column(nullable = false)
    private Boolean baptized = false;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role = UserRole.SERVER;
    
    @Column(name = "whatsapp", nullable = false)
    private Boolean whatsApp = false;
    
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    // Métodos de utilidad
    public String getFullName() {
        return firstName + " " + lastName;
    }
    
    public boolean hasRole(UserRole requiredRole) {
        return this.role == requiredRole;
    }
}
```

**Ventajas de JPA:**
- ✅ Anotaciones declarativas (`@Entity`, `@Table`)
- ✅ Validaciones automáticas (`@Column(nullable = false)`)
- ✅ Enums tipados (`UserRole`)
- ✅ Auditoría automática (`@CreatedDate`, `@LastModifiedDate`)
- ✅ Relaciones ORM (`@OneToMany`, `@ManyToOne`)

### 2. UserRole.java (Enum)

```java
package com.iglesia.sion.model.enums;

import lombok.Getter;

@Getter
public enum UserRole {
    PASTOR("Pastor", 1),
    STAFF("Staff", 2),
    SUPERVISOR("Supervisor", 3),
    SERVER("Server", 4);
    
    private final String displayName;
    private final int hierarchy;
    
    UserRole(String displayName, int hierarchy) {
        this.displayName = displayName;
        this.hierarchy = hierarchy;
    }
    
    public boolean canManage(UserRole targetRole) {
        return this.hierarchy < targetRole.hierarchy;
    }
}
```

### 3. AuditLog.java

```java
package com.iglesia.sion.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "table_name", nullable = false)
    private String tableName;
    
    @Column(name = "record_id")
    private UUID recordId;
    
    @Column(nullable = false)
    private String action; // INSERT, UPDATE, DELETE
    
    @Column(name = "old_data", columnDefinition = "JSONB")
    private String oldData;
    
    @Column(name = "new_data", columnDefinition = "JSONB")
    private String newData;
    
    @Column(name = "user_id")
    private UUID userId;
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
```

### 4. DTOs (Data Transfer Objects)

**CreateUserRequest.java:**
```java
package com.iglesia.sion.dto.request;

import com.iglesia.sion.model.enums.UserRole;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateUserRequest {
    
    @NotBlank(message = "El nombre es obligatorio")
    @Size(min = 2, max = 100, message = "El nombre debe tener entre 2 y 100 caracteres")
    private String firstName;
    
    @NotBlank(message = "El apellido es obligatorio")
    @Size(min = 2, max = 100)
    private String lastName;
    
    @Size(max = 20)
    private String idNumber;
    
    @NotBlank(message = "El email es obligatorio")
    @Email(message = "Email inválido")
    private String email;
    
    @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Teléfono inválido")
    private String phone;
    
    private String address;
    
    @Past(message = "La fecha de bautismo debe ser en el pasado")
    private LocalDate baptismDate;
    
    private Boolean baptized = false;
    
    @NotNull(message = "El rol es obligatorio")
    private UserRole role;
    
    private Boolean whatsApp = false;
    
    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
    private String password;
}
```

**UserResponse.java:**
```java
package com.iglesia.sion.dto.response;

import com.iglesia.sion.model.enums.UserRole;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private UUID id;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String phone;
    private String address;
    private LocalDate baptismDate;
    private Boolean baptized;
    private UserRole role;
    private Boolean whatsApp;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

---

## Repositories

### 1. UserRepository.java

**Go (actual):**
```go
// En handlers/users.go
rows, err := db.Query("SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC")
```

**Spring Boot:**
```java
package com.iglesia.sion.repository;

import com.iglesia.sion.model.User;
import com.iglesia.sion.model.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    
    // Métodos automáticos por convención de nombres
    Optional<User> findByEmail(String email);
    
    boolean existsByEmail(String email);
    
    boolean existsByIdNumber(String idNumber);
    
    List<User> findByRole(UserRole role);
    
    List<User> findByBaptized(Boolean baptized);
    
    // Con paginación
    Page<User> findByRoleOrderByCreatedAtDesc(UserRole role, Pageable pageable);
    
    // Queries personalizadas
    @Query("SELECT u FROM User u WHERE u.createdAt >= :date")
    List<User> findRecentUsers(@Param("date") LocalDateTime date);
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
    Long countByRole(@Param("role") UserRole role);
    
    @Query("SELECT u FROM User u WHERE " +
           "LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<User> searchUsers(@Param("search") String search, Pageable pageable);
    
    // Queries nativas si es necesario
    @Query(value = "SELECT * FROM users WHERE baptism_date IS NOT NULL " +
                   "AND EXTRACT(MONTH FROM baptism_date) = :month", 
           nativeQuery = true)
    List<User> findByBaptismMonth(@Param("month") int month);
}
```

**Ventajas:**
- ✅ Sin código SQL manual (métodos `findByX`)
- ✅ Paginación automática
- ✅ Type-safety en queries
- ✅ Queries complejas con `@Query`

### 2. AuditLogRepository.java

```java
package com.iglesia.sion.repository;

import com.iglesia.sion.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    
    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    
    List<AuditLog> findTop10ByOrderByCreatedAtDesc();
    
    List<AuditLog> findByTableNameAndRecordId(String tableName, UUID recordId);
    
    List<AuditLog> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
```

---

## Services

### 1. UserService.java

**Go (actual):**
```go
func (h *UserHandler) CreateUser(c echo.Context) error {
    var req CreateUserRequest
    if err := c.Bind(&req); err != nil {
        return c.JSON(400, map[string]string{"error": err.Error()})
    }
    // ... lógica de negocio + SQL manual
}
```

**Spring Boot:**
```java
package com.iglesia.sion.service;

import com.iglesia.sion.dto.request.CreateUserRequest;
import com.iglesia.sion.dto.request.UpdateUserRequest;
import com.iglesia.sion.dto.response.UserResponse;
import com.iglesia.sion.exception.BadRequestException;
import com.iglesia.sion.exception.ResourceNotFoundException;
import com.iglesia.sion.model.User;
import com.iglesia.sion.model.enums.UserRole;
import com.iglesia.sion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        log.info("Fetching all users");
        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        log.info("Fetching users with pagination: {}", pageable);
        return userRepository.findAll(pageable)
                .map(this::mapToResponse);
    }
    
    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        log.info("Fetching user by id: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + id));
        return mapToResponse(user);
    }
    
    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        log.info("Creating new user with email: {}", request.getEmail());
        
        // Validaciones
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("El email ya está registrado");
        }
        
        if (request.getIdNumber() != null && userRepository.existsByIdNumber(request.getIdNumber())) {
            throw new BadRequestException("El número de identificación ya está registrado");
        }
        
        // Crear usuario
        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .idNumber(request.getIdNumber())
                .email(request.getEmail())
                .phone(request.getPhone())
                .address(request.getAddress())
                .baptismDate(request.getBaptismDate())
                .baptized(request.getBaptized())
                .role(request.getRole())
                .whatsApp(request.getWhatsApp())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();
        
        User savedUser = userRepository.save(user);
        log.info("User created successfully with id: {}", savedUser.getId());
        
        return mapToResponse(savedUser);
    }
    
    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest request) {
        log.info("Updating user with id: {}", id);
        
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        
        // Actualizar solo campos no nulos
        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new BadRequestException("El email ya está registrado");
            }
            user.setEmail(request.getEmail());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress());
        }
        if (request.getBaptismDate() != null) {
            user.setBaptismDate(request.getBaptismDate());
        }
        if (request.getBaptized() != null) {
            user.setBaptized(request.getBaptized());
        }
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }
        
        User updatedUser = userRepository.save(user);
        log.info("User updated successfully");
        
        return mapToResponse(updatedUser);
    }
    
    @Transactional
    public void deleteUser(UUID id) {
        log.info("Deleting user with id: {}", id);
        
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("Usuario no encontrado");
        }
        
        userRepository.deleteById(id);
        log.info("User deleted successfully");
    }
    
    @Transactional(readOnly = true)
    public List<UserResponse> getUsersByRole(UserRole role) {
        return userRepository.findByRole(role).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<UserResponse> getRecentUsers(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return userRepository.findRecentUsers(since).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    // Mapper
    private UserResponse mapToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .address(user.getAddress())
                .baptismDate(user.getBaptismDate())
                .baptized(user.getBaptized())
                .role(user.getRole())
                .whatsApp(user.getWhatsApp())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
```

**Ventajas:**
- ✅ `@Transactional` maneja transacciones automáticamente
- ✅ Separación clara de lógica de negocio
- ✅ Logging estructurado
- ✅ Validaciones centralizadas
- ✅ Fácil de testear (inyección de dependencias)

### 2. DashboardService.java

```java
package com.iglesia.sion.service;

import com.iglesia.sion.dto.response.DashboardStatsResponse;
import com.iglesia.sion.dto.response.RecentActivityResponse;
import com.iglesia.sion.dto.response.RoleDistributionResponse;
import com.iglesia.sion.model.enums.UserRole;
import com.iglesia.sion.repository.AuditLogRepository;
import com.iglesia.sion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {
    
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    
    @Transactional(readOnly = true)
    public DashboardStatsResponse getStats() {
        log.info("Fetching dashboard statistics");
        
        long totalUsers = userRepository.count();
        long newRegistrations = userRepository.findRecentUsers(
                LocalDateTime.now().minusDays(30)
        ).size();
        
        List<RoleDistributionResponse> roleDistribution = getRoleDistribution();
        List<RecentActivityResponse> recentActivity = getRecentActivity();
        
        return DashboardStatsResponse.builder()
                .totalUsers(totalUsers)
                .newRegistrations(newRegistrations)
                .activeRoles(roleDistribution.size())
                .roleDistribution(roleDistribution)
                .recentActivity(recentActivity)
                .build();
    }
    
    private List<RoleDistributionResponse> getRoleDistribution() {
        return Arrays.stream(UserRole.values())
                .map(role -> {
                    long count = userRepository.countByRole(role);
                    return RoleDistributionResponse.builder()
                            .role(role.getDisplayName())
                            .count(count)
                            .color(getColorForRole(role))
                            .build();
                })
                .collect(Collectors.toList());
    }
    
    private List<RecentActivityResponse> getRecentActivity() {
        return auditLogRepository.findTop10ByOrderByCreatedAtDesc().stream()
                .map(audit -> RecentActivityResponse.builder()
                        .action(formatAction(audit.getAction(), audit.getTableName()))
                        .user(audit.getUserId().toString())
                        .time(formatTimeAgo(audit.getCreatedAt()))
                        .build())
                .collect(Collectors.toList());
    }
    
    private String getColorForRole(UserRole role) {
        return switch (role) {
            case PASTOR -> "#8B5CF6";
            case STAFF -> "#3B82F6";
            case SUPERVISOR -> "#10B981";
            case SERVER -> "#F59E0B";
        };
    }
    
    private String formatAction(String action, String tableName) {
        String table = tableName.equals("users") ? "usuário" : tableName;
        return switch (action) {
            case "INSERT" -> "Criou " + table;
            case "UPDATE" -> "Atualizou " + table;
            case "DELETE" -> "Deletou " + table;
            default -> action;
        };
    }
    
    private String formatTimeAgo(LocalDateTime dateTime) {
        // Implementación de "hace X tiempo"
        // ...
        return "hace 5 min";
    }
}
```

---

## Controllers

### 1. UserController.java

**Go (actual):**
```go
users := protected.Group("/users")
{
    users.GET("", userHandler.GetUsers)
    users.POST("", userHandler.CreateUser)
    users.GET("/:id", userHandler.GetUser)
    users.PUT("/:id", userHandler.UpdateUser)
    users.DELETE("/:id", userHandler.DeleteUser)
}
```

**Spring Boot:**
```java
package com.iglesia.sion.controller;

import com.iglesia.sion.dto.request.CreateUserRequest;
import com.iglesia.sion.dto.request.UpdateUserRequest;
import com.iglesia.sion.dto.response.UserResponse;
import com.iglesia.sion.model.enums.UserRole;
import com.iglesia.sion.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    
    @GetMapping
    @PreAuthorize("hasAnyRole('PASTOR', 'STAFF', 'SUPERVISOR')")
    public ResponseEntity<List<UserResponse>> getAllUsers(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
            Page<UserResponse> users = userService.getAllUsers(pageable);
            return ResponseEntity.ok(users.getContent());
        }
        
        List<UserResponse> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PASTOR', 'STAFF', 'SUPERVISOR')")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID id) {
        UserResponse user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }
    
    @PostMapping
    @PreAuthorize("hasAnyRole('PASTOR', 'STAFF')")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserResponse createdUser = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdUser);
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PASTOR', 'STAFF', 'SUPERVISOR')")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        UserResponse updatedUser = userService.updateUser(id, request);
        return ResponseEntity.ok(updatedUser);
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PASTOR')")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/role/{role}")
    @PreAuthorize("hasAnyRole('PASTOR', 'STAFF')")
    public ResponseEntity<List<UserResponse>> getUsersByRole(@PathVariable UserRole role) {
        List<UserResponse> users = userService.getUsersByRole(role);
        return ResponseEntity.ok(users);
    }
    
    @GetMapping("/recent")
    @PreAuthorize("hasAnyRole('PASTOR', 'STAFF')")
    public ResponseEntity<List<UserResponse>> getRecentUsers(
            @RequestParam(defaultValue = "7") int days
    ) {
        List<UserResponse> users = userService.getRecentUsers(days);
        return ResponseEntity.ok(users);
    }
}
```

**Ventajas:**
- ✅ `@PreAuthorize` para control de acceso declarativo
- ✅ `@Valid` para validaciones automáticas
- ✅ Paginación con `Pageable`
- ✅ Respuestas HTTP tipadas

### 2. DashboardController.java

```java
package com.iglesia.sion.controller;

import com.iglesia.sion.dto.response.DashboardStatsResponse;
import com.iglesia.sion.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    
    private final DashboardService dashboardService;
    
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('PASTOR', 'STAFF')")
    public ResponseEntity<DashboardStatsResponse> getStats() {
        DashboardStatsResponse stats = dashboardService.getStats();
        return ResponseEntity.ok(stats);
    }
}
```

---

## Seguridad y JWT

### 1. JwtTokenProvider.java

**Go (actual):**
```go
func validateSupabaseToken(tokenString string) (*Claims, error) {
    jwtSecret := os.Getenv("JWT_SECRET")
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        return []byte(jwtSecret), nil
    })
    // ...
}
```

**Spring Boot:**
```java
package com.iglesia.sion.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
@Slf4j
public class JwtTokenProvider {
    
    @Value("${spring.security.jwt.secret}")
    private String jwtSecret;
    
    @Value("${spring.security.jwt.expiration}")
    private long jwtExpirationMs;
    
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }
    
    public String generateToken(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);
        
        return Jwts.builder()
                .subject(userPrincipal.getId().toString())
                .claim("email", userPrincipal.getEmail())
                .claim("role", userPrincipal.getRole().name())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }
    
    public String getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        
        return claims.getSubject();
    }
    
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }
}
```

### 2. JwtAuthenticationFilter.java

```java
package com.iglesia.sion.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService customUserDetailsService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);
            
            if (StringUtils.hasText(jwt) && jwtTokenProvider.validateToken(jwt)) {
                String userId = jwtTokenProvider.getUserIdFromToken(jwt);
                
                UserDetails userDetails = customUserDetailsService.loadUserById(userId);
                
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );
                
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
                
                log.debug("Set authentication for user: {}", userId);
            }
        } catch (Exception e) {
            log.error("Could not set user authentication in security context", e);
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        
        return null;
    }
}
```

### 3. SecurityConfig.java

```java
package com.iglesia.sion.config;

import com.iglesia.sion.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsService userDetailsService;
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configure(http))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/**", "/api/v1/health").permitAll()
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }
    
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

### 4. AuthController.java

```java
package com.iglesia.sion.controller;

import com.iglesia.sion.dto.request.LoginRequest;
import com.iglesia.sion.dto.response.AuthResponse;
import com.iglesia.sion.security.JwtTokenProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = jwtTokenProvider.generateToken(authentication);
        
        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .build());
    }
    
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok().build();
    }
}
```

---

## Manejo de Errores

### GlobalExceptionHandler.java

```java
package com.iglesia.sion.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        log.error("Resource not found: {}", ex.getMessage());
        
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.NOT_FOUND.value())
                .error("Not Found")
                .message(ex.getMessage())
                .build();
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
    
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException ex) {
        log.error("Bad request: {}", ex.getMessage());
        
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Bad Request")
                .message(ex.getMessage())
                .build();
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Validation Failed")
                .message("Errores de validación")
                .validationErrors(errors)
                .build();
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
    
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        log.error("Access denied: {}", ex.getMessage());
        
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.FORBIDDEN.value())
                .error("Forbidden")
                .message("No tienes permisos para acceder a este recurso")
                .build();
        
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        log.error("Unexpected error: ", ex);
        
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error("Internal Server Error")
                .message("Ha ocurrido un error inesperado")
                .build();
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
```

---

## Testing

### UserServiceTest.java

```java
package com.iglesia.sion.service;

import com.iglesia.sion.dto.request.CreateUserRequest;
import com.iglesia.sion.dto.response.UserResponse;
import com.iglesia.sion.exception.BadRequestException;
import com.iglesia.sion.exception.ResourceNotFoundException;
import com.iglesia.sion.model.User;
import com.iglesia.sion.model.enums.UserRole;
import com.iglesia.sion.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private PasswordEncoder passwordEncoder;
    
    @InjectMocks
    private UserService userService;
    
    private User testUser;
    private CreateUserRequest createRequest;
    
    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .firstName("Juan")
                .lastName("Pérez")
                .email("juan@example.com")
                .role(UserRole.SERVER)
                .passwordHash("hashedPassword")
                .build();
        
        createRequest = CreateUserRequest.builder()
                .firstName("Juan")
                .lastName("Pérez")
                .email("juan@example.com")
                .role(UserRole.SERVER)
                .password("password123")
                .build();
    }
    
    @Test
    void createUser_Success() {
        // Arrange
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        
        // Act
        UserResponse result = userService.createUser(createRequest);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo("juan@example.com");
        verify(userRepository).save(any(User.class));
    }
    
    @Test
    void createUser_EmailAlreadyExists_ThrowsException() {
        // Arrange
        when(userRepository.existsByEmail(anyString())).thenReturn(true);
        
        // Act & Assert
        assertThatThrownBy(() -> userService.createUser(createRequest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("email ya está registrado");
        
        verify(userRepository, never()).save(any(User.class));
    }
    
    @Test
    void getUserById_Success() {
        // Arrange
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        
        // Act
        UserResponse result = userService.getUserById(userId);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo(testUser.getEmail());
    }
    
    @Test
    void getUserById_NotFound_ThrowsException() {
        // Arrange
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThatThrownBy(() -> userService.getUserById(userId))
                .isInstanceOf(ResourceNotFoundException.class);
    }
    
    @Test
    void deleteUser_Success() {
        // Arrange
        UUID userId = UUID.randomUUID();
        when(userRepository.existsById(userId)).thenReturn(true);
        
        // Act
        userService.deleteUser(userId);
        
        // Assert
        verify(userRepository).deleteById(userId);
    }
}
```

### UserControllerTest.java

```java
package com.iglesia.sion.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iglesia.sion.dto.request.CreateUserRequest;
import com.iglesia.sion.dto.response.UserResponse;
import com.iglesia.sion.model.enums.UserRole;
import com.iglesia.sion.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class UserControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @MockBean
    private UserService userService;
    
    @Test
    @WithMockUser(roles = "PASTOR")
    void createUser_Success() throws Exception {
        // Arrange
        CreateUserRequest request = CreateUserRequest.builder()
                .firstName("Juan")
                .lastName("Pérez")
                .email("juan@example.com")
                .role(UserRole.SERVER)
                .password("password123")
                .build();
        
        UserResponse response = UserResponse.builder()
                .id(UUID.randomUUID())
                .firstName("Juan")
                .lastName("Pérez")
                .email("juan@example.com")
                .role(UserRole.SERVER)
                .build();
        
        when(userService.createUser(any(CreateUserRequest.class))).thenReturn(response);
        
        // Act & Assert
        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("juan@example.com"));
    }
    
    @Test
    @WithMockUser(roles = "SERVER")
    void createUser_InsufficientPermissions_Forbidden() throws Exception {
        // Arrange
        CreateUserRequest request = CreateUserRequest.builder()
                .firstName("Juan")
                .lastName("Pérez")
                .email("juan@example.com")
                .role(UserRole.SERVER)
                .password("password123")
                .build();
        
        // Act & Assert
        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
}
```

---

## Deployment

### Dockerfile

```dockerfile
FROM openjdk:17-jdk-slim AS build

WORKDIR /app

COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .

RUN ./mvnw dependency:go-offline

COPY src ./src

RUN ./mvnw clean package -DskipTests

FROM openjdk:17-jre-slim

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENV JAVA_OPTS="-Xmx512m -Xms256m"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: sion_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  backend:
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/sion_db
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
      SPRING_JPA_HIBERNATE_DDL_AUTO: update
      JWT_SECRET: your-secret-key-min-256-bits-for-production
    depends_on:
      - postgres

volumes:
  postgres_data:
```

---

## Mejores Prácticas

### 1. Separación de Capas

```
Controller -> Service -> Repository -> Database
```

**✅ Correcto:**
- **Controllers**: Solo manejan HTTP (request/response)
- **Services**: Contienen lógica de negocio
- **Repositories**: Acceso a datos

**❌ Incorrecto:**
- Lógica de negocio en Controllers
- Queries SQL en Controllers

### 2. DTOs vs Entities

**✅ Usar DTOs:**
```java
// API recibe CreateUserRequest
// Service trabaja con User (Entity)
// API devuelve UserResponse
```

**❌ Exponer Entities directamente:**
```java
@PostMapping
public User create(@RequestBody User user) { // ❌ NO
    return userRepository.save(user);
}
```

### 3. Validaciones

**Nivel 1 - Anotaciones:**
```java
@NotBlank
@Email
@Size(min = 8)
```

**Nivel 2 - Service:**
```java
if (userRepository.existsByEmail(email)) {
    throw new BadRequestException("Email ya existe");
}
```

**Nivel 3 - Database:**
```java
@Column(unique = true, nullable = false)
```

### 4. Transacciones

**✅ Declarativas:**
```java
@Transactional
public void updateUserAndLog(UUID id, UpdateRequest req) {
    // Si falla cualquiera, rollback automático
    userRepository.save(user);
    auditLogRepository.save(audit);
}
```

### 5. Testing

```java
// Unit Tests - Mock dependencies
@MockBean
private UserRepository userRepository;

// Integration Tests - Database real
@SpringBootTest
@AutoConfigureMockMvc
class UserControllerIntegrationTest { }
```

---

## Comparación Final: Go vs Spring Boot

| Aspecto | Go (Echo) | Spring Boot |
|---------|-----------|-------------|
| **Velocidad de desarrollo** | Media | Alta |
| **Rendimiento** | Excelente | Bueno |
| **Ecosistema** | Limitado | Muy extenso |
| **ORM** | Manual (sqlx) | JPA/Hibernate automático |
| **Testing** | Básico | Robusto (Mockito, TestContainers) |
| **Seguridad** | Manual | Spring Security integrado |
| **Validaciones** | Manual | Declarativas (`@Valid`) |
| **DI (Inyección)** | Manual | Automática |
| **Curva de aprendizaje** | Baja | Media-Alta |
| **Deployment** | Binario único | JAR/WAR |
| **Memoria** | ~10-50 MB | ~200-500 MB |
| **Startup** | <1s | 3-5s |

---

## Conclusión

Para el proyecto Sion, **Spring Boot es más adecuado** si priorizas:

✅ **Desarrollo rápido** con menos código boilerplate  
✅ **Ecosistema maduro** con librerías para todo  
✅ **Testing robusto** integrado  
✅ **Seguridad** declarativa con Spring Security  
✅ **ORM automático** (JPA/Hibernate)  

**Go es mejor** si priorizas:

✅ **Máximo rendimiento** (microsegundos de latencia)  
✅ **Bajo consumo de memoria**  
✅ **Deployment simple** (binario único)  

---

## Recursos Adicionales

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Data JPA](https://spring.io/projects/spring-data-jpa)
- [Spring Security](https://spring.io/projects/spring-security)
- [Baeldung - Spring Tutorials](https://www.baeldung.com/)
- [JWT.io](https://jwt.io/)

---

**Autor:** Lovable AI Assistant  
**Fecha:** Enero 2025  
**Versión:** 1.0
