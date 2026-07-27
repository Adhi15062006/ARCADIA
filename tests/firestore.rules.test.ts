import fs from 'fs';
import path from 'path';
import test, { describe } from 'node:test';
import assert from 'node:assert';

/**
 * Firestore Security Rules Assertion Test Suite
 * Validates security spec invariants and the "Dirty Dozen" malicious payload mitigations.
 */

describe('Arcadia Security Specification & Firestore Rules Integrity', () => {
  const rulesPath = path.join(process.cwd(), 'firestore.rules');
  assert.strictEqual(fs.existsSync(rulesPath), true, 'firestore.rules file must exist');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  test('Rules file version 2 header check', () => {
    assert.strictEqual(rulesContent.includes("rules_version = '2';"), true, 'Must use rules_version = 2');
  });

  test('Payload 1: User privilege escalation prevention', () => {
    assert.strictEqual(rulesContent.includes("!incoming().keys().hasAny(['role', 'status', 'permissions'])"), true);
  });

  test('Payload 2: Immutable customerId enforcement on orders', () => {
    assert.strictEqual(rulesContent.includes("!incoming().diff(resource.data).affectedKeys().hasAny(['customerId'"), true);
  });

  test('Payload 3: Non-negative price and subtotal rules', () => {
    assert.strictEqual(rulesContent.includes("incoming().price >= 0"), true);
    assert.strictEqual(rulesContent.includes("incoming().total >= 0"), true);
  });

  test('Payload 5: Buffer exhaustion mitigation on contact messages', () => {
    assert.strictEqual(rulesContent.includes("incoming().message.size() < 10000"), true);
  });

  test('Payload 11: Immutability of activity audit logs', () => {
    assert.strictEqual(rulesContent.includes("match /activityLogs/{logId}"), true);
    assert.strictEqual(rulesContent.includes("allow update, delete: if false;"), true);
  });

  test('Identity Isolation: No insecure read bypass on private collections', () => {
    // Ensure no fallback '|| true' on read rules for orders, projects, payments, refunds, bookings
    assert.strictEqual(/match \/orders\/\{orderId\}[\s\S]*?allow read:[\s\S]*?\|\| true;/.test(rulesContent), false);
    assert.strictEqual(/match \/payments\/\{paymentId\}[\s\S]*?allow read:[\s\S]*?\|\| true;/.test(rulesContent), false);
    assert.strictEqual(/match \/projects\/\{projectId\}[\s\S]*?allow read:[\s\S]*?\|\| true;/.test(rulesContent), false);
  });
});
