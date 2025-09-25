import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Activity, Database, ArrowRight } from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLog: any;
}

export const AuditLogModal = ({ isOpen, onClose, auditLog }: AuditLogModalProps) => {
  if (!auditLog) return null;

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
      return new Date(value).toLocaleString('es-ES');
    }
    return String(value);
  };

  const getChangedFields = () => {
    if (!auditLog.old_values || !auditLog.new_values) return [];
    
    const changes = [];
    const oldValues = auditLog.old_values;
    const newValues = auditLog.new_values;
    
    for (const key in newValues) {
      if (oldValues[key] !== newValues[key]) {
        changes.push({
          field: key,
          oldValue: oldValues[key],
          newValue: newValues[key]
        });
      }
    }
    
    return changes;
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'default';
      case 'UPDATE': return 'secondary';
      case 'DELETE': return 'destructive';
      default: return 'outline';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT': return <Activity className="h-4 w-4" />;
      case 'UPDATE': return <ArrowRight className="h-4 w-4" />;
      case 'DELETE': return <Database className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const fieldLabels: Record<string, string> = {
    nombres: 'Nombres',
    apellidos: 'Apellidos',
    correo: 'Correo',
    telefono: 'Teléfono',
    direccion: 'Dirección',
    role: 'Rol',
    is_active: 'Activo',
    bautizado: 'Bautizado',
    fecha_bautizo: 'Fecha de Bautizo',
    cell_group: 'Grupo Celular',
    pastoral_notes: 'Notas Pastorales',
    updated_at: 'Actualizado el'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getActionIcon(auditLog.action)}
            Detalle de Actividad del Sistema
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Información General */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Fecha y Hora</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(auditLog.changed_at).toLocaleString('es-ES')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Usuario</p>
                <p className="text-sm text-muted-foreground">
                  {auditLog.users ? `${auditLog.users.nombres} ${auditLog.users.apellidos}` : 'Sistema'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Tabla</p>
                <p className="text-sm text-muted-foreground">{auditLog.table_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Acción</p>
                <Badge variant={getActionColor(auditLog.action)}>
                  {auditLog.action}
                </Badge>
              </div>
            </div>
          </div>

          {/* Cambios Realizados */}
          {auditLog.action === 'UPDATE' && getChangedFields().length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Cambios Realizados</h4>
              <div className="space-y-3">
                {getChangedFields().map((change, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <p className="font-medium text-sm mb-2">
                      {fieldLabels[change.field] || change.field}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded border">
                        <p className="text-red-600 dark:text-red-400 font-medium mb-1">Antes:</p>
                        <p className="text-red-800 dark:text-red-200">
                          {formatValue(change.oldValue)}
                        </p>
                      </div>
                      <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border">
                        <p className="text-green-600 dark:text-green-400 font-medium mb-1">Después:</p>
                        <p className="text-green-800 dark:text-green-200">
                          {formatValue(change.newValue)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Datos Creados */}
          {auditLog.action === 'INSERT' && auditLog.new_values && (
            <div>
              <h4 className="font-medium mb-3">Datos Creados</h4>
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {Object.entries(auditLog.new_values).map(([key, value]) => (
                    <div key={key}>
                      <p className="font-medium text-green-700 dark:text-green-300">
                        {fieldLabels[key] || key}:
                      </p>
                      <p className="text-green-800 dark:text-green-200">
                        {formatValue(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Datos Eliminados */}
          {auditLog.action === 'DELETE' && auditLog.old_values && (
            <div>
              <h4 className="font-medium mb-3">Datos Eliminados</h4>
              <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {Object.entries(auditLog.old_values).map(([key, value]) => (
                    <div key={key}>
                      <p className="font-medium text-red-700 dark:text-red-300">
                        {fieldLabels[key] || key}:
                      </p>
                      <p className="text-red-800 dark:text-red-200">
                        {formatValue(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ID del Registro */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              ID del registro: {auditLog.record_id}
            </p>
            <p className="text-xs text-muted-foreground">
              ID del audit log: {auditLog.id}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
