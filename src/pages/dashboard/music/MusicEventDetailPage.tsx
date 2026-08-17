import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { useMobileMode } from '@/hooks/useMobileMode';
import { MusicService } from '@/services/music.service';
import { EventDetailHeader, SetlistSection, TeamSection } from './EventDetail';
import { useMusicAccess } from './use-music-access';
import './music-theme.css';

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-52 w-full rounded-3xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/**
 * Full-page culto detail. Replaces the old cramped 512px dialog: the header
 * (date, badges, progress, share/publish) spans full width, and Equipo /
 * Repertorio sit side by side on desktop, stacked on mobile.
 */
export default function MusicEventDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const isMobileApp = useMobileMode();
  const { isDirector } = useMusicAccess();

  const {
    data: event,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['music-event', id],
    queryFn: () => MusicService.getEventById(id),
    enabled: !!id,
  });

  let body: React.ReactNode;
  if (isLoading) {
    body = <DetailSkeleton />;
  } else if (isError || !event) {
    body = (
      <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center space-y-3">
        <p className="font-semibold">No encontramos este culto</p>
        <p className="text-sm text-muted-foreground">Puede que se haya eliminado.</p>
      </div>
    );
  } else {
    body = (
      <div className="space-y-6">
        <EventDetailHeader event={event} isDirector={isDirector} />
        {/* min-w-0 on each grid item so the single-column mobile track can shrink
            below its content's min-content width (long member names use nowrap
            truncate) — without it the section overflows and badges get clipped. */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            <TeamSection event={event} isDirector={isDirector} />
          </div>
          <div className="min-w-0">
            <SetlistSection event={event} isDirector={isDirector} />
          </div>
        </div>
      </div>
    );
  }

  if (isMobileApp) {
    return (
      <MobileScreen title="Detalle del culto" back="/dashboard/music">
        <div className="music-shell music-aurora min-h-screen px-4 py-4">{body}</div>
      </MobileScreen>
    );
  }

  return (
    <div className="music-shell music-aurora space-y-6 rounded-2xl p-3 sm:p-5 md:p-8">
      <button
        type="button"
        onClick={() => navigate('/dashboard/music')}
        className="music-press music-eyebrow inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Volver a Música
      </button>
      {body}
    </div>
  );
}
