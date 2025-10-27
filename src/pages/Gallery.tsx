import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Gallery = () => {
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const galleryRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const galleryImages = [
    {
      id: 1,
      src: '/api/placeholder/400/300',
      alt: 'Servicio Dominical',
      category: 'servicios',
      title: 'Servicio Dominical',
      date: '2024-01-15',
    },
    {
      id: 2,
      src: '/api/placeholder/400/300',
      alt: 'Bautismo',
      category: 'eventos',
      title: 'Ceremonia de Bautismo',
      date: '2024-01-10',
    },
    {
      id: 3,
      src: '/api/placeholder/400/300',
      alt: 'Comunidad',
      category: 'comunidad',
      title: 'Reunión de Jóvenes',
      date: '2024-01-08',
    },
    {
      id: 4,
      src: '/api/placeholder/400/300',
      alt: 'Oración',
      category: 'servicios',
      title: 'Vigilia de Oración',
      date: '2024-01-05',
    },
    {
      id: 5,
      src: '/api/placeholder/400/300',
      alt: 'Actividad Familiar',
      category: 'eventos',
      title: 'Día de la Familia',
      date: '2024-01-01',
    },
    {
      id: 6,
      src: '/api/placeholder/400/300',
      alt: 'Estudio Bíblico',
      category: 'comunidad',
      title: 'Estudio Bíblico',
      date: '2023-12-28',
    },
  ];

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'eventos', label: 'Eventos Especiales' },
    { id: 'comunidad', label: 'Comunidad' },
  ];

  const filteredImages =
    selectedCategory === 'todos'
      ? galleryImages
      : galleryImages.filter(img => img.category === selectedCategory);

  useEffect(() => {
    // Animación inicial para las imágenes
    const images = imageRefs.current.filter(Boolean);

    gsap.set(images, {
      opacity: 0,
      y: 100,
      rotationX: -15,
      scale: 0.8,
    });

    // Animación de entrada staggered
    gsap.to(images, {
      opacity: 1,
      y: 0,
      rotationX: 0,
      scale: 1,
      duration: 1,
      stagger: {
        amount: 1.2,
        from: 'random',
      },
      ease: 'back.out(1.7)',
      scrollTrigger: {
        trigger: galleryRef.current,
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none reverse',
      },
    });

    // Efecto de hover 3D para cada imagen
    images.forEach((image, index) => {
      if (!image) return;

      const img = image.querySelector('img');
      if (!img) return;

      image.addEventListener('mouseenter', () => {
        gsap.to(image, {
          scale: 1.05,
          rotationY: 5,
          rotationX: 5,
          z: 50,
          duration: 0.3,
          ease: 'power2.out',
        });

        gsap.to(img, {
          scale: 1.1,
          duration: 0.3,
          ease: 'power2.out',
        });
      });

      image.addEventListener('mouseleave', () => {
        gsap.to(image, {
          scale: 1,
          rotationY: 0,
          rotationX: 0,
          z: 0,
          duration: 0.3,
          ease: 'power2.out',
        });

        gsap.to(img, {
          scale: 1,
          duration: 0.3,
          ease: 'power2.out',
        });
      });

      // Efecto de parallax scroll
      ScrollTrigger.create({
        trigger: image,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate: self => {
          const progress = self.progress;
          gsap.to(img, {
            y: progress * -50,
            duration: 0.1,
            overwrite: true,
          });
        },
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [filteredImages]);

  const handleImageClick = (image: any) => {
    const modal = document.createElement('div');
    modal.className =
      'fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm';
    modal.innerHTML = `
      <div class="relative max-w-4xl max-h-[90vh] p-4">
        <img src="${image.src}" alt="${image.alt}" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        <button class="absolute -top-2 -right-2 w-8 h-8 bg-background text-foreground rounded-full flex items-center justify-center text-xl font-bold hover:bg-accent hover:text-accent-foreground transition-colors border border-border">×</button>
      </div>
    `;

    document.body.appendChild(modal);

    gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.3 });

    const img = modal.querySelector('img');
    gsap.fromTo(
      img,
      { scale: 0.8, y: 50 },
      { scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)' }
    );

    modal.addEventListener('click', e => {
      if (e.target === modal || (e.target as Element).tagName === 'BUTTON') {
        gsap.to(modal, {
          opacity: 0,
          duration: 0.3,
          onComplete: () => modal.remove(),
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Galería de Fotos</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Momentos especiales de nuestra comunidad de fe
          </p>
        </div>

        {/* Filter Categories */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map(category => (
            <Badge
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'secondary'}
              className="cursor-pointer px-6 py-2 text-sm transition-all duration-300 hover:shadow-md"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.label}
            </Badge>
          ))}
        </div>

        {/* Gallery Grid */}
        <div
          ref={galleryRef}
          className="masonry-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            padding: '2rem 0',
          }}
        >
          {filteredImages.map((image, index) => (
            <div
              key={image.id}
              ref={el => (imageRefs.current[index] = el)}
              className="gallery-item group cursor-pointer"
              onClick={() => handleImageClick(image)}
              style={{
                perspective: '1000px',
                transformStyle: 'preserve-3d',
              }}
            >
              <div className="relative overflow-hidden rounded-xl shadow-lg bg-card">
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover transition-all duration-500"
                  />
                </div>

                {/* Overlay con efecto glass */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Badge flotante */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Badge
                    variant="secondary"
                    className="bg-white/20 backdrop-blur-md text-white border-white/30"
                  >
                    {image.category === 'servicios'
                      ? 'Servicios'
                      : image.category === 'eventos'
                        ? 'Eventos'
                        : 'Comunidad'}
                  </Badge>
                </div>

                {/* Indicador de click */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredImages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No hay fotos disponibles en esta categoría.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Gallery;
