import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../shared/constants/api-endpoints';
import { InboxNotification } from '../models/inbox-notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);

  getInbox(): Observable<InboxNotification[]> {
    return this.http.get<InboxNotification[]>(API_ENDPOINTS.notification.inbox());
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(API_ENDPOINTS.notification.inboxUnreadCount());
  }

  markAsRead(id: string): Observable<void> {
    return this.http.put<void>(API_ENDPOINTS.notification.inboxMarkRead(id), {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(API_ENDPOINTS.notification.inboxMarkAllRead(), {});
  }
}
