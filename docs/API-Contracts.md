# API Contracts

## 1. Contract Standards

### 1.1 Transport

- Protocol: HTTP/HTTPS
- Payload format: JSON
- Authentication: JWT Bearer (except explicit public endpoints)
- Correlation header: `X-Correlation-ID`

### 1.2 Response Envelope

All successful and error responses follow the standard envelope:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "correlationId": "string",
  "traceId": "string",
  "timestamp": "utc timestamp"
}
```

### 1.3 Error Contract

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "string",
    "message": "string",
    "details": []
  },
  "correlationId": "string",
  "traceId": "string",
  "timestamp": "utc timestamp"
}
```

---

## 2. Authentication and Identity APIs

Base path:

- `/api/auth`
- `/api/admin/dealers`
- `/api/super-admin`
- `/api/shipping-addresses`

### 2.1 Auth Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Start dealer registration with OTP |
| POST | `/api/auth/register/verify-otp` | Complete dealer registration |
| POST | `/api/auth/login` | Login initiation |
| POST | `/api/auth/login/verify-otp` | Dealer OTP login verification |
| POST | `/api/auth/refresh` | Rotate refresh token and issue new access token |
| POST | `/api/auth/forgot-password` | Request reset OTP |
| POST | `/api/auth/forgot-password/reset` | Reset password with OTP |

### 2.2 Shipping Address Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/shipping-addresses` | List addresses for current dealer |
| POST | `/api/shipping-addresses` | Add new address |
| PUT | `/api/shipping-addresses/{id}` | Update address |
| DELETE | `/api/shipping-addresses/{id}` | Delete address |
| PUT | `/api/shipping-addresses/{id}/set-default` | Set default address |

---

## 3. Catalog APIs

Base path:

- `/api/products`
- `/api/categories`
- `/api/inventory`

### 3.1 Product and Category

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/products` | Product search/listing |
| GET | `/api/products/{id}` | Product detail |
| POST | `/api/products` | Create product |
| PUT | `/api/products/{id}` | Update product |
| PUT | `/api/products/{id}/activate` | Activate product |
| PUT | `/api/products/{id}/deactivate` | Deactivate product |
| DELETE | `/api/products/{id}` | Hard delete product |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/{id}` | Update category |

### 3.2 Reservation and Inventory

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/inventory/restock/{productId}` | Restock inventory |
| POST | `/api/inventory/reserve` | Reserve stock for dealer cart |
| POST | `/api/inventory/release` | Release reservation |
| POST | `/api/inventory/release-all` | Clear all reservations for dealer |

---

## 4. Order APIs

Base path:

- `/api/orders`
- `/api/returns`

### 4.1 Order Lifecycle

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/orders` | Place new order |
| GET | `/api/orders/my` | Dealer order listing |
| GET | `/api/orders` | Admin order listing |
| GET | `/api/orders/{id}` | Order detail |
| PUT | `/api/orders/{id}/approve` | Approve on-hold order |
| PUT | `/api/orders/{id}/cancel` | Cancel order |
| PUT | `/api/orders/{id}/ready-for-dispatch` | Mark ready for dispatch |
| PUT | `/api/orders/{id}/in-transit` | Mark in transit |
| PUT | `/api/orders/{id}/delivered` | Mark delivered |

### 4.2 Returns

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/orders/{id}/returns` | Raise return request |
| POST | `/api/orders/upload-return-image` | Upload return evidence image |
| GET | `/api/returns/my` | Dealer return listing |
| GET | `/api/returns` | Admin return listing |
| PUT | `/api/returns/{id}/approve` | Approve return with `adminNotes` |
| PUT | `/api/returns/{id}/reject` | Reject return with `adminNotes` |

---

## 5. Logistics APIs

Base path:

- `/api/logistics`

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/logistics/shipments` | Create shipment |
| GET | `/api/logistics/shipments/pending` | Pending dispatch shipments |
| GET | `/api/logistics/shipments` | All shipments |
| GET | `/api/logistics/shipments/mine` | Agent assigned shipments |
| POST | `/api/logistics/shipments/assign-agent` | Assign agent and vehicle |
| PUT | `/api/logistics/shipments/{orderId}/status` | Update shipment status |
| GET | `/api/logistics/tracking/{orderId}` | Tracking timeline |
| POST | `/api/logistics/shipments/{id}/rate` | Dealer shipment rating |
| GET | `/api/logistics/agents/me` | Agent self profile |
| GET | `/api/logistics/agents` | Admin agent list |
| POST | `/api/logistics/agents` | Create agent |
| GET | `/api/logistics/vehicles` | List vehicles |
| POST | `/api/logistics/vehicles` | Create vehicle |

---

## 6. Payment APIs

Base path:

- `/api/payment`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/payment/dealers/{dealerId}/credit-check` | Credit eligibility |
| GET | `/api/payment/dealers/{dealerId}/credit-account` | Credit account detail |
| POST | `/api/payment/dealers/{dealerId}/credit-account` | Create credit account |
| PUT | `/api/payment/dealers/{dealerId}/credit-limit` | Update credit limit |
| POST | `/api/payment/invoices/generate` | Generate invoice |
| GET | `/api/payment/invoices` | List invoices |
| GET | `/api/payment/invoices/{invoiceId}` | Invoice detail |
| GET | `/api/payment/invoices/{invoiceId}/download` | Invoice PDF |
| GET | `/api/payment/invoices/order/{orderId}` | Invoice by order |
| GET | `/api/payment/admin/sales/export` | Sales export |

Razorpay endpoints:

- `/api/payment/razorpay/...`

---

## 7. Notification APIs

Base path:

- `/api/notifications`
- `/api/notification` (inbox operations)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/notifications/templates` | List templates |
| PUT | `/api/notifications/templates/{eventType}` | Update template |
| GET | `/api/notification/inbox` | User inbox |
| GET | `/api/notification/unread-count` | Unread count |
| PUT | `/api/notification/{id}/mark-read` | Mark one as read |
| PUT | `/api/notification/mark-all-read` | Mark all as read |

---

## 8. Internal APIs

Internal APIs are protected by service policy and internal JWT claims.

Examples:

- identity internal contact APIs
- order internal notification/invoice details
- payment internal credit check

---

## 9. Event Contracts

### 9.1 Envelope

```json
{
  "eventId": "guid",
  "eventType": "string",
  "occurredAt": "utc timestamp",
  "correlationId": "string",
  "source": "string",
  "payload": {}
}
```

### 9.2 Key Event Types

- `OrderReadyForDispatch`
- `OrderDelivered`
- `AgentAssigned`
- `ShipmentStatusUpdated`
- `InvoiceGenerated`
- `OrderCancelled`
- `ReturnRequested`

