/**
 * api-models.ts
 * Strongly-typed interfaces that mirror C# backend DTOs exactly.
 * Property names are camelCase because ASP.NET Core's default JSON serializer
 * lowercases the first letter of every property name.
 *
 * Keep these in sync with:
 *   - OrderSummaryDto / OrderDetailDto / OrderLineDto   (Order service)
 *   - ProductDto / CategoryDto                          (Catalog service)
 *   - DealerListDto                                     (Identity service)
 */

// ─────────────────────────────────────────────
// Catalog
// ─────────────────────────────────────────────

/** Mirrors Catalog.Application.DTOs.CategoryDto */
export interface CategoryDto {
  categoryId: string;
  name: string;
  description: string | null;
  parentCategoryId: string | null;
  isActive: boolean;
}

/** Mirrors Catalog.Application.DTOs.ProductDto */
export interface ProductDto {
  productId: string;
  categoryId: string;
  sku: string;
  name: string;
  brand: string | null;
  categoryName: string;
  unitPrice: number;
  minOrderQuantity: number;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  isInStock: boolean;
  status: string;          // 'Active' | 'Inactive'
  imageUrl: string | null;
}

// ─────────────────────────────────────────────
// Order
// ─────────────────────────────────────────────

/** Mirrors Order.Application.DTOs.OrderLineDto */
export interface OrderLineDto {
  orderLineId: string;
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

/** Mirrors Order.Application.DTOs.StatusHistoryDto */
export interface StatusHistoryDto {
  fromStatus: string;
  toStatus: string;
  notes: string | null;
  changedAt: string;   // ISO date string
}

/** Mirrors Order.Application.DTOs.OrderSummaryDto (list view) */
export interface OrderSummary {
  orderId: string;
  orderNumber: string;
  dealerId: string;
  status: string;
  totalAmount: number;
  paymentMode: string;
  totalItems: number;
  placedAt: string;         // ISO date string
  updatedAt: string | null;
  shippingAddressLine: string | null;
  shippingCity: string | null;
  shippingPinCode: string | null;
  shippingState: string | null;
  lines: OrderLineDto[] | null;
  dealerName: string | null;
  dealerEmail: string | null;
}

/** Mirrors Order.Application.DTOs.OrderDetailDto (detail view) */
export interface OrderDetail {
  orderId: string;
  orderNumber: string;
  dealerId: string;
  dealerName: string | null;
  dealerEmail: string | null;
  status: string;
  totalAmount: number;
  paymentMode: string;
  notes: string | null;
  placedAt: string;
  updatedAt: string | null;
  shippingAddressLabel: string | null;
  shippingAddressLine: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPinCode: string | null;
  lines: OrderLineDto[];
  statusHistory: StatusHistoryDto[];
}

// ─────────────────────────────────────────────
// Identity / Dealer
// ─────────────────────────────────────────────

/** Mirrors Identity.Application.DTOs.DealerListDto */
export interface DealerListItem {
  userId: string;
  dealerProfileId: string | null;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  status: string;           // 'Active' | 'Pending' | 'Suspended' | 'Rejected'
  businessName: string;
  gstNumber: string;
  addressLine1: string;
  city: string;
  state: string;
  pinCode: string;
  createdAt: string;        // ISO date string
  approvedAt: string | null;
  approvedByAdminId: string | null;
  creditLimit?: number;
  // Computed on frontend — not from backend
  serial?: number;
  totalSpent?: number;
}

// ─────────────────────────────────────────────
// Shared pagination wrapper
// ─────────────────────────────────────────────

/** Mirrors SharedInfrastructure's PagedResult<T> envelope */
export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
