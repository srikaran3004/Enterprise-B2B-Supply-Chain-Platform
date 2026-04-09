import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'hul_theme';
  private renderer: Renderer2;
  private theme$ = new BehaviorSubject<Theme>(this.getStoredTheme());

  currentTheme$ = this.theme$.asObservable();

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  getStoredTheme(): Theme {
    const stored = localStorage.getItem(this.THEME_KEY) as Theme;
    if (stored) return stored;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  toggle(): void {
    const current = this.theme$.value;
    const next: Theme = current === 'light' ? 'dark' : 'light';
    this.theme$.next(next);
    localStorage.setItem(this.THEME_KEY, next);
    this.apply();
  }

  apply(): void {
    const theme = this.theme$.value;
    if (theme === 'dark') {
      this.renderer.addClass(document.documentElement, 'dark');
    } else {
      this.renderer.removeClass(document.documentElement, 'dark');
    }
  }

  init(): void {
    this.apply();
  }

  isDark(): boolean {
    return this.theme$.value === 'dark';
  }
}
