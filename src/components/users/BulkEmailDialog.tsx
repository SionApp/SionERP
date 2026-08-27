import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CommunicationsService } from '@/services/communications.service';

interface BulkEmailDialogProps {
  recipientIds: string[];
  recipientCount: number;
  onSent?: () => void;
}

export function BulkEmailDialog({ recipientIds, recipientCount, onSent }: BulkEmailDialogProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const send = useMutation({
    mutationFn: () => CommunicationsService.sendBulkEmail(recipientIds, subject, body),
    onSuccess: result => {
      toast.success(
        `Correo encolado para ${result.queued} destinatario${result.queued !== 1 ? 's' : ''}`
      );
      setOpen(false);
      setSubject('');
      setBody('');
      onSent?.();
    },
    onError: () => toast.error('No se pudo encolar el correo'),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Mail className="h-4 w-4" />
          Enviar correo ({recipientCount})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Enviar correo a {recipientCount} usuario{recipientCount !== 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Asunto</Label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Asunto del correo"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mensaje</Label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Escribí el mensaje..."
              rows={6}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!subject.trim() || !body.trim() || send.isPending}
            onClick={() => send.mutate()}
          >
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
