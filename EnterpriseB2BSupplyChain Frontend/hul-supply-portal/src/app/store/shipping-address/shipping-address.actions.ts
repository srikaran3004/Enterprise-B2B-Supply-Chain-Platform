import { createAction, props } from '@ngrx/store';
import { ShippingAddress, AddShippingAddressDto } from '../../core/models/shipping-address.model';

export const loadAddresses = createAction('[ShippingAddress] Load Addresses');
export const loadAddressesSuccess = createAction(
  '[ShippingAddress] Load Addresses Success',
  props<{ addresses: ShippingAddress[] }>()
);
export const loadAddressesFailure = createAction(
  '[ShippingAddress] Load Addresses Failure',
  props<{ error: string }>()
);

export const addAddress = createAction(
  '[ShippingAddress] Add Address',
  props<{ address: AddShippingAddressDto }>()
);
export const addAddressSuccess = createAction(
  '[ShippingAddress] Add Address Success'
);
export const addAddressFailure = createAction(
  '[ShippingAddress] Add Address Failure',
  props<{ error: string }>()
);

export const updateAddress = createAction(
  '[ShippingAddress] Update Address',
  props<{ id: string; address: Partial<AddShippingAddressDto> }>()
);
export const updateAddressSuccess = createAction(
  '[ShippingAddress] Update Address Success'
);
export const updateAddressFailure = createAction(
  '[ShippingAddress] Update Address Failure',
  props<{ error: string }>()
);

export const deleteAddress = createAction(
  '[ShippingAddress] Delete Address',
  props<{ id: string }>()
);
export const deleteAddressSuccess = createAction(
  '[ShippingAddress] Delete Address Success'
);
export const deleteAddressFailure = createAction(
  '[ShippingAddress] Delete Address Failure',
  props<{ error: string }>()
);

export const setDefaultAddress = createAction(
  '[ShippingAddress] Set Default Address',
  props<{ id: string }>()
);
export const setDefaultAddressSuccess = createAction(
  '[ShippingAddress] Set Default Address Success'
);
export const setDefaultAddressFailure = createAction(
  '[ShippingAddress] Set Default Address Failure',
  props<{ error: string }>()
);
