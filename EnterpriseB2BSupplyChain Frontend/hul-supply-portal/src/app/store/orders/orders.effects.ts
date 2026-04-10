import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
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
          switchMap(res => {
            // Handle both paginated response (Items) and direct array
            const orders = res.items || res.Items || [];
            if (!Array.isArray(orders) || orders.length === 0) {
              return of(OrdersActions.loadMyOrdersSuccess({ orders: [] }));
            }

            const trackingRequests = orders.map((order: any) =>
              this.http.get<any>(API_ENDPOINTS.logistics.tracking(order.orderId)).pipe(
                map(tracking => ({ order, tracking })),
                catchError(() => of({ order, tracking: null }))
              )
            );

            return forkJoin(trackingRequests).pipe(
              map(items => {
                const mergedOrders = items.map(({ order, tracking }) => {
                  const effectiveStatus = this.getEffectiveStatus(order?.status, tracking?.currentStatus || tracking?.status);
                  return {
                    ...order,
                    status: effectiveStatus,
                    trackingStatus: tracking?.currentStatus || tracking?.status || null,
                  };
                });

                return OrdersActions.loadMyOrdersSuccess({ orders: mergedOrders });
              })
            );
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

  private getEffectiveStatus(orderStatus: string, trackingStatusRaw?: string): string {
    const trackingStatus = this.mapTrackingToOrderStatus(trackingStatusRaw);
    if (!trackingStatus) {
      return orderStatus;
    }

    const rank: Record<string, number> = {
      Placed: 1,
      OnHold: 2,
      Processing: 3,
      ReadyForDispatch: 4,
      InTransit: 5,
      OutForDelivery: 6,
      Delivered: 7,
      Cancelled: 8,
    };

    const orderRank = rank[orderStatus] ?? 0;
    const trackingRank = rank[trackingStatus] ?? 0;
    return trackingRank > orderRank ? trackingStatus : orderStatus;
  }

  private mapTrackingToOrderStatus(status?: string): string | null {
    if (!status) return null;

    switch (status) {
      case 'Delivered':
        return 'Delivered';
      case 'OutForDelivery':
        return 'OutForDelivery';
      case 'InTransit':
      case 'PickedUp':
      case 'VehicleBreakdown':
        return 'InTransit';
      case 'AgentAssigned':
        return 'ReadyForDispatch';
      default:
        return null;
    }
  }
}
