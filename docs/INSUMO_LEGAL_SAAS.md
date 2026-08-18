# Insumo técnico para ToS, EULA, Política de Privacidad y SLA — SionERP

> Este documento NO es un contrato ni tiene validez legal. Es el insumo técnico/factual — verificado contra el código real, no inventado — para que tu abogado redacte los cuatro documentos (Términos de Servicio, EULA, Política de Privacidad y Protección de Datos, SLA) sobre una base precisa de lo que SionERP hace hoy.

**Empresa que comercializa**: constituida en Venezuela.
**Mercado inicial**: iglesias en Venezuela, con expansión a otros países de LATAM sin definir todavía.

---

## 1. Qué es el producto (para el ToS/EULA)

SionERP es un sistema de gestión eclesiástica (SaaS, facturación mensual) para iglesias: administración de miembros, discipulado/células, zonas geográficas, eventos, reportes y (opcional) gestión de equipo de alabanza. Se vende por **módulos activables** — el cliente paga por lo que usa (Discipulado, Eventos, Reportes Avanzados, Música, etc.), el módulo Base (usuarios, roles, configuración) siempre está incluido.

Cada iglesia cliente es un **tenant** (inquilino) — importante para el ToS: quién es "el cliente" (la iglesia, representada por su administrador) y quién es "el usuario final" (cada miembro/líder con una cuenta dentro de esa iglesia) son roles legalmente distintos, relevante para el EULA.

---

## 2. Arquitectura de datos real (importante — corrige un documento interno desactualizado)

El `CLAUDE.md` del proyecto todavía describe la decisión de arquitectura original ("una base de datos PostgreSQL por iglesia, aislamiento físico total"). **Esa ya no es la arquitectura real.** Verificado contra el código de esta sesión (decenas de handlers backend, todos con el mismo patrón `WHERE church_id = $N`) y contra el proyecto Supabase de producción:

- **Es una base de datos compartida, con aislamiento lógico por fila** (`church_id` en cada tabla + Row Level Security de Postgres), no una base física separada por iglesia.
- El acceso a cada request pasa por un middleware que fuerza el scope al `church_id` del usuario autenticado.

Esto **no es necesariamente peor** para el cliente (RLS bien implementado es un estándar de la industria, lo usan la mayoría de los SaaS multi-tenant), pero la Política de Privacidad y el SLA tienen que describir el aislamiento **como es** ("aislamiento lógico mediante políticas de seguridad a nivel de fila, reforzado por middleware de autorización") y no como "base de datos físicamente separada por cliente", porque esa segunda frase sería una afirmación falsa con consecuencias si alguna vez hay un incidente de seguridad.

---

## 3. Inventario de datos personales recolectados

Campos que el sistema efectivamente guarda sobre las personas (miembros de la iglesia), verificado contra el modelo real (`users` + tablas de discipulado/música):

**Identificación y contacto**: nombre, apellido, cédula/documento de identidad, email, teléfono, WhatsApp (sí/no), dirección física.

**Datos demográficos**: fecha de nacimiento, estado civil, ocupación, nivel educativo.

**Datos religiosos/eclesiásticos** — ⚠️ en la mayoría de los marcos de protección de datos (GDPR, y por extensión buena parte de la doctrina LATAM) esto se trata como **categoría especial/sensible**, con requisitos de consentimiento reforzado: estado de bautismo y fecha, "cómo conoció la iglesia", interés en ministerio, grupo celular, notas pastorales (texto libre — potencialmente el campo más sensible de todo el sistema, lo carga el pastor/staff sobre un miembro), nivel jerárquico de discipulado.

**Geolocalización**: coordenadas de check-in (usuarios y grupos/células), usadas para el mapa. Esto es dato de ubicación, sensible en la mayoría de los marcos.

**Datos de uso/operación**: asistencia a reuniones/cultos, reportes semanales de líderes, auditoría de cambios (triggers de auditoría activos sobre las tablas más críticas: alertas, metas, reportes, perfiles de usuario).

**Contacto de emergencia**: nombre y teléfono de un tercero (la persona de emergencia no es usuaria del sistema — dato de un tercero recolectado indirectamente, punto que tu abogado va a querer mirar).

**Módulo Música (si el cliente lo activa)**: instrumento que toca cada integrante, disponibilidad/indisponibilidad declarada por fecha.

---

## 4. Terceros que procesan datos (subencargados del tratamiento)

Confirmado en el código y en la config de despliegue:

- **Supabase** — base de datos (Postgres), autenticación (JWT) y backups. ⚠️ Falta confirmar con precisión la región del proyecto de Supabase en uso (US/EU/otra) — esto determina si hay transferencia internacional de datos, dato que tu abogado necesita para la Política de Privacidad.
- **Vercel** — hosting del frontend (despliegue confirmado activo en este repo).
- **Resend** — envío de emails transaccionales (invitaciones, notificaciones). Confirmado en `apps/backend-go/emails/service.go` y `config/email.go`.
- **SMS**: hay un toggle de "notificaciones por SMS" en Configuración, pero **no hay ningún proveedor de SMS integrado en el código** (no hay Twilio ni equivalente) — es una opción de UI sin funcionalidad real todavía. No debería aparecer como subencargado activo hasta que se implemente.

---

## 5. Medidas de seguridad técnicas ya implementadas

Para el SLA y la sección de seguridad de la Política de Privacidad, esto SÍ está confirmado en producción:

