import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../shared/constants/api-endpoints';

export interface ReturnRequest {
  returnId: string;
  orderId: string;
  dealerId: string;
  reason: string;
  status: string;
  requestedAt: string;
  resolvedAt?: string | null;
  adminNotes?: string;
  orderNumber?: string;
  photoUrl?: string;
  thumbUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReturnsService {
  private http = inject(HttpClient);

  raiseReturn(orderId: string, reason: string, photoUrl?: string, thumbUrl?: string): Observable<{ returnId: string }> {
    return this.http.post<{ returnId: string }>(
      API_ENDPOINTS.returns.raiseReturn(orderId),
      { reason, photoUrl, thumbUrl },
      { headers: { 'X-Skip-Error-Toast': '1' } }
    );
  }

  getMyReturns(): Observable<ReturnRequest[]> {
    return this.http.get<any>(API_ENDPOINTS.returns.myReturns()).pipe(
      map(payload => this.normalizeReturnList(payload))
    );
  }

  getAllReturns(): Observable<ReturnRequest[]> {
    return this.http.get<any>(API_ENDPOINTS.returns.allReturns()).pipe(
      map(payload => this.normalizeReturnList(payload))
    );
  }

  approveReturn(returnId: string, adminNotes: string): Observable<void> {
    return this.http.put<void>(API_ENDPOINTS.returns.approve(returnId), { adminNotes });
  }

  rejectReturn(returnId: string, adminNotes: string): Observable<void> {
    return this.http.put<void>(API_ENDPOINTS.returns.reject(returnId), { adminNotes });
  }

  private normalizeReturnList(payload: any): ReturnRequest[] {
    if (Array.isArray(payload)) {
      return payload.map(item => this.normalizeReturn(item)).filter((x): x is ReturnRequest => x !== null);
    }

    const items = payload?.items ?? payload?.Items ?? payload?.data ?? payload?.Data;
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map(item => this.normalizeReturn(item)).filter((x): x is ReturnRequest => x !== null);
  }

  private normalizeReturn(raw: any): ReturnRequest | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const returnId = raw.returnId ?? raw.ReturnId;
    const orderId = raw.orderId ?? raw.OrderId;
    const dealerId = raw.dealerId ?? raw.DealerId;
    const reason = raw.reason ?? raw.Reason;
    const status = raw.status ?? raw.Status;
    const requestedAt = raw.requestedAt ?? raw.RequestedAt ?? raw.createdAt ?? raw.CreatedAt;

    if (!returnId || !orderId || !dealerId || !reason || !status || !requestedAt) {
      return null;
    }

    return {
      returnId,
      orderId,
      dealerId,
      reason,
      status,
      requestedAt,
      resolvedAt: raw.resolvedAt ?? raw.ResolvedAt ?? null,
      adminNotes: raw.adminNotes ?? raw.AdminNotes,
      orderNumber: raw.orderNumber ?? raw.OrderNumber,
      photoUrl: raw.photoUrl ?? raw.PhotoUrl,
      thumbUrl: raw.thumbUrl ?? raw.ThumbUrl,
    };
  }
}
