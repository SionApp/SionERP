import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface UserData {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  cedula: string;
  role: string;
  bautizado: boolean;
  whatsapp: boolean;
  created_at: string;
}

const UsersPage = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        toast.error('Error al cargar los usuarios');
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.cedula.includes(searchTerm)
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios registrados en el sistema
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, email o cédula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Lista de todos los usuarios registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No se encontraron usuarios</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-medium">
                          {user.nombres} {user.apellidos}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {user.correo}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Cédula: {user.cedula}</p>
                        <p>Teléfono: {user.telefono}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                    {user.bautizado && (
                      <Badge variant="outline">Bautizado</Badge>
                    )}
                    {user.whatsapp && (
                      <Badge variant="outline">WhatsApp</Badge>
                    )}
                  </div>
                  
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Registrado:</p>
                    <p>{new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;