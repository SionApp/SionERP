import { usePreferences } from '@/hooks/usePreferences';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SlidersHorizontal, Moon, Sun, Monitor, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

const TIMEZONES = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART)' },
  { value: 'America/New_York', label: 'Nueva York (EST)' },
  { value: 'America/Chicago', label: 'Chicago (CST)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (PST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)' },
  { value: 'UTC', label: 'UTC' },
];

const VISIBILITY = [
  { value: 'public', label: 'Público' },
  { value: 'members', label: 'Miembros' },
  { value: 'private', label: 'Privado' },
];

const DEFAULT_PREFS = {
  theme: 'auto' as const,
  language: 'es',
  timezone: 'America/Argentina/Buenos_Aires',
  email_notifications: true,
  push_notifications: true,
  sms_notifications: false,
  whatsapp_notifications: false,
  event_reminders: true,
  weekly_newsletter: false,
  profile_visibility: 'members' as const,
  show_email: false,
  show_phone: false,
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">{children}</p>
  );
}

export function PreferencesPanel() {
  const { preferences, loading, updatePreference, updatePreferences } = usePreferences();

  const pref = preferences ?? DEFAULT_PREFS;

  const handleReset = () => updatePreferences(DEFAULT_PREFS);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-4 space-y-4">
        {/* Header */}
        <div>
          <p className="text-sm font-medium">Preferencias</p>
          <p className="text-xs text-muted-foreground">Personalizá tu experiencia en el panel.</p>
        </div>

        <Separator />

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── Apariencia ── */}
            <div className="space-y-2.5">
              <SectionTitle>Apariencia</SectionTitle>
              <Row label="Modo">
                <ToggleGroup
                  type="single"
                  size="sm"
                  value={pref.theme === 'auto' ? 'auto' : pref.theme}
                  onValueChange={v =>
                    v && updatePreference('theme', v as 'light' | 'dark' | 'auto')
                  }
                  className="gap-0.5"
                >
                  <ToggleGroupItem value="light" className="h-7 w-7 rounded-md" aria-label="Claro">
                    <Sun className="h-3.5 w-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="dark" className="h-7 w-7 rounded-md" aria-label="Oscuro">
                    <Moon className="h-3.5 w-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="auto" className="h-7 w-7 rounded-md" aria-label="Sistema">
                    <Monitor className="h-3.5 w-3.5" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </Row>
            </div>

            <Separator />

            {/* ── Idioma & Zona ── */}
            <div className="space-y-2.5">
              <SectionTitle>Regional</SectionTitle>
              <Row label="Idioma">
                <Select value={pref.language} onValueChange={v => updatePreference('language', v)}>
                  <SelectTrigger className="h-7 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => (
                      <SelectItem key={l.value} value={l.value} className="text-xs">
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Zona horaria">
                <Select value={pref.timezone} onValueChange={v => updatePreference('timezone', v)}>
                  <SelectTrigger className="h-7 w-32 text-xs truncate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value} className="text-xs">
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
            </div>

            <Separator />

            {/* ── Notificaciones ── */}
            <div className="space-y-2.5">
              <SectionTitle>Notificaciones</SectionTitle>
              {(
                [
                  { key: 'email_notifications', label: 'Email' },
                  { key: 'push_notifications', label: 'Push' },
                  { key: 'whatsapp_notifications', label: 'WhatsApp' },
                  { key: 'event_reminders', label: 'Recordatorios' },
                  { key: 'weekly_newsletter', label: 'Newsletter' },
                ] as const
              ).map(({ key, label }) => (
                <Row key={key} label={label}>
                  <Switch
                    checked={!!pref[key]}
                    onCheckedChange={v => updatePreference(key, v)}
                    className={cn('scale-90')}
                  />
                </Row>
              ))}
            </div>

            <Separator />

            {/* ── Privacidad ── */}
            <div className="space-y-2.5">
              <SectionTitle>Privacidad</SectionTitle>
              <Row label="Visibilidad">
                <Select
                  value={pref.profile_visibility}
                  onValueChange={v =>
                    updatePreference('profile_visibility', v as 'public' | 'members' | 'private')
                  }
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITY.map(v => (
                      <SelectItem key={v.value} value={v.value} className="text-xs">
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Mostrar email">
                <Switch
                  checked={!!pref.show_email}
                  onCheckedChange={v => updatePreference('show_email', v)}
                  className="scale-90"
                />
              </Row>
              <Row label="Mostrar teléfono">
                <Switch
                  checked={!!pref.show_phone}
                  onCheckedChange={v => updatePreference('show_phone', v)}
                  className="scale-90"
                />
              </Row>
            </div>

            <Separator />

            {/* Restore */}
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-2"
              onClick={handleReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar valores por defecto
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
