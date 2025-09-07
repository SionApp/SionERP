import { Calendar, Clock, Users, Heart, Book, Mic2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Services = () => {
  const services = [
    {
      title: "Servicio Dominical",
      description: "Adoración, predicación y comunión",
      time: "Domingos 9:00 AM, 11:30 AM y 6:00 PM",
      icon: Heart,
      color: "bg-primary/10 text-primary"
    },
    {
      title: "Estudio Bíblico",
      description: "Profundizando en la Palabra de Dios",
      time: "Miércoles 7:00 PM",
      icon: Book,
      color: "bg-accent/20 text-primary"
    },
    {
      title: "Grupos Pequeños",
      description: "Comunión íntima y crecimiento espiritual",
      time: "Viernes 7:30 PM",
      icon: Users,
      color: "bg-primary-light/20 text-primary"
    },
    {
      title: "Alabanza y Adoración",
      description: "Tiempo especial de adoración",
      time: "Sábados 7:00 PM",
      icon: Mic2,
      color: "bg-accent/30 text-primary"
    }
  ];

  return (
    <section id="servicios" className="py-20 bg-gradient-to-b from-background to-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Nuestros Servicios
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Te invitamos a participar en nuestras actividades semanales diseñadas para 
            fortalecer tu fe y construir comunidad
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-md bg-card/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 rounded-full ${service.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <service.icon className="w-8 h-8" />
                </div>
                <CardTitle className="text-xl font-bold text-foreground">
                  {service.title}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex items-center justify-center text-sm text-primary font-medium">
                  <Clock className="w-4 h-4 mr-2" />
                  {service.time}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <p className="text-lg text-muted-foreground mb-4">
            ¿Primera vez visitando? ¡Te esperamos con los brazos abiertos!
          </p>
          <div className="flex items-center justify-center text-primary font-medium">
            <Calendar className="w-5 h-5 mr-2" />
            <span>No se requiere reservación - Ven como estés</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;