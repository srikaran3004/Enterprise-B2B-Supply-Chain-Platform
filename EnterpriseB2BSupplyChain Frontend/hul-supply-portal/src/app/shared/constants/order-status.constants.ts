export type OrderStatus =
  | 'Placed'
  | 'OnHold'
  | 'Processing'
  | 'ReadyForDispatch'
  | 'InTransit'
  | 'OutForDelivery'
  | 'Delivered'
  | 'ReturnRequested'
  | 'Closed'
  | 'Cancelled';

export type ShipmentStatus = 'Assigned' | 'PickedUp' | 'InTransit' | 'Delivered' | 'Failed';

export type UserStatus = 'Active' | 'Inactive' | 'Pending' | 'Suspended';

export const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string; variant: string }> = {
  Active: { label: 'Active', color: '#059669', bgColor: '#ecfdf5', icon: 'check-circle-2', variant: 'success' },
  Inactive: { label: 'Inactive', color: '#64748b', bgColor: '#f8fafc', icon: 'minus-circle', variant: 'neutral' },
  Pending: { label: 'Pending', color: '#d97706', bgColor: '#fffbeb', icon: 'clock-3', variant: 'warning' },
  Suspended: { label: 'Suspended', color: '#ef4444', bgColor: '#fef2f2', icon: 'pause-circle', variant: 'danger' },
  Placed: { label: 'Placed', color: '#3b82f6', bgColor: '#eff6ff', icon: 'package', variant: 'info' },
  OnHold: { label: 'On Hold', color: '#f59e0b', bgColor: '#fffbeb', icon: 'pause-circle', variant: 'warning' },
  Processing: { label: 'Processing', color: '#6366f1', bgColor: '#eef2ff', icon: 'loader', variant: 'primary' },
  ReadyForDispatch: { label: 'Ready to Ship', color: '#14b8a6', bgColor: '#f0fdfa', icon: 'package-check', variant: 'success' },
  InTransit: { label: 'In Transit', color: '#0ea5e9', bgColor: '#f0f9ff', icon: 'truck', variant: 'info' },
  OutForDelivery: { label: 'Out for Delivery', color: '#2563eb', bgColor: '#eff6ff', icon: 'truck', variant: 'info' },
  Delivered: { label: 'Delivered', color: '#10b981', bgColor: '#ecfdf5', icon: 'check-circle-2', variant: 'success' },
  ReturnRequested: { label: 'Return Requested', color: '#f97316', bgColor: '#fff7ed', icon: 'rotate-ccw', variant: 'warning' },
  Closed: { label: 'Closed', color: '#64748b', bgColor: '#f8fafc', icon: 'archive', variant: 'neutral' },
  Cancelled: { label: 'Cancelled', color: '#ef4444', bgColor: '#fef2f2', icon: 'x-circle', variant: 'danger' },
};

export const CANCELLABLE_STATUSES: OrderStatus[] = ['Placed', 'OnHold', 'Processing'];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];
