# Enterprise-B2B-Supply-Chain-Platform - All Diagrams (A4 Friendly)

This version is simplified for PDF export:

- Short labels
- Lower node density
- One diagram block per section
- Page-break marker after each section

---

## 1) ER Diagram (Simplified)

### 1.1 Core Business Tables

```mermaid
erDiagram
        USERS {
            guid UserId PK
            string Email
            string Role
        }
        DEALER_PROFILES {
            guid DealerProfileId PK
            guid UserId FK
            string BusinessName
        }
        PRODUCTS {
            guid ProductId PK
            guid CategoryId FK
            string SKU
        }
        CATEGORIES {
            guid CategoryId PK
            guid ParentCategoryId FK
            string Name
        }
        ORDERS {
            guid OrderId PK
            guid DealerId
            string Status
        }
        ORDER_LINES {
            guid OrderLineId PK
            guid OrderId FK
            guid ProductId
        }
        SHIPMENTS {
            guid ShipmentId PK
            guid OrderId
            string Status
        }
        TRACKING_EVENTS {
            guid EventId PK
            guid ShipmentId FK
            string Status
        }
        INVOICES {
            guid InvoiceId PK
            guid OrderId
            guid DealerId
        }
        INVOICE_LINES {
            guid LineId PK
            guid InvoiceId FK
            decimal LineTotal
        }

        USERS ||--|| DEALER_PROFILES : has
        CATEGORIES ||--o{ CATEGORIES : parent_of
        CATEGORIES ||--o{ PRODUCTS : groups
        ORDERS ||--o{ ORDER_LINES : contains
        SHIPMENTS ||--o{ TRACKING_EVENTS : timeline
        INVOICES ||--o{ INVOICE_LINES : contains
        ORDERS ||--o| SHIPMENTS : logical_OrderId
        ORDERS ||--o| INVOICES : logical_OrderId
```

### 1.2 Integration and Support Tables

```mermaid
erDiagram
        OUTBOX_MESSAGES {
            guid MessageId PK
            string EventType
            string Status
        }
        LOGISTICS_CONSUMED_MESSAGES {
            guid MessageLogId PK
            string MessageId
            string Consumer
        }
        PAYMENT_CONSUMED_MESSAGES {
            guid MessageLogId PK
            string MessageId
            string Consumer
        }
        NOTIFICATION_CONSUMED_MESSAGES {
            guid MessageLogId PK
            string MessageId
            string Consumer
        }
        NOTIFICATION_LOGS {
            guid LogId PK
            string EventType
            string Status
        }
        NOTIFICATION_INBOX {
            guid NotificationId PK
            guid DealerId
            bool IsRead
        }

        OUTBOX_MESSAGES ||..o{ LOGISTICS_CONSUMED_MESSAGES : event_flow
        OUTBOX_MESSAGES ||..o{ PAYMENT_CONSUMED_MESSAGES : event_flow
        OUTBOX_MESSAGES ||..o{ NOTIFICATION_CONSUMED_MESSAGES : event_flow
        NOTIFICATION_LOGS ||--o{ NOTIFICATION_INBOX : user_notice
```

<!-- pagebreak -->

---

## 2) Component Diagram

```mermaid
flowchart LR
        FE[Frontend] --> GW[Gateway\nOcelot]

        GW --> ID[Identity]
        GW --> CAT[Catalog]
        GW --> ORD[Order]
        GW --> LOG[Logistics]
        GW --> PAY[Payment]
        GW --> NOTIF[Notification]

        ORD --> ID
        ORD --> CAT
        ORD --> PAY
        LOG --> ORD
        LOG --> ID
        PAY --> ORD

        MQ[(RabbitMQ)]
        RED[(Redis)]
        SQL[(SQL Server)]

        ORD --> MQ
        CAT --> MQ
        LOG --> MQ
        PAY --> MQ
        NOTIF --> MQ

        ID --> RED
        CAT --> RED
        LOG --> RED

        ID --> SQL
        CAT --> SQL
        ORD --> SQL
        LOG --> SQL
        PAY --> SQL
        NOTIF --> SQL

        N[Note: Event bus via RabbitMQ\nOutbox is used in Order service]
        N -.-> MQ
```

