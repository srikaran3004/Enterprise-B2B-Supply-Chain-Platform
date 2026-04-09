import { createReducer, on } from '@ngrx/store';
import { ShippingAddress } from '../../core/models/shipping-address.model';
import * as ShippingAddressActions from './shipping-address.actions';

export interface ShippingAddressState {
  addresses: ShippingAddress[];
  loading: boolean;
  error: string | null;
}

export const initialState: ShippingAddressState = {
  addresses: [],
  loading: false,
  error: null
};

export const shippingAddressReducer = createReducer(
  initialState,

  on(ShippingAddressActions.loadAddresses, state => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ShippingAddressActions.loadAddressesSuccess, (state, { addresses }) => ({
    ...state,
    addresses,
    loading: false
  })),

  on(ShippingAddressActions.loadAddressesFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false
  })),

  on(
    ShippingAddressActions.addAddress,
    ShippingAddressActions.updateAddress,
    ShippingAddressActions.deleteAddress,
    ShippingAddressActions.setDefaultAddress,
    state => ({
      ...state,
      loading: true,
      error: null
    })
  ),

  on(
    ShippingAddressActions.addAddressSuccess,
    ShippingAddressActions.updateAddressSuccess,
    ShippingAddressActions.deleteAddressSuccess,
    ShippingAddressActions.setDefaultAddressSuccess,
    state => ({
      ...state,
      loading: false
    })
  ),

  on(
    ShippingAddressActions.addAddressFailure,
    ShippingAddressActions.updateAddressFailure,
    ShippingAddressActions.deleteAddressFailure,
    ShippingAddressActions.setDefaultAddressFailure,
    (state, { error }) => ({
      ...state,
      error,
      loading: false
    })
  )
);
