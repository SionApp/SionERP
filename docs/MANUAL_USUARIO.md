# Manual de Usuario — SionERP

**Versión**: 2.0
**Fecha**: Mayo 2026
**Última actualización**: Alertas automáticas, fases de grupo, objetivos estratégicos, nuevo sistema de reportes
**Sistema**: SionERP — Sistema de Gestión Cristiana

---

## 1. Introducción

### 1.1 ¿Qué es SionERP?

SionERP es un sistema diseñado para gestionar integralmente una iglesia cristiana. Permite:

- **Gestionar miembros** y usuarios con roles definidos
- **Administrar el discipulado** con estructura jerárquica de 5 niveles (células)
- **Controlar zonas** geográficas y los grupos en cada zona
- **Registrar reportes** semanales, quincenales, mensuales y trimestrales
- **Ver métricas y analytics** del ministerio en tiempo real
- **Gestionar objetivos** estratégicos con seguimiento de progreso
- **Recibir alertas** automáticas sobre grupos que necesitan atención o que merecen celebración

### 1.2 ¿Se puede usar desde el celular?

**Sí.** SionERP es una PWA (Progressive Web App). Podés instalarlo en tu celular como una app nativa:

- **Android**: Chrome → Menú → "Instalar aplicación"
- **iPhone**: Safari → Compartir → "Agregar a pantalla de inicio"

La navegación en móvil tiene barra inferior con los accesos rápidos.

### 1.3 ¿A quién va dirigido?

| Perfil | Uso principal |
|--------|--------------|
| **Pastor** | Vista ejecutiva de todo el ministerio |
| **Coordinador** | Estrategia general y objetivos |
| **Supervisor General** | Gestión de zona completa |
| **Supervisor Auxiliar** | Supervisión de 3-5 grupos |
| **Líder** | Gestión de su célula semanal |
| **Administrador (Admin)** | Setup inicial y gestión de módulos |
| **Staff** | Soporte y administración de usuarios |

---

## 2. Acceso al Sistema

### 2.1 Requisitos

- Navegador web moderno (Chrome, Firefox, Edge, Safari) o app instalada
- Cuenta de usuario creada por un administrador o pastor
- Conexión a internet

### 2.2 Iniciar Sesión

1. Ir a la URL del sistema
2. Ingresar correo electrónico y contraseña
3. Click en "Iniciar sesión"

Al ingresar, el sistema te redirige automáticamente al dashboard correspondiente a tu nivel.

### 2.3 Roles y Permisos

El sistema usa **Control de Acceso Basado en Roles (RBAC)**:

| Rol | Nivel | Permisos |
|-----|-------|---------|
| **Admin** | 500 | Setup del sistema, gestión de módulos |
| **Pastor** | 400 | Acceso total al sistema y todos los módulos |
| **Staff** | 300 | Gestión de usuarios, invitaciones, configuración |
| **Supervisor** | 200 | Gestión de grupos, zonas, reportes |
| **Server** | 100 | Acceso básico según módulo asignado |
| **Member** | 0 | Solo su perfil y datos básicos |

> **Importante**: El **rol** (admin/pastor/staff...) es independiente del **nivel de discipulado** (Líder/Supervisor/Coordinador/Pastoral). Un miembro puede ser Líder de Grupo sin tener rol de staff.

**Restricciones visibles**:
- Las páginas muestran solo las opciones que el usuario puede usar.
- Los botones de crear/editar/eliminar aparecen solo si tenés el nivel correcto.
- El menú lateral se adapta a tu rol y los módulos instalados.

---

## 3. Funcionalidades por Rol

### 3.1 Pastor — Dashboard Ejecutivo

Acceso completo a todo el sistema. Su dashboard muestra:

| Tab | Contenido |
|-----|-----------|
| **Vista General** | Gráficas de tendencias, distribución por zonas, KPIs globales |
| **Estratégico** | Objetivos activos con barras de progreso |
| **Aprobaciones** | Reportes enviados que esperan aprobación |
| **Alertas** | Alertas activas (críticas y de celebración) |
| **Salud del Sistema** | Asistencia promedio, salud espiritual, liderazgo, multiplicaciones |

