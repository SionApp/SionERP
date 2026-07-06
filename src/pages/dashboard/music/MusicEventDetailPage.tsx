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
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
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
    <div className="music-shell music-aurora space-y-6 animate-fade-in p-3 sm:p-4 md:p-6 rounded-2xl">
      <button
        type="button"
        onClick={() => navigate('/dashboard/music')}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a Música
      </button>
      {body}
    </div>
  );
}
