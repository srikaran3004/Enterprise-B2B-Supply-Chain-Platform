import { Injectable, NgZone } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';

/**
 * ZoneInterceptor — forces global change detection manually after every HTTP response.
 *
 * It uses NgZone.run to guarantee the UI updates instantly when data is fetched, explicitly
 * wrapping the callbacks so that Angular's change detection executes reliably.
 */
@Injectable()
export class ZoneInterceptor implements HttpInterceptor {
  constructor(private ngZone: NgZone) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return new Observable<HttpEvent<any>>(observer => {
      const sub = next.handle(req).subscribe({
        next:     (event)  => this.ngZone.run(() => observer.next(event)),
        error:    (err)    => this.ngZone.run(() => observer.error(err)),
        complete: ()       => this.ngZone.run(() => observer.complete()),
      });
      return () => {
        if (sub) {
          sub.unsubscribe();
        }
      };
    });
  }
}
