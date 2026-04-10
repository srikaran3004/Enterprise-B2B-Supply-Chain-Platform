import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, map } from 'rxjs';

interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: unknown;
  correlationId?: string;
  traceId?: string;
  timestamp?: string;
}

@Injectable()
export class ResponseEnvelopeInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      map(event => {
        if (!(event instanceof HttpResponse)) {
          return event;
        }

        // Skip binary/download responses.
        if (event.body instanceof Blob || event.body instanceof ArrayBuffer) {
          return event;
        }

        const body = event.body as ApiEnvelope | null;
        if (!body || typeof body !== 'object' || !('success' in body)) {
          return event;
        }

        if (body.success !== true) {
          return event;
        }

        // Keep existing frontend contracts stable while backend standardizes envelopes.
        return event.clone({ body: (body as ApiEnvelope).data ?? null });
      })
    );
  }
}