<!-- pagebreak -->

---

## 3) Use Case - Super Admin

```mermaid
flowchart LR
        SA[Super Admin] --> A1((Create Admin))
        SA --> A2((View Admins))
        SA --> A3((Approve or Reject Dealer))
        SA --> A4((Suspend or Reactivate Dealer))
        SA --> A5((Manage Products))
        SA --> A6((Manage Categories))
```

<!-- pagebreak -->

---

## 4) Use Case - Dealer

```mermaid
flowchart LR
        D[Dealer] --> D1((Register and Verify OTP))
        D --> D2((Login and Refresh))
        D --> D3((Browse Catalog))
        D --> D4((Favorite and Notify Me))
        D --> D5((Place Order))
        D --> D6((Track Order))
        D --> D7((Raise Return))
```

<!-- pagebreak -->

---

## 5) Use Case - Delivery Agent

```mermaid
flowchart LR
        AG[Delivery Agent] --> G1((View Assigned Shipments))
        AG --> G2((Pickup Shipment))
        AG --> G3((Update Transit Status))
        AG --> G4((Mark Delivered))
        AG --> G5((View Profile))
```

<!-- pagebreak -->

---

## 6) Sequence - Order Placement

```mermaid
sequenceDiagram
        participant Dealer
        participant API as Orders API
        participant H as PlaceOrderHandler
        participant ID as Identity
        participant PAY as Payment
        participant CAT as Catalog
        participant DB as Order DB
        participant OB as Outbox Poller
        participant MQ as RabbitMQ

        Dealer->>API: Place order
        API->>H: MediatR command
        H->>ID: Resolve shipping address
        H->>PAY: Check credit

        alt Approved
                H->>CAT: Commit inventory
                H->>PAY: Reserve limit
                H->>DB: Save Order
                H->>DB: Save Outbox(OrderPlaced)
        else On hold
                H->>DB: Save Order(OnHold)
                H->>DB: Save Outbox(AdminApprovalRequired)
        end

        OB->>DB: Read pending outbox
        OB->>MQ: Publish event
```

<!-- pagebreak -->

---

## 7) Sequence - Logistics Assignment

```mermaid
sequenceDiagram
        participant Admin
        participant ORD as Order Service
        participant OB as Outbox Poller
        participant MQ as RabbitMQ
        participant C as Logistics Consumer
        participant H as CreateShipmentHandler
        participant LDB as Logistics DB

        Admin->>ORD: Mark ReadyForDispatch
        ORD->>OB: Outbox row created
        OB->>MQ: Publish order.readyfordispatch

        MQ->>C: Consume event
        C->>LDB: Check idempotency table
        C->>H: CreateShipment command
        H->>LDB: Upsert shipment
        C->>LDB: Save consumed message
```

<!-- pagebreak -->

---

## 8) Sequence - Delivery Completion

```mermaid
sequenceDiagram
        participant AG as Delivery Agent
        participant LOG as Logistics API
        participant UH as UpdateStatusHandler
        participant LDB as Logistics DB
        participant RED as Redis
        participant OI as Order Internal API
        participant ODB as Order DB
        participant OB as Outbox Poller
        participant MQ as RabbitMQ
        participant PC as Payment Consumer
        participant NC as Notification Consumer

        AG->>LOG: Update status to Delivered
        LOG->>UH: Command
        UH->>LDB: Update shipment + tracking
        UH->>RED: Update latest tracking cache
        UH->>OI: MarkDelivered
        OI->>ODB: Save Outbox(OrderDelivered)
        OB->>MQ: Publish order.delivered
        MQ->>PC: Generate invoice
        MQ->>NC: Send notifications
```

