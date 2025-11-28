import { useState, useRef, useLayoutEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface GalleryItem {
  id: number;
  src: string;
  alt: string;
  category: string;
  title: string;
  date: string;
  description: string;
}

const Gallery = () => {
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const galleryImages: GalleryItem[] = [
    {
      id: 1,
      src: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=2673&auto=format&fit=crop",
      alt: "Servicio Dominical",
      category: "servicios",
      title: "Adoración en Vivo",
      date: "2024-01-15",
      description: "Un tiempo poderoso de alabanza y adoración juntos."
    },
    {
      id: 2,
      src: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2670&auto=format&fit=crop",
      alt: "Bautismo",
      category: "eventos",
      title: "Ceremonia de Bautismo",
      date: "2024-01-10",
      description: "Nuevas vidas entregadas a Cristo en las aguas."
    },
    {
      id: 3,
      src: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?q=80&w=2670&auto=format&fit=crop",
      alt: "Comunidad",
      category: "comunidad",
      title: "Reunión de Jóvenes",
      date: "2024-01-08",
      description: "La próxima generación levantándose con pasión."
    },
    {
      id: 4,
      src: "https://images.unsplash.com/photo-1445445290350-12a3b8c968ee?q=80&w=2674&auto=format&fit=crop",
      alt: "Oración",
      category: "servicios",
      title: "Vigilia de Oración",
      date: "2024-01-05",
      description: "Buscando el rostro de Dios en unidad."
    },
    {
      id: 5,
      src: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2670&auto=format&fit=crop",
      alt: "Actividad Familiar",
      category: "eventos",
      title: "Día de la Familia",
      date: "2024-01-01",
      description: "Compartiendo amor y alegría en familia."
    },
    {
      id: 6,
      src: "https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?q=80&w=2574&auto=format&fit=crop",
      alt: "Estudio Bíblico",
      category: "comunidad",
      title: "Estudio Bíblico",
      date: "2023-12-28",
      description: "Profundizando en la Palabra de Dios."
    }
  ];

  const categories = [
    { id: "todos", label: "Todos" },
    { id: "servicios", label: "Servicios" },
    { id: "eventos", label: "Eventos Especiales" },
    { id: "comunidad", label: "Comunidad" }
  ];

  const filteredImages = selectedCategory === "todos"
    ? galleryImages
    : galleryImages.filter(img => img.category === selectedCategory);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Initial animation for items
      const items = itemsRef.current.filter(Boolean);

      gsap.fromTo(items,
        {
          opacity: 0,
          y: 100,
          scale: 0.9,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: galleryRef.current,
            start: "top 80%",
          }
        }
      );

      // Parallax effect for the gallery container
      if (galleryRef.current) {
        gsap.to(galleryRef.current, {
          yPercent: -5,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1
          }
        });
      }

    }, containerRef);

    return () => ctx.revert();
  }, [filteredImages]);

  // 3D Tilt Effect Logic
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const item = itemsRef.current[index];
    if (!item) return;

    const rect = item.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation based on mouse position
    // Max rotation 10 degrees
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    gsap.to(item, {
      rotationX: rotateX,
      rotationY: rotateY,
      scale: 1.05,
      transformPerspective: 1000,
      transformOrigin: "center center",
      duration: 0.4,
      ease: "power2.out"
    });

    // Move the inner image slightly for depth
    const img = item.querySelector('img');
    if (img) {
      gsap.to(img, {
        scale: 1.1,
        x: (x - centerX) * 0.05,
        y: (y - centerY) * 0.05,
        duration: 0.4,
        ease: "power2.out"
      });
    }
  };

  const handleMouseLeave = (index: number) => {
    const item = itemsRef.current[index];
    if (!item) return;

    gsap.to(item, {
      rotationX: 0,
      rotationY: 0,
      scale: 1,
      duration: 0.6,
      ease: "elastic.out(1, 0.5)"
    });

    const img = item.querySelector('img');
    if (img) {
      gsap.to(img, {
        scale: 1,
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "power2.out"
      });
    }
  };

  const openModal = (item: GalleryItem) => {
    setSelectedImage(item);
  };

  return (
    <div ref={containerRef} className="dark min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black relative overflow-hidden text-white">
      <Header />

      {/* Cinematic Background Particles */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,215,0,0.05),transparent_70%)]" />
        <div className="particles opacity-30" />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-20">
        <div className="text-center mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 blur-[100px] rounded-full" />
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight relative">
            Galería <span className="text-primary">Sion</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light">
            Capturando la esencia de nuestra adoración y comunidad.
          </p>
        </div>

        {/* Filter Categories */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`
                px-6 py-2 rounded-full text-sm font-medium transition-all duration-300
                ${selectedCategory === category.id
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(234,179,8,0.3)] scale-105"
                  : "bg-secondary/50 text-secondary-foreground hover:bg-secondary hover:scale-105"
                }
              `}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div
          ref={galleryRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 perspective-1000"
        >
          {filteredImages.map((image, index) => (
            <div
              key={image.id}
              ref={(el) => (itemsRef.current[index] = el)}
              className="group relative h-[400px] rounded-2xl cursor-pointer will-change-transform"
              onMouseMove={(e) => handleMouseMove(e, index)}
              onMouseLeave={() => handleMouseLeave(index)}
              onClick={() => openModal(image)}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Card Content */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden bg-card border border-white/10 shadow-xl transition-shadow duration-300 group-hover:shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                {/* Image */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500 z-10" />
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transform scale-100 transition-transform duration-700"
                />

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 z-20" />

                {/* Text Content */}
                <div className="absolute bottom-0 left-0 right-0 p-8 z-30 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <Badge className="mb-3 bg-primary/90 text-primary-foreground hover:bg-primary border-none">
                    {image.category.toUpperCase()}
                  </Badge>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-primary transition-colors duration-300">
                    {image.title}
                  </h3>
                  <p className="text-gray-300 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0 delay-75">
                    {image.description}
                  </p>
                </div>

                {/* Shine Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none z-40 transition-opacity duration-500 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
              </div>
            </div>
          ))}
        </div>

        {filteredImages.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              No hay fotos disponibles en esta categoría.
            </p>
          </div>
        )}
      </main>

      {/* Fullscreen Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-6xl w-full max-h-[90vh] grid grid-cols-1 md:grid-cols-[1fr,300px] gap-8 bg-card/5 rounded-3xl overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 slide-in-from-bottom-10"
            onClick={e => e.stopPropagation()}
          >
            {/* Main Image */}
            <div className="relative h-[50vh] md:h-[80vh] bg-black/50">
              <img
                src={selectedImage.src}
                alt={selectedImage.alt}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Sidebar Info */}
            <div className="p-8 flex flex-col justify-center bg-card/10 backdrop-blur-md border-l border-white/5">
              <Badge className="w-fit mb-4 bg-primary text-primary-foreground">
                {selectedImage.category}
              </Badge>
              <h2 className="text-3xl font-bold text-white mb-4">
                {selectedImage.title}
              </h2>
              <p className="text-gray-300 mb-8 leading-relaxed">
                {selectedImage.description}
              </p>
              <div className="mt-auto pt-8 border-t border-white/10">
                <p className="text-sm text-gray-400">Fecha</p>
                <p className="text-white font-medium">{selectedImage.date}</p>
              </div>
            </div>

            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-primary hover:text-black transition-colors duration-300"
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <Footer />

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        
        .particles {
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(255, 215, 0, 0.15) 1px, transparent 1px),
            radial-gradient(circle at 80% 40%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            radial-gradient(circle at 40% 80%, rgba(255, 215, 0, 0.1) 2px, transparent 2px),
            radial-gradient(circle at 90% 90%, rgba(255, 255, 255, 0.15) 1px, transparent 1px);
          background-size: 100% 100%;
          animation: float 20s ease-in-out infinite alternate;
        }

        @keyframes float {
          0% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
          100% { transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Gallery;