- HTTPS forzado + HSTS (1 año, vía middleware `Secure` de Echo) — todo el tráfico rechaza HTTP plano.
- Autenticación JWT vía Supabase Auth.
- Row Level Security a nivel de base de datos + middleware de autorización por rol/jerarquía en cada endpoint.
- Comparación de claves de API en tiempo constante (`crypto/subtle.ConstantTimeCompare`) para la integración con terceros (Provider API).
- Triggers de auditoría en las tablas de negocio más críticas (alertas, metas, reportes, perfiles).
- Backups automáticos diarios vía Supabase (**retención de 7 días si el plan es el gratuito** — esto es un dato de negocio, no técnico: si van a vender con una promesa de retención de backup mayor a 7 días, hay que confirmar en qué plan de Supabase está corriendo producción).

---

## 6. Borrado automático de datos (implementado 2026-08-11)

**Ya no es una promesa a futuro — está construido y probado.** Cuando una iglesia se da de baja:

1. Provider API marca el tenant como `status = 'cancelled'`, `cancelled_at = NOW()` (`POST /provider/tenants/:id/cancel`).
2. Un scheduler corre una vez por día (`StartTenantPurgeScheduler`, `apps/backend-go/handlers/scheduler.go`) y busca tenants cancelados hace más de **30 días** (`TenantPurgeGraceDays` — período de gracia elegido por el negocio, no una restricción técnica, se puede ajustar) que todavía no fueron purgados.
3. Para cada uno, `purgeChurchData` borra en una sola transacción TODOS los datos de esa iglesia — las 42 tablas con `church_id` de la base (usuarios, discipulado, música, zonas, reportes, auditoría, todo). Si algo falla en el medio, la transacción entera se revierte: nunca queda un borrado parcial.
4. La fila de `churches` NO se borra — queda como tombstone (id/name/status/`deleted_at`) para poder demostrar auditoría: "esta iglesia canceló el [fecha], sus datos se borraron el [fecha]". El tombstone no contiene datos personales de ningún miembro.
5. Si la iglesia se reactiva dentro de los 30 días (`POST /provider/tenants/:id/reactivate`), el borrado se cancela — vuelve a `status='active'` y el scheduler la excluye.

Verificado con un test de integración real (`tenant_purge_test.go`) contra la base: borra todo lo del tenant cancelado, no toca ni una fila de otro tenant.

**Para el ToS/Política de Privacidad**: ahora sí podés prometer un plazo concreto de borrado post-cancelación (30 días desde la cancelación formal). Lo que tu abogado todavía tiene que definir es si ese número (30 días) es el que quieren comprometer contractualmente, o si prefieren dejarlo en un rango ("hasta 30 días") por margen operativo.

**Lo que sigue sin existir**: un endpoint de **exportación** de datos (portabilidad) — si el contrato promete "exportá tu información cuando quieras", hoy eso todavía se resuelve manualmente vía soporte, no self-service. Tampoco hay un "reporte de todos mis datos" para que un usuario final lo pida directamente desde la app (aunque las tablas críticas sí tienen auditoría de cambios).

---

## 7. Ciclo de vida de cuenta (para el ToS)

- Alta de una iglesia: vía Provider API (`CreateTenant`), con link de activación por email (dinámico, dominio configurable vía `FRONTEND_URL`).
- Cada iglesia tiene `status` (activo/suspendido) y `plan` — existe endpoint de **suspensión y reactivación** de tenant (relevante para la cláusula de "qué pasa si no pagás").
- Un tenant suspendido bloquea el login de sus usuarios (verificado en `middleware/auth.go`).
- Activación/registro de usuarios finales dentro de una iglesia: por invitación (con el mismo modal, ya sea invitación directa o automática al asignarlos a un módulo).

---

## 8. Contexto legal de Venezuela — para que tu abogado lo tenga presente

Esto no es asesoría legal, es contexto que como no-abogado me parece relevante no omitir: Venezuela **no tiene todavía una ley integral de protección de datos personales** equivalente al GDPR europeo o a la LGPD brasileña. La protección hoy se apoya principalmente en el derecho constitucional de **habeas data** (Art. 28 CRBV) y en normativa sectorial dispersa, no en un estatuto único y detallado. Esto le da a tu abogado más libertad para definir contractualmente los términos (porque hay menos un piso legal obligatorio que replicar), pero también significa que si en algún momento venden a iglesias en países con marcos más estrictos (México con su LFPDPPP, Colombia con su Ley 1581, o cualquier país con ley tipo GDPR), la Política de Privacidad va a necesitar una capa adicional específica para esos mercados — no alcanza con una sola política genérica LATAM.

---

## 9. Lo que queda 100% en manos de tu abogado (no technical input posible)

- Jurisdicción y mecanismo de resolución de disputas (tribunales vs. arbitraje).
- Moneda de facturación y tratamiento de mora/cancelación.
- Límites de responsabilidad e indemnización.
- Redacción exacta del consentimiento reforzado para los datos religiosos/sensibles (punto 3).
- El plazo de retención post-cancelación ya está definido e implementado (30 días, punto 6) — lo que falta es la redacción contractual exacta y si van a comprometerlo como número fijo o como máximo. Sigue abierto qué pasa con los **backups** de Supabase de una iglesia dada de baja (el borrado alcanza las tablas en vivo, no necesariamente copias de backup ya tomadas antes del borrado — confirmar con Supabase cuál es su propia política de retención/purga de backups).
- Si van a requerir un DPA (Data Processing Agreement) formal con Supabase/Vercel/Resend, más allá de sus ToS estándar como proveedores.

---

*Generado a partir de una revisión directa del código de SionERP (branch `develop`, commit `2c63073`) — no de la documentación interna del proyecto, que en el punto 2 estaba desactualizada.*
