import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../shared/constants/api-endpoints';

declare var Razorpay: any;

@Injectable({
  providedIn: 'root'
})
export class RazorpayService {
  private http = inject(HttpClient);

  createOrder(orderId: string, amount: number): Observable<{ razorpayOrderId: string }> {
    // Backend expects: Amount (decimal INR) and ReceiptId (our internal orderId)
    return this.http.post<{ razorpayOrderId: string }>(
      API_ENDPOINTS.payment.razorpayCreateOrder(),
      { amount, receiptId: orderId }
    );
  }

  confirmPayment(payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    orderId?: string;
    amount?: number;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API_ENDPOINTS.payment.razorpayConfirm(), payload);
  }

  /**
   * TEST MODE: Backend generates a synthetic payment ID + valid HMAC signature,
   * then self-confirms. Returns the confirmed payment details.
   */
  simulateCapture(razorpayOrderId: string, orderId?: string, amount?: number): Observable<{
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    message: string;
  }> {
    return this.http.post<any>(API_ENDPOINTS.payment.razorpaySimulateCapture(), { razorpayOrderId, orderId, amount });
  }

  // Uses Razorpay SDK window (kept for reference, not used in test mode)
  openRazorpay(options: any): void {
    if (typeof Razorpay !== 'undefined') {
      const rzp = new Razorpay(options);
      rzp.open();
    } else {
      console.error('Razorpay SDK not loaded');
    }
  }
}
