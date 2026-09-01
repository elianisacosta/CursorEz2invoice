import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getLocationPopoverPosition,
  handleLocationBadgeClick,
  isElementVisibleForInteraction,
  shouldCloseOnOutsidePointer,
} from './invoiceLocationBadgeInteraction.ts';

describe('handleLocationBadgeClick', () => {
  it('invokes onOpen when the popover is closed', () => {
    let opened = false;
    handleLocationBadgeClick(false, {
      onOpen: () => {
        opened = true;
      },
      onClose: () => {
        throw new Error('onClose should not run');
      },
    });
    assert.equal(opened, true);
  });

  it('invokes onClose when the popover is already open', () => {
    let closed = false;
    handleLocationBadgeClick(true, {
      onOpen: () => {
        throw new Error('onOpen should not run');
      },
      onClose: () => {
        closed = true;
      },
    });
    assert.equal(closed, true);
  });
});

describe('shouldCloseOnOutsidePointer', () => {
  it('does not close when clicking inside the badge or popover', () => {
    const root = { contains: (node: unknown) => node === 'badge' } as HTMLElement;
    const popover = { contains: (node: unknown) => node === 'menu' } as HTMLElement;
    assert.equal(shouldCloseOnOutsidePointer(root, popover, 'badge', true), false);
    assert.equal(shouldCloseOnOutsidePointer(root, popover, 'menu', true), false);
  });

  it('closes when clicking outside an active visible badge', () => {
    const root = { contains: () => false } as HTMLElement;
    const popover = { contains: () => false } as HTMLElement;
    assert.equal(shouldCloseOnOutsidePointer(root, popover, 'elsewhere', true), true);
  });

  it('ignores outside clicks when interaction is inactive', () => {
    const root = { contains: () => false } as HTMLElement;
    const popover = { contains: () => false } as HTMLElement;
    assert.equal(shouldCloseOnOutsidePointer(root, popover, 'elsewhere', false), false);
  });
});

describe('isElementVisibleForInteraction', () => {
  it('returns false for null and hidden elements', () => {
    assert.equal(isElementVisibleForInteraction(null), false);
    assert.equal(
      isElementVisibleForInteraction({ offsetParent: null } as HTMLElement),
      false
    );
    assert.equal(
      isElementVisibleForInteraction({ offsetParent: {} } as HTMLElement),
      true
    );
  });
});

describe('getLocationPopoverPosition', () => {
  it('positions the popover below the badge', () => {
    const button = {
      getBoundingClientRect: () => ({
        top: 100,
        left: 200,
        bottom: 120,
        right: 260,
        width: 60,
        height: 20,
        x: 200,
        y: 100,
        toJSON: () => ({}),
      }),
    } as HTMLElement;
    assert.deepEqual(getLocationPopoverPosition(button), { top: 124, left: 200 });
  });
});
