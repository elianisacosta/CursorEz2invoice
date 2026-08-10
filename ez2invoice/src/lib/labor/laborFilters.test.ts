import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LABOR_CATEGORY_ALL,
  averageHourlyLaborRate,
  laborItemMatchesCategory,
  laborItemMatchesQuery,
  laborItemMatchesRateType,
} from './laborFilters.ts';

describe('laborItemMatchesQuery', () => {
  it('matches service name, category, and description', () => {
    assert.equal(
      laborItemMatchesQuery(
        { service_name: 'Mud Flap Bracket', category: 'Mud Flap Labor', description: null },
        'bracket'
      ),
      true
    );
    assert.equal(
      laborItemMatchesQuery(
        { service_name: 'Install', category: 'Door Labor', description: 'hinge bracket kit' },
        'bracket'
      ),
      true
    );
    assert.equal(
      laborItemMatchesQuery(
        { service_name: 'Oil Change', category: 'General', description: 'standard service' },
        'bracket'
      ),
      false
    );
  });
});

describe('laborItemMatchesCategory', () => {
  it('treats All Categories as no filter', () => {
    assert.equal(laborItemMatchesCategory({ category: 'Door Labor' }, LABOR_CATEGORY_ALL), true);
    assert.equal(laborItemMatchesCategory({ category: 'Door Labor' }, 'Door Labor'), true);
    assert.equal(laborItemMatchesCategory({ category: null }, 'General'), true);
    assert.equal(laborItemMatchesCategory({ category: 'Door Labor' }, 'Valve Labor'), false);
  });
});

describe('laborItemMatchesRateType', () => {
  it('filters fixed and hourly rates', () => {
    assert.equal(laborItemMatchesRateType({ rate_type: 'fixed' }, 'all'), true);
    assert.equal(laborItemMatchesRateType({ rate_type: 'fixed' }, 'fixed'), true);
    assert.equal(laborItemMatchesRateType({ rate_type: 'hourly' }, 'fixed'), false);
    assert.equal(laborItemMatchesRateType({ rate_type: 'hourly' }, 'hourly'), true);
  });
});

describe('averageHourlyLaborRate', () => {
  it('averages only hourly items', () => {
    assert.equal(
      averageHourlyLaborRate([
        { rate_type: 'fixed', rate: 100 },
        { rate_type: 'hourly', rate: 80 },
        { rate_type: 'hourly', rate: 120 },
      ]),
      100
    );
    assert.equal(averageHourlyLaborRate([{ rate_type: 'fixed', rate: 50 }]), 0);
  });
});
