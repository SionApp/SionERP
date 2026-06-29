# Cómo Funcionan los Reportes y los Tableros — SionERP
## Guía completa para líderes, supervisores y pastores

**Versión**: 3.0
**Fecha**: Junio 2026
**Para quién es**: Cualquier persona que use el módulo de Discipulado — líderes, supervisores, coordinadores y pastores. No hace falta saber de computación.

> ¿Sos desarrollador y buscás el detalle técnico (tablas, fórmulas SQL, endpoints)? Ese material está en `docs/INDICE_TECNICO.md`. Este documento explica el **qué** y el **por qué**, en palabras.

---

## La idea en una frase

Cada semana, **cada persona reporta lo que pasó en su nivel**, y el sistema va **sumando hacia arriba** automáticamente: lo del líder llega al supervisor, lo del supervisor al general, y así hasta el pastor. Nadie tiene que sumar a mano.

Este documento te explica:
- Qué reporta cada uno
- Qué significan los números, los colores y **cada gráfica**
- Qué pasa "por detrás" cuando enviás un reporte
- Cuándo y por qué aparecen las alertas

---

## 1. La cadena: quién le reporta a quién

```
        PASTOR  (mira todo el ministerio)
          ▲
      COORDINADOR  (mira su región / varias zonas)
          ▲
   SUPERVISOR GENERAL  (mira su zona)
          ▲
  SUPERVISOR AUXILIAR  (mira 3 a 5 grupos)
          ▲
      LÍDER  (mira su célula)
```

**Regla de oro**: cada persona envía **un reporte por semana**. La semana va de **lunes a sábado**.

> 💡 **Dos cosas distintas: tu "rol" y tu "nivel".**
> El **rol** (admin, pastor, staff…) define qué partes del sistema podés tocar.
> El **nivel de discipulado** (Líder, Auxiliar, General, Coordinador) define qué reportás y qué ves en Discipulado.
> Son independientes: alguien puede ser Líder de una célula sin ser "staff" del sistema.

---

## 2. El reporte del LÍDER (la base de todo)

Es el reporte más importante. Todo lo demás se construye sobre éste. El líder completa **5 secciones**:

### 📋 Sección 1 — ¿Cuántos vinieron a la reunión?
| Campo | Qué anotás |
|-------|-----------|
| **Nuevos Discípulos (ND)** | Cuántos nuevos discípulos asistieron |
| **Discípulos Maduros (DM)** | Cuántos discípulos ya formados asistieron |
| **Amigos / Invitados** | Visitas que trajo el grupo |
| **Niños** | Cuántos niños asistieron |

### 🌱 Sección 2 — ¿Qué hizo el grupo?
| Campo | Qué anotás |
|-------|-----------|
| **Discipulados del grupo** | Cuántas relaciones de discipulado uno-a-uno se hicieron |
| **Evangelismo del grupo** | Salidas o conversaciones de evangelismo del grupo |

### 🙏 Sección 3 — ¿Cómo está el líder?
| Campo | Qué anotás |
|-------|-----------|
| **Cuidado de nuevos discípulos** | A cuántos nuevos estás acompañando |
| **Cuidado de discípulos maduros** | A cuántos maduros estás acompañando |
| **Días de diario espiritual** | Cuántos días tuviste tu tiempo personal (0 a 7) |
| **Evangelismo personal** | Tus conversaciones de evangelismo |
| **Asistencia a servicios** | ¿Fuiste al domingo? ¿A oración? ¿A doctrina? |

### ✨ Sección 4 — Estado del grupo
| Campo | Qué anotás |
|-------|-----------|
| **¿En proceso de multiplicación?** | ¿El grupo está por abrir una célula nueva? |

### 📝 Sección 5 — Comentarios
Espacio libre para contar desafíos, pedidos de oración o celebraciones.

---

## 3. El reporte del SUPERVISOR (Auxiliar, General, Coordinador)

Un supervisor **no reporta sobre su propia célula** — reporta sobre **su trabajo de supervisión**. Cambian las secciones:

