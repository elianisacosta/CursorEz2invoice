import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeInvoiceItemDropdownPosition,
  getInvoiceItemDropdownStyle,
} from './invoiceItemDropdownPosition.ts';

describe('computeInvoiceItemDropdownPosition', () => {
  it('anchors dropdown below the input using viewport coordinates', () => {
    const anchor = {
      getBoundingClientRect: () => ({
        top: 200,
        bottom: 232,
        left: 48,
        right: 308,
        width: 260,
        height: 32,
        x: 48,
        y: 200,
        toJSON: () => ({}),
      }),
    } as HTMLElement;

    const position = computeInvoiceItemDropdownPosition(anchor, 'line-1', {
      viewport: { width: 820, height: 812 },
    });
    assert.ok(position);
    assert.equal(position?.lineKey, 'line-1');
    assert.equal(position?.left, 48);
    assert.equal(position?.top, 236);
    assert.equal(position?.width, 260);
    assert.equal(position?.openAbove, false);
  });

  it('aligns dropdown width with the input on narrow viewports', () => {
    const anchor = {
      getBoundingClientRect: () => ({
        top: 120,
        bottom: 152,
        left: 24,
        right: 224,
        width: 200,
        height: 32,
        x: 24,
        y: 120,
        toJSON: () => ({}),
      }),
    } as HTMLElement;

    const position = computeInvoiceItemDropdownPosition(anchor, 'line-2', {
      minWidth: 260,
      viewport: { width: 390, height: 844 },
    });
    assert.ok(position);
    assert.equal(position?.left, 24);
    assert.equal(position?.width, 260);
  });

  it('opens above when there is not enough room below but room above', () => {
    const anchor = {
      getBoundingClientRect: () => ({
        top: 700,
        bottom: 732,
        left: 48,
        right: 308,
        width: 260,
        height: 32,
        x: 48,
        y: 700,
        toJSON: () => ({}),
      }),
    } as HTMLElement;

    const position = computeInvoiceItemDropdownPosition(anchor, 'line-3', {
      viewport: { width: 820, height: 800 },
    });
    assert.ok(position);
    assert.equal(position?.openAbove, true);
    assert.equal(position?.top, 696);
  });

  it('opens above the input with top anchored to the input edge', () => {
    const anchor = {
      getBoundingClientRect: () => ({
        top: 100,
        bottom: 132,
        left: 48,
        right: 308,
        width: 260,
        height: 32,
        x: 48,
        y: 100,
        toJSON: () => ({}),
      }),
    } as HTMLElement;

    const position = computeInvoiceItemDropdownPosition(anchor, 'line-4', {
      viewport: { width: 820, height: 200 },
      minDropdownHeight: 80,
    });
    assert.ok(position);
    assert.equal(position?.openAbove, true);
    assert.equal(position?.top, 96);
  });
});

describe('getInvoiceItemDropdownStyle', () => {
  it('uses translateY(-100%) when opening above the input', () => {
    const style = getInvoiceItemDropdownStyle({
      lineKey: 'line-4',
      left: 48,
      top: 36,
      width: 260,
      maxHeight: 120,
      openAbove: true,
    });
    assert.equal(style.transform, 'translateY(-100%)');
  });
});
