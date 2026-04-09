import { createReducer, on } from '@ngrx/store';
import { createSelector, createFeatureSelector } from '@ngrx/store';
import * as OrdersActions from './orders.actions';

export interface OrdersState {
  orders: any[];
  selectedOrder: any | null;
  loading: boolean;
  statusFilter: string | null;
  error: string | null;
}

export const initialState: OrdersState = {
  orders: [],
  selectedOrder: null,
  loading: false,
  statusFilter: null,
  error: null,
};

export const ordersReducer = createReducer(
  initialState,
  on(OrdersActions.loadMyOrders, (state) => ({ ...state, loading: true, error: null })),
  on(OrdersActions.loadMyOrdersSuccess, (state, { orders }) => ({ ...state, orders, loading: false })),
  on(OrdersActions.loadMyOrdersFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(OrdersActions.loadOrderDetail, (state) => ({ ...state, loading: true })),
  on(OrdersActions.loadOrderDetailSuccess, (state, { order }) => ({ ...state, selectedOrder: order, loading: false })),
  on(OrdersActions.loadOrderDetailFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(OrdersActions.placeOrder, (state) => ({ ...state, loading: true })),
  on(OrdersActions.placeOrderSuccess, (state) => ({ ...state, loading: false })),
  on(OrdersActions.placeOrderFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(OrdersActions.applyStatusFilter, (state, { status }) => ({ ...state, statusFilter: status })),
  on(OrdersActions.cancelOrderSuccess, (state, { orderId, reason }) => ({
    ...state,
    orders: state.orders.map(o => o.orderId === orderId ? { ...o, status: 'Cancelled' } : o),
    selectedOrder: state.selectedOrder?.orderId === orderId
      ? {
          ...state.selectedOrder,
          status: 'Cancelled',
          statusHistory: [
            ...(state.selectedOrder.statusHistory || []),
            {
              fromStatus: state.selectedOrder.status,
              toStatus: 'Cancelled',
              notes: reason,
              changedAt: new Date().toISOString()
            }
          ]
        }
      : state.selectedOrder
  })),
);

export const selectOrdersState = createFeatureSelector<OrdersState>('orders');
export const selectOrders = createSelector(selectOrdersState, s => s.orders);
export const selectSelectedOrder = createSelector(selectOrdersState, s => s.selectedOrder);
export const selectOrdersLoading = createSelector(selectOrdersState, s => s.loading);
export const selectStatusFilter = createSelector(selectOrdersState, s => s.statusFilter);
export const selectFilteredOrders = createSelector(selectOrders, selectStatusFilter, (orders, filter) =>
  filter ? orders.filter(o => o.status === filter) : orders
);