### Sección 1 — Tu trabajo de supervisión
- A cuántos nuevos discípulos acompañaste
- A cuántos de tu equipo visitaste
- Cuántos grupos visitaste en persona esta semana

### Sección 2 — Tu vida espiritual
- Días de diario espiritual, evangelismo personal, asistencia a servicios

### Sección 3 — Métricas de la Zona (¡se llenan solas!)
- **Total de Discipulados en la zona**
- **Total de Evangelismo en la zona**

> 💡 Estos dos números **NO los escribís vos**. El sistema los calcula sumando lo que reportaron los líderes a tu cargo esa misma semana. Lo explicamos en el punto siguiente.

### Sección 4 — Comentarios sobre la zona

---

## 4. Las "Métricas de Zona" que aparecen solas

Cuando un supervisor abre su reporte, la sección "Métricas de Zona" ya viene **pre-cargada**. ¿De dónde salen esos números?

```
El sistema mira los reportes de los LÍDERES a tu cargo
        ↓
Suma sus "Discipulados del grupo"  →  Total de Discipulados de la zona
Suma su evangelismo (grupal + personal)  →  Total de Evangelismo de la zona
```

**Tres cosas importantes para entenderlo bien:**

1. **Cuenta apenas se envía.** En cuanto un líder aprieta "Enviar", sus números ya suman en tu total de zona — **no hace falta esperar a aprobarlo**. La aprobación es un control de calidad aparte, no un requisito para que cuente.

2. **Es por semana, no acumulado.** Si estás reportando la semana 26, solo se suman los reportes de la semana 26. Los de la semana 25 ya quedaron en su semana. **Nunca se apila todo junto.**

3. **Solo cuenta a TUS líderes.** Si compartís zona con otro supervisor general, vos ves solo los líderes que están bajo tus auxiliares — nunca los del otro.

> ⚠️ **Aviso de "líderes sin zona".** Si ves un cartel amarillo que dice que hay líderes sin zona asignada, significa que algunos de sus reportes no se están sumando porque no tienen zona. Se arregla asignándoles la zona en la pestaña "Jerarquías".

---

## 5. El "Termómetro Espiritual" — cómo se mide la salud de un grupo

Cada vez que un líder reporta, el sistema le pone un **puntaje de salud al grupo**, del 0 al 13. Funciona como un termómetro: suma **un punto por cada señal de vida** presente esa semana.

**Las 13 señales (1 punto cada una):**

| # | Señal | | # | Señal |
|---|-------|---|---|-------|
| 1 | Vinieron nuevos discípulos | | 8 | El líder cuidó discípulos maduros |
| 2 | Vinieron discípulos maduros | | 9 | El líder tuvo diario espiritual |
| 3 | Vinieron amigos / invitados | | 10 | El líder evangelizó |
| 4 | Vinieron niños | | 11 | El líder fue al servicio del domingo |
| 5 | Hubo discipulado en el grupo | | 12 | El líder fue a oración |
| 6 | Hubo evangelismo del grupo | | 13 | El líder fue a doctrina |
| 7 | El líder cuidó nuevos discípulos | | | |

**Qué significa el puntaje:**

| Puntaje | Estado | Color |
|---------|--------|-------|
| 8 a 13 | **Saludable** — hay vida en varias áreas | 🟢 Verde |
| 5 a 7 | **En riesgo** — empieza a apagarse | 🟡 Amarillo |
| 0 a 4 | **En declive** — necesita atención urgente | 🔴 Rojo |

> El termómetro se calcula solo, a partir del reporte del líder. Es una foto de la **actividad** de esa semana, no un juicio sobre la persona. Importa: solo se mide con el **reporte del líder** (el de los supervisores no afecta el termómetro de los grupos).

---

## 6. Las fases de un grupo

Además del termómetro semana a semana, el sistema clasifica a cada grupo en una **fase**, que representa su madurez. La fase se calcula sola mirando todo el historial de reportes:

