import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Phase 1 Components
import { HulButtonComponent } from './ui/button/hul-button.component';
import { HulInputComponent } from './ui/input/hul-input.component';
import { HulCardComponent } from './ui/card/hul-card.component';
import { HulBadgeComponent } from './ui/badge/hul-badge.component';
import { HulStatusBadgeComponent } from './ui/status-badge/hul-status-badge.component';
import { HulTableComponent } from './ui/table/hul-table.component';
import { HulModalComponent } from './ui/modal/hul-modal.component';
import { HulSkeletonComponent } from './ui/skeleton/hul-skeleton.component';
import { HulEmptyStateComponent } from './ui/empty-state/hul-empty-state.component';
import { HulPageHeaderComponent } from './ui/page-header/hul-page-header.component';
import { HulSidebarComponent } from './ui/sidebar/hul-sidebar.component';
import { ToastContainerComponent } from './ui/toast/toast-container.component';

// Phase 2 Components
import { HulStatCardComponent } from './ui/stat-card/hul-stat-card.component';
import { HulDataTableComponent } from './ui/data-table/hul-data-table.component';
import { HulTabsComponent } from './ui/tabs/hul-tabs.component';
import { HulConfirmDialogComponent } from './ui/confirm-dialog/hul-confirm-dialog.component';
import { HulChipInputComponent } from './ui/chip-input/hul-chip-input.component';
import { HulTimelineComponent } from './ui/timeline/hul-timeline.component';
import { HulAvatarComponent } from './ui/avatar/hul-avatar.component';
import { HulSearchInputComponent } from './ui/search-input/hul-search-input.component';

// Pipes
import { InrCurrencyPipe } from './pipes/inr-currency.pipe';
import { RelativeTimePipe } from './pipes/relative-time.pipe';
import { NotificationBellComponent } from './ui/notification-bell/notification-bell.component';

const COMPONENTS = [
  // Phase 1
  HulButtonComponent,
  HulInputComponent,
  HulCardComponent,
  HulBadgeComponent,
  HulStatusBadgeComponent,
  HulTableComponent,
  HulModalComponent,
  HulSkeletonComponent,
  HulEmptyStateComponent,
  HulPageHeaderComponent,
  HulSidebarComponent,
  ToastContainerComponent,
  // Phase 2
  HulStatCardComponent,
  HulDataTableComponent,
  HulTabsComponent,
  HulConfirmDialogComponent,
  HulChipInputComponent,
  HulTimelineComponent,
  HulAvatarComponent,
  HulSearchInputComponent,
  NotificationBellComponent,
];

const PIPES = [InrCurrencyPipe, RelativeTimePipe];

@NgModule({
  declarations: [...COMPONENTS, ...PIPES],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ...COMPONENTS, ...PIPES],
})
export class SharedModule { }
