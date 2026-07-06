# Lifehut Workspace

A modern, highly polished, zero-trust Construction & Project Management Platform engineered for Contractors and Clients. Built with React, Vite, Tailwind CSS, and Firebase.

## 🔐 Zero-Trust Security Architecture

To prevent unauthorized project enumeration and horizontal privilege escalation, this platform implements a comprehensive, server-enforced **Attribute-Based Access Control (ABAC)** framework using Firestore Security Rules.

### 1. Server-Side Role Enforcement
The previous cosmetic client-side role toggle is now fully governed and enforced by backend security rules:
*   **Contractors** must authenticate using Google Sign-In and register their project membership. They are verified against the immutable `contractorUid` field matching their verified auth identity on create and updates.
*   **Clients** can connect securely using a unique client code. When verified, their anonymous (or authenticated) UID is appended to the project's server-side `memberUids` array, and a registered record is generated in the project's subcollection.

### 2. Secure Project Scoping & Listing
*   **No Unscoped Listing**: Querying all projects is forbidden. The `/projects` list is gated by a strict `where('memberUids', 'array-contains', uid)` constraint. The server rejects any query that tries to scrape or list all projects.
*   **Subcollection Protection**: All project subcollections (payment stages, daily progress, extra works, documents, chat messages, etc.) enforce parent project membership. Synchronous `get()` primitives are used to verify that the requesting user's UID is in the parent project's `memberUids` before allowing read or write operations.

### 3. Tight Update and Mutation Controls
*   **Immutable Financial Integrity**: Project contracts are immutable once created. Contractors cannot modify crucial fields without full verification.
*   **No Blind Updates**: Subcollection updates use strict `.affectedKeys().hasOnly(...)` constraints instead of loose `hasAny` matchers. This stops malicious actors from injecting unexpected or protected properties.

---

## 🚀 Setup & Local Development

### 1. Firebase Provisioning
Before running the application, make sure Firebase has been set up for your preview environment or production:
1. Initialize Firebase services and databases by running the `set_up_firebase` flow.
2. Ensure you have `firebase-applet-config.json` populated at the project root.

### 2. Deploying Security Rules
Deploy the zero-trust `firestore.rules` to secure the cloud database immediately:
```bash
# Using Firebase CLI
firebase deploy --only firestore:rules
```

### 3. Running the App locally
To boot the modern Vite development server:
```bash
# Install packages
npm install

# Start local server
npm run dev
```

---

## 📊 Standardized Calculations

The payment statement calculations have been fully aligned:
*   **Total Balance**: Computed as `payableAmount - receivedAmount` across both live interactive table rows, aggregate sums, and generated print/PDF document outputs.
*   The previous loose evaluation shortcuts (`isPaid ? 0 : payableAmount`) have been deleted to avoid math mismatches between paid stages and partially received accounts.