| Fase | Ícono | Cuándo está acá | Qué significa |
|------|-------|----------------|---------------|
| **Germinando** | 🌱 | Menos de 4 reportes | Grupo recién arrancado, todavía echando raíz |
| **Creciendo** | 🌿 | 4 o más reportes | Ya tiene ritmo y constancia |
| **Sólido** | 🌳 | 24+ semanas reportadas, con 12+ de termómetro alto (8+) y buena salud actual | Grupo maduro y estable |
| **Multiplicando** | ✨ | Marcó "en multiplicación" 2 o más veces en el último mes | Está por reproducirse en una célula nueva |
| **En dificultad** | ⚠️ | Tiene alertas activas sin resolver | Prioridad de atención |

> **El orden importa.** Si un grupo tiene una alerta sin resolver, aparece como "En dificultad" aunque por reportes fuera "Sólido" — porque algo necesita atención YA. Si no tiene alertas pero viene marcando multiplicación, aparece como "Multiplicando". Recién después se mira la madurez por cantidad de reportes y salud.

---

## 7. El recorrido de un reporte, día por día

```
LUNES — El líder reporta
  Completa las 5 secciones y aprieta "Enviar".
  En ese momento, el sistema:
   • Le pone el puntaje de salud al grupo
   • Suma sus números al total de su zona
   • Marca su reporte como "A tiempo"
   • Le avisa al supervisor: "Tenés un reporte nuevo para revisar"

MARTES a VIERNES — El supervisor revisa
  Entra a "Aprobaciones", ve los reportes pendientes,
  los lee y decide: Aprobar o Pedir cambios.

MIÉRCOLES a VIERNES — El supervisor hace su propio reporte
  Su sección "Métricas de Zona" ya viene llena con la suma
  de sus líderes. Completa su parte y envía.

SÁBADO 23:00 (11 de la noche) — Cierre de la semana
  El sistema revisa quién NO reportó y lo marca como "Falta".

DOMINGO — Reunión presencial
  Con todos los reportes ya cargados, el equipo discute
  cara a cara los resultados de la semana.
```

> 💡 **¿Por qué el sábado es la fecha límite?**
> Porque los **domingos son reuniones presenciales** donde se discuten los resultados. Para que esa reunión sirva, **todo tiene que estar cargado el sábado a la noche**. Por eso el cierre es sábado 23:00.

---

## 8. Aprobar y pedir cambios

Cuando un supervisor abre un reporte, tiene dos botones:

**✅ Aprobar**
- El reporte queda marcado como "Aprobado".
- Al líder le llega un aviso: *"Tu reporte fue aprobado"*.

**✋ Pedir cambios (Rechazar)**
- El reporte queda como "Necesita revisión".
- Al líder le llega un aviso con el motivo.
- **El líder corrige y vuelve a enviar esa misma semana.** No se pierde nada.

> Para el líder: si tu reporte dice "Necesita revisión", abrilo, leé el comentario de tu supervisor, corregí y reenvialo. Listo.

---

## 9. Cumplimiento — quién reportó y quién faltó

Cada supervisor tiene una pestaña **"Cumplimiento"** que muestra, semana por semana, quién entregó y quién no.

```
CUMPLIMIENTO — Últimas 8 semanas

Persona          S26  S25  S24  S23  S22  S21  S20  S19   Faltas
─────────────────────────────────────────────────────────────────
Juan Pérez        ✅   ✅   ✅   ✅   ✅   ✅   ✅   ✅      0
María García      ✅   ✅   🟡   ✅   ✅   ✅   ✅   ✅      1
Carlos López      ✅   ❌   ❌   ✅   ❌   ✅   ✅   ✅      3 🚨
```

**Qué significa cada color:**

| Color | Estado | Quiere decir |
|-------|--------|-------------|
| 🟢 ✅ | **A tiempo** | Entregó dentro de la semana (lunes a sábado) |
| 🟡 | **Tarde** | Entregó, pero después del sábado a la noche |
| 🔴 ❌ | **Falta** | No entregó esa semana |
| ⚪ | **Pendiente** | Todavía no entregó, pero la semana no cerró aún |

