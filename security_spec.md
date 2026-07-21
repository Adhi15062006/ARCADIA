# Security Specification for Arcadia Web Development

## 1. Data Invariants
- **Identity Isolation**: A client can only read, create, or update documents where `clientId` or `customerId` or `userId` matches their authenticated UID.
- **Role-based Controls**: Access to system logs, settings, and full collection queries is reserved for Super Admin, Admin, Manager, and Employee roles.
- **Immutability of Key Fields**: Once created, historical transaction IDs, `createdAt` server timestamps, and `customerId` fields cannot be mutated.
- **Terminal State Lock**: Once an order is set to `Cancelled` or a payment is marked `Success` or `Failed`, its state can never be modified by non-admin accounts.
- **Volumetric Boundaries**: String fields like biography or name are strictly size-limited to prevent Denial-of-Wallet buffer exhaustion.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads attempt to exploit access gaps or update anomalies, and must be strictly blocked by our security rules:

### Payload 1: Privilege Escalation (Self-Assigned Admin Role)
- **Target Collection**: `/users/{uid}`
- **Attempt**: A guest or client attempts to register and set their role to `Super Admin`.
- **Malicious Payload**:
```json
{
  "id": "attacker_uid",
  "email": "attacker@evil.com",
  "name": "Attacker",
  "role": "Super Admin",
  "status": "Active"
}
```

### Payload 2: Ghost Update (Bypassing Immutable Field)
- **Target Collection**: `/orders/{orderId}`
- **Attempt**: A client attempts to change the `customerId` of an order to link it to another client's account.
- **Malicious Payload**:
```json
{
  "customerId": "another_victim_uid"
}
```

### Payload 3: Financial Poisoning (Injecting Negative Prices)
- **Target Collection**: `/orders/{orderId}`
- **Attempt**: A user attempts to place an order with a price of -$100.
- **Malicious Payload**:
```json
{
  "id": "order_xyz",
  "customerId": "attacker_uid",
  "price": -100.00,
  "paymentStatus": "Unpaid"
}
```

### Payload 4: State Shortcutting (Setting Order Directly to Paid)
- **Target Collection**: `/orders/{orderId}`
- **Attempt**: A client attempts to update their unpaid order status directly to `Paid` without completing a real transaction.
- **Malicious Payload**:
```json
{
  "paymentStatus": "Paid"
}
```

### Payload 5: Buffer Exhaustion (Denial-of-Wallet String Inject)
- **Target Collection**: `/contactMessages/{msgId}`
- **Attempt**: A user attempts to flood the contact form with a 10MB message to exhaust storage limits.
- **Malicious Payload**:
```json
{
  "name": "Spammer",
  "email": "spammer@evil.com",
  "message": "[10MB string content...]"
}
```

### Payload 6: Spoofing Authenticated Sender
- **Target Collection**: `/chatRooms/{roomId}/messages/{msgId}`
- **Attempt**: Authenticated user `attacker_uid` attempts to send a message claiming it was sent by user `victim_uid`.
- **Malicious Payload**:
```json
{
  "roomId": "room_123",
  "senderId": "victim_uid",
  "text": "Please transfer funds immediately."
}
```

### Payload 7: Accessing PII of Another User (Blanket Read)
- **Target Collection**: `/users`
- **Attempt**: An authenticated client attempts to execute a blanket query to list all other registered users' emails.
- **Action**: `list` query
- **Result**: `PERMISSION_DENIED`

### Payload 8: Immutable Milestone Forgery
- **Target Collection**: `/projects/{projectId}`
- **Attempt**: A client attempts to change the `sourceCodeLink` or milestones on an active developer project without authorization.
- **Malicious Payload**:
```json
{
  "sourceCodeLink": "https://github.com/attacker/malicious-repo"
}
```

### Payload 9: Forging Coupons
- **Target Collection**: `/coupons/{couponId}`
- **Attempt**: A client attempts to create a new promotional coupon code with 100% discount.
- **Malicious Payload**:
```json
{
  "code": "FREE100",
  "discountType": "Percentage",
  "value": 100,
  "status": "Active"
}
```

### Payload 10: Setting Fraudulent Refund Success
- **Target Collection**: `/payments/{paymentId}`
- **Attempt**: An authenticated user attempts to write a mock refund/payment record marked as `Success`.
- **Malicious Payload**:
```json
{
  "id": "pay_fake",
  "amount": 9999.00,
  "currency": "USD",
  "status": "Success",
  "transactionId": "tx_mock_123"
}
```

### Payload 11: Modifying Immutable Server Logs
- **Target Collection**: `/activityLogs/{logId}`
- **Attempt**: An attacker attempts to delete or alter a log entry that captured their IP address.
- **Action**: `update` or `delete` on `/activityLogs/{logId}`
- **Result**: `PERMISSION_DENIED`

### Payload 12: Injecting Unvalidated HTML or Scripts in FAQ
- **Target Collection**: `/faq/{faqId}`
- **Attempt**: A user attempts to write a cross-site scripting (XSS) payload into the website's FAQ collection.
- **Malicious Payload**:
```json
{
  "question": "<script>evil()</script>",
  "answer": "Exploited."
}
```

---

## 3. Test Runner Specification (`firestore.rules.test.ts`)
```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "industrious-cove-h5jvd",
    firestore: {
      rules: require("fs").readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Arcadia Firebase Backend Security Rules Test Suite", () => {
  test("Payload 1: Client cannot self-promote to Super Admin", async () => {
    const aliceDb = testEnv.authenticatedContext("alice_uid").firestore();
    await assertFails(
      setDoc(doc(aliceDb, "users", "alice_uid"), {
        id: "alice_uid",
        email: "alice@example.com",
        name: "Alice",
        role: "Super Admin",
        status: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    );
  });

  test("Payload 2: User cannot alter customerId on existing orders", async () => {
    const bobDb = testEnv.authenticatedContext("bob_uid").firestore();
    await assertFails(
      setDoc(doc(bobDb, "orders", "order_123"), {
        customerId: "victim_uid"
      }, { merge: true })
    );
  });

  test("Payload 3: Negative prices are strictly rejected", async () => {
    const bobDb = testEnv.authenticatedContext("bob_uid").firestore();
    await assertFails(
      setDoc(doc(bobDb, "orders", "order_abc"), {
        id: "order_abc",
        customerId: "bob_uid",
        price: -100,
        paymentStatus: "Unpaid"
      })
    );
  });
});
```
