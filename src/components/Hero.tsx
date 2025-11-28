import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Users, Clock } from "lucide-react";
import churchHero from "@/assets/church-hero-enhanced.jpg";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Background Zoom Effect
      gsap.fromTo(bgRef.current,
        { scale: 1.1 },
        {
          scale: 1,
          duration: 10,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true
          }
        }
      );

      // Text Entrance Animation
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(".hero-text-item",
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.2, delay: 0.5 }
      );

      // Button Entrance
      tl.fromTo(".hero-btn",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 },
        "-=0.5"
      );

      // Service Times Entrance
      tl.fromTo(".hero-services",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        "-=0.6"
      );

    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Dynamic Background Image */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          ref={bgRef}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-110"
          style={{ backgroundImage: `url(${churchHero})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40"></div>
        </div>
      </div>

      {/* Divine Particles Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="particles opacity-20"></div>
      </div>

      {/* Content */}
      <div ref={textRef} className="relative z-10 container mx-auto px-4 text-center text-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="hero-text-item text-5xl md:text-8xl font-bold mb-6 leading-tight tracking-tight">
            Bienvenido a
            <span className="block text-primary font-black mt-2 drop-shadow-lg">Iglesia Sion</span>
          </h1>

          <p className="hero-text-item text-xl md:text-2xl mb-10 text-gray-200 max-w-2xl mx-auto leading-relaxed font-light">
            Una comunidad de fe donde experimentarás el amor de Dios y encontrarás tu propósito.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button
              variant="default"
              size="lg"
              className="hero-btn text-lg px-8 py-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] transition-all duration-300 transform hover:-translate-y-1"
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
              variant="outline"
              size="lg"
              className="hero-btn text-lg px-8 py-6 rounded-full border-white/20 text-primary hover:bg-white/10 backdrop-blur-sm transition-all duration-300"
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
          <div className="hero-services bg-black/30 backdrop-blur-md rounded-2xl p-8 max-w-md mx-auto border border-white/10 shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <h3 className="text-lg font-semibold mb-4 text-primary">Servicios Dominicales</h3>
            <div className="space-y-3 text-gray-200">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Primer Servicio</span>
                </div>
                <span className="font-mono text-primary-light">7:00 AM</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Segundo Servicio</span>
                </div>
                <span className="font-mono text-primary-light">9:00 AM</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Tercer Servicio</span>
                </div>
                <span className="font-mono text-primary-light">11:00 AM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Gradient Bottom */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent"></div>

      <style>{`
        .particles {
          background-image: 
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            radial-gradient(circle at 30% 70%, rgba(255, 215, 0, 0.1) 1px, transparent 1px);
          background-size: 100px 100px;
          animation: particleFloat 60s linear infinite;
        }
        @keyframes particleFloat {
          0% { background-position: 0 0; }
          100% { background-position: 100px -100px; }
        }
      `}</style>
    </section>
  );
};

export default Hero;