> **¿A quién muestra cada supervisor?** Un auxiliar ve a sus líderes directos. Un supervisor general ve a **todos los líderes** que están bajo sus auxiliares (no solo a los auxiliares). Así el general tiene la foto completa de quién está cumpliendo en su zona.

### Las "faltas acumuladas" y la escalación

La columna **"Faltas"** cuenta cuántas semanas, en total, esa persona dejó pasar sin reportar.

- **A la 1ª falta**: le llega un aviso a la persona — *"Faltó tu reporte de la semana X"*.
- **A la 3ª falta**: además del aviso a la persona, **se le avisa también al supervisor de su supervisor** (escalación), y la fila se marca en rojo con 🚨.

> 💡 Un reporte entregado **tarde** SÍ cuenta como entregado — no suma a las faltas. La idea es premiar que se haya cargado, aunque haya sido después del sábado.

---

## 10. "Me olvidé una semana" — cargar un reporte atrasado

Si dejaste pasar una semana, **no la perdés**. Podés cargarla después:

1. Andá a "Nuevo Reporte".
2. Arriba hay un **selector de semana**. Elegí la semana que te faltó.
3. Completá y enviá.

El sistema entiende que es una semana vieja y la marca como **"Tarde"** (no como "A tiempo", porque sería faltar a la verdad) — pero la cuenta como entregada y **te saca esa falta**.

> No se puede cargar una semana futura, solo las pasadas. Y cada reporte pertenece a **una** semana: nunca se acumulan varios en uno solo.

---

## 11. Las alertas automáticas

Cada noche el sistema revisa todos los grupos y, si encuentra algo que merece atención (o celebración), genera una **alerta**. Hay dos clases.

### 🔴 Alertas críticas (piden acción)

| Alerta | Cuándo aparece | Qué te dice |
|--------|---------------|-------------|
| **Sin reportes** | El grupo no reporta hace 2 semanas | "Este grupo se quedó sin reportar — contactá al líder" |
| **Asistencia baja** | Asisten menos de la mitad de los miembros (mirando las últimas 4 semanas) | "Revisar retención del grupo" |
| **Declive espiritual** | El termómetro promedio bajó de 5 (últimas 4 semanas) | "El grupo se está apagando, necesita acompañamiento" |
| **Sin crecimiento** | 8 semanas sin nada de evangelismo ni discipulado | "Grupo estancado — pensar una estrategia" |

### 🟢 Alertas de celebración (para reconocer lo bueno)

| Alerta | Cuándo aparece | Qué te dice |
|--------|---------------|-------------|
| **Constancia** | 12 semanas seguidas reportando | "¡Grupo constante! Felicitar al líder" |
| **Campeones de evangelismo** | Evangelismo activo 4 de las últimas 4 semanas | "¡Hay fruto! Celebrar el esfuerzo" |
| **Grupo sólido** | Termómetro de 8 o más, sostenido 12 semanas | "¡Grupo fuerte espiritualmente!" |

> Las alertas llegan a quien corresponde: un supervisor ve las de sus grupos; el pastor ve las de toda la iglesia. Cada uno ve solo lo suyo. Y el sistema no repite la misma alerta todos los días — espera un tiempo antes de volver a avisar lo mismo.

---

## 12. Los objetivos que se actualizan solos

Si tu iglesia usa **objetivos estratégicos** (metas de crecimiento, evangelismo, etc.), algunos pueden configurarse para **medirse automáticamente** desde los reportes. En ese caso, no hace falta cargar el avance a mano.

**Ejemplo:**
```
Objetivo: "Sumar 100 nuevos discípulos este trimestre"
        ↓
El líder Juan reporta 5 nuevos discípulos esta semana
        ↓
El sistema suma esos 5 al objetivo automáticamente
        ↓
Y va subiendo: el objetivo del auxiliar, del general y del
coordinador también reflejan esos 5 — todo sin escribir nada.
```

Así, el pastor ve en su panel *"Nuevos discípulos este trimestre: 87 de 100"* sin que nadie haya sumado a mano.

