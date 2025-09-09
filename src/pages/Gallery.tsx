import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Gallery = () => {
  const [selectedCategory, setSelectedCategory] = useState("todos");

  const galleryImages = [
    {
      id: 1,
      src: "/api/placeholder/400/300",
      alt: "Servicio Dominical",
      category: "servicios",
      title: "Servicio Dominical",
      date: "2024-01-15"
    },
    {
      id: 2,
      src: "/api/placeholder/400/300",
      alt: "Bautismo",
      category: "eventos",
      title: "Ceremonia de Bautismo",
      date: "2024-01-10"
    },
    {
      id: 3,
      src: "/api/placeholder/400/300",
      alt: "Comunidad",
      category: "comunidad",
      title: "Reunión de Jóvenes",
      date: "2024-01-08"
    },
    {
      id: 4,
      src: "/api/placeholder/400/300",
      alt: "Oración",
      category: "servicios",
      title: "Vigilia de Oración",
      date: "2024-01-05"
    },
    {
      id: 5,
      src: "/api/placeholder/400/300",
      alt: "Actividad Familiar",
      category: "eventos",
      title: "Día de la Familia",
      date: "2024-01-01"
    },
    {
      id: 6,
      src: "/api/placeholder/400/300",
      alt: "Estudio Bíblico",
      category: "comunidad",
      title: "Estudio Bíblico",
      date: "2023-12-28"
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Galería de Fotos
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Momentos especiales de nuestra comunidad de fe
          </p>
        </div>

        {/* Filter Categories */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "secondary"}
              className="cursor-pointer px-6 py-2 text-sm transition-all duration-300 hover:shadow-md"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.label}
            </Badge>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredImages.map((image) => (
            <Card key={image.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
              <CardContent className="p-0">
                <div className="relative overflow-hidden">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {image.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(image.date).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredImages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No hay fotos disponibles en esta categoría.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Gallery;