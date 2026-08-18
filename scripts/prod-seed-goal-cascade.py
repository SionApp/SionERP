#!/usr/bin/env python3
"""
Crea un objetivo real + su cascada de asignaciones (Coordinador → Sup.
General → Sup. Auxiliar → Líder) para UNA zona, contra el backend real —
mismo camino de código que usa la app en producción, ningún atajo por SQL
directo. No crea cuentas, no renombra a nadie, no toca contraseñas: usa el
login real de quien ya tiene sesión en esa jerarquía.

Requiere que quien ejecuta el script tenga las credenciales reales de UN
usuario con visibilidad total del módulo (pastor/staff, o el propio
Coordinador de la zona — ambos ya tienen "canSeeAll" en el backend) para:
  1) leer /discipleship/hierarchy y ubicar la cadena líder→...→coordinador
     de la zona pedida,
  2) crear el objetivo,
  3) crear la cascada de asignaciones.

Uso:
    python3 scripts/prod-seed-goal-cascade.py \\
        --supabase-url https://TU-PROYECTO.supabase.co \\
        --supabase-anon-key eyJ... \\
        --api-url https://sionerp.onrender.com \\
        --email pastor@tuiglesia.com \\
        --password '********' \\
        --zone "OESTE 1" \\
        --goal-type attendance \\
        --title "Asistencia mensual — Zona OESTE 1" \\
        --target-metric asistencia_total \\
        --target-value 40 \\
        --deadline 2026-09-30

Variables de entorno equivalentes (evita pasar la password por argv):
    SEED_SUPABASE_URL, SEED_SUPABASE_ANON_KEY, SEED_API_URL,
    SEED_EMAIL, SEED_PASSWORD

Salida: crea el objetivo + 4 niveles de asignación (target_value se reparte
igual en cada nivel salvo el líder, que recibe target-value/4 redondeado —
ajustá con --leader-target si querés un número distinto). Cada asignación
dispara la notificación real al asignado (ver commit "notifica a todos los
involucrados..."). No somete ningún reporte — eso lo hace el líder de
verdad, en vivo, durante la demo: es justamente el momento que hace subir la
cascada y es más elocuente hacerlo en pantalla que simularlo acá.
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request


def env_default(flag_env, argv_val):
    return argv_val if argv_val is not None else os.environ.get(flag_env)


def die(msg):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def http(method, url, headers=None, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            body = r.read().decode()
            return r.status, (json.loads(body) if body else {})
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"raw": body[:500]}


def login(supabase_url, anon_key, email, password):
    st, body = http(
        "POST",
        f"{supabase_url}/auth/v1/token?grant_type=password",
        headers={"apikey": anon_key, "Content-Type": "application/json"},
        payload={"email": email, "password": password},
    )
    if st != 200 or "access_token" not in body:
        die(f"Login falló ({st}): {body}")
    return body["access_token"]


def api(method, api_url, token, path, payload=None):
    return http(
        method,
        f"{api_url}/api/v1{path}",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        payload=payload,
    )


LEVEL_NAME = {1: "líder", 2: "auxiliar", 3: "general", 4: "coordinador"}


def resolve_chain(api_url, token, zone_name, email_overrides):
    st, rows = api("GET", api_url, token, "/discipleship/hierarchy")
    if st != 200 or not isinstance(rows, list):
        die(f"No se pudo leer /discipleship/hierarchy ({st}): {rows}")

    by_level = {1: [], 2: [], 3: [], 4: []}
    for r in rows:
        lvl = r.get("hierarchy_level")
        if lvl in by_level and (r.get("zone_name") or "").strip().upper() == zone_name.strip().upper():
            by_level[lvl].append(r)

    missing = [lvl for lvl in (1, 2, 3, 4) if not by_level[lvl]]
    if missing:
        die(
            f"No encontré usuario(s) de nivel {missing} en la zona {zone_name!r}. "
            f"Revisá el nombre exacto de la zona (case-insensitive) o completá "
            f"la jerarquía en /dashboard/discipleship antes de correr esto."
        )

    chain = {}
    for lvl in (1, 2, 3, 4):
        candidates = by_level[lvl]
        override_email = email_overrides.get(lvl)
        if override_email:
            matches = [c for c in candidates if c["user_email"].strip().lower() == override_email.strip().lower()]
            if not matches:
                die(
                    f"--{LEVEL_NAME[lvl]}-email {override_email!r} no aparece como nivel {lvl} "
                    f"en la zona {zone_name!r}."
                )
            chosen = matches[0]
        else:
            chosen = candidates[0]
            if len(candidates) > 1:
                print(
                    f"  aviso: {len(candidates)} usuarios de nivel {lvl} en la zona "
                    f"{zone_name!r} — usando a {chosen['user_name']!r} "
                    f"({chosen['user_email']}). Pasá --{LEVEL_NAME[lvl]}-email si "
                    f"querés otro."
                )
        chain[lvl] = chosen
        print(f"  nivel {lvl}: {chosen['user_name']} <{chosen['user_email']}>")
    return chain


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--supabase-url")
    p.add_argument("--supabase-anon-key")
    p.add_argument("--api-url")
    p.add_argument("--email")
    p.add_argument("--password")
    p.add_argument("--zone", required=True, help="Nombre exacto de la zona (ej. 'OESTE 1')")
    p.add_argument("--goal-type", default="attendance",
                    choices=["growth", "attendance", "conversions", "baptisms",
                             "new_groups", "multiplications", "spiritual_health", "personalizado"])
    p.add_argument("--title", required=True)
    p.add_argument("--description", default="")
    p.add_argument("--target-metric", required=True)
    p.add_argument("--target-value", type=float, required=True)
    p.add_argument("--deadline", required=True, help="YYYY-MM-DD")
    p.add_argument("--priority", type=int, default=2)
    p.add_argument("--measurement-type", default="automatic", choices=["automatic", "manual"])
    p.add_argument("--leader-target-value", type=float, default=None,
                    help="Target del líder, si querés uno distinto al del resto de la cascada")
    p.add_argument("--leader-email", help="Desambiguar qué líder usar si la zona tiene varios")
    p.add_argument("--aux-email", help="Desambiguar qué sup. auxiliar usar si la zona tiene varios")
    p.add_argument("--general-email", help="Desambiguar qué sup. general usar si la zona tiene varios")
    p.add_argument("--coordinador-email", help="Desambiguar qué coordinador usar si la zona tiene varios")
    args = p.parse_args()

    supabase_url = env_default("SEED_SUPABASE_URL", args.supabase_url)
    anon_key = env_default("SEED_SUPABASE_ANON_KEY", args.supabase_anon_key)
    api_url = env_default("SEED_API_URL", args.api_url)
    email = env_default("SEED_EMAIL", args.email)
    password = env_default("SEED_PASSWORD", args.password)

    missing_cfg = [n for n, v in [
        ("--supabase-url/SEED_SUPABASE_URL", supabase_url),
        ("--supabase-anon-key/SEED_SUPABASE_ANON_KEY", anon_key),
        ("--api-url/SEED_API_URL", api_url),
        ("--email/SEED_EMAIL", email),
        ("--password/SEED_PASSWORD", password),
    ] if not v]
    if missing_cfg:
        die("Faltan parámetros: " + ", ".join(missing_cfg))

    print(f"Login como {email} ...")
    token = login(supabase_url, anon_key, email, password)
    print("  OK\n")

    print(f"Resolviendo cadena jerárquica de la zona {args.zone!r} ...")
    email_overrides = {1: args.leader_email, 2: args.aux_email, 3: args.general_email, 4: args.coordinador_email}
    chain = resolve_chain(api_url, token, args.zone, email_overrides)
    print()

    zone_id = chain[4].get("zone_id") or chain[3].get("zone_id")

    print(f"Creando objetivo {args.title!r} ...")
    st, goal = api("POST", api_url, token, "/discipleship/goals", {
        "goal_type": args.goal_type,
        "title": args.title,
        "description": args.description,
        "target_metric": args.target_metric,
        "target_value": int(args.target_value),  # CreateGoalRequest.TargetValue es int en el backend
        "deadline": args.deadline,
        "zone_id": zone_id or None,
        "priority": args.priority,
        "measurement_type": args.measurement_type,
    })
    if st != 201:
        die(f"CreateGoal falló ({st}): {goal}")
    goal_id = goal["goal_id"]
    print(f"  goal_id = {goal_id}\n")

    leader_target = args.leader_target_value if args.leader_target_value is not None else args.target_value / 4

    print("Creando cascada de asignaciones ...")
    parent_id = None
    targets = {4: args.target_value, 3: args.target_value, 2: args.target_value, 1: leader_target}
    for lvl in (4, 3, 2, 1):
        user = chain[lvl]
        st, body = api("POST", api_url, token, f"/discipleship/goals/{goal_id}/assignments", {
            "assignments": [{
                "assigned_to": user["user_id"],
                "target_value": targets[lvl],
                "parent_assignment_id": parent_id,
            }]
        })
        if st != 201 or not body.get("created"):
            die(f"Assignment nivel {lvl} falló ({st}): {body}")
        parent_id = body["created"][0]["id"]
        print(f"  nivel {lvl} ({user['user_name']}): target={targets[lvl]} -> assignment_id={parent_id}")

    print(f"""
Listo. Objetivo creado con cascada completa en la zona {args.zone!r}.
  - Cada asignado ya recibió su notificación ("Se te asignó un objetivo").
  - Para ver la cascada moverse en vivo: pedile al líder que someta su
    reporte semanal real desde /dashboard/discipleship — el progreso sube
    solo, líder → auxiliar → general → coordinador, y las notificaciones de
    "nuevo reporte" / "reporte aprobado" / "se recibió un reporte en tu
    equipo" salen exactamente en ese momento, no antes.
""")


if __name__ == "__main__":
    main()
