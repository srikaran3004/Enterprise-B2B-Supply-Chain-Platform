import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../../../core/services/notification.service';
import { InboxNotification } from '../../../../core/models/inbox-notification.model';

@Component({
  selector: 'app-dealer-notifications',
  standalone: false,
  template: `
    <div class="notifications-page">
      <hul-page-header 
        title="Notifications" 
        subtitle="Stay updated with your orders and account activities"
        [breadcrumbs]="[{label: 'Home', route: '/dealer/dashboard'}, {label: 'Notifications'}]">
      </hul-page-header>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-state">
        <hul-skeleton type="text" [count]="5"></hul-skeleton>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && notifications.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        </div>
        <h3>No notifications yet</h3>
        <p>When you receive notifications about your orders, payments, or account, they'll appear here.</p>
      </div>

      <!-- Notifications List -->
      <div *ngIf="!loading && notifications.length > 0" class="notifications-list">
        <div *ngFor="let notif of notifications" 
             class="notification-card" 
             [class.notification-card--unread]="!notif.isRead"
             (click)="markAsRead(notif)">
          <div class="notification-icon" [ngClass]="getIconClass(notif.type)">
            <svg *ngIf="notif.type === 'Order'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <svg *ngIf="notif.type === 'Payment'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg *ngIf="notif.type !== 'Order' && notif.type !== 'Payment'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="notification-content">
            <div class="notification-header">
              <h4 class="notification-title">{{ notif.title }}</h4>
              <span class="notification-time">{{ notif.createdAt | date:'short' }}</span>
            </div>
            <p class="notification-message">{{ notif.message }}</p>
            <div class="notification-footer">
              <span class="notification-type-badge" [ngClass]="'badge-' + notif.type.toLowerCase()">
                {{ notif.type }}
              </span>
              <span *ngIf="!notif.isRead" class="unread-indicator">New</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Mark All as Read Button -->
      <div *ngIf="!loading && hasUnread" class="actions-bar">
        <hul-button variant="outline" size="sm" (click)="markAllAsRead()">
          Mark all as read
        </hul-button>
      </div>
    </div>
  `,
  styles: [`
    .notifications-page { animation: slideUp 300ms var(--ease-out); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

    .loading-state { margin-top: 20px; }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: var(--bg-card);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card);
    }

    .empty-icon {
      display: inline-flex;
      padding: 20px;
      background: var(--bg-muted);
      border-radius: 50%;
      color: var(--text-tertiary);
      margin-bottom: 20px;
    }

    .empty-state h3 {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px;
    }

    .empty-state p {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0;
      max-width: 400px;
      margin: 0 auto;
    }

    .notifications-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 20px;
    }

    .notification-card {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      border: 1px solid var(--border-default);
      transition: all var(--duration-fast);
      cursor: pointer;
    }

    .notification-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }

    .notification-card--unread {
      background: rgba(0, 102, 204, 0.03);
      border-left: 3px solid var(--hul-primary);
    }

    .notification-icon {
      flex-shrink: 0;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-order { background: rgba(0, 102, 204, 0.1); color: var(--hul-primary); }
    .icon-payment { background: rgba(0, 163, 108, 0.1); color: var(--hul-success); }
    .icon-system { background: rgba(108, 92, 231, 0.1); color: #6c5ce7; }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 8px;
    }

    .notification-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
      flex: 1;
    }

    .notification-time {
      font-size: 12px;
      color: var(--text-tertiary);
      white-space: nowrap;
    }

    .notification-message {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0 0 12px;
      line-height: 1.5;
    }

    .notification-footer {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .notification-type-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .badge-order { background: rgba(0, 102, 204, 0.1); color: var(--hul-primary); }
    .badge-payment { background: rgba(0, 163, 108, 0.1); color: var(--hul-success); }
    .badge-system { background: rgba(108, 92, 231, 0.1); color: #6c5ce7; }

    .unread-indicator {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 12px;
      background: var(--hul-primary);
      color: white;
    }

    .actions-bar {
      margin-top: 20px;
      display: flex;
      justify-content: center;
    }
  `]
})
export class DealerNotificationsComponent implements OnInit {
  loading = true;
  notifications: InboxNotification[] = [];
  hasUnread = false;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.loading = true;
    this.notificationService.getInbox().subscribe({
      next: (data) => {
        this.notifications = data;
        this.hasUnread = data.some(n => !n.isRead);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  markAsRead(notification: InboxNotification) {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.notificationId).subscribe({
        next: () => {
          notification.isRead = true;
          this.hasUnread = this.notifications.some(n => !n.isRead);
        }
      });
    }
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
        this.hasUnread = false;
      }
    });
  }

  getIconClass(type: string): string {
    if (type === 'Order') return 'icon-order';
    if (type === 'Payment') return 'icon-payment';
    return 'icon-system';
  }
}
