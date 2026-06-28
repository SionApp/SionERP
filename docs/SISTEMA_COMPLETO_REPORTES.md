# Sistema Completo de Reportes — SionERP
## Flujo, Cálculos y Impacto

**Versión**: 1.0  
**Fecha**: Junio 2026  
**Propósito**: Documento técnico completo sobre cómo funcionan los reportes en SionERP — qué datos se envían, cómo se calculan, qué afectan, qué alertas generan.

**Audiencia**: Pastores, supervisores, desarrolladores que necesitan entender la lógica del sistema.

---

## Introducción: ¿Por Qué Este Documento?

SionERP es un sistema de **reportes en cascada**. Cada semana:
- Un **líder** reporta lo que pasó en su célula
- Un **auxiliar** suma esos reportes + reporta su propio trabajo
- Un **general** suma auxiliares + reporta su supervisión
- Un **coordinador** suma zonas + reporta visión regional
- El **pastor** ve todo agregado

Pero **¿cómo se agregan?** ¿**Qué significa cada número?** ¿**Por qué aparecen alertas?** Este documento responde todo eso.

---

## 1. LA JERARQUÍA: QUIÉN REPORTA A QUIÉN

```
NIVEL 5 — Pastor / Visión Estratégica
    ↑
NIVEL 4 — Coordinador (Regional/Zonal)
    ↑
NIVEL 3 — Supervisor General (Zona/Sector)
    ↑
NIVEL 2 — Supervisor Auxiliar (3–5 grupos)
    ↑
NIVEL 1 — Líder de Grupo (Una célula)
```

**Cada persona reporta UN vez por semana** (ISO week: lunes a sábado).  
**El supervisor aprueba ANTES de que afecte al dashboard.**

---

## 2. QUÉ REPORTA CADA NIVEL (LOS DATOS)

### NIVEL 1 — LÍDER DE GRUPO

Un líder envía **5 secciones** cada semana:

#### Sección 1: Asistencia de la Reunión
```
¿Cuántos asistieron?
├─ Nuevos Discípulos (ND)     [número]
├─ Discípulos Maduros (DM)    [número]
├─ Amigos/Invitados           [número]
└─ Niños                       [número]
```
**Fórmula de impacto**: Total de asistencia = ND + DM + Amigos + Niños

#### Sección 2: Actividad del Grupo
```
¿Qué pasó en el grupo?
├─ Discipulados realizados    [número de nuevas relaciones 1-a-1]
└─ Eventos de evangelismo     [número de salidas/conversaciones]
```

#### Sección 3: Vida del Líder
```
¿Cómo está espiritualmente el líder?
├─ Nuevos discípulos que cuida      [número]
├─ Discípulos maduros que cuida     [número]
├─ Días en diario espiritual        [0-7 días]
├─ Conversaciones de evangelismo    [número personal]
└─ Asistencia a servicios
    ├─ Domingo                      [Sí/No]
    ├─ Oración                      [Sí/No]
    └─ Doctrina                     [Sí/No]
```

#### Sección 4: Estado del Grupo
```
¿Se está reproduciendo?
└─ ¿En proceso de multiplicación?   [Sí/No]
```

#### Sección 5: Observaciones
```
Comentarios libres del líder
└─ Notas/desafíos/celebraciones     [texto]
```

---

### NIVEL 2, 3, 4 — SUPERVISORES Y COORDINADOR

Los supervisores reportan **diferente** — no reportan sobre su grupo, sino sobre su **supervisión**:

#### Sección 1: Trabajo de Supervisión
```
¿Qué hiciste como supervisor?
├─ Nuevos discípulos que supervisaste     [número]
├─ Subordinados que visitaste             [número de personas]
└─ Grupos personalmente visitados         [número de células]
```

#### Sección 2: Vida Espiritual del Supervisor
```
¿Cómo está espiritualmente?
├─ Días en diario espiritual              [0-7]
├─ Conversaciones de evangelismo personal [número]
└─ Asistencia a servicios
    ├─ Domingo                            [Sí/No]
    └─ Oración                            [Sí/No]
```

#### Sección 3: Métricas de la Zona (AUTO-CARGADAS)
```
¿Cuánto reportaron tus subordinados?
├─ Total Discipulados (zona)              [CALCULADO automáticamente]
└─ Total Evangelismo (zona)               [CALCULADO automáticamente]
```

