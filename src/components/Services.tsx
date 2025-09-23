import { Settings, Users, BarChart3, UserCheck, Calendar, Clock, Mic2, ChefHat, Music, Video, Volume2, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Services = () => {
  const modules = [
    {
      title: "Gestión de Cultos",
      description: "Coordinación completa de servicios dominicales",
      features: ["Cronogramas", "Asignación de equipos", "Control de recursos"],
      icon: Calendar,
      color: "bg-primary/10 text-primary",
      departments: [
        { name: "Cocina", icon: ChefHat },
        { name: "Músicos", icon: Music },
        { name: "Producción", icon: Video },
        { name: "Sonido", icon: Volume2 }
      ]
    },
    {
      title: "Módulo Discipulado",
      description: "Seguimiento personalizado 1v1 con nuevos convertidos",
      features: ["Asignación mentores", "Progreso individual", "Recursos formativos"],
      icon: UserCheck,
      color: "bg-accent/20 text-accent",
      departments: []
    },
    {
      title: "Gestión de Departamentos",
      description: "Administración y coordinación interdepartamental",
      features: ["Roles y permisos", "Comunicación interna", "Reportes"],
      icon: Settings,
      color: "bg-primary-light/20 text-primary",
      departments: []
    },
    {
      title: "Analytics y Reportes",
      description: "Métricas y análisis organizacional avanzado",
      features: ["Dashboards", "Indicadores KPI", "Exportar datos"],
      icon: BarChart3,
      color: "bg-accent/30 text-accent",
      departments: []
    }
  ];

  return (
    <section id="modulos" className="py-20 bg-gradient-to-b from-background to-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-primary/10 rounded-full px-6 py-2 mb-4">
            <Settings className="w-5 h-5 mr-2 text-primary" />
            <span className="text-sm font-semibold text-primary">ERP ECLESIÁSTICO</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Módulos del Sistema
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Plataforma integral que centraliza toda la gestión organizacional de tu iglesia, 
            desde la coordinación del culto hasta el seguimiento personalizado de discipulado
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {modules.map((module, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-xl ${module.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <module.icon className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl font-bold text-foreground mb-2">
                      {module.title}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-base">
                      {module.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Características:</h4>
                  <ul className="space-y-1">
                    {module.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {module.departments.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Departamentos integrados:</h4>
                    <div className="flex flex-wrap gap-2">
                      {module.departments.map((dept, idx) => (
                        <div key={idx} className="flex items-center bg-secondary/50 rounded-full px-3 py-1">
                          <dept.icon className="w-4 h-4 mr-1.5 text-primary" />
                          <span className="text-sm text-foreground">{dept.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-8 max-w-4xl mx-auto border border-primary/20">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              ¿Listo para optimizar la gestión de tu iglesia?
            </h3>
            <p className="text-lg text-muted-foreground mb-6">
              Únete a la nueva era de administración eclesiástica con SION
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex items-center text-primary font-medium">
                <Users className="w-5 h-5 mr-2" />
                <span>Sistema multiusuario</span>
              </div>
              <div className="flex items-center text-primary font-medium">
                <MessageSquare className="w-5 h-5 mr-2" />
                <span>Soporte 24/7</span>
              </div>
              <div className="flex items-center text-primary font-medium">
                <Clock className="w-5 h-5 mr-2" />
                <span>Implementación rápida</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;