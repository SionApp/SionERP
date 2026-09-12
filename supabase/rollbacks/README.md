# Rollback scripts

Hand-written DOWN migrations for specific forward migrations in
`supabase/migrations/`. They live **outside** that directory on purpose:
Supabase's CLI treats every timestamped `.sql` file under `migrations/` as a
pending forward migration. A rollback script named with the same
`<timestamp>_<name>_down.sql` convention would be picked up and **executed**
by `supabase migration up --include-all` on any environment where it wasn't
already recorded as applied — undoing real work instead of documenting how
to.

## Usage

These are **not** run automatically by any tooling. To roll back the
migration a given file targets, review it, then apply it manually:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/rollbacks/<file>.sql
```

Read the file's own header comment first — several of these have specific
reversibility caveats (e.g. `20260902000001_education_content_model_down.sql`
reconstructs data from what the UP migration itself wrote, and deliberately
does not restore a dropped column with a fabricated default).

## Naming

Keep the `<forward-migration-timestamp>_<name>_down.sql` convention so it's
obvious which forward migration each file reverses — just not inside
`migrations/`.