**IMPORTANTE**: Estos números NO son "qué hizo el supervisor". Son la **suma de lo que reportaron los líderes de la zona**. El sistema los calcula automáticamente con `GetZoneRollup()`.

#### Sección 4: Comentarios
```
Observaciones sobre la zona
└─ Notas libres
```

---

## 3. EL "TERMÓMETRO ESPIRITUAL" — CÓMO SE MIDE LA SALUD

**El sistema cuenta puntos** para cada grupo basado en lo que el líder reporta:

```
¿Tiene ND?                      → +1 punto
¿Tiene DM?                      → +1 punto
¿Tiene invitados?               → +1 punto
¿Tiene niños?                   → +1 punto
¿Hizo discipulado grupal?       → +1 punto
¿Hizo evangelismo grupal?       → +1 punto
¿Líder cuida ND?                → +1 punto
¿Líder cuida DM?                → +1 punto
¿Líder hace diario espiritual?  → +1 punto
¿Líder hace evangelismo?        → +1 punto
¿Líder fue a domingo?           → +1 punto
¿Líder fue a oración?           → +1 punto
¿Líder fue a doctrina?          → +1 punto
                    MÁXIMO = 13 PUNTOS
```

**¿Qué significa el puntaje?**
```
13 puntos = Grupo EXCELENTE
8-12 puntos = Grupo SALUDABLE ✅
5-7 puntos = Grupo EN RIESGO ⚠️
0-4 puntos = Grupo EN DECLIVE 🚨
```

Este "termómetro" se calcula **automaticamente** cada vez que reporta un líder. Es lo que ves en los gráficos del dashboard bajo "Salud del Grupo".

---

## 4. EL FLUJO COMPLETO (Paso a Paso)

### LUNES: El Líder Envía su Reporte

```
Líder abre SionERP → Discipulado → "Nuevo Reporte"
         ↓
    Completa las 5 secciones
         ↓
    Click "Enviar"
         ↓
    El sistema:
    ├─ Guarda en discipleship_reports
    ├─ Calcula "Termómetro Espiritual" (0-13 puntos)
    ├─ Extrae valores automáticos para "Objetivos" (si hay)
    ├─ Actualiza report_compliance: marca como "on_time"
    ├─ Notifica al supervisor auxiliar: "Nuevo reporte para revisar"
    └─ Inicia cálculo automático de objetivos (en background)
```

---

### MARTES-JUEVES: El Supervisor Revisa

```
Supervisor Auxiliar abre → Discipulado → "Aprobaciones"
         ↓
    Ve los reportes "Pendientes" de sus líderes
         ↓
    Click "Ver" en uno
         ↓
    Lee el reporte y decide:
    ├─ Click "Aprobar" 
    │   ├─ Status → "approved"
    │   ├─ Notifica al líder: "Tu reporte fue aprobado"
    │   └─ Contribuye al rollup de zona
    │
    └─ Click "Rechazar"
        ├─ Status → "revision_required"
        ├─ Notifica al líder: "Tu reporte necesita cambios"
        └─ El líder reenvía ese reporte
```

---

### MIÉRCOLES-VIERNES: El Supervisor General Ve el Rollup

```
Supervisor General reporta SU PROPIA actividad de supervisión.
         ↓
    Cuando abre el modal de reporte, la sección "Métricas de Zona"
    se LLENA AUTOMÁTICAMENTE con:
    
    ├─ Total Discipulados = SUM(discipleships de líderes bajo mis auxiliares)
    ├─ Total Evangelismo = SUM(evangelismo grupal + evangelismo personal de líderes)
    └─ Líderes Contribuyentes = COUNT(DISTINCT líderes que reportaron)
```

**¿De dónde salen estos números?** → `GetZoneRollup()` consulta:
- Todos los líderes bajo MIS auxiliares (2 niveles abajo)
- Sus reportes APROBADOS
- Suma discipleships + evangelismo

**NO es cumulative.** Si reporto en la semana W26:
- Solo cuento reportes de W26
- Líderes de W25 NO se suman
- W27 es una semana nueva

---

### SÁBADO: Cierre Semanal (Automático)

