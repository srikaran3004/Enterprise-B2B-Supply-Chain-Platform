# High-Level Design (HLD) Document
**Project:** Enterprise B2B Supply Chain Platform

<div style="page-break-after: always;"></div>

## 1. System Overview

### Architectural Summary
The Enterprise B2B Supply Chain Platform is built on a distributed, event-driven microservices architecture. It decouples high-traffic domains (Catalog and Ordering) from administrative domains (Identity, Logistics, Payments) to provide a resilient, scalable backend for Fast-Moving Consumer Goods (FMCG) ecosystems. The system utilizes an API Gateway as a Backend-For-Frontend (BFF) to funnel all client traffic, while inter-service communication is handled asynchronously via a message broker.

### Key Design Decisions & Trade-Offs
- **Eventual Consistency over Strong Consistency:** Opting for asynchronous event propagation improves performance and fault tolerance but introduces a slight delay in cross-service data synchronization.
- **Database per Service:** Ensuring true decoupling at the cost of complex distributed transactions (handled via Saga choreography).
- **Read/Write Segregation (CQRS):** Separating command execution from read queries adds architectural overhead but significantly boosts read-heavy performance (e.g., catalog browsing).

---

## 2. Architecture Style

**Architecture Style:** Event-Driven Microservices

**Justification based on System Requirements:**
- **High Throughput Needs:** The system must process massive bulk B2B orders without locking the entire database. Event-driven architectures absorb traffic spikes by queuing requests.
- **Independent Lifecycles:** Allows different development teams to build, deploy, and scale the `Logistics` service independently from the `Payment` service.
- **Resilience:** If the `Notification` service goes down, the `Order` service continues to function; notification events simply queue up until the service is restored.

---

## 3. Technology Stack

