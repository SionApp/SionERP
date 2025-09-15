import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Users, BookOpen, Globe } from "lucide-react";
import worshipCommunity from "@/assets/church-history.jpg";
import pastorSpeaking from "@/assets/pastor-enhanced.jpg";

const About = () => {
  const values = [
    {
      icon: Heart,
      title: "Amor",
      description: "Compartimos el amor incondicional de Cristo"
    },
    {
      icon: Users,
      title: "Comunidad",
      description: "Construimos relaciones auténticas y duraderas"
    },
    {
      icon: BookOpen,
      title: "Verdad",
      description: "Fundamentados en la Palabra de Dios"
    },
    {
      icon: Globe,
      title: "Misión",
      description: "Llevamos el Evangelio a toda persona"
    }
  ];

  return (
    <section id="nosotros" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Quiénes Somos
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Somos una iglesia cristiana evangélica comprometida con predicar el Evangelio 
            y formar discípulos que transformen sus comunidades
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h3 className="text-3xl font-bold text-foreground mb-6">
              Nuestra Historia
            </h3>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              Desde 1995, hemos sido una luz en nuestra comunidad, predicando la Palabra de Dios 
              con poder y dedicación. Comenzamos como un pequeño grupo de creyentes con el sueño 
              de ver vidas transformadas por el poder del Evangelio.
            </p>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Hoy somos una familia de fe diversa y unida, comprometida con el crecimiento 
              espiritual, el servicio a la comunidad y la expansión del Reino de Dios.
            </p>
            <Button variant="default" size="lg">
              Conoce Más de Nuestra Historia
            </Button>
          </div>
          <div className="relative">
            <img 
              src={worshipCommunity} 
              alt="Comunidad adorando juntos"
              className="rounded-2xl shadow-2xl w-full h-[400px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-2xl"></div>
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">
            Nuestros Valores
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="text-center group hover:shadow-lg transition-all duration-300 border-0 bg-card/50">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                    <value.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="text-xl font-bold text-foreground mb-2">{value.title}</h4>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pastor Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="lg:order-2">
            <h3 className="text-3xl font-bold text-foreground mb-6">
              Nuestro Pastor
            </h3>
            <h4 className="text-xl font-semibold text-primary mb-4">
              Pastor Carlos Mendoza
            </h4>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              Con más de 20 años de ministerio, el Pastor Carlos ha dedicado su vida a 
              predicar la Palabra de Dios con pasión y autenticidad. Su corazón por las 
              almas perdidas y su amor por la iglesia local han sido pilares fundamentales 
              de nuestro crecimiento.
            </p>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Junto a su esposa María y sus dos hijos, forman una familia comprometida 
              con el servicio a Dios y a la comunidad.
            </p>
            <Button variant="outline" size="lg">
              Conoce al Equipo Pastoral
            </Button>
          </div>
          <div className="lg:order-1 relative">
            <img 
              src={pastorSpeaking} 
              alt="Pastor predicando"
              className="rounded-2xl shadow-2xl w-full h-[400px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent rounded-2xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;