```
23:00 (11 PM) — El sistema automáticamente:

Para cada (usuario, semana ISO):
  IF no hay reporte enviado {
    Marca como "missed"
    Incrementa missed_count
  } ELSE IF reporte enviado DESPUÉS de Sábado 23:59 {
    Marca como "late" (no "on_time")
  }
  
Resultado: report_compliance genera "Cumplimiento de Reportes"
```

---

## 5. AUTOMÁTICO: CÓMO AFECTAN LOS REPORTES A LOS OBJETIVOS

### Mapeo Automático (Cuando se Habilita)

Si un **Objetivo** tiene `measurement_type = 'automatic'`, el sistema **extrae automáticamente** un valor de cada reporte:

```
Objetivo tipo "Asistencia"
  → Extrae: attendance_nd + attendance_dm + attendance_friends + attendance_kids

Objetivo tipo "Crecimiento"
  → Extrae: leader_new_disciples_care

Objetivo tipo "Evangelismo"
  → Extrae: group_evangelism + leader_evangelism

Objetivo tipo "Multiplicación"
  → Extrae: is_multiplying (Sí→1, No→0)

Objetivo tipo "Salud Espiritual"
  → Extrae: spiritual_journal_days (0-7)

Objetivo tipo "Personalizado"
  → No extrae nada (debe ser manual)
```

### 3-Paso Upward Aggregation (Lo Que Subes)

```
1. Se extrae el valor individual del reporte
   ↓
2. Se suma al objetivo del líder
   ├─ Hoja: "mi objetivo personal"
   ├─ Rama: "mi auxiliar supervisa esto"
   └─ Raíz: "mi general ve el total"
   ↓
3. Automáticamente sube
   ├─ Mi valor → Objetivo del Auxiliar que me supervisa
   ├─ Suma del Auxiliar → Objetivo del General
   └─ Suma del General → Objetivo del Coordinador
```

**Ejemplo**:
- Semana W26: Líder Juan reporta 5 nuevos discípulos en su célula
- Sistema extrae: `new_disciples_care = 5`
- Objetivo "Crecimiento" de Juan: sube a 5
- Objetivo "Crecimiento" del Auxiliar Pedro (que supervisa a Juan): sube con el +5
- Objetivo "Crecimiento" del General: recibe los +5
- Dashboard del General muestra: "Total de nuevos discípulos bajo mi supervisión: 120"

---

## 6. APROBACIÓN Y COMPLIANCE (QUIÉN CUMPLEN)

### Tabla `report_compliance`

El sistema mantiene un registro de **quién reportó cuándo**:

```
┌─────────┬──────────┬──────────┬──────────┐
│ Usuario │ Semana   │ Estado   │ Detalles │
├─────────┼──────────┼──────────┼──────────┤
│ Juan    │ W26      │ on_time  │ Enviado lunes
│ Juan    │ W25      │ on_time  │ Enviado martes
│ Juan    │ W24      │ missed   │ Nunca envió
│ Juan    │ W23      │ late     │ Enviado el lunes después
│ Pedro   │ W26      │ pending  │ Aún no reporta (es sábado 10 AM)
└─────────┴──────────┴──────────┴──────────┘

Columna "Estado":
  pending  = Falta esta semana (aún es sábado antes de 23:59)
  on_time  = Envió de lunes a sábado 23:59
  late     = Envió después de sábado 23:59
  missed   = No envió nunca esa semana
```

### Missed Count (Faltas Acumuladas)

El sistema **recomputa automáticamente** cada vez que reportas:

```
missed_count = COUNT(filas con estado='missed' para este usuario)

Si Juan tiene:
  ├─ W26 = on_time
  ├─ W25 = on_time
  ├─ W24 = missed  ← cuenta 1
  ├─ W23 = late
  ├─ W22 = missed  ← cuenta 2
  └─ W21 = missed  ← cuenta 3
  
  missed_count = 3
```

**¿Por qué importa?** → Cuando `missed_count >= 3`, se genera una **alerta de escalación** al supervisor del supervisor.

---

## 7. EL PANEL "CUMPLIMIENTO" (¿Quién Faltó?)

### Lo Que Ve Cada Supervisor

Cada supervisor tiene un tab "Cumplimiento" que muestra:

