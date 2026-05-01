# MÓDULO DE DISCIPULADO — DOCUMENTO VIVO

> **Última actualización:** 2026-05-01
> **Estado:** En desarrollo activo
> **Nota:** Este documento se ACTUALIZA con cada decisión importante del módulo.

---

## 1. VISIÓN GENERAL

El módulo de discipulado gestiona células de discipulado en una jerarquía de 5 niveles, con reportes semanales que alimentan métricas de salud espiritual, multiplicación y crecimiento.

**Principio fundamental:** Medimos lo que la gente **HACE**, no lo que la gente **DICE**. Todas las métricas de salud espiritual se calculan a partir de acciones reportadas, nunca de auto-evaluación subjetiva.

---

## 2. JERARQUÍA DE ROLES

| Nivel | Rol | Reporta a | Frecuencia |
|-------|-----|-----------|------------|
| 1 | Líder de Grupo | Supervisor Auxiliar | Semanal |
| 2 | Supervisor Auxiliar | Supervisor General | Quincenal |
| 3 | Supervisor General | Coordinador | Mensual |
| 4 | Coordinador | Pastor | Trimestral |
| 5 | Pastor | — | Dashboard ejecutivo |

---

## 3. REPORTE SEMANAL DEL LÍDER (Fuente de Verdad)

### 3.1 Tabla: `discipleship_reports`

```
id              UUID
reporter_id     UUID → users.id
report_type     TEXT (='leader')
report_level    INT  (=1)
period_start    DATE
period_end      DATE
status          ENUM (draft/submitted/approved/revision_required)
report_data     JSONB ← acá van todas las métricas
```

### 3.2 Campos del `report_data` (LeaderReportModal)

El líder reporta 3 secciones cada semana:

#### SECCIÓN A: Métricas del Grupo (reunión de discipulado)

| Campo | Tipo | Qué mide |
|-------|------|----------|
| `attendance_nd` | int | Nuevos discípulos en la reunión |
| `attendance_dm` | int | Discípulos maduros presentes |
| `attendance_friends` | int | Amigos/visitantes |
| `attendance_kids` | int | Niños presentes |
| `group_discipleships` | int | Discipulados realizados en el grupo esta semana |
| `group_evangelism` | int | Personas evangelizadas por el grupo |

#### SECCIÓN B: Vida Personal del Líder

| Campo | Tipo | Qué mide |
|-------|------|----------|
| `leader_new_disciples_care` | int | Atención 1-1 a nuevos discípulos |
| `leader_mature_disciples_care` | int | Atención 1-1 a discípulos maduros |
| `spiritual_journal_days` | int | Días de diario espiritual esta semana |
| `leader_evangelism` | int | Evangelismo personal del líder |

#### SECCIÓN C: Asistencia Congregacional

| Campo | Tipo | Qué mide |
|-------|------|----------|
| `service_attendance_sunday` | bool | ¿Asistió al servicio dominical? |
| `service_attendance_prayer` | bool | ¿Asistió al servicio de oración (viernes)? |
| `doctrine_attendance` | bool | ¿Asistió a doctrina? |

**Total: 13 métricas por semana** (10 numéricas + 3 booleanas)

---

## 4. TEMPERATURA ESPIRITUAL OBJETIVA

### 4.1 Filosofía

El `spiritual_temperature` antiguo era un campo subjetivo del 1-10 que el líder decidía arbitrariamente. **Ya no se usa.**

La nueva temperatura espiritual se **calcula automáticamente** a partir de las acciones que el líder reporta. El líder NO elige su temperatura — sus acciones la determinan.

### 4.2 Fórmula de Cálculo

**Por semana:** Cada métrica numérica > 0 = 1 punto. Cada booleano = true → 1 punto.

```
Puntos semanales = count(métricas > 0) + count(booleanos true)
Máximo posible = 13 puntos por semana
```

**Por trimestre (~12 semanas):** Se suman los puntos de las últimas 12 semanas.

```
Puntos trimestrales = SUM(puntos_semanales) para las últimas 12 semanas
Máximo teórico = 156 puntos (13 × 12)
```

### 4.3 Escala de Temperatura (trimestral)

| Rango de puntos | Temperatura | Interpretación |
|-----------------|-------------|---------------|
| 140–156 | 🔥 **10** | Fuego puro, consistente |
| 120–139 | 🔥 **9** | Muy activo |
| 100–119 | 🌟 **8** | Sólido y constante |
| 80–99 | 🌟 **7** | Bien, con áreas de mejora |
| 60–79 | 🌱 **6** | Funcionando, puede crecer |
| 40–59 | ⚠️ **5** | Necesita atención |
| 20–39 | 🚨 **4** | En riesgo |
| 0–19 | 🔴 **≤3** | Crítico, intervención pastoral |

### 4.4 Por qué esto funciona

