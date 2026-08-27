import { ApiService } from './api.service';

export class CommunicationsService {
  static sendBulkEmail(
    recipientIds: string[],
    subject: string,
    body: string
  ): Promise<{ queued: number }> {
    return ApiService.post<
      { queued: number },
      { recipient_ids: string[]; subject: string; body: string }
    >('/communications/bulk-email', { recipient_ids: recipientIds, subject, body });
  }
}
