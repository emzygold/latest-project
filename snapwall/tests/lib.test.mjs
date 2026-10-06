import assert from 'node:assert/strict';
import { test } from 'node:test';
import { timeUntil } from '../src/lib/format.ts';
import { parseJoinCode } from '../src/lib/joinCode.ts';

test('parseJoinCode reads deep links, URLs and bare codes', () => {
  assert.equal(parseJoinCode('snapwall://join/abc234'), 'ABC234');
  assert.equal(parseJoinCode('https://snapwall.app/join/XY7KQ2'), 'XY7KQ2');
  assert.equal(parseJoinCode('  k9m2pq '), 'K9M2PQ');
  assert.equal(parseJoinCode('hello'), null);
  assert.equal(parseJoinCode('https://example.com'), null);
  assert.equal(parseJoinCode('ABC-123'), null);
});

test('timeUntil formats countdowns', () => {
  const now = Date.UTC(2026, 0, 1);
  const at = (ms) => new Date(now + ms).toISOString();
  assert.equal(timeUntil(at(-1000), now), null);
  assert.equal(timeUntil(at(30 * 1000), now), 'under a minute');
  assert.equal(timeUntil(at(45 * 60 * 1000), now), '45m');
  assert.equal(timeUntil(at((3 * 60 + 12) * 60 * 1000), now), '3h 12m');
  assert.equal(timeUntil(at((2 * 24 + 4) * 60 * 60 * 1000), now), '2d 4h');
});
