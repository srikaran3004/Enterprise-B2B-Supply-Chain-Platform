import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface SidebarItem {
  label: string;
  route: string;
  icon: string;
  badge?: number;
  children?: SidebarItem[];
}

@Component({
  selector: 'hul-sidebar',
  standalone: false,
  template: `
    <aside class="sidebar" [class.sidebar--collapsed]="collapsed">
      <!-- Logo -->
      <div class="sidebar__logo">
        <div class="sidebar__logo-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M8 4L16 0L24 4L24 12L16 16L8 12Z" fill="#0369a1" opacity="0.9"/>
            <path d="M12 8L20 4L28 8L28 16L20 20L12 16Z" fill="#f59e0b" opacity="0.7"/>
            <text x="16" y="16" text-anchor="middle" dominant-baseline="central" fill="white" font-size="10" font-weight="700" font-family="Space Grotesk">H</text>
          </svg>
        </div>
        <span class="sidebar__logo-text" *ngIf="!collapsed">
          <span class="logo-hul">HUL</span><span class="logo-supply">Supply</span>
        </span>
      </div>

      <!-- Nav Items -->
      <nav class="sidebar__nav">
        <ng-container *ngFor="let item of menuItems">
          <!-- Item with children (collapsible group) -->
          <ng-container *ngIf="item.children && item.children.length > 0">
            <button class="sidebar__item sidebar__item--parent"
              [class.sidebar__item--expanded]="isGroupExpanded(item.label)"
              [class.sidebar__item--child-active]="hasActiveChild(item)"
              (click)="onParentItemClick(item)"
              [title]="collapsed ? item.label : ''">
              <span class="sidebar__item-icon" [innerHTML]="getIconSvg(item.icon)"></span>
              <span class="sidebar__item-label" *ngIf="!collapsed">{{ item.label }}</span>
              <svg *ngIf="!collapsed" class="sidebar__chevron" [class.sidebar__chevron--open]="isGroupExpanded(item.label)"
                   width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="sidebar__children" *ngIf="isGroupExpanded(item.label) && !collapsed">
              <a *ngFor="let child of item.children"
                 class="sidebar__item sidebar__item--child"
                 [class.sidebar__item--active]="isActive(child.route)"
                 [routerLink]="child.route"
                 [title]="collapsed ? child.label : ''">
                <span class="sidebar__item-icon" [innerHTML]="getIconSvg(child.icon)"></span>
                <span class="sidebar__item-label">{{ child.label }}</span>
                <span *ngIf="child.badge" class="sidebar__item-badge">{{ child.badge }}</span>
              </a>
            </div>
          </ng-container>

          <!-- Regular item (no children) -->
          <a *ngIf="!item.children || item.children.length === 0"
             class="sidebar__item"
             [class.sidebar__item--active]="isActive(item.route)"
             [routerLink]="item.route"
             [title]="collapsed ? item.label : ''">
            <span class="sidebar__item-icon" [innerHTML]="getIconSvg(item.icon)"></span>
            <span class="sidebar__item-label" *ngIf="!collapsed">{{ item.label }}</span>
            <span *ngIf="item.badge && !collapsed" class="sidebar__item-badge">{{ item.badge }}</span>
          </a>
        </ng-container>
      </nav>

      <!-- User Section -->
      <div class="sidebar__user">
        <div class="sidebar__user-avatar" [style.background]="userImageUrl ? 'transparent' : ''">
          <img *ngIf="userImageUrl" [src]="userImageUrl" class="avatar__img" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />
          <span *ngIf="!userImageUrl">{{ getInitials() }}</span>
        </div>
        <div class="sidebar__user-info" *ngIf="!collapsed">
          <span class="sidebar__user-name">{{ userName }}</span>
          <span class="sidebar__user-role">{{ userRole }}</span>
        </div>
        <button *ngIf="!collapsed" class="sidebar__logout" (click)="onLogout()" title="Logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 248px;
      height: 100vh;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 100;
      background: var(--bg-card);
      border-right: 1px solid var(--border-default);
      display: flex;
      flex-direction: column;
      transition: width var(--duration-slow) var(--ease-in-out);
      overflow: hidden;
    }

    .sidebar--collapsed {
      width: 68px;
    }

    .sidebar__logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 18px;
      border-bottom: 1px solid var(--border-default);
      min-height: 64px;
    }

    .sidebar__logo-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .sidebar__logo-text {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 600;
      white-space: nowrap;
    }

    .logo-hul { color: var(--text-primary); }
    .logo-supply { color: var(--hul-primary); }

    .sidebar__nav {
      flex: 1;
      padding: 12px 8px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sidebar__item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      font-family: var(--font-body);
      transition: all var(--duration-fast) var(--ease-out);
      white-space: nowrap;
      position: relative;
      border: none;
      background: none;
      cursor: pointer;
      width: 100%;
      text-align: left;
      box-sizing: border-box;
    }

    .sidebar__item:hover {
      background: var(--bg-muted);
      color: var(--text-primary);
    }

    .sidebar__item--active {
      background: var(--hul-primary-light);
      color: var(--hul-primary);
      font-weight: 600;
    }

    .sidebar__item--active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      bottom: 6px;
      width: 3px;
      background: var(--hul-primary);
      border-radius: 0 3px 3px 0;
    }

    :host-context(.dark) .sidebar__item--active {
      background: rgba(3, 105, 161, 0.15);
      color: #38bdf8;
    }

    :host-context(.dark) .sidebar__item--active::before {
      background: #38bdf8;
    }

    /* Parent group styles */
    .sidebar__item--parent {
      padding-right: 10px;
    }

    .sidebar__item--child-active {
      color: var(--hul-primary);
    }

    .sidebar__chevron {
      margin-left: auto;
      flex-shrink: 0;
      transition: transform 200ms ease;
      opacity: 0.5;
    }

    .sidebar__chevron--open {
      transform: rotate(180deg);
    }

    .sidebar__children {
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding-left: 12px;
      margin-bottom: 4px;
      animation: expandIn 150ms ease;
    }

    @keyframes expandIn {
      from { opacity: 0; max-height: 0; }
      to { opacity: 1; max-height: 500px; }
    }

    .sidebar__item--child {
      font-size: 13px;
      padding: 8px 14px;
      color: var(--text-tertiary);
    }

    .sidebar__item--child:hover {
      color: var(--text-primary);
    }

    .sidebar__item--child.sidebar__item--active {
      color: var(--hul-primary);
      background: var(--hul-primary-light);
    }

    .sidebar__item-icon {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .sidebar__item-label {
      flex: 1;
    }

    .sidebar__item-badge {
      background: var(--hul-primary);
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 9999px;
      min-width: 20px;
      text-align: center;
    }

    .sidebar__user {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px;
      border-top: 1px solid var(--border-default);
    }

    .sidebar__user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--hul-primary), var(--hul-primary-hover));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      font-family: var(--font-display);
      flex-shrink: 0;
    }

    .sidebar__user-info {
      flex: 1;
      min-width: 0;
    }

    .sidebar__user-name {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar__user-role {
      display: block;
      font-size: 11px;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .sidebar__logout {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-tertiary);
      padding: 6px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      transition: all var(--duration-fast) var(--ease-out);
      flex-shrink: 0;
    }

    .sidebar__logout:hover {
      background: rgba(239, 68, 68, 0.1);
      color: var(--hul-danger);
    }

    @media (max-width: 1023px) {
      .sidebar {
        transform: translateX(-100%);
        box-shadow: var(--shadow-xl);
      }
      .sidebar.sidebar--open {
        transform: translateX(0);
      }
    }
  `]
})
export class HulSidebarComponent {
  @Input() menuItems: SidebarItem[] = [];
  @Input() set items(val: SidebarItem[]) { this.menuItems = val; }
  @Input() collapsed = false;
  @Input() brandLabel = '';
  @Input() sidebarClass = '';
  @Output() logoutClicked = new EventEmitter<void>();
  @Output() collapsedChange = new EventEmitter<boolean>();

