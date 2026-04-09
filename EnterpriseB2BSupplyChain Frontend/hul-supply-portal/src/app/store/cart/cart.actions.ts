import { createAction, props } from '@ngrx/store';

export interface CartItem {
  product: any;
  quantity: number;
}

export const addToCart = createAction('[Cart] Add To Cart', props<{ product: any; quantity: number }>());
export const removeFromCart = createAction('[Cart] Remove From Cart', props<{ productId: string }>());
export const updateQuantity = createAction('[Cart] Update Quantity', props<{ productId: string; quantity: number }>());
export const setPaymentMode = createAction('[Cart] Set Payment Mode', props<{ mode: 'COD' | 'PrePaid' }>());
export const setNotes = createAction('[Cart] Set Notes', props<{ notes: string }>());
export const toggleCart = createAction('[Cart] Toggle Cart');
export const openCart = createAction('[Cart] Open Cart');
export const closeCart = createAction('[Cart] Close Cart');
export const clearCart = createAction('[Cart] Clear Cart');

// Inventory reservation actions
export const reserveInventorySuccess = createAction('[Cart] Reserve Inventory Success', props<{ productId: string }>());
export const releaseInventorySuccess = createAction('[Cart] Release Inventory Success', props<{ productId: string }>());
export const releaseAllInventorySuccess = createAction('[Cart] Release All Inventory Success');
