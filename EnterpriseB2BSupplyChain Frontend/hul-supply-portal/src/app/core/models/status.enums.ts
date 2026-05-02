/**
 * status.enums.ts
 * Frontend enums synchronized with backend string enum values.
 * These mirror the C# enums stored as strings in the database and returned in DTOs.
 *
 * Keep in sync with:
 *   - Order.Domain.Enums.OrderStatus
 *   - Logistics.Domain.Enums.ShipmentStatus
 *   - Payment.Domain.Enums.PaymentStatus (or InvoiceStatus)
 *   - Identity.Domain.Enums.UserStatus
 */

export enum OrderStatus {
  PaymentPending    = 'PaymentPending',
  PaymentFailed     = 'PaymentFailed',
  Placed            = 'Placed',
  OnHold            = 'OnHold',
  Processing        = 'Processing',
  ReadyForDispatch  = 'ReadyForDispatch',
  InTransit         = 'InTransit',
  Delivered         = 'Delivered',
  ReturnRequested   = 'ReturnRequested',
  Closed            = 'Closed',
  Cancelled         = 'Cancelled',
}

export enum ShipmentStatus {
  Pending    = 'Pending',
  Assigned   = 'Assigned',
  PickedUp   = 'PickedUp',
  InTransit  = 'InTransit',
  Delivered  = 'Delivered',
  Failed     = 'Failed',
}

export enum PaymentStatus {
  Pending   = 'Pending',
  Paid      = 'Paid',
  Failed    = 'Failed',
  Overdue   = 'Overdue',
  Waived    = 'Waived',
  Refunded  = 'Refunded',
}

export enum UserStatus {
  Pending   = 'Pending',
  Active    = 'Active',
  Suspended = 'Suspended',
  Rejected  = 'Rejected',
}

export enum ProductStatus {
  Active   = 'Active',
  Inactive = 'Inactive',
}

/** Helper: returns true if an order is in an active (non-terminal) state */
export function isActiveOrder(status: string): boolean {
  return [
    OrderStatus.PaymentPending,
    OrderStatus.PaymentFailed,
    OrderStatus.Placed,
    OrderStatus.OnHold,
    OrderStatus.Processing,
    OrderStatus.ReadyForDispatch,
    OrderStatus.InTransit,
  ].includes(status as OrderStatus);
}

/** Helper: returns true if an order is in a terminal state */
export function isTerminalOrder(status: string): boolean {
  return status === OrderStatus.Delivered || status === OrderStatus.Closed || status === OrderStatus.Cancelled;
}
