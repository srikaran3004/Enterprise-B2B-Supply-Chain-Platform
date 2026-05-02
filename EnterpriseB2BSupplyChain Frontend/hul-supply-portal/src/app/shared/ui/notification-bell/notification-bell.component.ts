import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { InboxNotification } from '../../../core/models/inbox-notification.model';
import { Subject, Subscription, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-notification-bell',
  standalone: false,
  template: `
<div class="notif-wrapper">
  <!-- Bell Icon Button -->
  <button class="notif-bell-btn" (click)="toggleDropdown()" title="View notifications">
    <svg class="bell-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
    <!-- Unread Badge -->
    <span *ngIf="unreadCount > 0" class="notif-badge">
      <span class="badge-ping"></span>
      <span class="badge-text">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
    </span>
  </button>

  <!-- Dropdown Panel -->
  <div *ngIf="isDropdownOpen" class="notif-dropdown">
    <!-- Header -->
    <div class="notif-header">
      <h3>Notifications</h3>
      <div class="notif-header-actions">
        <button *ngIf="unreadCount > 0" class="notif-mark-all-btn" (click)="markAllRead($event)" title="Mark all as read">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Mark all read
        </button>
        <span class="notif-new-tag" *ngIf="unreadCount > 0">{{ unreadCount }} New</span>
      </div>
    </div>

    <!-- List -->
    <div class="notif-list">
      <div *ngIf="notifications.length === 0" class="notif-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; opacity: 0.5;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <p style="margin: 0; font-weight: 500;">No notifications yet</p>
        <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.7;">You're all caught up!</p>
      </div>
      <div *ngFor="let notif of notifications" class="notif-item" [class.notif-item--unread]="!notif.isRead" (click)="viewAll()">
        <div class="notif-icon-wrap" [ngClass]="getIconClass(notif.type)">
          <!-- SVG Icons -->
          <svg *ngIf="notif.type === 'Order'" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          <svg *ngIf="notif.type === 'Payment'" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <svg *ngIf="notif.type !== 'Order' && notif.type !== 'Payment'" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div class="notif-content">
          <p class="notif-title">{{ notif.title }}</p>
          <p class="notif-message">{{ notif.message }}</p>
          <p class="notif-time">{{ notif.createdAt | date:'short' }}</p>
        </div>
        <div class="notif-unread-dot" *ngIf="!notif.isRead"></div>
      </div>
    </div>

    <!-- Footer -->
    <div class="notif-footer" *ngIf="notifications.length > 0">
      <button (click)="viewAll()" class="notif-view-all">View all notifications</button>
    </div>
  </div>
</div>
<!-- Backdrop -->
<div *ngIf="isDropdownOpen" class="notif-backdrop" (click)="isDropdownOpen = false"></div>
  `,
  styles: [`
    .notif-wrapper { position: relative; }
    .notif-bell-btn { position: relative; padding: 8px; background: none; border: none; cursor: pointer; color: var(--text-secondary); border-radius: 50%; transition: color var(--duration-fast); display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; }
    .notif-bell-btn:hover { color: var(--text-primary); background: var(--bg-muted); }
    .bell-icon { width: 24px; height: 24px; }
    
    .notif-badge { position: absolute; top: 1px; right: 1px; display: flex; width: 18px; height: 18px; align-items: center; justify-content: center; }
    .badge-ping { position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: var(--hul-danger); opacity: 0.45; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
    .badge-text {
      position: relative; width: 18px; height: 18px; background-color: var(--hul-danger); color: #ffffff;
      display: flex; align-items: center; justify-content: center; border-radius: 50%;
      border: 2px solid var(--bg-card); font-size: 9px; font-weight: 800; line-height: 1;
      box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
    }
    @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }

    .notif-dropdown { position: absolute; right: 0; top: calc(100% + 8px); z-index: 50; width: 340px; background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-modal); border: 1px solid var(--border-default); overflow: hidden; transform-origin: top right; animation: slideDown var(--duration-fast) ease-out; }
    @keyframes slideDown { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

    .notif-header { padding: 14px 16px; border-bottom: 1px solid var(--border-default); display: flex; justify-content: space-between; align-items: center; background: var(--bg-body); }
    .notif-header h3 { margin: 0; font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .notif-header-actions { display: flex; align-items: center; gap: 8px; }
    .notif-mark-all-btn { display: inline-flex; align-items: center; gap: 4px; background: none; border: 1px solid var(--border-default); color: var(--text-secondary); font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: var(--radius-md); cursor: pointer; transition: all var(--duration-fast); }
    .notif-mark-all-btn:hover { background: var(--hul-primary-light); color: var(--hul-primary); border-color: var(--hul-primary); }
    .notif-new-tag { background: var(--hul-primary-light); color: var(--hul-primary); font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 12px; white-space: nowrap; }

    .notif-list { max-height: 320px; overflow-y: auto; width: 100%; }
    .notif-empty { padding: 40px 20px; text-align: center; color: var(--text-tertiary); font-size: 13px; display: flex; flex-direction: column; align-items: center; }
    
    .notif-item { display: flex; padding: 16px; border-bottom: 1px solid var(--border-default); cursor: pointer; transition: background var(--duration-fast); }
    .notif-item:hover { background: var(--bg-muted); }
    .notif-item--unread { background: rgba(0, 102, 204, 0.04); }
    
    .notif-icon-wrap { flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; }
    .notif-icon-wrap svg { width: 18px; height: 18px; }
    .notif-type-order { background: rgba(0, 102, 204, 0.1); color: var(--hul-primary); }
    .notif-type-payment { background: rgba(0, 163, 108, 0.1); color: var(--hul-success); }
    .notif-type-system { background: rgba(108, 92, 231, 0.1); color: #6c5ce7; }
    
    .notif-content { flex: 1; min-width: 0; }
    .notif-item--unread .notif-title { font-weight: 600; }
    .notif-title { margin: 0 0 4px; font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
    .notif-message { margin: 0 0 8px; font-size: 13px; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .notif-time { margin: 0; font-size: 11px; color: var(--text-tertiary); }
    
    .notif-unread-dot { flex-shrink: 0; margin-left: 12px; width: 8px; height: 8px; background: var(--hul-primary); border-radius: 50%; align-self: center; }
    
    .notif-footer { padding: 12px; border-top: 1px solid var(--border-default); text-align: center; background: var(--bg-body); }
    .notif-view-all { background: none; border: none; color: var(--hul-primary); font-size: 13px; font-weight: 600; cursor: pointer; padding: 4px 8px; transition: color var(--duration-fast); }
    .notif-view-all:hover { color: #0056b3; text-decoration: underline; }
    
    .notif-backdrop { position: fixed; inset: 0; z-index: 40; background: transparent; }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);

  unreadCount = 0;
  notifications: InboxNotification[] = [];
  isDropdownOpen = false;

  private destroy$ = new Subject<void>();
  private pollSubscription?: Subscription;

  ngOnInit() {
    this.fetchNotifications();

    // Poll every 30 seconds for new notifications
    this.pollSubscription = timer(30000, 30000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.notificationService.getUnreadCount())
      )
      .subscribe({
        next: (res) => {
          if (res.count > this.unreadCount) {
            // we have new notifications, fetch inbox again
            this.fetchNotifications();
          } else {
            this.unreadCount = res.count;
          }
        },
        error: (err) => {
          console.error('Failed to poll notification count:', err);
          // Silently fail - don't disrupt user experience
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchNotifications() {
    this.notificationService.getInbox().subscribe({
      next: (data) => {
        this.notifications = data;
        this.unreadCount = data.filter(n => !n.isRead).length;
      },
      error: (err) => {
        console.error('Failed to fetch notifications:', err);
        // Silently fail - don't show error to user for background notifications
        this.notifications = [];
        this.unreadCount = 0;
      }
    });
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen && this.unreadCount > 0) {
      // Auto mark all as read when opening dropdown
      this.notificationService.markAllAsRead().subscribe({
        next: () => {
          this.unreadCount = 0;
          this.notifications.forEach(n => n.isRead = true);
        },
        error: (err) => console.error('Failed to mark notifications as read:', err)
      });
    }
  }

  markAllRead(event: Event): void {
    event.stopPropagation();
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.unreadCount = 0;
        this.notifications.forEach(n => n.isRead = true);
      },
      error: () => {}
    });
  }

  viewAll() {
    this.isDropdownOpen = false;
    const role = this.authService.getUserRole();
    if (role === UserRole.Admin || role === UserRole.SuperAdmin) {
      this.router.navigate(['/admin/notifications']);
    } else if (role === UserRole.Dealer) {
      this.router.navigate(['/dealer/notifications']);
    } else {
      // For other roles, just close the dropdown
      return;
    }
  }

  getIconClass(type: string): string {
    if (type === 'Order') return 'notif-type-order';
    if (type === 'Payment') return 'notif-type-payment';
    return 'notif-type-system';
  }
}
