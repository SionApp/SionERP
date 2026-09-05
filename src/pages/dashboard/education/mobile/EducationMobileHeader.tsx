import { MobileNotificationsBell } from '@/components/mobile/MobileNotificationsBell';

/**
 * Mobile handoff, "Cabecera de sección (alumno: Inicio, Catálogo)" — eyebrow
 * "Escuela de formación" + title + bell + initials avatar. `MobileScreen`'s
 * built-in header always puts a subtitle BELOW the title, never an eyebrow
 * above it, so screens that need this exact layout pass it via
 * `<MobileScreen header={<EducationMobileHeader .../>}>` instead.
 */
export function EducationMobileHeader({ title, initial }: { title: string; initial: string }) {
  return (
    <header
      className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center gap-3 px-5 pb-3.5 pt-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-normal text-muted-foreground">Escuela de formación</p>
          <h1 className="truncate text-[22px] font-normal text-foreground">{title}</h1>
        </div>
        <MobileNotificationsBell className="h-10 w-10 shrink-0 rounded-full bg-surface-container" />
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-edu-primary text-[15px] font-medium text-white">
          {initial}
        </span>
      </div>
    </header>
  );
}
