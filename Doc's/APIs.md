# Comprehensive API Documentation
**Project:** Enterprise B2B Supply Chain Platform

<div style="page-break-after: always;"></div>

## 1. Introduction
This document details the RESTful APIs exposed by the Backend-For-Frontend (BFF) API Gateway for the Enterprise B2B Supply Chain Platform. 

### Base URL
All endpoints are relative to the API Gateway domain:
`https://api.enterprise-b2b.com/v1`

### Content Type
All requests and responses use `application/json` unless otherwise specified.

---

## 2. Authentication & Authorization
All endpoints (except login/registration) require a valid JWT Access Token passed in the Authorization header.

**Header Format:**
`Authorization: Bearer <your_jwt_token>`

Roles Supported: `Dealer`, `Admin`, `SuperAdmin`, `DeliveryAgent`.

---

<div style="page-break-after: always;"></div>

## 3. Identity Service APIs

### 3.1 Authenticate User
Generates a JWT Access Token and Refresh Token for valid credentials.

- **Endpoint:** `POST /api/identity/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "dealer@example.com",
    "password": "securepassword123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "accessToken": "eyJhb...",
    "refreshToken": "d7a8f...",
    "expiresIn": 3600
  }
  ```
- **Error (401 Unauthorized):** Invalid credentials.

### 3.2 Register Dealer
Submits a new dealer application. Requires Admin approval before login.

- **Endpoint:** `POST /api/identity/auth/register-dealer`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "newdealer@example.com",
    "password": "securepassword123",
    "businessName": "ABC Corp",
    "gstin": "22AAAAA0000A1Z5"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "userId": "uuid",
    "status": "Pending"
  }
  ```

### 3.3 Approve Dealer
- **Endpoint:** `PUT /api/identity/admin-dealer/{userId}/approve`
- **Access:** `Admin`, `SuperAdmin`
- **Response:** `204 No Content`

### 3.4 Soft Delete User
- **Endpoint:** `DELETE /api/identity/users/{userId}`
- **Access:** `SuperAdmin`
- **Response:** `204 No Content`

---

<div style="page-break-after: always;"></div>

## 4. Catalog Service APIs

### 4.1 Get Product Catalog
Fetches paginated list of active products. Highly cached.

- **Endpoint:** `GET /api/catalog/products`
- **Access:** `Dealer`, `Admin`
- **Query Parameters:** `?pageIndex=1&pageSize=50&categoryId=uuid`
- **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "productId": "uuid",
        "sku": "FMCG-001",
        "name": "Product Name",
        "price": 100.50,
        "availableStock": 500
      }
    ],
    "totalCount": 1500
  }
  ```

### 4.2 Create Product
- **Endpoint:** `POST /api/catalog/products`
- **Access:** `Admin`
- **Request Body:**
  ```json
  {
    "sku": "FMCG-002",
    "name": "New Product",
    "price": 150.00,
    "stockCount": 1000,
    "categoryId": "uuid"
  }
  ```
- **Response:** `201 Created`

---

<div style="page-break-after: always;"></div>

## 5. Order Service APIs

### 5.1 Place B2B Order
Submits a new order, triggering the Saga to reserve inventory and credit.

- **Endpoint:** `POST /api/orders`
- **Access:** `Dealer`
- **Request Body:**
  ```json
  {
    "paymentMethod": "CreditAccount", 
    "items": [
      {
        "productId": "uuid",
        "quantity": 50
      }
    ]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "orderId": "uuid",
    "status": "Pending",
    "totalAmount": 5025.00
  }
  ```
- **Error (422 Unprocessable Entity):** Insufficient Inventory or Credit.

### 5.2 Get Dealer Orders
- **Endpoint:** `GET /api/orders/my-orders`
- **Access:** `Dealer`
- **Response (200 OK):** Array of Order objects.

### 5.3 Raise Order Return
- **Endpoint:** `POST /api/orders/{orderId}/return`
- **Access:** `Dealer`
- **Request Body:**
  ```json
  {
    "reason": "Items damaged during transit"
  }
  ```
- **Response:** `200 OK` (Order status changes to `ReturnRequested`)
- **Error (409 Conflict):** Order is not in `Delivered` state.

---

<div style="page-break-after: always;"></div>

## 6. Payment Service APIs

### 6.1 Create Razorpay Order
Generates a Razorpay Order ID for digital payments.

- **Endpoint:** `POST /api/payment/razorpay/create-order`
- **Access:** `Dealer`
- **Request Body:**
  ```json
  {
    "internalOrderId": "uuid",
    "amount": 5025.00
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "razorpayOrderId": "order_Fds21..."
  }
  ```

### 6.2 Razorpay Webhook Callback
External endpoint called by Razorpay to confirm payment capture.

- **Endpoint:** `POST /api/payment/razorpay/webhook`
- **Access:** Public (Secured via Razorpay Signature Header)
- **Response:** `200 OK` (Asynchronously confirms order).

---

<div style="page-break-after: always;"></div>

## 7. Logistics Service APIs

### 7.1 Assign Delivery Agent
- **Endpoint:** `POST /api/logistics/shipments/{orderId}/assign`
- **Access:** `Admin`
- **Request Body:**
  ```json
  {
    "agentId": "uuid",
    "vehicleId": "uuid"
  }
  ```
- **Response:** `200 OK`

### 7.2 Update Shipment Status
Updates the real-time physical state of the shipment.

- **Endpoint:** `PUT /api/logistics/shipments/{shipmentId}/status`
- **Access:** `DeliveryAgent`
- **Request Body:**
  ```json
  {
    "status": "Delivered",
    "notes": "Left at warehouse dock"
  }
  ```
- **Response:** `200 OK`
- **Valid Statuses:** `ReadyForDispatch`, `InTransit`, `Delivered`, `FailedAttempt`.

---

<div style="page-break-after: always;"></div>

## 8. Standard Error Responses

The platform strictly adheres to the [RFC 7807 Problem Details for HTTP APIs](https://tools.ietf.org/html/rfc7807) standard.

**Example 400 Bad Request (Validation Error):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "traceId": "00-4b1...",
  "errors": {
    "Email": [
      "The Email field is required.",
      "The Email field is not a valid e-mail address."
    ],
    "Password": [
      "Password must be at least 8 characters long."
    ]
  }
}
```

**Example 422 Unprocessable Entity (Domain Logic Error):**
```json
{
  "type": "DomainException",
  "title": "Insufficient Stock",
  "status": 422,
  "detail": "Product FMCG-001 only has 20 units available.",
  "traceId": "00-8c2..."
}
```
