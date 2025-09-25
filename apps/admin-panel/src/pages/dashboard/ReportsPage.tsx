import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  TrendingUp, 
  PieChart, 
  Filter,
  Search,
  RefreshCw,
  Eye,
  Printer
} from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { DateRange } from "react-day-picker";

const ReportsPage = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const reportTypes = [
    {
      id: "users",
      title: "Reporte de Usuarios",
      description: "Estadísticas completas de miembros y visitantes",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20"
    },
    {
      id: "growth",
      title: "Reporte de Crecimiento",
      description: "Análisis de crecimiento congregacional",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/20"
    },
    {
      id: "demographics",
      title: "Reporte Demográfico",
      description: "Análisis por edades, ubicación y estados",
      icon: PieChart,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20"
    },
    {
      id: "activities",
      title: "Reporte de Actividades",
      description: "Participación en eventos y servicios",
      icon: BarChart3,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/20"
    }
  ];

  const recentReports = [
    {
      id: 1,
      name: "Reporte Mensual - Marzo 2024",
      type: "Usuarios",
      generatedDate: "2024-03-31",
      status: "completed",
      fileSize: "2.3 MB"
    },
    {
      id: 2,
      name: "Análisis de Crecimiento Q1",
      type: "Crecimiento",
      generatedDate: "2024-03-28",
      status: "completed",
      fileSize: "1.8 MB"
    },
    {
      id: 3,
      name: "Demografía Congregacional",
      type: "Demográfico",
      generatedDate: "2024-03-25",
      status: "processing",
      fileSize: "..."
    }
  ];

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    // Simular generación de reporte
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Centro de Reportes
          </h1>
          <p className="text-muted-foreground mt-1">
            Genera reportes detallados y analiza el crecimiento de la congregación
          </p>
        </div>
        <Button 
          onClick={handleGenerateReport}
          disabled={!selectedReport || isGenerating}
          className="w-full lg:w-auto"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Generar Reporte
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="generator" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="generator">Generar Reportes</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          {/* Report Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <Card 
                  key={report.id}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                    selectedReport === report.id 
                      ? 'ring-2 ring-primary shadow-lg scale-105' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedReport(report.id)}
                >
                  <CardHeader className="pb-3">
                    <div className={`w-12 h-12 rounded-xl ${report.bgColor} flex items-center justify-center mb-3`}>
                      <Icon className={`w-6 h-6 ${report.color}`} />
                    </div>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {report.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          {/* Configuration Panel */}
          {selectedReport && (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Configuración del Reporte
                </CardTitle>
                <CardDescription>
                  Personaliza los parámetros para tu reporte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="date-range">Rango de Fechas</Label>
                    <DatePickerWithRange
                      date={dateRange}
                      onDateChange={setDateRange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="format">Formato de Exportación</Label>
                    <Select defaultValue="pdf">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filter">Filtro por Estado</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los Estados</SelectItem>
                        <SelectItem value="active">Solo Activos</SelectItem>
                        <SelectItem value="members">Solo Miembros</SelectItem>
                        <SelectItem value="visitors">Solo Visitantes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="groupby">Agrupar Por</Label>
                    <Select defaultValue="month">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Día</SelectItem>
                        <SelectItem value="week">Semana</SelectItem>
                        <SelectItem value="month">Mes</SelectItem>
                        <SelectItem value="quarter">Trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <Button 
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="flex-1 sm:flex-none"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generando Reporte...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Generar y Descargar
                      </>
                    )}
                  </Button>
                  <Button variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    Vista Previa
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Buscar Reportes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input 
                    placeholder="Buscar por nombre o tipo de reporte..." 
                    className="w-full"
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="users">Usuarios</SelectItem>
                    <SelectItem value="growth">Crecimiento</SelectItem>
                    <SelectItem value="demographics">Demográfico</SelectItem>
                    <SelectItem value="activities">Actividades</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Reports History */}
          <div className="grid gap-4">
            {recentReports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <h3 className="font-semibold">{report.name}</h3>
                        <Badge variant={
                          report.status === 'completed' ? 'default' : 
                          report.status === 'processing' ? 'secondary' : 'destructive'
                        }>
                          {report.status === 'completed' ? 'Completado' : 
                           report.status === 'processing' ? 'Procesando' : 'Error'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {report.generatedDate}
                        </span>
                        <span>Tipo: {report.type}</span>
                        <span>Tamaño: {report.fileSize}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Descargar
                      </Button>
                      <Button variant="outline" size="sm">
                        <Printer className="w-4 h-4 mr-1" />
                        Imprimir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;