1. **No se puede manipular:** El líder no controla el número, solo controla sus acciones semanales.
2. **Refleja realidad:** Si un grupo mantiene 8+ por 12 semanas, ES un grupo sano. No hay debate.
3. **Señala áreas específicas:** Se puede mostrar "tu temperatura bajó porque esta semana no hubo evangelismo ni servicio de oración".
4. **Captura el 1-1 implícitamente:** Si `leader_new_disciples_care` y `leader_mature_disciples_care` son consistentes > 0, el discipulado 1-1 está ocurriendo. No hace falta un sistema separado.

### 4.5 Nota sobre el servicio de oración (viernes)

El `service_attendance_prayer` **NO genera alertas negativas por sí solo**. Es entendible que no todos puedan asistir los viernes (trabajo, familia). Se muestra como métrica informativa en el dashboard pero no penaliza la temperatura espiritual de forma agresiva.

---

## 5. FASES DEL GRUPO (Group Phase)

Los grupos pasan por fases naturales. NO es "multiplicando = bueno, no multiplicando = malo". Cada fase tiene su valor.

### 5.1 Fases

| Fase | Significado | Cálculo automático |
|------|-------------|-------------------|
| `germinating` | Grupo nuevo, formando base (< 4 semanas) | Primeros reportes |
| `growing` | Creciendo estable, asistencia subiendo | attendance_nd > 0 en 4+ semanas |
| `solid` | Maduro, consistente (> 24 semanas, temp ≥ 7) | Temperatura ≥ 7 por 24+ semanas |
| `multiplying` | Formando nuevo grupo, dividiéndose | Líder marca `is_multiplying = true` en 2+ reportes |
| `at_risk` | Necesita apoyo activo | Alertas activas > 4 semanas |

### 5.2 Visualización equitativa

Todos los grupos muestran su fase con badge de igual peso visual:

- 🟢 **Sólido** — "Columna vertebral del ministerio"
- 🟡 **Creciendo** — "En progreso, buen ritmo"
- 🟠 **Multiplicando** — "Dando fruto, expandiéndose"
- 🔵 **Germinando** — "Naciendo, formando base"
- 🔴 **Necesita apoyo** — "Oportunidad de ayuda" (NO fracaso)

### 5.3 Métricas del dashboard (todas con igual importancia)

- Grupos sólidos este trimestre 🏆
- Grupos multiplicando 🌟
- Grupos germinando 🌱
- Grupos que necesitan apoyo 🤝
- Temperatura promedio general
- Líderes activos

---

## 6. SISTEMA DE ALERTAS

### 6.1 Alertas automáticas (basadas en reportes)

| Alerta | Trigger | Acción sugerida |
|--------|---------|-----------------|
| 🔴 `critical_low` | avg attendance total ≤ 3 por 12 semanas | Pastor contacta líder |
| 🟡 `no_growth` | 0 attendance_nd + 0 group_evangelism por 8 semanas | Ofrecer apoyo evangelismo |
| 🟡 `spiritual_decline` | temperatura calculada < 5 por 4 semanas seguidas | Revisión pastoral |
| 🟢 `needs_encouragement` | 4 semanas sin reporte | Recordatorio amable |

### 6.2 Alertas de celebración (nuevo)

No todo es problema. También celebramos:

| Alerta | Trigger |
|--------|---------|
| 🎉 `consistency_milestone` | 12 semanas consecutivas con reportes |
| 🎉 `growth_streak` | attendance_nd > 0 por 6 semanas seguidas |
| 🎉 `evangelism_champion` | group_evangelism + leader_evangelism > 0 por 4 semanas |
| 🎉 `solid_group` | Temperatura ≥ 8 por 12 semanas |

### 6.3 Lo que NO genera alerta

- No asistir al servicio de oración (viernes) — es informativo, no penalizante
- Temperatura baja en primeras 4 semanas (grupo germinando)
- Un solo reporte faltante (puede ser viaje, enfermedad)

---

## 7. MULTIPLICACIÓN DE GRUPOS

### 7.1 Flujo

1. **Señal:** El líder marca `is_multiplying = true` en su reporte semanal (1 campo nuevo)
2. **Validación:** El sistema detecta 2+ reportes consecutivos con `is_multiplying = true`
3. **Notificación:** El supervisor/pastor recibe alerta "Grupo X indica estar en proceso de multiplicación"
4. **Decisión:** El pastor decide quién es el nuevo líder, cuándo dividir, cómo asignar territorio
5. **Registro:** Se crea entrada en `cell_multiplication_tracking` cuando la multiplicación se ejecuta

### 7.2 Indicadores automáticos de "listo para multiplicar"

Independientemente de lo que diga el líder, el sistema puede sugerir:

- Temperatura trimestral ≥ 8
- `attendance_dm` promedio ≥ 6 (hay discípulos maduros suficientes)
- `group_discipleships` > 0 en 8+ semanas (hay formación activa)
- Grupo en fase `solid` por 12+ semanas

Estos son **sugerencias**, no decisiones automáticas.

### 7.3 Tabla: `cell_multiplication_tracking`

```
id                   UUID
parent_group_id      UUID → discipleship_groups.id
parent_leader_id     UUID → users.id
new_group_id         UUID → discipleship_groups.id (nullable hasta que se cree)
new_leader_id        UUID → users.id (nullable hasta que se asigne)
multiplication_date  DATE
multiplication_type  TEXT (standard/planned/emergency)
success_status       TEXT (completed/pending/cancelled)
initial_members      INT
notes                TEXT
```

