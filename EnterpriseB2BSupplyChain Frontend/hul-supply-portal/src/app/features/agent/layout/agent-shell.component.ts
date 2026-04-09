import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-agent-shell', standalone: false,
  template: `
    <div class="agent-layout" [class.layout--collapsed]="sidebarCollapsed">

      <!-- ── Sidebar ──────────────────────────────────────────── -->
      <aside class="agent-sidebar">
        <!-- Brand -->
        <div class="sidebar-brand">
          <div class="sidebar-brand__logo">
            <!-- HUL logo: matches admin/dealer portal hul-sidebar logo -->
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 4L16 0L24 4L24 12L16 16L8 12Z" fill="#0369a1" opacity="0.9"/>
              <path d="M12 8L20 4L28 8L28 16L20 20L12 16Z" fill="#f59e0b" opacity="0.7"/>
              <text x="16" y="16" text-anchor="middle" dominant-baseline="central" fill="white" font-size="10" font-weight="700" font-family="Space Grotesk">H</text>
            </svg>
          </div>
          <div class="sidebar-brand__text" *ngIf="!sidebarCollapsed">
            <span class="brand-name"><span class="brand-hul">HUL</span><span class="brand-supply">Supply</span></span>
            <span class="brand-sub">Agent Portal</span>
          </div>
        </div>

        <!-- Collapse toggle — always visible, floats at sidebar edge -->
        <button class="collapse-btn" (click)="sidebarCollapsed = !sidebarCollapsed"
                [title]="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
          <svg *ngIf="!sidebarCollapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          <svg *ngIf="sidebarCollapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <!-- Nav Items -->
        <nav class="sidebar-nav">
          <a class="nav-item" routerLink="/agent/deliveries" routerLinkActive="nav-item--active"
             [title]="sidebarCollapsed ? 'My Deliveries' : ''">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/>
            </svg>
            <span class="nav-label" *ngIf="!sidebarCollapsed">My Deliveries</span>
          </a>
          <a class="nav-item" routerLink="/agent/profile" routerLinkActive="nav-item--active"
             [title]="sidebarCollapsed ? 'Profile' : ''">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="nav-label" *ngIf="!sidebarCollapsed">Profile</span>
          </a>
        </nav>

        <!-- Bottom: Sign Out only (dark mode moved to topbar) -->
        <div class="sidebar-footer">
          <button class="footer-btn footer-btn--logout" (click)="logout()" title="Sign Out">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span class="nav-label" *ngIf="!sidebarCollapsed">Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- ── Main Area ─────────────────────────────────────────── -->
      <div class="agent-main-wrap">
        <!-- Topbar -->
        <header class="agent-topbar">
          <!-- Mobile hamburger -->
          <button class="mobile-menu-btn" (click)="mobileNavOpen = !mobileNavOpen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <!-- Page Title / Brand (shown on mobile) -->
          <div class="topbar-brand">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <path d="M8 4L16 0L24 4L24 12L16 16L8 12Z" fill="#0369a1" opacity="0.9"/>
              <path d="M12 8L20 4L28 8L28 16L20 20L12 16Z" fill="#f59e0b" opacity="0.7"/>
              <text x="16" y="16" text-anchor="middle" dominant-baseline="central" fill="white" font-size="10" font-weight="700" font-family="Space Grotesk">H</text>
            </svg>
            <span class="topbar-brand__name"><span class="topbar-hul">HUL</span><span class="topbar-supply">Supply</span></span>
          </div>

          <!-- Right: dark mode + notification bell + agent chip -->
          <div class="topbar-right">
            <!-- Dark mode toggle -->
            <button class="topbar-icon-btn" (click)="themeService.toggle()"
                    [title]="themeService.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
              <!-- Sun icon (shown when in dark mode, to switch to light) -->
              <svg *ngIf="themeService.isDark()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
              <!-- Moon icon (shown when in light mode, to switch to dark) -->
              <svg *ngIf="!themeService.isDark()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>

            <app-notification-bell></app-notification-bell>

            <div class="agent-chip">
              <div class="agent-chip__avatar">{{ agentInitial }}</div>
              <div class="agent-chip__info">
                <span class="agent-chip__name">{{ agentName }}</span>
                <span class="agent-chip__role">
                  <span class="duty-dot"></span>
                  On Duty
                </span>
              </div>
            </div>
          </div>
        </header>

        <!-- Mobile Sidebar Overlay -->
        <div class="mobile-overlay" *ngIf="mobileNavOpen" (click)="mobileNavOpen = false"></div>
        <div class="mobile-sidebar" [class.mobile-sidebar--open]="mobileNavOpen">
          <div class="mobile-sidebar__header">
            <div class="mobile-brand">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M8 4L16 0L24 4L24 12L16 16L8 12Z" fill="#0369a1" opacity="0.9"/>
                <path d="M12 8L20 4L28 8L28 16L20 20L12 16Z" fill="#f59e0b" opacity="0.7"/>
                <text x="16" y="16" text-anchor="middle" dominant-baseline="central" fill="white" font-size="10" font-weight="700" font-family="Space Grotesk">H</text>
              </svg>
              <span style="font-family:var(--font-display);font-weight:700;font-size:16px;color:var(--text-primary)">
                <span style="color:#0369a1">HUL</span><span style="color:var(--text-primary)">Supply</span>
              </span>
            </div>
            <button class="mobile-close-btn" (click)="mobileNavOpen = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <nav class="mobile-nav">
            <a class="mobile-nav-item" routerLink="/agent/deliveries" routerLinkActive="mobile-nav-item--active" (click)="mobileNavOpen = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
              My Deliveries
            </a>
            <a class="mobile-nav-item" routerLink="/agent/profile" routerLinkActive="mobile-nav-item--active" (click)="mobileNavOpen = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Profile
            </a>
            <button class="mobile-nav-item mobile-nav-item--logout" (click)="logout()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </nav>
        </div>

        <!-- Page Content -->
        <main class="agent-content">
          <router-outlet></router-outlet>
        </main>
      </div>

    </div>
  `,
  styles: [`
    /* ── Root Layout ──────────────────────────────────────────── */
    .agent-layout {
      display: flex; min-height: 100vh;
      background: var(--bg-subtle);
    }

    /* ── Sidebar ─────────────────────────────────────────────── */
    .agent-sidebar {
      width: 240px; min-height: 100vh; flex-shrink: 0;
      background: var(--bg-card);
      border-right: 1px solid var(--border-default);
      display: flex; flex-direction: column;
      position: sticky; top: 0; height: 100vh;
      overflow-y: auto; overflow-x: hidden;
      transition: width var(--duration-base) var(--ease-out);
      z-index: 50;
    }
    .layout--collapsed .agent-sidebar { width: 64px; }
    @media (max-width: 768px) { .agent-sidebar { display: none; } }

    /* Brand */
    .sidebar-brand {
      display: flex; align-items: center; gap: 10px;
      padding: 16px 14px;
      border-bottom: 1px solid var(--border-default);
      min-height: 64px;
    }
    .sidebar-brand__logo { flex-shrink: 0; display: flex; align-items: center; }
    .sidebar-brand__logo svg { border-radius: 6px; }
    .sidebar-brand__text { flex: 1; min-width: 0; overflow: hidden; }
    .brand-name { display: block; font-family: var(--font-display); font-size: 15px; font-weight: 800; white-space: nowrap; line-height: 1.2; }
    .brand-hul { color: #0369a1; }
    .brand-supply { color: var(--text-primary); }
    .brand-sub { display: block; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--text-tertiary); white-space: nowrap; margin-top: 2px; }

    /* Collapse toggle — sits below brand, always visible */
    .collapse-btn {
      display: flex; align-items: center; justify-content: center;
      width: 100%; padding: 8px;
      background: none; border: none; border-bottom: 1px solid var(--border-default);
      cursor: pointer; color: var(--text-tertiary);
      transition: all var(--duration-fast);
      flex-shrink: 0;
    }
    .collapse-btn:hover { background: var(--bg-muted); color: var(--text-primary); }

    /* Nav */
    .sidebar-nav { flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; }
    .nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; border-radius: var(--radius-lg);
      font-size: 14px; font-weight: 500; color: var(--text-secondary);
      text-decoration: none; transition: all var(--duration-fast) var(--ease-out);
      white-space: nowrap; overflow: hidden;
    }
    .nav-item:hover { background: var(--bg-muted); color: var(--text-primary); }
    .nav-item--active { background: var(--hul-primary-light); color: var(--hul-primary); font-weight: 600; }
    .nav-icon { flex-shrink: 0; }
    .nav-label { overflow: hidden; text-overflow: ellipsis; }

    /* Footer */
    .sidebar-footer { padding: 8px; border-top: 1px solid var(--border-default); display: flex; flex-direction: column; gap: 2px; }
    .footer-btn {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; border-radius: var(--radius-lg);
      font-size: 14px; font-weight: 500; color: var(--text-secondary);
      background: none; border: none; cursor: pointer;
      font-family: var(--font-body); white-space: nowrap; overflow: hidden;
      transition: all var(--duration-fast);
    }
    .footer-btn:hover { background: var(--bg-muted); color: var(--text-primary); }
    .footer-btn--logout:hover { background: rgba(239,68,68,.08); color: #dc2626; }

    /* ── Main Wrap ────────────────────────────────────────────── */
    .agent-main-wrap { flex: 1; min-width: 0; display: flex; flex-direction: column; }

    /* ── Topbar ──────────────────────────────────────────────── */
    .agent-topbar {
      height: 60px; background: var(--bg-card);
      border-bottom: 1px solid var(--border-default);
      display: flex; align-items: center; gap: 12px;
      padding: 0 24px; position: sticky; top: 0; z-index: 40;
      box-shadow: var(--shadow-xs);
    }
    .mobile-menu-btn {
      width: 36px; height: 36px; border: 1px solid var(--border-default);
      border-radius: var(--radius-md); background: none; cursor: pointer;
      color: var(--text-secondary); display: none; align-items: center; justify-content: center;
    }
    @media (max-width: 768px) { .mobile-menu-btn { display: flex; } }

    .topbar-brand { display: flex; align-items: center; gap: 8px; }
    .topbar-brand__name { font-family: var(--font-display); font-size: 15px; font-weight: 700; }
    .topbar-hul { color: #0369a1; }
    .topbar-supply { color: var(--text-primary); }

    /* Right section */
    .topbar-right { display: flex; align-items: center; gap: 8px; margin-left: auto; }

    /* Dark mode toggle button in topbar */
    .topbar-icon-btn {
      width: 36px; height: 36px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background: var(--bg-subtle); cursor: pointer;
      color: var(--text-secondary);
      display: flex; align-items: center; justify-content: center;
      transition: all var(--duration-fast);
      flex-shrink: 0;
    }
    .topbar-icon-btn:hover { background: var(--bg-muted); color: var(--text-primary); border-color: var(--hul-primary); }

    /* Agent chip */
    .agent-chip {
      display: flex; align-items: center; gap: 8px;
      padding: 5px 12px; border-radius: var(--radius-lg);
      background: var(--bg-subtle); border: 1px solid var(--border-default);
    }
    .agent-chip__avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, #0369a1, #0ea5e9);
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; font-family: var(--font-display); flex-shrink: 0;
    }
    .agent-chip__info { display: flex; flex-direction: column; }
    .agent-chip__name { font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 1.2; }
    .agent-chip__role { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #059669; font-weight: 600; }
    .duty-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: pulse 2s ease infinite; }
    @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.6; transform:scale(0.85); } }

    /* ── Page Content ─────────────────────────────────────────── */
    .agent-content { flex: 1; padding: 28px 32px; box-sizing: border-box; }
    @media (max-width: 768px) { .agent-content { padding: 16px; } }

    /* ── Mobile Overlay ──────────────────────────────────────── */
    .mobile-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.4);
      z-index: 200; backdrop-filter: blur(2px);
    }
    .mobile-sidebar {
      position: fixed; left: 0; top: 0; bottom: 0; width: 280px;
      background: var(--bg-card); border-right: 1px solid var(--border-default);
      z-index: 210; transform: translateX(-100%);
      transition: transform var(--duration-base) var(--ease-out);
      display: flex; flex-direction: column;
      box-shadow: var(--shadow-xl);
    }
    .mobile-sidebar--open { transform: translateX(0); }
    .mobile-sidebar__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border-default);
    }
    .mobile-brand { display: flex; align-items: center; gap: 10px; }
    .mobile-close-btn {
      width: 34px; height: 34px; border: 1px solid var(--border-default);
      border-radius: var(--radius-md); background: none; cursor: pointer;
      color: var(--text-secondary); display: flex; align-items: center; justify-content: center;
    }
    .mobile-nav { padding: 12px; display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .mobile-nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: var(--radius-lg);
      font-size: 15px; font-weight: 500; color: var(--text-secondary);
      text-decoration: none; background: none; border: none;
      cursor: pointer; font-family: var(--font-body);
      transition: all var(--duration-fast);
    }
    .mobile-nav-item:hover { background: var(--bg-muted); color: var(--text-primary); }
    .mobile-nav-item--active { background: var(--hul-primary-light); color: var(--hul-primary); font-weight: 600; }
    .mobile-nav-item--logout { color: #dc2626; }
    .mobile-nav-item--logout:hover { background: rgba(239,68,68,.08); }
  `]
})
export class AgentShellComponent implements OnInit {
  agentName = '';
  agentInitial = 'A';
  sidebarCollapsed = false;
  mobileNavOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    public themeService: ThemeService
  ) {}

  ngOnInit(): void {
    const name = this.authService.getUserName() || 'Agent';
    this.agentName = name;
    this.agentInitial = name.charAt(0).toUpperCase();
    this.themeService.init();
  }

  logout(): void { this.authService.logout(); }
}
