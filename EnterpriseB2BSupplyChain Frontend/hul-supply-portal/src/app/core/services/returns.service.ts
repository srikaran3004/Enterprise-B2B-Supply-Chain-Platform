import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../shared/constants/api-endpoints';

export interface ReturnRequest {
  returnId: string;
  orderId: string;
  dealerId: string;
  reason: string;
  status: string;
  resolution?: string;
  refundAmount?: number;
  createdAt: string;
  adminNotes?: string;
  orderNumber?: string;
  photoUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReturnsService {
  private http = inject(HttpClient);

  raiseReturn(orderId: string, reason: string): Observable<{ returnId: string }> {
    return this.http.post<{ returnId: string }>(API_ENDPOINTS.returns.raiseReturn(orderId), { orderId, reason });
  }

  getMyReturns(): Observable<ReturnRequest[]> {
    return this.http.get<ReturnRequest[]>(API_ENDPOINTS.returns.myReturns());
  }

  getAllReturns(): Observable<ReturnRequest[]> {
    return this.http.get<ReturnRequest[]>(API_ENDPOINTS.returns.allReturns());
  }

  approveReturn(returnId: string, resolution: string, refundAmount: number): Observable<void> {
    return this.http.put<void>(API_ENDPOINTS.returns.approve(returnId), { resolution, refundAmount });
  }

  rejectReturn(returnId: string, adminNotes: string): Observable<void> {
    return this.http.put<void>(API_ENDPOINTS.returns.reject(returnId), { adminNotes });
  }
}
