/**
 * Sube las capturas del manual al bucket público `manual-screenshots` de Supabase
 * y escribe docs/screenshots/urls.json con las URLs públicas (para pegar en Notion).
 *
 * Uso:
 *   export SUPABASE_URL=https://<proyecto>.supabase.co
 *   export SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
 *   node docs/screenshots/upload.mjs
 *
 * La service-role key NO se guarda en el repo: se lee de la variable de entorno.
 */
import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL = process.env.SUPABASE_URL?.trim();
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const BUCKET = 'manual-screenshots';

if (!URL || !KEY) {
  console.error('Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

if (!KEY.startsWith('eyJ')) {
  console.error(
    'La service-role key no parece un JWT (debería empezar con "eyJ").\n' +
      'Usá la key clásica "service_role" de Supabase → Settings → API → Legacy/JWT keys,\n' +
      'NO la del formato nuevo "sb_secret_...".'
  );
  process.exit(1);
}

const dir = dirname(fileURLToPath(import.meta.url));
const supabase = createClient(URL, KEY);

const pngs = readdirSync(dir).filter((f) => f.endsWith('.png'));
if (pngs.length === 0) {
  console.error('No hay .png en docs/screenshots/. Corré primero la captura.');
  process.exit(1);
}

const urls = {};
for (const file of pngs) {
  const body = readFileSync(join(dir, file));
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(file, body, { contentType: 'image/png', upsert: true });
  if (error) {
    console.error(`✗ ${file}: ${error.message}`);
    continue;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(file);
  urls[file.replace('.png', '')] = data.publicUrl;
  console.log(`✓ ${file}  →  ${data.publicUrl}`);
}

writeFileSync(join(dir, 'urls.json'), JSON.stringify(urls, null, 2));
console.log(`\n📝 ${Object.keys(urls).length} URLs escritas en docs/screenshots/urls.json`);
