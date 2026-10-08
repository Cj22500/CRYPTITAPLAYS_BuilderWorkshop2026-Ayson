import assert from 'node:assert/strict';
import test from 'node:test';

import { mapBuilderCard } from '../src/lib/mapBuilderCard.ts';

const fields = {
  builder_name: 'Ada',
  builder_no: '12',
  profession: '',
  program: 'Computer Science',
  country: 'PH',
  specialization: '',
  building_since: '2026',
  focus: '',
  community: '',
  skills: 'Move, React, , Sui',
  issued: 'October 2026',
  about: '',
  website_url: 'https://example.com',
  photo_url: 'https://example.com/assets/profile.png',
};

test('maps valid chain fields and splits skills', () => {
  const result = mapBuilderCard(fields, '0xabc', { AddressOwner: '0x123' }, 'Sui Mainnet');
  assert.equal(result.fields.builder_no, '12');
  assert.deepEqual(result.skills, ['Move', 'React', 'Sui']);
  assert.equal(result.owner, '0x123');
  assert.equal(result.objectId, '0xabc');
});

test('accepts a numeric builder number from JSON', () => {
  assert.equal(mapBuilderCard({ ...fields, builder_no: 12 }, '0xabc', null, 'Sui Mainnet').fields.builder_no, '12');
});

test('rejects missing or malformed chain fields', () => {
  for (const field of Object.keys(fields)) {
    assert.throws(
      () => mapBuilderCard({ ...fields, [field]: undefined }, '0xabc', null, 'Sui Mainnet'),
      new RegExp(`BuilderCard field ${field} is missing or invalid`),
    );
  }
  assert.throws(
    () => mapBuilderCard({ ...fields, profession: { unexpected: true } }, '0xabc', null, 'Sui Mainnet'),
    /BuilderCard field profession is missing or invalid/,
  );
  assert.throws(
    () => mapBuilderCard({ ...fields, builder_no: -1 }, '0xabc', null, 'Sui Mainnet'),
    /BuilderCard field builder_no is missing or invalid/,
  );
});
