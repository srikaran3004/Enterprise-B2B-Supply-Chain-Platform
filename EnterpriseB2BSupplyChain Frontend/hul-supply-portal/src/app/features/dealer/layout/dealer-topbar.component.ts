import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { selectCartCount, selectIsCartOpen } from '../../../store/cart/cart.reducer';
import * as CartActions from '../../../store/cart/cart.actions';

@Component({
  selector: 'app-dealer-topbar',
  standalone: false,
  template: `
    <header class="topbar">
      <div class="topbar__left">
        <button class="topbar__hamburger" (click)="toggleSidebar.emit()">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>

      <div class="topbar__center">
        <div class="topbar__search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search products, orders..." class="topbar__search-input" />
        </div>
      </div>

      <div class="topbar__right">
        <!-- Theme toggle -->
        <button class="topbar__icon-btn" (click)="toggleTheme()" [title]="themeService.isDark() ? 'Light mode' : 'Dark mode'">
          <svg *ngIf="!themeService.isDark()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg *ngIf="themeService.isDark()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>

        <!-- Notification bell -->
        <app-notification-bell></app-notification-bell>

        <!-- Cart -->
        <button class="topbar__icon-btn topbar__cart-btn" (click)="onCartToggle()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <span class="topbar__badge topbar__badge--cart" *ngIf="(cartCount$ | async) as count" [class.topbar__badge--bounce]="count">{{ count }}</span>
        </button>

        <!-- User dropdown -->
        <div class="topbar__user" (click)="showDropdown = !showDropdown">
          <div class="topbar__avatar">{{ getInitials() }}</div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>

          <div class="topbar__dropdown" *ngIf="showDropdown">
            <a routerLink="/dealer/profile" class="topbar__dropdown-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Profile
            </a>
            <button class="topbar__dropdown-item topbar__dropdown-item--danger" (click)="onLogout()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      gap: 16px;
      height: 64px;
      padding: 0 24px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--border-default);
      backdrop-filter: blur(8px);
    }

    .topbar__left { display: flex; align-items: center; }

    .topbar__hamburger {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-secondary);
      padding: 8px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      transition: all var(--duration-fast) var(--ease-out);
    }

    .topbar__hamburger:hover {
      background: var(--bg-muted);
      color: var(--text-primary);
    }

    .topbar__center { flex: 1; max-width: 480px; }

    .topbar__search {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 14px;
      height: 40px;
      background: var(--bg-subtle);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-full);
      transition: all var(--duration-base) var(--ease-out);
      color: var(--text-tertiary);
    }

    .topbar__search:focus-within {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.1);
    }

    .topbar__search-input {
      flex: 1;
      border: none;
      background: none;
      outline: none;
      font-size: 14px;
      color: var(--text-primary);
      font-family: var(--font-body);
    }

    .topbar__search-input::placeholder { color: var(--text-disabled); }

    .topbar__right {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
    }

    .topbar__icon-btn {
      position: relative;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-secondary);
      padding: 8px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      transition: all var(--duration-fast) var(--ease-out);
    }

    .topbar__icon-btn:hover {
      background: var(--bg-muted);
      color: var(--text-primary);
    }

    .topbar__badge {
      position: absolute;
      top: 2px;
      right: 2px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      background: var(--hul-danger);
      color: white;
      font-size: 10px;
      font-weight: 700;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .topbar__badge--bounce {
      animation: bounce 0.3s ease;
    }

    .topbar__badge--cart {
      background: var(--hul-primary);
    }

    .topbar__user {
      position: relative;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--radius-md);
      transition: background var(--duration-fast) var(--ease-out);
      color: var(--text-secondary);
      margin-left: 4px;
    }

    .topbar__user:hover { background: var(--bg-muted); }

    .topbar__avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--hul-primary), var(--hul-primary-hover));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      font-family: var(--font-display);
    }

    .topbar__dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 200px;
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: 6px;
      z-index: 100;
      animation: scaleIn 150ms var(--ease-out);
    }

    .topbar__dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      font-size: 14px;
      color: var(--text-secondary);
      text-decoration: none;
      border: none;
      background: none;
      width: 100%;
      cursor: pointer;
      font-family: var(--font-body);
      transition: all var(--duration-fast) var(--ease-out);
    }

    .topbar__dropdown-item:hover {
      background: var(--bg-muted);
      color: var(--text-primary);
    }

    .topbar__dropdown-item--danger:hover {
      background: rgba(239, 68, 68, 0.08);
      color: var(--hul-danger);
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95) translateY(-4px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    @keyframes bounce {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.3); }
    }

    @media (max-width: 640px) {
      .topbar__center { display: none; }
    }
  `]
})
export class DealerTopbarComponent {
  @Input() sidebarCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  cartCount$: Observable<number>;
  showDropdown = false;

  constructor(
    public themeService: ThemeService,
    private authService: AuthService,
    private store: Store
  ) {
    this.cartCount$ = this.store.select(selectCartCount);
  }

  getInitials(): string {
    const name = this.authService.getUserName() || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  onCartToggle(): void {
    this.store.dispatch(CartActions.toggleCart());
  }

  onLogout(): void {
    this.authService.logout();
  }
}
