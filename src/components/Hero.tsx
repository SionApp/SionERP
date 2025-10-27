import { Button } from '@/components/ui/button';
import { ArrowRight, Heart, Users, MapPin, Calendar } from 'lucide-react';
import churchHero from '@/assets/church-hero-enhanced.jpg';

const Hero = () => {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${churchHero})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-800/70 to-gray-700/50"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-md rounded-full px-6 py-2 border border-white/20 mb-4">
              <Heart className="w-5 h-5 mr-2 text-accent" />
              <span className="text-sm font-medium">Iglesia Evangélica</span>
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="font-black" style={{ color: 'hsl(var(--sion-gold))' }}>
              SION
            </span>
            <span className="block text-3xl md:text-4xl lg:text-5xl font-semibold mt-2">
              Cambiando Vidas
            </span>
          </h1>

          <p className="text-lg md:text-xl mb-8 text-white/90 max-w-3xl mx-auto leading-relaxed">
            Una comunidad de fe comprometida con la transformación personal y espiritual. Ven y sé
            parte de una familia que cambia vidas a través del amor de Cristo.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button
              variant="hero"
              size="lg"
              className="text-lg px-10 py-4 font-semibold"
              onClick={() => {
                document.getElementById('servicios')?.scrollIntoView({
                  behavior: 'smooth',
                });
              }}
            >
              <Users className="w-5 h-5 mr-2" />
              Conoce Nuestros Ministerios
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="divine"
              size="lg"
              className="text-lg px-10 py-4 font-semibold"
              onClick={() => {
                document.getElementById('contacto')?.scrollIntoView({
                  behavior: 'smooth',
                });
              }}
            >
              <MapPin className="w-5 h-5 mr-2" />
              Visítanos
            </Button>
          </div>

          {/* Church Info */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 max-w-2xl mx-auto border border-white/20">
            <h3 className="text-lg font-semibold mb-6 text-center">Nuestra Comunidad</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-accent">🙏</div>
                <p className="text-sm text-white/90">Adoración</p>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-accent">💝</div>
                <p className="text-sm text-white/90">Comunión</p>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-accent">📖</div>
                <p className="text-sm text-white/90">Enseñanza</p>
              </div>
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
