import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiService } from '@/services/api.service';
import { DiscipleshipService } from '@/services/discipleship.service';
import type {
  GroupMemberWithDetails,
  AttendanceWithDetails,
  RecordAttendanceRequest,
  AddGroupMemberRequest,
} from '@/types/discipleship.types';
import { normalizeNullString } from '@/lib/utils';
import {
  Users,
  UserPlus,
  Check,
  X,
  Search,
  Loader2,
  Calendar,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

interface GroupMembersProps {
  groupId: string;
  groupName: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

const normalizeNullString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'String' in value && 'Valid' in value) {
    const nullString = value as { String: string; Valid: boolean };
    return nullString.Valid ? nullString.String : null;
  }
  return String(value);
};

export function GroupMembers({ groupId, groupName }: GroupMembersProps) {
  const [members, setMembers] = useState<GroupMemberWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('member');
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceList, setAttendanceList] = useState<Map<string, boolean>>(new Map());
  const [recentAttendance, setRecentAttendance] = useState<AttendanceWithDetails[]>([]);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await DiscipleshipService.getGroupMembers(groupId);
      const membersData = data || [];
      const normalized = membersData.map(m => ({
        ...m,
        user_name: normalizeNullString(m.user_name) || 'Sin nombre',
        user_email: normalizeNullString(m.user_email) || '',
      }));
      setMembers(normalized);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Error al cargar miembros');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const response = await ApiService.get<{ users: User[] } | User[]>('/users');
      let userList: User[] = [];
      if (Array.isArray(response)) {
        userList = response as User[];
      } else if (response && typeof response === 'object' && 'users' in response) {
        userList = (response.users as User[]) || [];
      }

      const normalized = userList
        .filter(u => u.id)
        .map(u => ({
          id: String(normalizeNullString(u.id) || ''),
          full_name:
            u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Sin nombre',
          email: normalizeNullString(u.email) || '',
          phone: normalizeNullString(u.phone) || '',
        }));
      setUsers(normalized);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadRecentAttendance = useCallback(async () => {
    try {
      const lastWeek = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const data = await DiscipleshipService.getGroupAttendance(groupId, lastWeek);
      setRecentAttendance((data || []).slice(0, 14));
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  }, [groupId]);

  useEffect(() => {
    loadMembers();
    loadRecentAttendance();
  }, [loadMembers, loadRecentAttendance]);

  const filteredUsers = users.filter(
    u =>
      !members.some(m => m.user_id === u.id) &&
      (u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error('Selecciona un usuario');
      return;
    }

    try {
      setSaving(true);
      const data: AddGroupMemberRequest = {
        user_id: selectedUserId,
        role_in_group: selectedRole,
      };
      await DiscipleshipService.addGroupMember(groupId, data);
      toast.success('Miembro agregado');
      setIsAddDialogOpen(false);
      setSelectedUserId('');
      setSelectedRole('member');
      await loadMembers();
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Error al agregar miembro');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await DiscipleshipService.removeGroupMember(memberId);
      toast.success('Miembro removido');
      await loadMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Error al remover miembro');
    }
  };

  const handleSaveAttendance = async () => {
    const attendance: RecordAttendanceRequest[] = members
      .filter(m => m.is_active)
      .map(m => ({
        user_id: m.user_id,
        present: attendanceList.get(m.user_id) ?? true,
      }));

    if (attendance.length === 0) {
      toast.error('No hay miembros activos');
      return;
    }

    try {
      setSaving(true);
      await DiscipleshipService.bulkRecordAttendance(groupId, {
        meeting_date: attendanceDate,
        attendance,
      });
      toast.success('Asistencia registrada');
      setIsAttendanceDialogOpen(false);
      await loadRecentAttendance();
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Error al registrar asistencia');
    } finally {
      setSaving(false);
    }
  };

  const getMemberAttendance = (userId: string): number => {
    const memberAttendance = recentAttendance.filter(a => a.user_id === userId && a.present);
    const total = recentAttendance.filter(a => a.user_id === userId).length;
    if (total === 0) return 0;
    return Math.round((memberAttendance.length / total) * 100);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    const config = {
      leader: { label: 'Líder', variant: 'default' as const },
      helper: { label: 'Ayudante', variant: 'secondary' as const },
      member: { label: 'Miembro', variant: 'outline' as const },
      visitor: { label: 'Visitante', variant: 'outline' as const },
    };
    const c = config[role as keyof typeof config] || config.member;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Miembros del Grupo
          </CardTitle>
          <CardDescription>{groupName}</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAttendanceList(new Map());
              members
                .filter(m => m.is_active)
                .forEach(m => {
                  attendanceList.set(m.user_id, true);
                });
              setIsAttendanceDialogOpen(true);
            }}
          >
            <Calendar className="w-4 h-4 mr-1" />
            Asistencia
          </Button>
          <Button
            size="sm"
            onClick={() => {
              loadUsers();
              setIsAddDialogOpen(true);
            }}
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Agregar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay miembros en este grupo</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                loadUsers();
                setIsAddDialogOpen(true);
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Agregar primer miembro
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(member => (
              <div
                key={member.id}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  !member.is_active ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.user_name}`}
                    />
                    <AvatarFallback>{getInitials(member.user_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{member.user_name}</div>
                    <div className="text-xs text-muted-foreground">{member.user_email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getRoleBadge(member.role_in_group)}
                  {member.is_active && member.role_in_group !== 'leader' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialog agregar miembro */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Miembro</DialogTitle>
            <DialogDescription>
              Busca y selecciona un usuario para agregar al grupo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuario..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {loadingUsers ? (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No hay usuarios disponibles
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-2 border rounded-lg cursor-pointer hover:bg-muted ${
                      selectedUserId === user.id ? 'bg-primary/10 border-primary' : ''
                    }`}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}`}
                        />
                        <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{user.full_name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                    {selectedUserId === user.id && <Check className="w-4 h-4 text-primary" />}
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <Label>Rol en el grupo</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Miembro</SelectItem>
                  <SelectItem value="helper">Ayudante</SelectItem>
                  <SelectItem value="visitor">Visitante</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMember} disabled={!selectedUserId || saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Agregar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog registrar asistencia */}
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Asistencia</DialogTitle>
            <DialogDescription>Registra la asistencia de los miembros del grupo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fecha de reunión</Label>
              <Input
                type="date"
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Miembros ({members.filter(m => m.is_active).length})</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const allPresent = members
                      .filter(m => m.is_active)
                      .every(m => attendanceList.get(m.user_id) === true);
                    const newList = new Map(attendanceList);
                    members
                      .filter(m => m.is_active)
                      .forEach(m => {
                        newList.set(m.user_id, !allPresent);
                      });
                    setAttendanceList(newList);
                  }}
                >
                  {members.filter(m => m.is_active).every(m => attendanceList.get(m.user_id))
                    ? 'Desmarcar todos'
                    : 'Marcar todos'}
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {members
                  .filter(m => m.is_active)
                  .map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.user_name}`}
                          />
                          <AvatarFallback>{getInitials(member.user_name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{member.user_name}</span>
                      </div>
                      <Checkbox
                        checked={attendanceList.get(member.user_id) ?? true}
                        onCheckedChange={checked => {
                          const newList = new Map(attendanceList);
                          newList.set(member.user_id, checked === true);
                          setAttendanceList(newList);
                        }}
                      />
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAttendanceDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAttendance} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
