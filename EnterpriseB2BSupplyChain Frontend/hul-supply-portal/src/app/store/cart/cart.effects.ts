import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as CartActions from './cart.actions';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

@Injectable()
export class CartEffects {
    private actions$ = inject(Actions);
    private cartService = inject(CartService);
    private toast = inject(ToastService);

    // Reserve inventory when adding to cart
    reserveInventory$ = createEffect(() =>
        this.actions$.pipe(
            ofType(CartActions.addToCart),
            switchMap(({ product, quantity }) =>
                this.cartService.reserveInventory(product.productId, quantity).pipe(
                    map(() => CartActions.reserveInventorySuccess({ productId: product.productId })),
                    catchError((error) => {
                        const message = error.error?.message || 'Failed to reserve inventory';
                        this.toast.error(message);
                        // Revert the cart addition
                        return of(CartActions.removeFromCart({ productId: product.productId }));
                    })
                )
            )
        )
    );

    // Release inventory when removing from cart
    releaseInventory$ = createEffect(() =>
        this.actions$.pipe(
            ofType(CartActions.removeFromCart),
            switchMap(({ productId }) =>
                this.cartService.releaseInventory(productId).pipe(
                    map(() => CartActions.releaseInventorySuccess({ productId })),
                    catchError((error) => {
                        console.error('Failed to release inventory:', error);
                        // Continue anyway - don't block cart removal
                        return of(CartActions.releaseInventorySuccess({ productId }));
                    })
                )
            )
        )
    );

    // Release all inventory when clearing cart
    releaseAllInventory$ = createEffect(() =>
        this.actions$.pipe(
            ofType(CartActions.clearCart),
            switchMap(() =>
                this.cartService.releaseAllInventory().pipe(
                    map(() => CartActions.releaseAllInventorySuccess()),
                    catchError((error) => {
                        console.error('Failed to release all inventory:', error);
                        return of(CartActions.releaseAllInventorySuccess());
                    })
                )
            )
        )
    );
}
