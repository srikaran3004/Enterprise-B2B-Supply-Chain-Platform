import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import * as OrdersActions from './orders.actions';
import * as CartActions from '../cart/cart.actions';
import { API_ENDPOINTS } from '../../shared/constants/api-endpoints';
import { ToastService } from '../../shared/ui/toast/toast.service';

@Injectable()
export class OrdersEffects {
  private actions$ = inject(Actions);
  private http = inject(HttpClient);
  private router = inject(Router);
  private toast = inject(ToastService);

  loadMyOrders$ = createEffect(() =>
    this.actions$.pipe(
      // using any for now to handle new paginated payload without full TS refactor
      ofType<{ type: string, status?: string, page?: number, pageSize?: number }>('[Orders] Load My Orders'),
      switchMap(({ status, page = 1, pageSize = 10 }) => {
        let url = API_ENDPOINTS.orders.myOrders();
        let params = new URLSearchParams();
        if (status) params.append('status', status);
        params.append('page', page.toString());
        params.append('pageSize', pageSize.toString());
        
        return this.http.get<any>(`${url}?${params.toString()}`).pipe(
          map(res => {
            // Handle both paginated response (Items) and direct array
            const orders = res.items || res.Items || [];
            return OrdersActions.loadMyOrdersSuccess({ orders });
          }),
          catchError(error => {
            console.error('Failed to load orders:', error);
            return of(OrdersActions.loadMyOrdersFailure({ error: error.message }));
          })
        );
      })
    )
  );

  loadOrderDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrdersActions.loadOrderDetail),
      switchMap(({ orderId }) =>
        this.http.get<any>(API_ENDPOINTS.orders.orderById(orderId)).pipe(
          map(order => OrdersActions.loadOrderDetailSuccess({ order })),
          catchError(error => of(OrdersActions.loadOrderDetailFailure({ error: error.message })))
        )
      )
    )
  );

  placeOrder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrdersActions.placeOrder),
      switchMap(({ payload }) =>
        this.http.post<any>(API_ENDPOINTS.orders.base(), payload).pipe(
          map(response => OrdersActions.placeOrderSuccess({
            orderId: response.orderId,
            orderNumber: response.orderNumber,
            status: response.status
          })),
          catchError(error => of(OrdersActions.placeOrderFailure({ error: error.error?.error || 'Order failed' })))
        )
      )
    )
  );

  placeOrderSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrdersActions.placeOrderSuccess),
      tap(({ orderId, orderNumber }) => {
        this.toast.success(`Order ${orderNumber} placed successfully!`);
        this.router.navigate(['/dealer/orders', orderId]);
      }),
      map(() => CartActions.clearCart())
    )
  );

  cancelOrder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrdersActions.cancelOrder),
      switchMap(({ orderId, reason }) =>
        this.http.put<any>(API_ENDPOINTS.orders.cancelOrder(orderId), { reason }).pipe(
          map(() => {
            this.toast.success('Order cancelled successfully');
            return OrdersActions.cancelOrderSuccess({ orderId, reason });
          }),
          catchError(error => {
            this.toast.error(error.error?.Message || error.error?.message || error.error?.error || 'Failed to cancel order');
            return of(OrdersActions.loadMyOrdersFailure({ error: error.message }));
          })
        )
      )
    )
  );
}