```
CUMPLIMIENTO DE REPORTES — Últimas 8 semanas

Líder             │ W26 │ W25 │ W24 │ W23 │ W22 │ W21 │ W20 │ W19 │ Faltas
──────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼────────
Juan Pérez        │  ✅ │  ✅ │  ✅ │  ✅ │  ✅ │  ✅ │  ✅ │  ✅ │ 0
María García      │  ✅ │  ✅ │  ⏰ │  ✅ │  ✅ │  ✅ │  ✅ │  ✅ │ 1
Carlos López      │  ✅ │  ❌ │  ❌ │  ✅ │  ❌ │  ✅ │  ✅ │  ✅ │ 3 🚨

Colores:
  ✅ = on_time (verde)
  ⏰ = late (amarillo)
  ❌ = missed (rojo)
  ? = pending (gris)
  
  🚨 = 3+ faltas → ESCALACIÓN ENVIADA
```

### Notificaciones de Cumplimiento

Cuando alguien falta:
```
1ª falta (W24) → Notificación al líder: "Faltó tu reporte de W24"
2ª falta (W22) → Notificación al líder: "Ahora tienes 2 faltas"
3ª falta (W21) → Notificación DOBLE:
                 ├─ Al líder: "Tienes 3 faltas — contacta a tu supervisor"
                 └─ Al supervisor del supervisor (escalación)
```

---

## 8. ALERTAS AUTOMÁTICAS (¿Cuándo Se Disparan?)

El sistema genera **7 reglas de alerta** automáticamente cada noche:

### ALERTAS CRÍTICAS (Rojo 🔴 — Atención Requerida)

#### 1. "Sin Reportes en 2 Semanas"
```
IF grupo NO tiene reporte en últimos 14 días {
  Crea alerta: "Este grupo no ha reportado hace 2 semanas"
  Notifica a: Supervisor del grupo
  Acción: "Ver grupo y contactar al líder"
}
```

#### 2. "Asistencia Muy Baja"
```
IF grupo tiene miembros AND asistencia promedio < 50% del miembro count {
  Crea alerta: "Asistencia baja — revisar retención"
  Ejemplo: "10 miembros, promedio 3 asistentes = 30%"
}
```

#### 3. "Declive Espiritual" 
```
IF grupo tiene "termómetro espiritual" promedio < 5 en últimos 28 días {
  Crea alerta: "Grupo en declive espiritual"
  Razón: Muy pocos eventos, poca visitación, bajo diario espiritual
}
```

#### 4. "Sin Crecimiento en 8 Semanas"
```
IF grupo NO tiene discipleship O evangelism en últimos 56 días {
  Crea alerta: "Grupo estancado — necesita estrategia"
}
```

---

### ALERTAS CELEBRATORIAS (Verde 🟢 — Celebración)

#### 5. "12 Semanas Consistente"
```
IF grupo reportó 12+ semanas seguidas (84 días) sin faltar {
  Crea alerta: "¡Grupo consistente! 12 semanas reportando"
}
```

#### 6. "Campeones de Evangelismo"
```
IF grupo reportó evangelismo 4+ veces en últimas 4 semanas {
  Crea alerta: "¡Evangelismo activo! Celebremos el fruto"
}
```

#### 7. "Grupo Sólido"
```
IF grupo tuvo "termómetro espiritual" >= 8 puntos 12+ veces en 84 días {
  Crea alerta: "¡Grupo sólido espiritualmente!"
}
```

---

## 9. DASHBOARDS: QUÉ VE CADA NIVEL

### NIVEL 1 (Líder) VE:
```
┌─ Mi Célula ──────────────────────┐
│ • Miembros: 8 (7 activos)        │
│ • Asistencia prom: 85%           │
│ • Próxima reunión: Dom 2pm       │
│ • Estado: Reporte enviado W26 ✅ │
│                                   │
│ • Mis últimos 5 reportes         │
│ • Mis objetivos (si asignados)   │
└───────────────────────────────────┘
```

