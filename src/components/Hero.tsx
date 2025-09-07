import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Users } from "lucide-react";
import churchHero from "@/assets/church-hero.jpg";

const Hero = () => {
  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${churchHero})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-primary/40"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Bienvenido a
            <span className="block text-accent font-black">Vida Nueva</span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto leading-relaxed">
            Una comunidad de fe donde experimentarás el amor de Dios y encontrarás tu propósito
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              variant="hero" 
              size="lg" 
              className="text-lg px-8 py-4"
              onClick={() => {
                const event = new CustomEvent('openRegistrationModal');
                window.dispatchEvent(event);
              }}
            >
              <Users className="w-5 h-5 mr-2" />
              Únete a Nosotros
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              variant="divine" 
              size="lg" 
              className="text-lg px-8 py-4"
              onClick={() => {
                document.getElementById('nosotros')?.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }}
            >
              <Heart className="w-5 h-5 mr-2" />
              Conoce Más
            </Button>
          </div>
          
          {/* Service Times */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 max-w-md mx-auto border border-white/20">
            <h3 className="text-lg font-semibold mb-4">Servicios Dominicales</h3>
            <div className="space-y-2 text-white/90">
              <p>🌅 Primer Servicio: 7:00 AM</p>
              <p>☀️ Segundo Servicio: 9:00 AM</p>
              <p>🌙 Tercer Servicio: 11:00 AM</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent"></div>
    </section>
  );
};

export default Hero;