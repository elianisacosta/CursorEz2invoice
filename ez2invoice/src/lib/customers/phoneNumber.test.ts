import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPhoneInputValue,
  formatPhoneInputWithCursor,
  formatUsPhoneDisplay,
  normalizePhoneForLookup,
  serializePhoneForStorage,
} from './phoneNumber.ts';
import { customerMatchesQuery } from './searchCustomers.ts';

describe('formatUsPhoneDisplay', () => {
  it('formats 10-digit US numbers', () => {
    assert.equal(formatUsPhoneDisplay('4709250071'), '(470) 925-0071');
    assert.equal(formatUsPhoneDisplay('5027673961'), '(502) 767-3961');
    assert.equal(formatUsPhoneDisplay('2398515893'), '(239) 851-5893');
  });

  it('formats 11-digit US numbers with country code', () => {
    assert.equal(formatUsPhoneDisplay('15027673961'), '+1 (502) 767-3961');
  });

  it('preserves unusual values', () => {
    assert.equal(formatUsPhoneDisplay('+44 20 7946 0958'), '+44 20 7946 0958');
    assert.equal(formatUsPhoneDisplay('12345'), '12345');
  });
});

describe('formatPhoneInputValue', () => {
  it('formats progressively while typing', () => {
    assert.equal(formatPhoneInputValue('5'), '(5');
    assert.equal(formatPhoneInputValue('502'), '(502');
    assert.equal(formatPhoneInputValue('5027'), '(502) 7');
    assert.equal(formatPhoneInputValue('5027673961'), '(502) 767-3961');
    assert.equal(formatPhoneInputValue('15027673961'), '+1 (502) 767-3961');
  });
});

describe('formatPhoneInputWithCursor', () => {
  it('keeps the cursor after the same number of digits when backspacing', () => {
    const current = '(502) 767-3961';
    const { formatted, cursor } = formatPhoneInputWithCursor(
      current.slice(0, current.length - 1),
      current.length - 1
    );
    assert.equal(formatted, '(502) 767-396');
    assert.ok(cursor >= 0 && cursor <= formatted.length);
  });

  it('supports pasting a digit-only number', () => {
    const { formatted } = formatPhoneInputWithCursor('5027673961', 10);
    assert.equal(formatted, '(502) 767-3961');
  });
});

describe('normalizePhoneForLookup', () => {
  it('matches formatted and raw phone values', () => {
    assert.equal(normalizePhoneForLookup('(502) 767-3961'), '5027673961');
    assert.equal(normalizePhoneForLookup('5027673961'), '5027673961');
    assert.equal(normalizePhoneForLookup('15027673961'), '5027673961');
  });
});

describe('serializePhoneForStorage', () => {
  it('stores US numbers as digits without changing search behavior', () => {
    assert.equal(serializePhoneForStorage('(502) 767-3961'), '5027673961');
    assert.equal(serializePhoneForStorage('15027673961'), '15027673961');
  });
});

describe('customer phone search compatibility', () => {
  it('finds the same customer by digits or formatted phone', () => {
    const customer = {
      first_name: 'Test',
      last_name: 'User',
      phone: '5027673961',
    };
    assert.equal(customerMatchesQuery(customer, '5027673961'), true);
    assert.equal(customerMatchesQuery(customer, '(502) 767-3961'), true);
  });
});
