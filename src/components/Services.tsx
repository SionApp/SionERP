import { Heart, Users, BookOpen, Music, Baby, Hand, HandHeart, Globe, Clock, MapPin, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Services = () => {
  const ministerios = [
    {
      title: "Adoración y Música",
      description: "Ministerio dedicado a la alabanza y adoración congregacional",
      features: ["Coro principal", "Música instrumental", "Escuela de música", "Cultos especiales"],
      icon: Music,
      color: "bg-primary/10 text-primary",
      horarios: ["Domingos 9:00 AM", "Miércoles 7:00 PM"]
    },
    {
      title: "Discipulado",
      description: "Crecimiento espiritual y formación cristiana integral",
      features: ["Clases bíblicas", "Mentorías personales", "Grupos pequeños", "Estudios temáticos"],
      icon: BookOpen,
      color: "bg-accent/20 text-accent",
      horarios: ["Sábados 2:00 PM", "Martes 7:00 PM"]
    },
    {
      title: "Ministerio Infantil",
      description: "Formación y cuidado especializado para los más pequeños",
      features: ["Escuela dominical", "Actividades recreativas", "Teatro infantil", "Campamentos"],
      icon: Baby,
      color: "bg-primary-light/20 text-primary",
      horarios: ["Domingos 9:00 AM", "Sábados 3:00 PM"]
    },
    {
      title: "Oración e Intercesión",
      description: "Ministerio dedicado a la vida de oración y intercesión",
      features: ["Cadenas de oración", "Vigilias", "Intercesión pastoral", "Escuela de oración"],
      icon: Hand,
      color: "bg-accent/30 text-accent",
      horarios: ["Viernes 6:00 AM", "Domingos 8:00 AM"]
    },
    {
      title: "Acción Social",
      description: "Servicio comunitario y ayuda a los más necesitados",
      features: ["Banco de alimentos", "Visitas hospitalarias", "Apoyo familiar", "Programas sociales"],
      icon: HandHeart,
      color: "bg-primary/15 text-primary",
      horarios: ["Sábados 10:00 AM"]
    },
    {
      title: "Misiones",
      description: "Evangelización y plantación de iglesias locales e internacionales",
      features: ["Campañas evangelísticas", "Apoyo misionero", "Viajes misioneros", "Plantación de iglesias"],
      icon: Globe,
      color: "bg-accent/25 text-accent",
      horarios: ["Primer domingo del mes"]
    }
  ];

  return (
    <section id="servicios" className="py-20 bg-gradient-to-b from-background to-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-primary/10 rounded-full px-6 py-2 mb-4">
            <Heart className="w-5 h-5 mr-2 text-primary" />
            <span className="text-sm font-semibold text-primary">MINISTERIOS</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Nuestros Ministerios
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Espacios de crecimiento, servicio y comunión donde cada persona puede desarrollar 
            sus dones y servir a Dios en diferentes áreas del ministerio
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ministerios.map((ministerio, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-xl ${ministerio.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <ministerio.icon className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg font-bold text-foreground mb-2">
                      {ministerio.title}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">
                      {ministerio.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2 text-sm">Actividades:</h4>
                  <ul className="space-y-1">
                    {ministerio.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-foreground mb-2 text-sm">Horarios:</h4>
                  <div className="flex flex-wrap gap-2">
                    {ministerio.horarios.map((horario, idx) => (
                      <div key={idx} className="flex items-center bg-secondary/50 rounded-full px-3 py-1">
                        <Clock className="w-3 h-3 mr-1.5 text-primary" />
                        <span className="text-xs text-foreground">{horario}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-8 max-w-4xl mx-auto border border-primary/20">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              ¿Te gustaría ser parte de un ministerio?
            </h3>
            <p className="text-lg text-muted-foreground mb-6">
              Cada persona tiene dones únicos. Ven y descubre cómo puedes servir en SION
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex items-center text-primary font-medium">
                <Users className="w-5 h-5 mr-2" />
                <span>Comunidad unida</span>
              </div>
              <div className="flex items-center text-primary font-medium">
                <MapPin className="w-5 h-5 mr-2" />
                <span>Múltiples ubicaciones</span>
              </div>
              <div className="flex items-center text-primary font-medium">
                <Calendar className="w-5 h-5 mr-2" />
                <span>Actividades semanales</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;