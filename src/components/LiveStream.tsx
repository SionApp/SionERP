import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users } from "lucide-react";

const LiveStream = () => {
  // En producción, esto vendría de tu base de datos o API
  const isLive = false; // Cambiar a true cuando esté en vivo
  const nextService = {
    date: "Domingo, 14 de Enero",
    time: "9:00 AM",
    title: "Servicio Dominical"
  };

  return (
    <section id="streaming" className="py-20 bg-gradient-to-br from-primary/5 to-background">
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
          <Card className="overflow-hidden shadow-xl">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                {isLive ? (
                  <Badge variant="destructive" className="px-4 py-2">
                    <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                    EN VIVO
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="px-4 py-2">
                    PRÓXIMO SERVICIO
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {isLive ? "Servicio en Vivo" : nextService.title}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-0">
              {isLive ? (
                <div className="relative aspect-video bg-black">
                  <iframe
                    src="https://www.youtube.com/embed/YOUR_LIVE_STREAM_ID"
                    title="Iglesia Vida Nueva - Servicio en Vivo"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Users className="w-12 h-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-4">
                      El servicio no está en vivo
                    </h3>
                    <div className="space-y-2 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{nextService.date}</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{nextService.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            
            <div className="p-6 bg-muted/30">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  {isLive 
                    ? "¡Gracias por acompañarnos en este servicio!" 
                    : "Nos vemos en nuestro próximo servicio en vivo"
                  }
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