### NIVEL 2 (Auxiliar) VE:
```
┌─ Mi Sector (3-5 grupos) ──────────┐
│ • Grupos bajo mi supervisión: 5   │
│ • Total miembros: 40              │
│ • Asistencia promedio: 78%        │
│ • Líderes necesitados: 1 (sin 2 semanas)
│                                    │
│ TAB "Cumplimiento":               │
│  Quién reportó (semana a semana)  │
│  Quién se quedó sin reportar      │
│                                    │
│ TAB "Grupos":                     │
│  Salud de cada grupo              │
│  Alerta: "Sin reportes en 2 sem"  │
└────────────────────────────────────┘
```

### NIVEL 3 (General) VE:
```
┌─ Mi Zona ─────────────────────────┐
│ • Total grupos: 20                │
│ • Total miembros: 150             │
│ • Asistencia promedio: 76%        │
│ • Crecimiento semanal: +3 miembros│
│ • Salud promedio: 7.2/13 (buena)  │
│                                    │
│ GRÁFICO: Tendencia 24 semanas     │
│ GRÁFICO: Distribución por zona    │
│ GRÁFICO: Asistencia semanal       │
│                                    │
│ TAB "Cumplimiento":               │
│  Quién de MIS auxiliares reportó  │
│  Quién faltó (con escalación)     │
│                                    │
│ TAB "Alertas":                    │
│  Grupos sin reportes              │
│  Grupos en declive                │
│  Celebraciones                    │
└────────────────────────────────────┘
```

### NIVEL 4–5 (Coordinador/Pastor) VE:
```
┌─ Visión Completa ──────────────────┐
│ • Todas las zonas                  │
│ • Todos los estadísticas agregadas │
│ • Todos los objetivos estratégicos │
│ • Mapa de zonas con salud          │
│                                     │
│ TAB "Alertas Críticas":            │
│  Todos los grupos en problema      │
│  Escalaciones de compliance        │
│                                     │
│ TAB "Aprobaciones":                │
│  Reportes que llegan al pastor     │
│  para revisión final               │
│                                     │
│ TAB "Reportes":                    │
│  Historial completo + búsqueda     │
└─────────────────────────────────────┘
```

---

## 10. FÓRMULAS DE AGREGACIÓN (Cómo Sube Todo)

### De Líder a Auxiliar
```
SUM(attendance) = ND + DM + amigos + niños de TODOS los líderes bajo este auxiliar

SUM(discipleship) = group_discipleships de TODOS los líderes

AVG(asistencia) = promedio de (asistencia total / miembros) para cada grupo
```

### De Auxiliar a General
```
Sumamos líderes bajo MIS AUXILIARES (no solo líderes directos):

Total discipleship = SUM(discipleship de TODOS los líderes en mis 2 niveles abajo)

Total evangelism = SUM(group_evangelism + leader_evangelism de todos los líderes)

Zone metrics = Estos se pre-calculan cuando abre el modal de reporte
               usando GetZoneRollup()
```

### De General a Coordinador
```
Todos los supervisores generales en su zona

Total groups = SUM(grupos)
Total members = SUM(miembros)  
Health index = AVG(termómetro espiritual)
Growth = TREND(nuevos miembros / total)
```

### De Coordinador a Pastor
```
Todas las zonas en la iglesia

Total ministry = SUM(todo)
Health overall = TREND(últimas 24 semanas)
Alerts = TODAS las alertas en la iglesia
```

---

## 11. LATE SUBMISSION RECOVERY (Enviar Atrasado)

### Escenario Normal
```
Semana W26: Lunes a Sábado 23:59
 ├─ Líder Juan reporta miércoles → status = "on_time" ✅
 └─ Cuenta para compliance W26

Sábado 23:00: Barrida automática
 ├─ Enuncia quien no reportó
 └─ Marca como "missed" para gente sin reporte
```

### Escenario de Recuperación
```
Juan OLVIDA reportar W26. Sábado 23:00 pasa:
 → report_compliance(Juan, W26) = "missed"

Juan se da cuenta el LUNES siguiente:
 ├─ Juan va a "Nuevo Reporte"
 ├─ Selecciona "Semana anterior (W26)"
 ├─ Rellena y envía
 └─ Sistema write-through ve que es DESPUÉS de Sábado 23:59
     ├─ NO cambia a "on_time" (eso sería mentira)
     ├─ Cambia a "late" (fue tarde pero se envió)
     └─ Notifica: "Reporte enviado (aunque después del sábado)"

IMPORTANTE: No downgrade. Si es "on_time", nunca baja a "late".
            Pero "missed" → "late" sí ocurre.
```