**Acceso**: Loguearse → ir a "Discipulado" → Dashboard aparece automáticamente.

---

### 3.2 Coordinador — Dashboard Estratégico

| Tab | Contenido |
|-----|-----------|
| **Resumen** | KPIs de sus zonas |
| **Supervisores** | Lista de supervisores a cargo |
| **Objetivos** | Gestión de objetivos estratégicos |
| **Reportes** | Reportes pendientes de revisión |

---

### 3.3 Supervisor General — Dashboard Zonal

- Vista consolidada de todos los grupos en su zona
- Reportes mensuales de sus supervisores auxiliares
- Identificación de grupos que necesitan atención

---

### 3.4 Supervisor Auxiliar — Dashboard de Supervisión

- Supervisión de 3-5 grupos asignados
- Reportes quincenales
- Alertas de grupos bajo su cargo

---

### 3.5 Líder — Dashboard de Grupo

- Su grupo de discipulado con lista de miembros
- Formulario de reporte semanal
- Historial de asistencia

---

## 4. Módulo de Discipulado — Guía Completa

### 4.1 Jerarquía

```
Pastor (Nivel 5)
    ↓
Coordinador (Nivel 4)
    ↓
Supervisor General (Nivel 3)
    ↓
Supervisor Auxiliar (Nivel 2)
    ↓
Líder de Grupo (Nivel 1)
```

### 4.2 Registrar Reporte Semanal (Líder)

El reporte semanal tiene **4 secciones**:

**Sección 1 — Asistencia de la Reunión**
- Asistencia Nuevos Discípulos (ND)
- Asistencia Discípulos Maduros (DM)
- Invitados/Amigos
- Niños

**Sección 2 — Actividad del Grupo**
- Grupos de discipulado realizados
- Salidas de evangelismo
- Seguimiento a discípulos nuevos (líder)
- Seguimiento a discípulos maduros (líder)

**Sección 3 — Compromiso del Líder**
- Días de diario espiritual
- Evangelismo personal
- Asistencia al servicio dominical ✓/✗
- Asistencia a oración ✓/✗
- Asistencia a doctrina ✓/✗

**Sección 4 — Estado del Grupo**
- ¿Está el grupo en proceso de multiplicación? (checkbox)

**Pasos**:
1. Dashboard → "Enviar Reporte"
2. Completar las 4 secciones
3. Click en "Enviar"

El sistema calcula automáticamente la **salud espiritual del grupo** con estos 13 datos (más activos = mayor salud).

---

### 4.3 Fases de un Grupo

Cada grupo tiene una fase calculada automáticamente según su historial de reportes:

| Fase | Icono | Criterio |
|------|-------|---------|
| **Germinando** | 🌱 | Menos de 4 reportes totales |
| **Creciendo** | 🌿 | 4 o más reportes totales |
| **Sólido** | 💎 | 24+ reportes, 12+ con alta salud espiritual |
| **Multiplicando** | 🔥 | Marcado "en multiplicación" en 2+ reportes recientes |
| **Necesita apoyo** | ⚠️ | Tiene alertas críticas activas sin resolver |

La fase se muestra como badge de color en la lista de grupos.

---

### 4.4 Sistema de Alertas

Las alertas se generan automáticamente para notificar situaciones importantes:

**Alertas Críticas** (requieren acción pastoral):

| Tipo | Cuándo se genera |
|------|-----------------|
| 📋 Sin Reportes | El grupo no envió reportes en 2 semanas |
| 📉 Asistencia Baja | Asistencia promedio < 50% por 4 semanas |
| ⬇️ Declive Espiritual | Salud espiritual < 5 por 4 semanas consecutivas |
| 🔄 Sin Crecimiento | Sin métricas de crecimiento en el período |

**Alertas de Celebración** (buenas noticias):

| Tipo | Cuándo se genera |
|------|-----------------|
| 🏆 Hito de Consistencia | Racha sostenida de reportes regulares |
| ⭐ Campeón de Evangelismo | Destacado en métricas de evangelismo |
| 💪 Grupo Sólido | Grupo clasificado como sólido |

