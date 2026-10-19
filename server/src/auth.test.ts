import { test, describe } from 'node:test';
import assert from 'node:assert';
import { AuthService } from './services/auth.service';
import { SignUpSchema, LoginSchema, TransactionSchema } from '@spendwise/shared';

describe('SpendWise Authentication & Security Unit Tests', () => {
  test('Password hashing produces bcrypt hash and validates correctly', async () => {
    const rawPassword = 'SecretP@ssw0rd123!';
    const hash = await AuthService.hashPassword(rawPassword);

    assert.notStrictEqual(hash, rawPassword);
    assert.strictEqual(hash.startsWith('$2'), true);

    const matches = await AuthService.comparePassword(rawPassword, hash);
    assert.strictEqual(matches, true);

    const wrongMatches = await AuthService.comparePassword('WrongPassword!', hash);
    assert.strictEqual(wrongMatches, false);
  });

  test('JWT generation and verification works as expected', () => {
    const payload = { userId: 'user-uuid-123', email: 'test@spendwise.io' };
    const token = AuthService.generateToken(payload);

    assert.strictEqual(typeof token, 'string');
    assert.strictEqual(token.split('.').length, 3);

    const verified = AuthService.verifyToken(token);
    assert.ok(verified);
    assert.strictEqual(verified.userId, payload.userId);
    assert.strictEqual(verified.email, payload.email);

    const invalid = AuthService.verifyToken('invalid.token.string');
    assert.strictEqual(invalid, null);
  });

  test('SignUpSchema enforces password complexity and matching confirmPassword', () => {
    // Valid signup
    const valid = SignUpSchema.safeParse({
      email: 'alex@spendwise.io',
      password: 'StrongP@ssw0rd1',
      confirmPassword: 'StrongP@ssw0rd1'
    });
    assert.strictEqual(valid.success, true);

    // Mismatched passwords
    const mismatched = SignUpSchema.safeParse({
      email: 'alex@spendwise.io',
      password: 'StrongP@ssw0rd1',
      confirmPassword: 'DifferentP@ssw0rd2'
    });
    assert.strictEqual(mismatched.success, false);

    // Weak password
    const weak = SignUpSchema.safeParse({
      email: 'alex@spendwise.io',
      password: 'weak',
      confirmPassword: 'weak'
    });
    assert.strictEqual(weak.success, false);
  });

  test('TransactionSchema validates minor units and positive amounts', () => {
    const validTx = TransactionSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'expense',
      amount: 4550, // $45.50 in cents
      currency: 'USD',
      categoryId: 'cat-food',
      date: '2026-10-19',
      paymentMethod: 'Credit Card',
      createdAt: '2026-10-19T10:00:00Z',
      updatedAt: '2026-10-19T10:00:00Z'
    });
    assert.strictEqual(validTx.success, true);

    // Invalid negative amount
    const invalidTx = TransactionSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'expense',
      amount: -100,
      currency: 'USD',
      categoryId: 'cat-food',
      date: '2026-10-19',
      paymentMethod: 'Credit Card',
      createdAt: '2026-10-19T10:00:00Z',
      updatedAt: '2026-10-19T10:00:00Z'
    });
    assert.strictEqual(invalidTx.success, false);
  });
});
