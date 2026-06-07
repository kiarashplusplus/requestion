'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { getLocality, listLocalities, LOCALITIES } = require('../localities');

test('getLocality returns id + name + domains for a known locality', () => {
  const loc = getLocality('austin');
  assert.strictEqual(loc.id, 'austin');
  assert.strictEqual(loc.name, 'Austin, TX');
  assert.ok(Array.isArray(loc.domains) && loc.domains.length > 0);
});

test('getLocality returns null for unknown / missing ids', () => {
  assert.strictEqual(getLocality('atlantis'), null);
  assert.strictEqual(getLocality(undefined), null);
  assert.strictEqual(getLocality(''), null);
});

test('getLocality does not mutate the source entry', () => {
  getLocality('boston').id = 'tampered';
  assert.strictEqual(LOCALITIES.boston.id, undefined);
});

test('listLocalities returns {id, name} for every locality, no domains leaked', () => {
  const list = listLocalities();
  assert.strictEqual(list.length, Object.keys(LOCALITIES).length);
  for (const entry of list) {
    assert.deepStrictEqual(Object.keys(entry).sort(), ['id', 'name']);
    assert.ok(getLocality(entry.id), `listed id ${entry.id} should resolve`);
  }
});