**Cómo resolver una alerta**:
1. Dashboard Pastoral → Tab "Alertas"
2. Click en la alerta
3. Revisar detalles (grupo, zona, mensaje)
4. Click en "Resolver"

Las alertas de celebración se muestran con badge verde y ícono 🎉.

---

### 4.5 Objetivos Estratégicos

Los objetivos permiten establecer metas concretas y seguir su progreso:

**Tipos de objetivo**:
- **Asistencia**: Meta de asistencia promedio
- **Crecimiento**: Nuevos miembros o conversiones
- **Multiplicación**: Grupos que se multiplican
- **Espiritual**: Temperatura espiritual promedio

**Prioridades**: Alta (rojo), Media (naranja), Baja (amarillo)

**Estados**:
- **Activo**: En curso
- **Completado**: Meta alcanzada
- **Extendido**: Se amplió el plazo
- **Cerrado**: Cerrado sin completar

**Barra de progreso por color**:
- 🟢 Verde: > 75% completado
- 🔵 Azul: 50-75%
- 🟡 Amarillo: 25-50%
- 🔴 Rojo: < 25%

**Acciones disponibles**:
- **Extender plazo**: Si el objetivo necesita más tiempo
- **Cerrar incompleto**: Si se decide no continuar
- **Auto-actualizar progreso**: Calcula progreso automáticamente desde los datos del sistema

---

### 4.6 Gestionar Grupos

**Crear grupo** (Supervisor o superior):
1. Discipulado → "Grupos"
2. Click en "Nuevo Grupo"
3. Completar: nombre, líder asignado, zona, día y hora de reunión
4. Guardar

**Fases visibles** en la lista: Cada grupo muestra su fase (🌱🌿💎🔥⚠️).

**Agregar miembros** a un grupo:
1. Click en el grupo → "Ver Miembros"
2. Click en "Agregar Miembro"
3. Seleccionar usuario del sistema

---

### 4.7 Gestionar Jerarquía

**Asignar un usuario a la jerarquía**:
1. Discipulado → "Jerarquía"
2. Seleccionar usuario
3. Asignar nivel (1-5) y supervisor directo
4. Guardar

> Esto es diferente al rol del sistema (admin/pastor/staff). La jerarquía define el nivel dentro del módulo de discipulado.

---

### 4.8 Flujo de Reportes por Nivel

| Nivel | Tipo de reporte | Frecuencia | Aprueba |
|-------|----------------|-----------|---------|
| Líder (1) | Reporte de grupo | Semanal | Sup. Auxiliar |
| Sup. Auxiliar (2) | Consolidación de grupos | Quincenal | Sup. General |
| Sup. General (3) | Consolidación de zona | Mensual | Coordinador |
| Coordinador (4) | Consolidación regional | Trimestral | Pastor |
| Pastor (5) | Dashboard ejecutivo | Siempre disponible | — |

---

## 5. Módulo de Zonas

### 5.1 ¿Qué es una zona?

Una zona es una **división geográfica** que agrupa grupos de discipulado. Permite visualizar la distribución del ministerio en un mapa.

### 5.2 Crear zona (Staff o superior)

1. Discipulado → "Zonas"
2. Click en "Nueva Zona"
3. Completar: nombre, descripción, color identificador
4. Guardar

### 5.3 Estados de los Grupos

| Estado | Descripción | Cuenta para estadísticas |
|--------|------------|------------------------|
| **Activo** | Funcionamiento regular | ✅ Sí |
| **Inactivo** | Suspendido temporalmente | ❌ No |
| **Multiplicando** | En proceso de división | ✅ Sí |

> Una zona aparece como "activa" solo si tiene al menos un grupo activo.

### 5.4 Ver Mapa de Zonas

1. Discipulado → "Zonas" → "Ver Mapa"
2. El mapa (Leaflet) muestra grupos por zona con sus coordenadas

---

## 6. Gestión de Usuarios

### 6.1 Crear Usuario (Staff o superior)

