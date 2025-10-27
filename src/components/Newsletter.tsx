import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, Users, Gift } from 'lucide-react';

const Newsletter = () => {
  // En producción, estos datos vendrían de tu base de datos
  const events = [
    {
      id: 1,
      title: 'Retiro Espiritual 2024',
      description:
        'Únete a nosotros para un fin de semana de renovación espiritual en las montañas.',
      date: '2024-02-15',
      time: '6:00 PM',
      location: 'Centro de Retiros El Refugio',
      category: 'retiro',
      featured: true,
      image: '/api/placeholder/400/200',
    },
    {
      id: 2,
      title: 'Conferencia de Jóvenes',
      description: 'Tres días de enseñanza, adoración y compañerismo para jóvenes de 13 a 25 años.',
      date: '2024-02-28',
      time: '7:00 PM',
      location: 'Iglesia Vida Nueva',
      category: 'jovenes',
      featured: false,
      image: '/api/placeholder/400/200',
    },
  ];

  // Evento por defecto cuando no hay eventos especiales
  const defaultEvent = {
    title: 'Servicios Regulares',
    description:
      'Te invitamos a nuestros servicios dominicales. Ven y experimenta el amor de Dios en comunidad.',
    highlights: [
      'Adoración en vivo',
      'Enseñanza bíblica',
      'Oración comunitaria',
      'Compañerismo cristiano',
    ],
  };

  const hasSpecialEvents = events.length > 0;

  return (
    <section id="newsletter" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Actividades y Eventos
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Mantente informado sobre nuestras actividades especiales y eventos comunitarios
          </p>
        </div>

        {hasSpecialEvents ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {events.map(event => (
              <Card
                key={event.id}
                className={`overflow-hidden hover:shadow-lg transition-all duration-300 ${event.featured ? 'ring-2 ring-primary/20' : ''}`}
              >
                {event.featured && (
                  <div className="bg-primary/10 px-4 py-2">
                    <Badge variant="default" className="text-xs">
                      <Gift className="w-3 h-3 mr-1" />
                      Evento Destacado
                    </Badge>
                  </div>
                )}

                <div className="relative">
                  <img src={event.image} alt={event.title} className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <Badge
                    variant="secondary"
                    className="absolute top-4 right-4 bg-white/90 text-primary"
                  >
                    {event.category === 'retiro'
                      ? 'Retiro'
                      : event.category === 'jovenes'
                        ? 'Jóvenes'
                        : 'Evento'}
                  </Badge>
                </div>

                <CardHeader>
                  <CardTitle className="text-xl font-bold text-foreground">{event.title}</CardTitle>
                  <p className="text-muted-foreground">{event.description}</p>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>
                        {new Date(event.date).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{event.location}</span>
                    </div>
                  </div>

                  <Button className="w-full" variant={event.featured ? 'default' : 'outline'}>
                    <Users className="w-4 h-4 mr-2" />
                    Inscribirse Ahora
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Contenido por defecto cuando no hay eventos especiales
          <div className="max-w-4xl mx-auto">
            <Card className="overflow-hidden shadow-xl">
              <div className="relative">
                <img
                  src="/api/placeholder/800/300"
                  alt="Servicios regulares de la Iglesia Sion - Congregación reunida para adoración y enseñanza bíblica"
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h3 className="text-3xl font-bold mb-2">{defaultEvent.title}</h3>
                    <p className="text-lg opacity-90">{defaultEvent.description}</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-xl font-semibold text-foreground mb-4">
                      Lo que puedes experimentar:
                    </h4>
                    <ul className="space-y-2">
                      {defaultEvent.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          <span className="text-muted-foreground">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xl font-semibold text-foreground mb-4">
                      Horarios de Servicios:
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>Domingo 7:00 AM - Primer Servicio</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>Domingo 9:00 AM - Servicio Principal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>Domingo 11:00 AM - Servicio Vespertino</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <Button size="lg" className="px-8">
                    <Users className="w-4 h-4 mr-2" />
                    Planifica tu Visita
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
};

export default Newsletter;