> Los objetivos marcados como "personalizados" se cargan a mano — esos el sistema no los toca.

---

## 13. Multiplicaciones — cuando una célula se reproduce

El corazón del modelo celular es que los grupos **se multiplican**: cuando una célula crece, abre una célula nueva con un líder nuevo.

**Cómo participa el reporte:**
- En cada reporte, el líder marca **"¿En proceso de multiplicación?"**.
- Si lo marca **2 o más veces en el último mes**, el grupo pasa a la fase **"Multiplicando"** ✨.
- Cuando la multiplicación se concreta, queda registrada en el **historial de multiplicaciones**, que guarda: el grupo madre, el grupo nuevo, la fecha, el tipo y si fue exitosa.

**En el tablero:**
- El número **"Grupos Multiplicando"** cuenta cuántas células están en ese proceso ahora mismo.
- El **historial** te deja ver el árbol de reproducción: qué grupo nació de qué grupo, y cuándo.

> Multiplicarse es la meta sana de toda célula. Por eso tiene su propia fase, su propio número en el tablero y hasta una alerta de celebración cuando un grupo viene fuerte.

---

## 14. Las gráficas y los números del panel

Esta es la parte que más se pregunta: **¿qué significa cada número y cada gráfica del dashboard?**

### Las tarjetas de arriba (los KPIs)

| Tarjeta | Qué cuenta | Cómo se calcula |
|---------|-----------|-----------------|
| **Grupos Activos** | Células activas en tu alcance | Cuenta los grupos activos que te corresponden por tu nivel |
| **Miembros Activos** | Total de personas en esos grupos | Suma los miembros de todos tus grupos |
| **Grupos Multiplicando** | Células por reproducirse | Cuenta los grupos en fase "Multiplicando" |
| **Necesitan Atención** | Grupos con problemas | Cuenta los grupos con alertas críticas sin resolver |
| **Asistencia Promedio** | Cuánta gente viene en promedio | Promedio de asistentes por reunión, últimas 4 semanas |
| **Salud Espiritual** | El "termómetro" promedio del ministerio | Promedio del termómetro (0 a 13) de todos tus grupos, últimas 4 semanas |

> ⚠️ **No confundir dos "saludes".** El **termómetro de un grupo** (sección 5) es de UN grupo en UNA semana. La tarjeta **"Salud Espiritual"** es el **promedio** del termómetro de TODOS tus grupos en el último mes. Una es la foto de un grupo; la otra, el clima general de tu zona.

### Los gráficos

**📈 Tendencia Semanal (gráfico de línea)**
Muestra, semana a semana (últimas 12 a 24 semanas):
- **Asistencia total** — cuánta gente vino en total cada semana
- **Visitantes** — cuántos amigos/invitados se sumaron
- **Grupos que reportaron** — cuántas células entregaron esa semana

*Para qué sirve*: ver de un vistazo si el ministerio **sube, se mantiene o baja**. Una línea que cae varias semanas seguidas es una señal de alerta temprana.

**📊 Distribución por Zonas (gráfico de barras)**
Compara las zonas entre sí: grupos, miembros y asistencia por zona.

*Para qué sirve*: ver **qué zonas están fuertes y cuáles necesitan apoyo**.

**🥧 Distribución de Salud (gráfico de torta)**
Reparte tus grupos según su estado: cuántos están saludables 🟢, en riesgo 🟡 y en declive 🔴.

*Para qué sirve*: saber, de un vistazo, **qué proporción de tus grupos están bien** y cuántos piden atención.

> Todos los gráficos respetan tu nivel: un supervisor ve solo lo suyo; el pastor ve toda la iglesia.

---

## 15. Qué ve cada nivel en su pantalla

### 👤 Líder — "Mi Célula"
- Miembros del grupo y cuántos están activos
- Asistencia promedio
- Próxima reunión (día, hora, lugar)
- Si ya reportó esta semana o no
- Sus últimos reportes y sus objetivos