  userName = '';
  userRole = '';
  userImageUrl = '';
  expandedGroups: Set<string> = new Set();
  private sanitizer = inject(DomSanitizer);

  constructor(private router: Router, private authService: AuthService) {
    this.userName = this.authService.getUserName() || 'User';
    this.userRole = this.authService.getUserRole() || 'Dealer';
    const decoded = this.authService.getDecodedToken() as any;
    if (decoded && decoded.profilePictureUrl) {
      this.userImageUrl = decoded.profilePictureUrl;
    }
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  hasActiveChild(item: SidebarItem): boolean {
    return !!item.children?.some(child => this.isActive(child.route));
  }

  isGroupExpanded(label: string): boolean {
    // Auto-expand if a child is active
    const item = this.menuItems.find(m => m.label === label);
    if (item && this.hasActiveChild(item)) return true;
    return this.expandedGroups.has(label);
  }

  toggleGroup(label: string): void {
    if (this.expandedGroups.has(label)) {
      this.expandedGroups.delete(label);
    } else {
      this.expandedGroups.add(label);
    }
  }

  onParentItemClick(item: SidebarItem): void {
    // In collapsed mode, child links are hidden, so parent click should navigate.
    if (this.collapsed) {
      this.router.navigateByUrl(item.route);
      return;
    }

    this.toggleGroup(item.label);
  }

  getInitials(): string {
    return this.userName
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  onLogout(): void {
    this.logoutClicked.emit();
    this.authService.logout();
  }

  getIconSvg(iconName: string): SafeHtml {
    const icons: Record<string, string> = {
      'home': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      'layout-dashboard': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
      'package': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
      'shopping-bag': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
      'shopping-cart': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
      'receipt': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17V7"/></svg>',
      'rotate-ccw': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
      'user': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      'user-check': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>',
      'user-plus': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
      'users': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      'credit-card': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
      'folder': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
      'warehouse': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/></svg>',
      'bell': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
      'bar-chart-2': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
      'clipboard-list': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>',
      'map-pin': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
      'clock': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      'truck': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
      'trending-up': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
      'alert-triangle': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      'activity': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
      'store': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>',
      'pause-circle': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>',
      'user-clock': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><circle cx="19" cy="14" r="3"/><path d="M19 12v2l1 1"/></svg>',
      'corner-down-left': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>',
    };
    const svgString = icons[iconName] || icons['package'];
    return this.sanitizer.bypassSecurityTrustHtml(svgString);
  }
}
