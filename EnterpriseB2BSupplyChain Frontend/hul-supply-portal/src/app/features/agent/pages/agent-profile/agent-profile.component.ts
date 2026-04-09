import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { ZoneHttpService } from '../../../../core/services/zone-http.service';
import { API_ENDPOINTS } from '../../../../shared/constants/api-endpoints';

@Component({
  selector: 'app-agent-profile', standalone: false,
  template: `
    <div class="profile-page">
      <hul-page-header title="My Profile" subtitle="Manage your account and preferences"></hul-page-header>

      <!-- Loading -->
      <div *ngIf="loading" class="skeleton-grid">
        <div class="skeleton" style="height:200px;border-radius:var(--radius-xl)"></div>
        <div class="skeleton" style="height:280px;border-radius:var(--radius-xl)"></div>
      </div>

      <div *ngIf="!loading" class="profile-grid">

        <!-- Agent Card -->
        <div class="profile-card">
          <div class="profile-avatar">
            <div class="avatar-circle">{{ initial }}</div>
            <div class="duty-badge">
              <span class="duty-dot"></span>
              On Duty
            </div>
          </div>
          <h2 class="profile-name">{{ agentData?.fullName || userName }}</h2>
          <p class="profile-role">Delivery Agent</p>
          <div class="profile-region" *ngIf="agentData?.serviceRegion">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {{ agentData?.serviceRegion }}
          </div>

          <!-- Stats -->
          <div class="profile-stats" *ngIf="agentData">
            <div class="profile-stat">
              <div class="profile-stat__value">{{ agentData.totalDeliveries }}</div>
              <div class="profile-stat__label">Deliveries</div>
            </div>
            <div class="profile-stat-divider"></div>
            <div class="profile-stat">
              <div class="profile-stat__value rating-val">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                {{ agentData.averageRating > 0 ? agentData.averageRating.toFixed(1) : 'N/A' }}
              </div>
              <div class="profile-stat__label">Avg Rating</div>
            </div>
            <div class="profile-stat-divider"></div>
            <div class="profile-stat">
              <div class="profile-stat__value">{{ agentData.status }}</div>
              <div class="profile-stat__label">Status</div>
            </div>
          </div>
        </div>

        <!-- Settings Card -->
        <div class="settings-card">
          <div class="settings-section-title">Account Details</div>
          <div class="settings-row settings-row--info" *ngIf="agentData?.phone">
            <div class="settings-row__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.44 2 2 0 0 1 3.6 2.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l.94-.94a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <div class="settings-row__text">
              <span class="settings-row__label">Phone</span>
              <span class="settings-row__value mono">{{ agentData.phone }}</span>
            </div>
          </div>
          <div class="settings-row settings-row--info" *ngIf="agentData?.licenseNumber">
            <div class="settings-row__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <div class="settings-row__text">
              <span class="settings-row__label">License No.</span>
              <span class="settings-row__value mono">{{ agentData.licenseNumber }}</span>
            </div>
          </div>

          <div class="settings-divider"></div>
          <div class="settings-section-title">Preferences</div>

          <!-- Dark Mode Toggle -->
          <div class="settings-row settings-row--interactive" (click)="themeService.toggle()">
            <div class="settings-row__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" *ngIf="!themeService.isDark()">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              </svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" *ngIf="themeService.isDark()">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </div>
            <div class="settings-row__text">
              <span class="settings-row__label">Dark Mode</span>
              <span class="settings-row__value">{{ themeService.isDark() ? 'Enabled' : 'Disabled' }}</span>
            </div>
            <div class="toggle-switch" [class.toggle-switch--on]="themeService.isDark()">
              <div class="toggle-switch__thumb"></div>
            </div>
          </div>

          <div class="settings-divider"></div>

          <!-- Sign Out -->
          <div class="settings-row settings-row--danger" (click)="logout()">
            <div class="settings-row__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </div>
            <div class="settings-row__text">
              <span class="settings-row__label" style="color:#dc2626">Sign Out</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-tertiary);margin-left:auto"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .profile-page { max-width: 900px; animation: fadeIn 200ms ease; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }

    .profile-grid { display: grid; grid-template-columns: 320px 1fr; gap: 24px; }
    @media (max-width: 768px) { .profile-grid { grid-template-columns: 1fr; } }

    .skeleton-grid { display: grid; grid-template-columns: 320px 1fr; gap: 24px; }
    .skeleton {
      background: linear-gradient(90deg, var(--bg-muted) 0%, var(--bg-subtle) 50%, var(--bg-muted) 100%);
      background-size: 200% 100%; animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }

    /* Profile Card */
    .profile-card {
      background: var(--bg-card); border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card); border: 1px solid var(--border-default);
      padding: 32px 24px; text-align: center;
    }
    .profile-avatar { position: relative; display: inline-block; margin-bottom: 16px; }
    .avatar-circle {
      width: 80px; height: 80px; border-radius: 50%;
      background: linear-gradient(135deg, #0369a1, #0ea5e9);
      color: white; font-size: 28px; font-weight: 700;
      font-family: var(--font-display); display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(3,105,161,.3);
    }
    .duty-badge {
      position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%);
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 9999px;
      background: #d1fae5; color: #065f46;
      font-size: 10px; font-weight: 700; white-space: nowrap;
      border: 1.5px solid #a7f3d0;
    }
    .duty-dot { width: 5px; height: 5px; border-radius: 50%; background: #10b981; }
    .profile-name { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .profile-role { font-size: 13px; color: var(--text-tertiary); margin: 0 0 8px; }
    .profile-region { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; color: var(--hul-primary); font-weight: 600; }

    .profile-stats { display: flex; align-items: center; justify-content: center; gap: 0; margin-top: 24px; border-top: 1px solid var(--border-default); padding-top: 20px; }
    .profile-stat { flex: 1; text-align: center; }
    .profile-stat__value { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; justify-content: center; gap: 4px; }
    .rating-val { color: #d97706; }
    .profile-stat__label { font-size: 11px; color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }
    .profile-stat-divider { width: 1px; height: 40px; background: var(--border-default); flex-shrink: 0; }

    /* Settings Card */
    .settings-card {
      background: var(--bg-card); border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card); border: 1px solid var(--border-default);
      overflow: hidden;
    }
    .settings-section-title {
      padding: 12px 20px 8px; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .08em; color: var(--text-tertiary);
    }
    .settings-row {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 20px; border-bottom: 1px solid var(--border-default);
    }
    .settings-row:last-child { border-bottom: none; }
    .settings-row--interactive { cursor: pointer; transition: background var(--duration-fast); }
    .settings-row--interactive:hover { background: var(--bg-muted); }
    .settings-row--danger { cursor: pointer; transition: background var(--duration-fast); }
    .settings-row--danger:hover { background: rgba(239,68,68,.04); }
    .settings-row__icon { width: 32px; height: 32px; border-radius: var(--radius-md); background: var(--bg-subtle); border: 1px solid var(--border-default); display: flex; align-items: center; justify-content: center; color: var(--hul-primary); flex-shrink: 0; }
    .settings-row__text { flex: 1; display: flex; flex-direction: column; }
    .settings-row__label { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .settings-row__value { font-size: 13px; color: var(--text-tertiary); margin-top: 1px; }
    .mono { font-family: var(--font-mono); }

    .settings-divider { height: 1px; background: var(--border-default); margin: 4px 0; }

    /* Toggle Switch */
    .toggle-switch {
      width: 44px; height: 24px; border-radius: 12px;
      background: var(--bg-muted); border: 1px solid var(--border-default);
      position: relative; flex-shrink: 0;
      transition: background var(--duration-fast);
    }
    .toggle-switch--on { background: var(--hul-primary); border-color: var(--hul-primary); }
    .toggle-switch__thumb {
      width: 18px; height: 18px; border-radius: 50%;
      background: white; position: absolute; top: 2px; left: 3px;
      transition: transform var(--duration-fast); box-shadow: 0 1px 4px rgba(0,0,0,.2);
    }
    .toggle-switch--on .toggle-switch__thumb { transform: translateX(20px); }
  `]
})
export class AgentProfileComponent implements OnInit {
  userName = '';
  initial = 'A';
  loading = true;
  agentData: any = null;

  constructor(
    private authService: AuthService,
    public themeService: ThemeService,
    private http: ZoneHttpService
  ) {}

  ngOnInit(): void {
    const name = this.authService.getUserName() || 'Agent';
    this.userName = name;
    this.initial = name.charAt(0).toUpperCase();
    this.loadAgentData();
  }

  loadAgentData(): void {
    // Call the dedicated /agents/me endpoint — returns the calling agent's own profile
    // This endpoint is authorized for DeliveryAgent role (unlike /agents which is Admin-only)
    this.http.get<any>(API_ENDPOINTS.logistics.agentMe()).subscribe({
      next: agent => {
        if (agent) this.agentData = agent;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  logout(): void { this.authService.logout(); }
}
