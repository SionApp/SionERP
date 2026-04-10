import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface LiveStreamData {
  is_live?: boolean;
  youtube_video_id?: string;
  title?: string;
}

interface LiveStreamProps {
  liveData?: LiveStreamData;
}

const LiveStream = ({ liveData }: LiveStreamProps) => {
  // If liveData is passed, use it. Otherwise we assume the parent handles the logic 
  // (since we are now conditionally rendering this component only when live)

  const isLive = liveData?.is_live && liveData?.youtube_video_id;

  if (!isLive) return null; // Should not happen if parent handles it, but safe guard

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Servicio en Vivo
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Únete a nosotros desde cualquier lugar del mundo
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="overflow-hidden shadow-xl border-primary/20">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Badge variant="destructive" className="px-4 py-2 animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full mr-2" />
                  EN VIVO
                </Badge>
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {liveData.title || "Servicio en Vivo"}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div className="relative aspect-video bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${liveData.youtube_video_id}?autoplay=1&mute=1`}
                  title={liveData.title || "Iglesia Vida Nueva - Servicio en Vivo"}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </CardContent>

            <div className="p-6 bg-muted/30">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  ¡Gracias por acompañarnos en este servicio!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Domingos 7:00 AM</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Domingos 9:00 AM</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Domingos 11:00 AM</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default LiveStream;