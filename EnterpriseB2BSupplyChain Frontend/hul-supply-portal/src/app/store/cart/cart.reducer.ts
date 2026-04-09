import { createReducer, on } from '@ngrx/store';
import { createSelector, createFeatureSelector } from '@ngrx/store';
import * as CartActions from './cart.actions';
import { CartItem } from './cart.actions';

export interface CartState {
  items: CartItem[];
  paymentMode: 'COD' | 'PrePaid';
  notes: string;
  isOpen: boolean;
}

export const initialState: CartState = {
  items: [],
  paymentMode: 'COD',
  notes: '',
  isOpen: false,
};

export const cartReducer = createReducer(
  initialState,
  on(CartActions.addToCart, (state, { product, quantity }) => {
    const existing = state.items.find(i => i.product.productId === product.productId);
    if (existing) {
      return {
        ...state,
        items: state.items.map(i =>
          i.product.productId === product.productId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      };
    }
    return { ...state, items: [...state.items, { product, quantity }] };
  }),
  on(CartActions.removeFromCart, (state, { productId }) => ({
    ...state,
    items: state.items.filter(i => i.product.productId !== productId)
  })),
  on(CartActions.updateQuantity, (state, { productId, quantity }) => ({
    ...state,
    items: state.items.map(i =>
      i.product.productId === productId ? { ...i, quantity } : i
    )
  })),
  on(CartActions.setPaymentMode, (state, { mode }) => ({ ...state, paymentMode: mode })),
  on(CartActions.setNotes, (state, { notes }) => ({ ...state, notes })),
  on(CartActions.toggleCart, (state) => ({ ...state, isOpen: !state.isOpen })),
  on(CartActions.openCart, (state) => ({ ...state, isOpen: true })),
  on(CartActions.closeCart, (state) => ({ ...state, isOpen: false })),
  on(CartActions.clearCart, () => initialState),
);

// Selectors
export const selectCartState = createFeatureSelector<CartState>('cart');
export const selectCartItems = createSelector(selectCartState, s => s.items);
export const selectCartCount = createSelector(selectCartItems, items => items.reduce((sum, i) => sum + i.quantity, 0));
export const selectCartTotal = createSelector(selectCartItems, items => items.reduce((sum, i) => sum + (i.product.unitPrice * i.quantity), 0));
export const selectIsCartOpen = createSelector(selectCartState, s => s.isOpen);
export const selectPaymentMode = createSelector(selectCartState, s => s.paymentMode);
export const selectCartNotes = createSelector(selectCartState, s => s.notes);