---

## 12. CASOS ESPECIALES

### Líderes Sin Zona Asignada
```
El sistema ve: "Líder Juan no tiene zona_id"

Impacto:
 ├─ Reporte se guarda normalmente
 ├─ Pero NO se suma en rollup de zona (aparece como "unmapped")
 ├─ GetZoneRollup() devuelve: "unmapped_leaders: 1"
 ├─ SupervisionReportModal.tsx muestra aviso: "1 líder sin zona"
 └─ Solución: Asignar zona_id en "Jerarquías"
```

### Multiplicaciones
```
Reporte líder: is_multiplying = true (sí)

Impacto automático:
 ├─ Si hay objetivo "Multiplicaciones" → extrae valor 1
 ├─ Si hay objetivo "Crecimiento" → podría incluirlo
 └─ Alert engine ve: "Grupo multiplicando" → celebración potencial

No es lo mismo que: "Cuántas células nuevas nacieron" (eso es manual)
```

---

## 13. RESUMEN: EL FLUJO COMPLETO EN UNA PÁGINA

```
1. LÍDER REPORTA
   └─ Llena 5 secciones (asistencia, actividad, vida, servicios, notas)
       ├─ Sistema calcula "Termómetro" (0-13)
       ├─ Extrae valores para objetivos automáticos
       ├─ Actualiza compliance: "on_time"
       └─ Notifica supervisor

2. SUPERVISOR REVISA Y APRUEBA
   └─ Ve "Aprobaciones" tab
       ├─ Click "Ver" en reporte
       ├─ Aprueba o Rechaza
       └─ Si aprueba → contribuye al rollup de zona

3. SUPERVISOR REPORTA (si es Auxiliar/General/Coordinador)
   └─ Abre su reporte
       ├─ "Métricas de Zona" se llenan automáticamente
       │  (GetZoneRollup suma: discipleship + evangelism)
       ├─ Completa su trabajo de supervisión
       └─ Envía

4. SUPERIOR VE DASHBOARD ACTUALIZADO
   └─ Zona tab muestra:
       ├─ Total grupos, miembros, asistencia
       ├─ Gráficos de tendencia
       ├─ Alertas (críticas + celebración)
       └─ Tab "Cumplimiento": quién reportó, quién faltó

5. CADA SÁBADO 23:00 — BARRIDA AUTOMÁTICA
   └─ Marca "missed" a quien no reportó
       ├─ Recomputa missed_count
       ├─ Si missed_count >= 3 → escalación
       └─ Genera alertas de compliance

6. OBJETIVOS SE ACTUALIZAN EN 3 PASOS
   └─ Valor individual → suma auxiliar → suma general → suma coordinador
       └─ Dashboard muestra: "Total de nuevos discípulos: 450"
```

---

## 14. LIMITACIONES CONOCIDAS & FUTURO

### Lo Que NO Hace Ahora
- Multi-tenant por subdomain (en roadmap)
- Agregación en tiempo real (refrescar = nueva consulta)
- Móvil con modales específicas (ahora renderiza web)
- Predicción IA en objetivos
- Clusturización automática de alertas

### Lo Que SÍ Hace
- ✅ Cascada semanal de reportes con aprobación
- ✅ Agregación jerárquica automática
- ✅ Compliance tracking con escalación
- ✅ Alertas automáticas (7 tipos)
- ✅ Objetivos automáticos con agregación upward
- ✅ Late submission recovery
- ✅ Jerarquía de múltiples supervisores por zona

---

## Contacto & Preguntas

Si en tu iglesia:
- ❌ Un reporte no aparece en el dashboard → chequear "Aprobaciones"
- ❌ Las métricas de zona no se cargan → verificar que líderes tengan zona asignada
- ❌ Las alertas no llegan → revisar Notificaciones center
- ❌ Un objetivo no se actualiza → confirmar que es "measurement_type = automatic"

Contactá a tu administrador o pastor para ayuda.

---

**Documento generado**: Junio 2026  
**Última revisión**: Implementación de compliance y alertas  
**Próxima versión**: Con multi-tenancy y agregación real-time