---

## 8. ARQUITECTURA DE BASE DE DATOS (Estado Actual)

### 8.1 Tablas Core

```
users
  ├─ id, email, first_name, last_name, phone, role
  ├─ baptized, baptism_date, is_active_member
  ├─ discipleship_level (1-5)
  └─ zone_id (FK → zones.id)

discipleship_hierarchy
  ├─ id, user_id, hierarchy_level (1-5)
  ├─ supervisor_id (self-referential → users.id)
  ├─ zone_id, zone_name, territory
  ├─ active_groups_assigned
  └─ created_at, updated_at

discipleship_groups
  ├─ id, group_name, leader_id (FK → users.id)
  ├─ supervisor_id (FK → users.id)
  ├─ meeting_location, meeting_day, meeting_time
  ├─ member_count, active_members
  ├─ status (active/inactive)
  ├─ zone_name
  └─ created_at, updated_at

discipleship_reports
  ├─ id, reporter_id, report_type, report_level
  ├─ period_start, period_end
  ├─ status (draft/submitted/approved/revision_required)
  ├─ report_data (JSONB) ← métricas del líder
  └─ submitted_at, approved_at, created_at, updated_at

cell_multiplication_tracking
  ├─ id, parent_group_id, parent_leader_id
  ├─ new_group_id, new_leader_id
  ├─ multiplication_date, multiplication_type
  ├─ success_status, initial_members, notes
  └─ created_at, updated_at

zones
  ├─ id, name, territory, leader_id
  └─ created_at, updated_at
```

### 8.2 Tabla legacy (discipleship_metrics)

La tabla `discipleship_metrics` con `spiritual_temperature` subjetivo **sigue existiendo** pero está en desuso. Las nuevas métricas vienen de `discipleship_reports.report_data`.

---

## 9. DISCIPULADO 1-A-1

El discipulado 1-a-1 **no tiene formulario separado**. Se captura indirectamente a través de:

- `leader_new_disciples_care` — atención 1-1 a nuevos discípulos
- `leader_mature_disciples_care` — atención 1-1 a discípulos maduros

Si estos campos son consistentemente > 0 en los reportes, el discipulado 1-1 está ocurriendo.

**No hace falta dar acceso a cada miembro.** El líder reporta por el grupo y por su vida personal de discipulado.

---

## 10. DECISIONES DE DISEÑO

### 10.1 Temperatura espiritual = cálculo automático, NO auto-evaluación

**Problema:** El líder podía poner cualquier número del 1-10 sin fundamento.
**Solución:** La temperatura se calcula de las 13 métricas del reporte semanal.
**Por qué:** Medimos acciones, no sentimientos.

### 10.2 Multiplicación = señal del líder, decisión del pastor

**Problema:** ¿Quién decide cuándo un grupo se multiplica?
**Solución:** El líder marca `is_multiplying` en su reporte. El pastor decide cuándo y cómo.
**Por qué:** La multiplicación es una decisión pastoral, no un umbral automático.

### 10.3 Servicio de oración = informativo, no penalizante

**Problema:** Penalizar por no asistir los viernes es injusto (trabajo, familia).
**Solución:** Se muestra en dashboard pero no genera alertas negativas agresivas.
**Por qué:** Grace over guilt.

### 10.4 Fases del grupo = todas válidas, ninguna denigrante

**Problema:** Los grupos que no multiplican se sienten "menos".
**Solución:** Cada fase tiene su badge positivo. "Sólido" = columna vertebral, no "estancado".
**Por qué:** La consistencia es tan valiosa como la expansión.

---

## 11. PENDIENTES / POR HACER

- [ ] Agregar campo `is_multiplying` al reporte semanal del líder (LeaderReportModal)
- [ ] Implementar cálculo de temperatura espiritual objetiva en backend
- [ ] Crear vista/materialized view de temperatura trimestral por grupo
- [ ] Implementar cálculo automático de fase del grupo
- [ ] Crear sistema de alertas automáticas (críticas + celebración)
- [ ] Dashboard: mostrar fases del grupo con badges equitativos
- [ ] Dashboard: métricas de grupos sólidos TANTO como multiplicaciones
- [ ] Migrar dashboards para usar `discipleship_reports` en vez de `discipleship_metrics`

---

## 12. HISTORIAL DE CAMBIOS

| Fecha | Cambio |
|-------|--------|
| 2026-05-01 | Eliminada temperatura espiritual subjetiva. Nueva fórmula objetiva basada en 13 métricas del reporte semanal |
| 2026-05-01 | Documentado sistema de fases del grupo (germinating/growing/solid/multiplying/at_risk) |
| 2026-05-01 | Documentado flujo de multiplicación: señal del líder → decisión del pastor |
| 2026-05-01 | Documentadas alertas automáticas (críticas + celebración) |
| 2026-05-01 | Principio fundamental: medimos acciones, no sentimientos |
