import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  MapPin, 
  Clock, 
  Users, 
  Globe,
  Search,
  Filter,
  MoreHorizontal,
  CalendarDays,
  Image as ImageIcon,
  Upload,
  Settings,
  Share2,
  Copy,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

const EventsPage = () => {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const eventCategories = [
    { id: 'service', name: 'Servicios', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
    { id: 'conference', name: 'Conferencias', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' },
    { id: 'worship', name: 'Adoración', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
    { id: 'youth', name: 'Jóvenes', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
    { id: 'children', name: 'Niños', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400' },
    { id: 'community', name: 'Comunitario', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400' }
  ];

  const sampleEvents = [
    {
      id: 1,
      title: "Servicio Dominical",
      description: "Únete a nosotros para un tiempo de adoración y la Palabra de Dios.",
      date: "2024-04-07",
      time: "10:00",
      endTime: "12:00",
      location: "Santuario Principal",
      category: "service",
      isRecurring: true,
      isPublished: true,
      attendees: 250,
      maxAttendees: 300,
      image: "/api/placeholder/400/200",
      organizer: "Pastor Juan Pérez"
    },
    {
      id: 2,
      title: "Conferencia de Jóvenes 2024",
      description: "Tres días de enseñanzas poderosas, adoración y compañerismo para jóvenes de 15-25 años.",
      date: "2024-04-15",
      time: "18:00",
      endTime: "21:00",
      location: "Centro de Convenciones",
      category: "youth",
      isRecurring: false,
      isPublished: true,
      attendees: 180,
      maxAttendees: 200,
      image: "/api/placeholder/400/200",
      organizer: "Pastor de Jóvenes María González"
    },
    {
      id: 3,
      title: "Noche de Adoración",
      description: "Una noche especial dedicada completamente a la adoración y la presencia de Dios.",
      date: "2024-04-20",
      time: "19:00",
      endTime: "21:30",
      location: "Santuario Principal",
      category: "worship",
      isRecurring: false,
      isPublished: false,
      attendees: 0,
      maxAttendees: 300,
      image: "/api/placeholder/400/200",
      organizer: "Ministerio de Adoración"
    }
  ];

  const getCategoryInfo = (categoryId: string) => {
    return eventCategories.find(cat => cat.id === categoryId) || eventCategories[0];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const EventCard = ({ event }: { event: any }) => {
    const category = getCategoryInfo(event.category);
    
    return (
      <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className="relative">
          <div className="h-48 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="absolute top-3 right-3">
            <Badge className={category.color}>
              {category.name}
            </Badge>
          </div>
          {!event.isPublished && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary">Borrador</Badge>
            </div>
          )}
        </div>
        
        <CardContent className="p-6">
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                {event.title}
              </h3>
              <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
                {event.description}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                <span>{formatDate(event.date)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{event.time} - {event.endTime}</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{event.attendees}/{event.maxAttendees} asistentes</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                {event.isRecurring && (
                  <Badge variant="outline" className="text-xs">
                    Recurrente
                  </Badge>
                )}
                {event.isPublished && (
                  <Badge variant="outline" className="text-xs">
                    <Globe className="w-3 h-3 mr-1" />
                    Publicado
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(event)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const CreateEventDialog = () => (
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Evento</DialogTitle>
          <DialogDescription>
            Completa la información del evento que deseas crear
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Título del Evento *</Label>
              <Input 
                id="title" 
                placeholder="Nombre del evento"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea 
                id="description" 
                placeholder="Describe el evento en detalle..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {eventCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizer">Organizador</Label>
              <Input 
                id="organizer" 
                placeholder="Nombre del organizador"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha *</Label>
              <Input 
                id="date" 
                type="date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Hora de Inicio *</Label>
              <Input 
                id="time" 
                type="time"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">Hora de Fin</Label>
              <Input 
                id="endTime" 
                type="time"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAttendees">Capacidad Máxima</Label>
              <Input 
                id="maxAttendees" 
                type="number"
                placeholder="300"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Ubicación *</Label>
              <Input 
                id="location" 
                placeholder="Dirección o nombre del lugar"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="image">Imagen del Evento</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Subir Imagen
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Evento Recurrente</Label>
                <p className="text-sm text-muted-foreground">
                  Se repite automáticamente
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Publicar en Website</Label>
                <p className="text-sm text-muted-foreground">
                  Visible para visitantes
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Requiere Registro</Label>
                <p className="text-sm text-muted-foreground">
                  Los asistentes deben registrarse
                </p>
              </div>
              <Switch />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              setIsCreateDialogOpen(false);
              toast.success("Evento creado exitosamente");
            }}>
              Crear Evento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Gestión de Eventos
          </h1>
          <p className="text-muted-foreground mt-1">
            Crea y administra eventos para tu congregación
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Crear Evento
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar eventos..." 
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {eventCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select defaultValue="upcoming">
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Próximos</SelectItem>
                  <SelectItem value="past">Pasados</SelectItem>
                  <SelectItem value="draft">Borradores</SelectItem>
                  <SelectItem value="published">Publicados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sampleEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-primary">12</div>
            <div className="text-sm text-muted-foreground">Eventos este mes</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600">850</div>
            <div className="text-sm text-muted-foreground">Total asistentes</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-orange-600">3</div>
            <div className="text-sm text-muted-foreground">Próximos eventos</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-purple-600">8</div>
            <div className="text-sm text-muted-foreground">Eventos publicados</div>
          </CardContent>
        </Card>
      </div>

      <CreateEventDialog />

      {/* Event Detail Modal */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                {selectedEvent.title}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-1" />
                    Compartir
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="h-48 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground" />
              </div>

              <div className="space-y-4">
                <p className="text-muted-foreground">{selectedEvent.description}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{formatDate(selectedEvent.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{selectedEvent.time} - {selectedEvent.endTime}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{selectedEvent.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{selectedEvent.attendees}/{selectedEvent.maxAttendees} asistentes</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Badge className={getCategoryInfo(selectedEvent.category).color}>
                    {getCategoryInfo(selectedEvent.category).name}
                  </Badge>
                  {selectedEvent.isRecurring && (
                    <Badge variant="outline">Recurrente</Badge>
                  )}
                  {selectedEvent.isPublished && (
                    <Badge variant="outline">
                      <Globe className="w-3 h-3 mr-1" />
                      Publicado
                    </Badge>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  <strong>Organizador:</strong> {selectedEvent.organizer}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default EventsPage;