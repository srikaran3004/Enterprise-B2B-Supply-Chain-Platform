import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';

export interface ConfirmConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

@Injectable({ providedIn: 'root' })
export class HulConfirmService {
  private confirmSubject = new Subject<{ confirmed: boolean }>();
  private dialogStateSubject = new Subject<{ isOpen: boolean; config: ConfirmConfig | null }>();
  
  dialogState$ = this.dialogStateSubject.asObservable();

  confirm(config: ConfirmConfig): Observable<boolean> {
    this.dialogStateSubject.next({ isOpen: true, config });
    return new Observable(observer => {
      const sub = this.confirmSubject.pipe(take(1)).subscribe(result => {
        observer.next(result.confirmed);
        observer.complete();
      });
      return () => sub.unsubscribe();
    });
  }

  resolve(confirmed: boolean): void {
    this.confirmSubject.next({ confirmed });
    this.dialogStateSubject.next({ isOpen: false, config: null });
  }
}
