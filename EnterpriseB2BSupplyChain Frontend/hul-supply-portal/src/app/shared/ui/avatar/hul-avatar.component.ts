import { Component, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'hul-avatar',
  standalone: false,
  template: `
    <div class="avatar avatar--{{ size }} avatar--group" [style.background]="imageUrl ? 'transparent' : bgColor" (click)="triggerUpload()">
      <img *ngIf="imageUrl" [src]="imageUrl" [alt]="name" class="avatar__img" />
      <span *ngIf="!imageUrl" class="avatar__initials">{{ initials }}</span>
      
      <!-- Hover Overlay for Edit Mode -->
      <div *ngIf="editable" class="avatar__overlay">
        <svg class="avatar__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        <span class="avatar__text">CHANGE</span>
      </div>

      <input *ngIf="editable" type="file" #fileInput class="avatar__input" accept=".jpg,.jpeg,.png" (change)="onFileSelected($event)">
    </div>
  `,
  styles: [`
    .avatar { position: relative; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; color: white; font-family: var(--font-display); font-weight: 700; flex-shrink: 0; overflow: hidden; cursor: pointer; }
    .avatar--xs { width: 24px; height: 24px; font-size: 10px; }
    .avatar--sm { width: 32px; height: 32px; font-size: 12px; }
    .avatar--md { width: 40px; height: 40px; font-size: 14px; }
    .avatar--lg { width: 48px; height: 48px; font-size: 18px; }
    .avatar--xl { width: 72px; height: 72px; font-size: 24px; }
    .avatar__img { width: 100%; height: 100%; object-fit: cover; }
    .avatar__initials { line-height: 1; }
    .avatar__overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s ease; color: white; }
    .avatar--group:hover .avatar__overlay { opacity: 1; }
    .avatar__icon { width: 24px; height: 24px; margin-bottom: 4px; }
    .avatar__text { font-size: 10px; font-weight: 500; letter-spacing: 0.05em; }
    .avatar__input { display: none; }
  `]
})
export class HulAvatarComponent {
  @Input() name = '';
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() imageUrl?: string;
  @Input() editable = false;
  @Output() fileSelected = new EventEmitter<File>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private colors = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#0d9488', '#e11d48', '#0369a1', '#6366f1'];

  get initials(): string {
    if (!this.name) return '?';
    const words = this.name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    return words[0].substring(0, 2).toUpperCase();
  }

  get bgColor(): string {
    let hash = 0;
    for (let i = 0; i < this.name.length; i++) hash = this.name.charCodeAt(i) + ((hash << 5) - hash);
    return this.colors[Math.abs(hash) % this.colors.length];
  }

  triggerUpload(): void {
    if (this.editable && this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileSelected.emit(input.files[0]);
      // Reset input value so the same file can be selected again if needed
      input.value = '';
    }
  }
}
