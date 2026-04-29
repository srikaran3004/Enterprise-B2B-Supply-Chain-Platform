export enum UserRole {
  SuperAdmin = 'SuperAdmin',
  Admin = 'Admin',
  Dealer = 'Dealer',
  DeliveryAgent = 'DeliveryAgent'
}

export interface User {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  phoneNumber?: string;
  businessName?: string;
  dealerId?: string;
}

export interface DecodedToken {
  sub: string;
  email: string;
  role: UserRole;
  fullName: string;
  dealerId: string;
  jti: string;
  exp: number;
  businessName?: string;
  gstNumber?: string;
  phoneNumber?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  profilePictureUrl?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken?: string | null;
  role: string;
  fullName: string;
  userId: string;
}

export interface RegisterDealerDto {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  businessName: string;
  gstNumber: string;
  tradeLicenseNumber?: string | null;
  addressLine1: string;
  city: string;
  state: string;
  pinCode: string;
  isInterstate: boolean;
}

export interface AuthResult {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken?: string | null;
  role: string;
  fullName: string;
  userId: string;
  requiresOtp?: boolean;
  message?: string;
}