<!-- pagebreak -->

---

## 9) Class Diagram (Core + Application)

```mermaid
classDiagram
        class OrdersController
        class IMediator {
            <<interface>>
            +Send()
        }
        class PlaceOrderCommand
        class PlaceOrderHandler
        class IOrderRepository {
            <<interface>>
            +AddAsync()
            +SaveChangesAsync()
        }
        class IOutboxRepository {
            <<interface>>
            +AddAsync()
            +GetPendingAsync()
        }
        class Order
        class OrderLine
        class OrderStatusHistory
        class OutboxMessage
        class Shipment
        class TrackingEvent

        OrdersController --> IMediator
        IMediator --> PlaceOrderHandler
        PlaceOrderHandler --> IOrderRepository
        PlaceOrderHandler --> IOutboxRepository

        Order "1" *-- "many" OrderLine
        Order "1" *-- "many" OrderStatusHistory
        Shipment "1" *-- "many" TrackingEvent
```

<!-- pagebreak -->

---

## 10) State Diagram (Order + Consignment)

```mermaid
stateDiagram-v2
        [*] --> Placed
        Placed --> OnHold: limit exceeded
        Placed --> Processing: auto approve
        OnHold --> Processing: admin approve
        Processing --> ReadyForDispatch
        ReadyForDispatch --> InTransit
        InTransit --> Delivered
        Delivered --> ReturnRequested
        Delivered --> Closed
        Placed --> Cancelled
        OnHold --> Cancelled
        Processing --> Cancelled

        state ShipmentFlow {
            [*] --> Pending
            Pending --> AgentAssigned
            AgentAssigned --> PickedUp
            PickedUp --> InTransitShip
            InTransitShip --> OutForDelivery
            OutForDelivery --> DeliveredShip
            AgentAssigned --> VehicleBreakdown
            VehicleBreakdown --> InTransitShip
        }
```

<!-- pagebreak -->

---

## 11) Activity Diagram (Dealer Places Order)

```mermaid
flowchart TD
        A[Start Place Order] --> B[Fetch shipping address]
        B --> C[Check credit]
        C --> D{Approved?}

        D -->|No| E[Create OnHold order]
        E --> F[Write outbox: AdminApprovalRequired]
        F --> Z[Return response]

        D -->|Yes| G[Commit inventory]
        G --> H{Inventory ok?}
        H -->|No| X[Fail request]
        H -->|Yes| I[Reserve purchase limit]
        I --> J{Reserve ok?}
        J -->|No| K[Restore inventory]
        K --> X
        J -->|Yes| L[Save order + outbox OrderPlaced]
        L --> Z

        N[Note: Outbox later publishes to RabbitMQ]
        N -.-> L
```

<!-- pagebreak -->

---

## 12) Service Flow (RabbitMQ Event Map)

```mermaid
flowchart LR
        O[Order Outbox Poller] -->|order.readyfordispatch| MQ[(RabbitMQ)]
        O -->|order.delivered| MQ
        L1[Logistics AgentAssigned Publisher] -->|agent.assigned| MQ
        L2[Logistics Shipment Publisher] -->|shipment.status| MQ
        C[Catalog StockRestored Publisher] -->|catalog.stock.restored| MQ

        MQ --> LC[Logistics Ready Consumer]
        MQ --> PC[Payment Delivered Consumer]
        MQ --> NC[Notification Consumer]

        LC --> DLQ[(Dead Letter Exchange)]
        PC --> DLQ
        NC --> DLQ

        T[Note: Consumers use ConsumedMessages table for idempotency]
        T -.-> NC
```

<!-- pagebreak -->

---

## Notes

- Messaging: RabbitMQ topic exchange.
- Reliability: Order outbox + consumer dedupe + retry/DLQ.
- Cache: Redis is used for live tracking and selected caching paths.