**Opción A — Creación directa** (tiene acceso inmediato):
1. "Usuarios" → "Nuevo Usuario"
2. Ingresar: nombre, correo, contraseña, rol
3. Click en "Crear"

**Opción B — Invitación por correo**:
1. "Usuarios" → "Invitar Usuario"
2. Ingresar correo y rol
3. El usuario recibe un correo con link de acceso

### 6.2 Editar Usuario

1. "Usuarios" → buscar usuario
2. Click en "Editar"
3. Modificar datos y guardar

> Solo staff y superior pueden editar usuarios. Un usuario siempre puede editar su propio perfil desde "Mi Perfil".

### 6.3 Perfil Personal

1. Menú → "Mi Perfil"
2. Editar nombre, foto, información de contacto
3. Guardar

---

## 7. Configuración del Sistema (Pastor / Admin)

### 7.1 Información de la Iglesia

1. "Configuración" → "Información de la Iglesia"
2. Editar: nombre, dirección, teléfono, correo
3. Guardar

### 7.2 Gestión de Módulos (Solo Admin)

Los módulos permiten activar o desactivar funcionalidades:

| Módulo | Qué habilita |
|--------|-------------|
| **Discipulado** | Grupos, jerarquía, reportes, alertas, objetivos |
| **Zonas** | Gestión geográfica y mapa |
| **Eventos** | Calendario de eventos (próximamente) |
| **Reportes** | Módulo de reportes avanzados (próximamente) |

Para activar/desactivar: "Gestión de Módulos" → Toggle del módulo.

---

## 8. Preguntas Frecuentes

### ¿Olvidé mi contraseña?

Contactar al pastor o administrador del sistema para restablecer el acceso.

### ¿No puedo ver cierta función o página?

El sistema oculta funciones según tu rol. Si creés que necesitás acceso a algo, contactar a tu pastor o administrador.

### ¿El reporte no se envía?

Verificar que todos los campos numéricos estén completos. La conexión a internet debe estar activa.

### ¿Por qué el grupo no muestra datos en el dashboard?

El dashboard se alimenta de los reportes semanales. Si el líder no envió reportes aún, los indicadores mostrarán cero. Enviar al menos 1 reporte para ver datos.

### ¿Qué significa "Temperatura Espiritual"?

Es un indicador calculado automáticamente a partir de las 13 métricas del reporte semanal. No es un número que el líder ingresa — el sistema lo calcula según la actividad real reportada. Un grupo con todas sus métricas activas tiene temperatura 13/13 (máxima).

### ¿Qué son las alertas de "Celebración"?

Son notificaciones positivas que el sistema genera automáticamente cuando un grupo alcanza hitos importantes: consistencia en reportes, logros en evangelismo, o clasificación como grupo sólido. Aparecen con badge verde y ícono 🎉 en el dashboard.

---

## 9. Glosario

| Término | Significado |
|---------|------------|
| **Discipulado** | Sistema de formación de nuevos cristianos en grupos pequeños (células) |
| **Célula / Grupo** | Grupo pequeño que se reúne semanalmente para crecer espiritualmente |
| **Jerarquía** | Estructura de liderazgo de 5 niveles del módulo discipulado |
| **Zona** | División geográfica para organizar grupos |
| **Multiplicación** | Proceso de dividir un grupo cuando crece y está listo |
| **Temperatura Espiritual** | Indicador calculado de la salud del grupo (suma de 13 métricas activas) |
| **Fase de Grupo** | Estado calculado: Germinando → Creciendo → Sólido → Multiplicando |
| **RBAC** | Control de acceso basado en roles (Role-Based Access Control) |
| **PWA** | App web instalable en el celular como si fuera nativa |
| **isFullAccess** | Flag que tienen pastores y staff para ver todo el sistema |

---

## 10. Contacto y Soporte

Para asistencia técnica o problemas de acceso:

- **Administrador del sistema**: Pastor Daniel Rodríguez
- **Correo**: pastor@sionerp.local

---

_Manual actualizado en Mayo 2026. Incluye: sistema de alertas automáticas, fases de grupo, objetivos estratégicos, nuevo sistema de reportes JSONB y PWA._
