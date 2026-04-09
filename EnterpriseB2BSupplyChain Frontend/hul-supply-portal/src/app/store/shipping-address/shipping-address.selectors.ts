import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ShippingAddressState } from './shipping-address.reducer';

export const selectShippingAddressState = createFeatureSelector<ShippingAddressState>('shippingAddresses');

export const selectAllAddresses = createSelector(
  selectShippingAddressState,
  (state) => state.addresses || []
);

export const selectDefaultAddress = createSelector(
  selectAllAddresses,
  (addresses) => addresses?.find(a => a.isDefault) || addresses?.[0] || null
);

export const selectAddressesLoading = createSelector(
  selectShippingAddressState,
  (state) => state.loading
);
