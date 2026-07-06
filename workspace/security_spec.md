# Firestore Security Specification and Threat Model

This specification defines the strict security posture for the Construction Management Platform (MetroBuild) Firestore database.

## 1. Core Security Invariants

1. **Authenticated Access Only**: All read and write operations require a valid Firebase Auth UID.
2. **Project Relationship Enforcement**: Subcollections (stages, extra works, expenses, daily progress, doc cabinets, chat messages) are only accessible if the document resides in a parent project that the authenticated identity is authorized to access.
3. **Immutability Invariants**: Key fields such as `id`, `projectId`, `createdAt`, `originalValue` must remain immutable after creation.
4. **Action-Based Keys Lock**: Updating a stage can only modify dynamic stage status and received values, preventing arbitrary budget modifications.
5. **Role Integrity**: A client can never claim to be a contractor or alter critical financial fields (e.g. modifying expense logs or structural contract values). Only approved coordinators are authorized for Contractor roles.

---

## 2. The "Dirty Dozen" Threat Payloads (Invariants Checklist)

Below are twelve malicious payloads/queries designed to break state, bypass authentication, or corrupt financial values:

### Payload 1: Unauthorized Project Creation (Identity Spoofing)
An attacker attempts to self-create a project with an arbitrary code or inject they are the admin.
```json
{
  "id": "malicious_project",
  "name": "Free Mansion",
  "clientName": "Attacker",
  "email": "attacker@gmail.com",
  "clientCode": "CLIENT-FREE",
  "contractValue": 0,
  "isLocked": false,
  "status": "Active"
}
```

### Payload 2: Ghost Field Update (Vulnerability Guard)
An attacker attempts to inject a `ghostField` inside a project document update to check for loose validation.
```json
{
  "name": "Green Villa Renovated",
  "ghostField": "malicious_payload_injected"
}
```

### Payload 3: Budget Overwriting (Privilege Escalation)
A client hacker attempts to update the `contractValue` of their active project to 0 after sign-off.
```json
{
  "contractValue": 0
}
```

### Payload 4: Stage Price Adjustment (Financial Integrity)
A client attempts to alter the `payableAmount` on an active project stage milestone from $50,000 to $500.
```json
{
  "id": "stage_gv_4",
  "payableAmount": 500
}
```

### Payload 5: Unauthorized Extra Work Self-Approval
A contractor attempts to self-approve a pending pending variation or a client attempts to overwrite the amount of an extra work.
```json
{
  "approvalStatus": "Approved",
  "amount": 9000000
}
```

### Payload 6: Rogue Expense Creation
An unauthenticated or external client tries to inject fake machinery or labour expenses into the builder's logs.
```json
{
  "id": "fake_exp_99",
  "projectId": "proj_green_villa",
  "amount": 10000000,
  "category": "Material",
  "description": "Ghost materials delivered"
}
```

### Payload 7: Denial of Wallet (ID Poisoning Attack)
Attempting to create a document with a document ID exceeding the safe size limit (e.g. 1.5KB string containing junk data).
```text
DocID: "a".repeat(2000)
```

### Payload 8: Message Sender Impersonation
A client attempts to send a message claiming the sender is `'Contractor'` to bypass coordination.
```json
{
  "id": "msg_spoofed_1",
  "sender": "Contractor",
  "text": "The price has been fully reduced. Free of charge."
}
```

### Payload 9: Timestamp Sabotage
A client sends a progress log or chat message with a backdated or future timestamp payload.
```json
{
  "timestamp": "2030-12-31T23:59:59Z"
}
```

### Payload 10: Unauthorized Document deletion
A client tries to delete architectural agreements or BOQs from the document center without authorization.
```text
DELETE /projects/proj_green_villa/documents/doc_1
```

### Payload 11: Bulk Scrape Query (Query Trust Enforcer)
Attacker tries to scan the entire global subcollections (e.g., billing details, private phone numbers) across all projects.
```text
CollectionGroup query: /stages
```

### Payload 12: Stage Locking Overwrite
After a project's first stage is locked, trying to forcefully toggle `isLocked: false` without completing standard workflow gates.
```json
{
  "isLocked": false
}
```

---

## 3. Test Assertions
All Twelve "Dirty Dozen" scenarios must yield standard Firebase Firestore API `PERMISSION_DENIED` errors.
