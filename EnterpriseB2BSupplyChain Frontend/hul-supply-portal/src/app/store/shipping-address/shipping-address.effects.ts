import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { ShippingAddressService } from '../../core/services/shipping-address.service';
import * as ShippingAddressActions from './shipping-address.actions';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { catchError, map, mergeMap, of, tap } from 'rxjs';

@Injectable()
export class ShippingAddressEffects {
  private actions$ = inject(Actions);
  private shippingAddressService = inject(ShippingAddressService);
  private toast = inject(ToastService);

  loadAddresses$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ShippingAddressActions.loadAddresses),
      mergeMap(() =>
        this.shippingAddressService.getShippingAddresses().pipe(
          map(addresses => ShippingAddressActions.loadAddressesSuccess({ addresses })),
          catchError(error => of(ShippingAddressActions.loadAddressesFailure({ error: error.message })))
        )
      )
    )
  );

  addAddress$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ShippingAddressActions.addAddress),
      mergeMap(({ address }) =>
        this.shippingAddressService.addShippingAddress(address).pipe(
          map(() => ShippingAddressActions.addAddressSuccess()),
          tap(() => this.toast.success('Address added successfully!')),
          catchError(error => {
            this.toast.error('Failed to add address');
            return of(ShippingAddressActions.addAddressFailure({ error: error.message }));
          })
        )
      )
    )
  );

  updateAddress$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ShippingAddressActions.updateAddress),
      mergeMap(({ id, address }) =>
        this.shippingAddressService.updateShippingAddress(id, address).pipe(
          map(() => ShippingAddressActions.updateAddressSuccess()),
          tap(() => this.toast.success('Address updated successfully!')),
          catchError(error => {
            this.toast.error('Failed to update address');
            return of(ShippingAddressActions.updateAddressFailure({ error: error.message }));
          })
        )
      )
    )
  );

  deleteAddress$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ShippingAddressActions.deleteAddress),
      mergeMap(({ id }) =>
        this.shippingAddressService.deleteShippingAddress(id).pipe(
          map(() => ShippingAddressActions.deleteAddressSuccess()),
          tap(() => this.toast.success('Address deleted successfully!')),
          catchError(error => {
            this.toast.error('Failed to delete address');
            return of(ShippingAddressActions.deleteAddressFailure({ error: error.message }));
          })
        )
      )
    )
  );

  setDefaultAddress$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ShippingAddressActions.setDefaultAddress),
      mergeMap(({ id }) =>
        this.shippingAddressService.setDefaultAddress(id).pipe(
          map(() => ShippingAddressActions.setDefaultAddressSuccess()),
          tap(() => this.toast.success('Default address updated!')),
          catchError(error => {
            this.toast.error('Failed to set default address');
            return of(ShippingAddressActions.setDefaultAddressFailure({ error: error.message }));
          })
        )
      )
    )
  );

  // Reload addresses after any mutation success
  reloadAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        ShippingAddressActions.addAddressSuccess,
        ShippingAddressActions.updateAddressSuccess,
        ShippingAddressActions.deleteAddressSuccess,
        ShippingAddressActions.setDefaultAddressSuccess
      ),
      map(() => ShippingAddressActions.loadAddresses())
    )
  );
}
