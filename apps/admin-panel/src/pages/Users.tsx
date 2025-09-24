import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Search, Plus, Edit, Trash2, UserCheck } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "pastor" | "staff" | "supervisor" | "server";
  phone: string;
  status: "active" | "inactive";
  createdAt: string;
}

const mockUsers: User[] = [
  {
    id: "1",
    name: "Pastor Juan Pérez",
    email: "pastor@iglesiasion.com",
    role: "pastor",
    phone: "+1 809-555-0001",
    status: "active",
    createdAt: "2024-01-15"
  },
  {
    id: "2",
    name: "María González",
    email: "maria@iglesiasion.com",
    role: "staff",
    phone: "+1 809-555-0002",
    status: "active",
    createdAt: "2024-02-10"
  },
  {
    id: "3",
    name: "Carlos Rodríguez",
    email: "carlos@iglesiasion.com",
    role: "supervisor",
    phone: "+1 809-555-0003",
    status: "active",
    createdAt: "2024-03-05"
  },
  {
    id: "4",
    name: "Ana Martínez",
    email: "ana@iglesiasion.com",
    role: "server",
    phone: "+1 809-555-0004",
    status: "inactive",
    createdAt: "2024-03-20"
  }
];

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case "pastor": return "default";
    case "staff": return "secondary";
    case "supervisor": return "outline";
    case "server": return "destructive";
    default: return "secondary";
  }
};

const getStatusBadgeVariant = (status: string) => {
  return status === "active" ? "default" : "secondary";
};

const Users = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users] = useState<User[]>(mockUsers);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Gestión de Usuarios
            </h1>
            <p className="text-muted-foreground">
              Administra los usuarios del sistema y sus roles
            </p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o rol..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuarios ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-sm text-muted-foreground">{user.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(user.status)}>
                      {user.status === "active" ? "Activo" : "Inactivo"}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
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
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Users;