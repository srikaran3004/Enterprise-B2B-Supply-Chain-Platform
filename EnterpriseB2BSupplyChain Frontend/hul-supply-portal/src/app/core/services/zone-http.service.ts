import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';

/**
 * ZoneHttpService wraps Angular's HttpClient.
 * We manually run the RxJS events inside NgZone.run() to ensure they
 * fire cleanly within Angular's change detection context zone.
 */
@Injectable({ providedIn: 'root' })
export class ZoneHttpService {
  constructor(private http: HttpClient, private ngZone: NgZone) {}

  get<T>(url: string, options?: object): Observable<T> {
    return new Observable<T>(observer => {
      let sub: Subscription;
      sub = this.http.get<T>(url, { ...(options as any), observe: 'body' }).subscribe({
        next: (data: any) => this.ngZone.run(() => observer.next(data as T)),
        error: (err: any) => this.ngZone.run(() => observer.error(err)),
        complete: () => this.ngZone.run(() => observer.complete()),
      });
      return () => {
        if (sub) {
          sub.unsubscribe();
        }
      };
    });
  }

  post<T>(url: string, body: any, options?: object): Observable<T> {
    return new Observable<T>(observer => {
      let sub: Subscription;
      sub = this.http.post<T>(url, body, { ...(options as any), observe: 'body' }).subscribe({
        next: (data: any) => this.ngZone.run(() => observer.next(data as T)),
        error: (err: any) => this.ngZone.run(() => observer.error(err)),
        complete: () => this.ngZone.run(() => observer.complete()),
      });
      return () => {
        if (sub) {
          sub.unsubscribe();
        }
      };
    });
  }

  put<T>(url: string, body: any, options?: object): Observable<T> {
    return new Observable<T>(observer => {
      let sub: Subscription;
      sub = this.http.put<T>(url, body, { ...(options as any), observe: 'body' }).subscribe({
        next: (data: any) => this.ngZone.run(() => observer.next(data as T)),
        error: (err: any) => this.ngZone.run(() => observer.error(err)),
        complete: () => this.ngZone.run(() => observer.complete()),
      });
      return () => {
        if (sub) {
          sub.unsubscribe();
        }
      };
    });
  }

  delete<T>(url: string, body?: any, options?: object): Observable<T> {
    return new Observable<T>(observer => {
      let sub: Subscription;
      const httpOptions: any = { ...(options as any), observe: 'body' };
      if (body !== undefined && body !== null) {
        httpOptions.body = body;
      }
      sub = this.http.delete<T>(url, httpOptions).subscribe({
        next: (data: any) => this.ngZone.run(() => observer.next(data as T)),
        error: (err: any) => this.ngZone.run(() => observer.error(err)),
        complete: () => this.ngZone.run(() => observer.complete()),
      });
      return () => {
        if (sub) {
          sub.unsubscribe();
        }
      };
    });
  }
}
