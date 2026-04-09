import { createAction, props } from '@ngrx/store';

export const loadMyOrders = createAction('[Orders] Load My Orders', props<{ status?: string, page?: number, pageSize?: number }>());
export const loadMyOrdersSuccess = createAction('[Orders] Load My Orders Success', props<{ orders: any[] }>());
export const loadMyOrdersFailure = createAction('[Orders] Load My Orders Failure', props<{ error: string }>());

export const loadOrderDetail = createAction('[Orders] Load Order Detail', props<{ orderId: string }>());
export const loadOrderDetailSuccess = createAction('[Orders] Load Order Detail Success', props<{ order: any }>());
export const loadOrderDetailFailure = createAction('[Orders] Load Order Detail Failure', props<{ error: string }>());

export const placeOrder = createAction('[Orders] Place Order', props<{ payload: any }>());
export const placeOrderSuccess = createAction('[Orders] Place Order Success', props<{ orderId: string; orderNumber: string; status: string }>());
export const placeOrderFailure = createAction('[Orders] Place Order Failure', props<{ error: string }>());

export const applyStatusFilter = createAction('[Orders] Apply Status Filter', props<{ status: string | null }>());
export const cancelOrder = createAction('[Orders] Cancel Order', props<{ orderId: string; reason: string }>());
export const cancelOrderSuccess = createAction('[Orders] Cancel Order Success', props<{ orderId: string; reason: string }>());