### 👥 Supervisor Auxiliar — "Mi Sector"
- Sus 3 a 5 grupos, con la salud de cada uno
- Asistencia promedio del sector
- Pestaña **Cumplimiento**: quién de sus líderes reportó
- Alertas de sus grupos

### 🗺️ Supervisor General — "Mi Zona"
- Total de grupos, miembros y asistencia de la zona
- Gráficos de tendencia (cómo evoluciona semana a semana)
- Pestaña **Cumplimiento**: el cumplimiento de **todos los líderes** bajo sus auxiliares
- Alertas de la zona

### 🌎 Coordinador y Pastor — "Visión completa"
- Todas las zonas juntas
- Estadísticas generales y objetivos estratégicos
- Mapa de zonas con su salud
- Todas las alertas críticas y todas las aprobaciones finales

---

## 16. Preguntas frecuentes

**"Envié mi reporte pero mi supervisor no lo ve."**
→ Que revise la pestaña **"Aprobaciones"**. Ahí aparecen los reportes esperando revisión.

**"Las métricas de zona me aparecen en cero."**
→ Probablemente los líderes todavía no reportaron esa semana, o no tienen zona asignada. Fijate si hay un aviso amarillo de "líderes sin zona".

**"No me llegan las notificaciones."**
→ Revisá el centro de notificaciones (la campanita arriba). Si nada llega, avisá al administrador.

**"Mi objetivo no se actualiza con los reportes."**
→ Ese objetivo seguramente está configurado como "personalizado" (carga manual). Solo los de medición automática se actualizan solos.

**"Me equivoqué en un reporte ya enviado."**
→ Pedile a tu supervisor que lo marque "Necesita revisión". Te vuelve a vos para corregirlo y reenviarlo.

**"Falté una semana, ¿la perdí?"**
→ No. Usá el selector de semana en "Nuevo Reporte" y cargá la semana atrasada. Cuenta como entregada (marcada "Tarde").

**"¿Por qué mi grupo aparece 'En dificultad' si vengo reportando bien?"**
→ Porque tiene una alerta sin resolver. Resolvé o atendé la alerta y la fase se actualiza.

**"La tarjeta 'Salud Espiritual' me da un número raro, como 6,8. ¿Qué es?"**
→ Es el termómetro promedio (de 0 a 13) de todos tus grupos en el último mes. 6,8 quiere decir que, en promedio, tus grupos muestran casi 7 de las 13 señales de vida.

---

## 17. Todo el flujo en una página

```
1. EL LÍDER REPORTA (lunes)
   Completa 5 secciones → al enviar:
   • Se calcula la salud del grupo (0-13) y su fase
   • Sus números suman al total de su zona (al instante)
   • Queda marcado "A tiempo"
   • Le avisa al supervisor

2. EL SUPERVISOR REVISA (martes a viernes)
   En "Aprobaciones": Aprueba o Pide cambios.
   Si pide cambios, el líder corrige y reenvía.

3. EL SUPERVISOR REPORTA (su propia supervisión)
   "Métricas de Zona" ya vienen llenas (suma de sus líderes).
   Completa su parte y envía.

4. EL SUPERIOR VE SU PANEL ACTUALIZADO
   Tarjetas (KPIs), gráficos de tendencia, distribución
   de salud, alertas y pestaña "Cumplimiento".

5. SÁBADO 23:00 — CIERRE AUTOMÁTICO
   Marca "Falta" a quien no entregó.
   A las 3 faltas → avisa al supervisor de su supervisor.

6. DOMINGO — REUNIÓN PRESENCIAL
   Con todo cargado, se discuten los resultados cara a cara.

7. LOS OBJETIVOS SUBEN SOLOS
   Cada número sube de nivel en nivel hasta el pastor,
   sin que nadie sume a mano.
```

---

**¿Dudas que este documento no resuelve?** Hablá con tu administrador o pastor.

*Documento de usuario — Junio 2026. Para el detalle técnico (tablas, fórmulas, endpoints), ver `docs/INDICE_TECNICO.md`.*
