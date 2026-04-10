# Operational Runbook

## 1. Purpose

This runbook provides operational guidance for local execution, validation, troubleshooting, and incident triage.

---

## 2. Prerequisites

- .NET SDK 10
- Node.js + npm
- SQL Server / SQL Express
- Redis
- RabbitMQ

Optional:

- Visual Studio for multi-project launch
- Docker Desktop for infrastructure containers

---

## 3. Startup Procedure

## 3.1 Infrastructure

```powershell
cd "EnterpriseB2BSupplyChain Backend/EnterpriseB2BSupplyChain"
docker compose up -d
```

Expected:

- Redis available on `localhost:6379`
- RabbitMQ available on `localhost:5672`
- RabbitMQ management UI on `localhost:15672`

## 3.2 Backend

Recommended:

- run all API projects from Visual Studio launch profile

Build validation:

```powershell
dotnet build "EnterpriseB2BSupplyChain Backend/EnterpriseB2BSupplyChain/EnterpriseB2BSupplyChain.slnx" --configuration Release -v minimal
```

## 3.3 Frontend

```powershell
cd "EnterpriseB2BSupplyChain Frontend/hul-supply-portal"
npx ng serve
```

Production build validation:

```powershell
npx ng build --configuration production
```

---

## 4. Health and Smoke Checks

## 4.1 Service Health Endpoints

Verify each service:

- `GET http://localhost:5002/health`
- `GET http://localhost:5004/health`
- `GET http://localhost:5006/health`
- `GET http://localhost:5008/health`
- `GET http://localhost:5010/health`
- `GET http://localhost:5012/health`

## 4.2 Gateway Routing

- check gateway route access at `http://localhost:5000`
- validate key upstream paths are forwarded to downstream services

## 4.3 Authentication Flow

- login
- OTP verification
- protected endpoint access
- refresh token rotation flow

## 4.4 Core Domain Smoke Paths

- place order
- mark ready-for-dispatch
- assign shipment agent
- delivery status update
- invoice generation flow
- notification inbox/email trigger

---

## 5. Logging and Correlation

## 5.1 Log Locations

Logs are written under each service runtime root using date-partitioned folders.

## 5.2 Correlation

Header:

- `X-Correlation-ID`

Validation:

- send a request with custom correlation ID
- verify same ID appears in:
  - service logs
  - response header
  - event envelope metadata

---

## 6. Messaging Operations

## 6.1 RabbitMQ Queue Verification

Check:

- exchange exists (`supplychain.domain.events`)
- consumer queues are bound
- dead-letter queues are provisioned

## 6.2 Consumer Reliability Checks

- replay duplicate event payload
- verify dedupe via `ConsumedMessages`
- simulate repeated failures and confirm DLQ routing after max retries

---

## 7. Database Operations

## 7.1 Migration Strategy

- migrations are generated per service infrastructure project
- verify schema compatibility before runtime execution

## 7.2 Integrity Checks

Validate critical constraints/indexes:

- unique `DeliveryAgents.UserId`
- invoice index on `DealerId`
- default shipping address uniqueness strategy

---

## 8. Troubleshooting Guide

## 8.1 API Returns 401/403

Checks:

- token expiry
- role claims
- internal policy claims for service calls
- audience mismatch in JWT settings

## 8.2 Agent Assignment Fails

Checks:

- shipment status preconditions
- agent and vehicle availability states
- mapping integrity between Identity and Logistics users

## 8.3 Notification Not Triggered

Checks:

- outbox has published records
- queue bindings and routing keys
- consumer hosted service active
- email template availability for event type

## 8.4 Invoice Not Generated

Checks:

- `OrderDelivered` event published
- payment consumer health
- `ConsumedMessages` dedupe entry behavior
- invoice uniqueness keys and prior records

---

## 9. Recovery Procedures

## 9.1 Service Restart Sequence

1. restart infrastructure (Redis/RabbitMQ) if needed
2. restart backend services
3. restart frontend
4. rerun health checks

## 9.2 Queue Recovery

- inspect dead-letter queues
- analyze payload + error headers
- replay only after root-cause fix

## 9.3 Token and Session Recovery

- force logout in frontend
- clear local auth artifacts
- re-login and verify refresh lifecycle

---

## 10. Operational Guardrails

- avoid direct DB edits unless incident response requires them
- preserve event idempotency by respecting consumer dedupe
- use correlation IDs for all incident debugging trails
- run release build checks before declaring environment healthy

