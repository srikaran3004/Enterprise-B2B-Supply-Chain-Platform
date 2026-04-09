import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-logistics-topbar', standalone: false,
  template: `
    <header class="topbar">
      <div class="topbar__left">
        <button class="topbar__toggle" (click)="toggleSidebar.emit()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
        <span class="topbar__role-badge" style="background:#eef2ff;color:#6366f1">Logistics</span>
      </div>
      <div class="topbar__right">
        <button class="topbar__icon-btn" (click)="themeService.toggle()"><svg *ngIf="!themeService.isDark()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><svg *ngIf="themeService.isDark()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></button>
        <hul-avatar [name]="userName" size="sm"></hul-avatar>
        <button class="topbar__icon-btn" (click)="logout()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
      </div>
    </header>
  `,
  styles: [`
    .topbar { display: flex; align-items: center; justify-content: space-between; height: 60px; padding: 0 24px; background: var(--bg-card); border-bottom: 1px solid var(--border-default); position: sticky; top: 0; z-index: 100; }
    .topbar__left, .topbar__right { display: flex; align-items: center; gap: 12px; }
    .topbar__toggle { background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 6px; border-radius: var(--radius-md); }
    .topbar__toggle:hover { background: var(--bg-muted); }
    .topbar__role-badge { padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
    :host-context(.dark) .topbar__role-badge { background: rgba(99,102,241,.15) !important; }
    .topbar__icon-btn { background: none; border: none; cursor: pointer; color: var(--text-tertiary); padding: 8px; border-radius: var(--radius-md); display: flex; align-items: center; }
    .topbar__icon-btn:hover { background: var(--bg-muted); color: var(--text-primary); }
  `]
})
export class LogisticsTopbarComponent {
  @Input() collapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();
  userName: string;
  constructor(private authService: AuthService, public themeService: ThemeService) { this.userName = authService.getUserName() || 'Logistics'; }
  logout(): void { this.authService.logout(); }
}
