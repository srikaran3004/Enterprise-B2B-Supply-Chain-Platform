export interface ShippingAddress {
  addressId: string;
  label: string;
  addressLine1: string;
  city: string;
  state: string;
  pinCode: string;
  phoneNumber: string;
  isDefault: boolean;
}

export interface AddShippingAddressDto {
  label: string;
  addressLine1: string;
  city: string;
  state: string;
  pinCode: string;
  phoneNumber?: string;
  isDefault: boolean;
}
