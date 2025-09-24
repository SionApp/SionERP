import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Play, Square, Edit, Trash2, Plus, Youtube } from "lucide-react";

interface LiveStream {
  id: string;
  title: string;
  description: string;
  youtubeVideoId: string;
  isLive: boolean;
  scheduledStart: string;
  createdAt: string;
}

const mockStreams: LiveStream[] = [
  {
    id: "1",
    title: "Servicio Dominical - Mañana",
    description: "Servicio dominical de la mañana con predicación especial",
    youtubeVideoId: "dQw4w9WgXcQ",
    isLive: true,
    scheduledStart: "2024-03-24T09:00:00",
    createdAt: "2024-03-20"
  },
  {
    id: "2",
    title: "Estudio Bíblico Miércoles",
    description: "Estudio bíblico de los miércoles por la noche",
    youtubeVideoId: "jNQXAC9IVRw",
    isLive: false,
    scheduledStart: "2024-03-27T19:00:00",
    createdAt: "2024-03-21"
  }
];

const LiveStreams = () => {
  const [streams] = useState<LiveStream[]>(mockStreams);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    youtubeVideoId: "",
    scheduledStart: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement stream creation
    console.log("Creating stream:", formData);
    setShowForm(false);
    setFormData({
      title: "",
      description: "",
      youtubeVideoId: "",
      scheduledStart: ""
    });
  };

  const toggleLiveStatus = (streamId: string) => {
    // TODO: Implement live status toggle
    console.log("Toggling live status for stream:", streamId);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Transmisiones en Vivo
            </h1>
            <p className="text-muted-foreground">
              Gestiona las transmisiones de YouTube de la iglesia
            </p>
          </div>
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva Transmisión
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Nueva Transmisión</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Título de la transmisión"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtubeVideoId">ID del Video de YouTube</Label>
                    <Input
                      id="youtubeVideoId"
                      value={formData.youtubeVideoId}
                      onChange={(e) => setFormData({...formData, youtubeVideoId: e.target.value})}
                      placeholder="dQw4w9WgXcQ"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descripción de la transmisión"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduledStart">Fecha y Hora Programada</Label>
                  <Input
                    id="scheduledStart"
                    type="datetime-local"
                    value={formData.scheduledStart}
                    onChange={(e) => setFormData({...formData, scheduledStart: e.target.value})}
                    required
                  />
                </div>

                <div className="flex space-x-4">
                  <Button type="submit">Crear Transmisión</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6">
          {streams.map((stream) => (
            <Card key={stream.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Youtube className="h-5 w-5 text-red-600" />
                      {stream.title}
                    </CardTitle>
                    <p className="text-muted-foreground mt-2">{stream.description}</p>
                  </div>
                  <Badge variant={stream.isLive ? "default" : "secondary"}>
                    {stream.isLive ? "En Vivo" : "Programado"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">ID del Video</Label>
                      <p className="text-sm text-muted-foreground">{stream.youtubeVideoId}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Fecha Programada</Label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(stream.scheduledStart).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Creado</Label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(stream.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <iframe
                      src={`https://www.youtube.com/embed/${stream.youtubeVideoId}`}
                      title={stream.title}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant={stream.isLive ? "destructive" : "default"}
                      onClick={() => toggleLiveStatus(stream.id)}
                    >
                      {stream.isLive ? (
                        <>
                          <Square className="h-4 w-4 mr-2" />
                          Detener
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Iniciar
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {streams.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Youtube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No hay transmisiones configuradas. Crea tu primera transmisión.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveStreams;