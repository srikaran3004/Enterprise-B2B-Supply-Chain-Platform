import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { cartReducer, initialState } from './cart.reducer';
import * as CartActions from './cart.actions';

describe('Cart Reducer (NgRx State Management)', () => {
  it('should return the initial state when an unknown action is dispatched', () => {
    const action = { type: 'Unknown' };
    const state = cartReducer(initialState, action as any);
    expect(state).toBe(initialState);
  });

  it('should accurately add a product to the cart state', () => {
    const dummyProduct = { productId: 'abc-123', name: 'Lux Soap Box', unitPrice: 15 } as any;
    const action = CartActions.addToCart({ product: dummyProduct, quantity: 2 });
    
    const state = cartReducer(initialState, action);
    
    expect(state.items.length).toBe(1);
    expect(state.items[0].product.productId).toBe('abc-123');
    expect(state.items[0].quantity).toBe(2);
  });
  
  it('should correctly set the cart to "open" when openCart is dispatched', () => {
     const state = cartReducer(initialState, CartActions.openCart());
     expect(state.isOpen).toBe(true);
  });
});