| Category | Technology |
|---|---|
| **Frontend** | Angular 17, TypeScript, SCSS |
| **Backend** | .NET 8 (C#), ASP.NET Core Web API |
| **Database** | SQL Server (Relational data) |
| **Messaging / APIs** | RabbitMQ (Event Broker), REST APIs |
| **Caching** | Redis (Distributed Cache) |
| **Infrastructure / Cloud** | Docker Containers, Kubernetes (K8s) |
| **DevOps Tools** | GitHub Actions (CI/CD), Serilog (Logging) |

<div style="page-break-after: always;"></div>

## 4. System Architecture Diagram

```mermaid
flowchart TD
    %% Clients
    Client_Web[Angular B2B Portal]
    Client_Mob[Delivery Agent Mobile]

    %% Gateway
    Gateway[API Gateway / Load Balancer]

    %% Message Broker
    Broker[[RabbitMQ Event Bus]]

    %% Microservices
    subgraph Microservices Layer
        ID_Service[Identity Service]
        Cat_Service[Catalog Service]
        Ord_Service[Order Service]
        Pay_Service[Payment Service]
        Log_Service[Logistics Service]
        Notif_Service[Notification Service]
    end

    %% Databases
    subgraph Data Layer
        DB_ID[(Identity DB)]
        DB_Cat[(Catalog DB)]
        DB_Ord[(Order DB)]
        DB_Pay[(Payment DB)]
        DB_Log[(Logistics DB)]
        Cache[(Redis Cache)]
    end

    %% External
    Ext_Pay([Razorpay API])
    Ext_Email([SMTP Service])

    %% Routing
    Client_Web --> Gateway
    Client_Mob --> Gateway
    Gateway --> ID_Service & Cat_Service & Ord_Service & Pay_Service & Log_Service

    %% DB Connections
    ID_Service --> DB_ID
    Cat_Service --> DB_Cat & Cache
    Ord_Service --> DB_Ord
    Pay_Service --> DB_Pay
    Log_Service --> DB_Log

    %% Event Bus Connections
    ID_Service -.-> Broker
    Cat_Service -.-> Broker
    Ord_Service -.-> Broker
    Pay_Service -.-> Broker
    Log_Service -.-> Broker
    Broker -.-> Notif_Service
    
    %% External Integration
    Pay_Service --> Ext_Pay
    Notif_Service --> Ext_Email
```

<div style="page-break-after: always;"></div>

## 5. Component Diagram

```mermaid
flowchart LR
    subgraph API Gateway
        Routing[Path Routing]
        AuthZ[Token Validation]
    end

    subgraph Service Structure (Typical)
        API[API Endpoints]
        App[Application Layer / CQRS]
        Dom[Domain Entities]
        Infra[Infrastructure Layer]
    end

    Routing --> API
    AuthZ --> API
    
    API --> App
    App --> Dom
    App --> Infra
    
    Infra --> DB[(Local Database)]
    Infra --> Bus[[Event Bus Integration]]
```

---

<div style="page-break-after: always;"></div>

## 6. Deployment Diagram

```mermaid
flowchart TD
    Internet((Internet)) --> WAF[Cloud WAF]
    WAF --> LB[External Load Balancer]
    
    subgraph Kubernetes Cluster
        Ingress[Ingress Controller]
        
        subgraph Frontend Nodes
            UI_Pods[Angular UI Pods]
        end
        
        subgraph Backend Nodes
            API_GW[API Gateway Pods]
            SVC_Pods[Microservice Pods]
        end
    end
    
    LB --> Ingress
    Ingress --> UI_Pods
    Ingress --> API_GW
    API_GW --> SVC_Pods
    
    subgraph Private Cloud / Managed Services
        SQL[(Managed SQL Server Instances)]
        Redis[(Managed Redis Cluster)]
        MQ[[Managed RabbitMQ Broker]]
    end
    
    SVC_Pods --> SQL
    SVC_Pods --> Redis
    SVC_Pods -.-> MQ
```

---

<div style="page-break-after: always;"></div>

## 7. Service Flow Diagrams

### API Request Lifecycle (Write Operation)

```mermaid
flowchart TD
    Start((Client Request)) --> GW[API Gateway Validates JWT]
    GW --> API[Microservice Controller]
    API --> CQRS[CQRS Command Dispatcher]
    CQRS --> Trans[Begin Database Transaction]
    Trans --> Save[Persist Domain Entity]
    Save --> Pub[Publish Domain Event to Broker]
    Pub --> Commit[Commit Transaction]
    Commit --> Res((Return HTTP 200/201))
```

### Authentication Flow

```mermaid
flowchart TD
    Req((Login Request)) --> GW[API Gateway]
    GW --> ID[Identity Service]
    ID --> DB[(Identity DB)]
    DB --> Val[Validate Hash & Role]
    
    Val -- Success --> JWT[Generate Access & Refresh Tokens]
    JWT --> Ret((Return Tokens to Client))
    
    Val -- Failure --> Fail((Return HTTP 401 Unauthorized))
```

### Data Processing Pipeline (Asynchronous Fulfillment)

```mermaid
flowchart TD
    Trigger((Order Created Event)) --> MQ[[RabbitMQ]]
    
    MQ --> Consume1[Catalog Service Consumes]
    Consume1 --> Exec1[Reserve Inventory]
    
    MQ --> Consume2[Payment Service Consumes]
    Consume2 --> Exec2[Deduct B2B Credit Limit]
    
    Exec1 --> OK{Both Succeed?}
    Exec2 --> OK
    
    OK -- Yes --> PubOK[Publish OrderConfirmed Event]
    OK -- No --> PubFail[Publish Compensation Event]
    
    PubOK --> End((Order Shipped))
    PubFail --> Rev[Revert Locks & Cancel Order]
```

---

<div style="page-break-after: always;"></div>

## 8. Data Architecture Overview

```mermaid
erDiagram
    %% Core Entities Only, No Field Details
    
    USER ||--o| DEALER_PROFILE : "1:1 mapping"
    DEALER_PROFILE ||--o{ ORDER : "places"
    ORDER ||--|{ ORDER_ITEM : "contains"
    PRODUCT ||--o{ ORDER_ITEM : "referenced by"
    DEALER_PROFILE ||--o| CREDIT_ACCOUNT : "holds"
    ORDER ||--o{ SHIPMENT : "fulfilled by"

    USER { }
    DEALER_PROFILE { }
    ORDER { }
    ORDER_ITEM { }
    PRODUCT { }
    CREDIT_ACCOUNT { }
    SHIPMENT { }
```

---

## 9. Design Patterns (Architectural Level)

- **Microservices Architecture:** Decomposes the application into loosely coupled, independently deployable services organized around business capabilities.
- **CQRS (Command Query Responsibility Segregation):** Used in the application layer via MediatR to strictly separate state-mutating commands from data-fetching queries, optimizing performance and code readability.
- **Event-Driven Choreography (Saga):** Utilized for distributed transactions. Instead of a central orchestrator controlling order fulfillment, services react to RabbitMQ events to execute local transactions (e.g., locking inventory).
- **Layered Architecture (Clean Architecture):** Inside each microservice, dependencies point inward. Domain entities have no knowledge of infrastructure (Entity Framework or REST APIs).

---

## 10. Scalability & Performance Design

- **Horizontal Scaling:** The stateless microservices (deployed via Docker/Kubernetes) are designed to scale horizontally by adding more pods/containers dynamically during high load.
- **Vertical Scaling:** The relational SQL Server databases scale vertically with increased compute resources to handle complex write loads.
- **Caching Strategies:** A distributed Redis cache is placed in front of the Catalog service. Because catalog queries represent the bulk of platform read traffic, caching drastically reduces database I/O.
- **Load Handling:** The API Gateway uses Round-Robin load balancing to distribute incoming traffic evenly across healthy microservice instances.

---

## 11. Security Architecture

- **Authentication Mechanism:** The platform utilizes stateless JSON Web Tokens (JWT) issued by the Identity service. Tokens are short-lived, with secure refresh token rotation.
- **Authorization Model:** Role-Based Access Control (RBAC). Claims encoded in the JWT (e.g., `Role: Admin`, `Role: Dealer`) are inspected at the API Gateway and Service Controller levels to permit or deny execution.
- **Data Protection:** All external traffic is encrypted via HTTPS (TLS 1.2+). At the database layer, sensitive columns and passwords are mathematically hashed, and Transparent Data Encryption (TDE) is applied to data at rest.

---

## 12. Fault Tolerance & Reliability

- **Retry Strategies:** The system employs Polly-based exponential backoff and jittered retry policies for transient database errors (e.g., `DbUpdateConcurrencyException` during simultaneous inventory locks).
- **Failover Handling:** The API Gateway utilizes health checks. If a microservice pod fails, traffic is immediately routed to healthy pods. Kubernetes automatically restarts failing containers.
- **Observability Overview:** Structured logging is implemented via Serilog. Error traces and domain event logs are aggregated into centralized logging dashboards, enabling operators to trace a user request entirely through the distributed microservice cluster.
