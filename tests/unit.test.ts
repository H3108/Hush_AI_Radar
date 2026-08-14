import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cosineSimilarity, isoWeekKey } from '../src/server/gemini';
import { calculateRadarScore, hashUrl } from '../src/server/pipeline';

test('cosineSimilarity: identical vectors return 1', () => {
  assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1);
});

test('cosineSimilarity: orthogonal vectors return 0', () => {
  assert.equal(cosineSimilarity([1, 0, 0], [0, 1, 0]), 0);
});

test('cosineSimilarity: opposite vectors return -1', () => {
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1);
});

test('cosineSimilarity: partially similar vectors', () => {
  const sim = cosineSimilarity([1, 1], [1, 0]);
  const expected = 1 / Math.sqrt(2);
  assert.ok(Math.abs(sim - expected) < 1e-9);
});

test('cosineSimilarity: guards malformed inputs', () => {
  assert.equal(cosineSimilarity([], []), 0);
  assert.equal(cosineSimilarity([1, 2], [1]), 0);
  assert.equal(cosineSimilarity([0, 0], [0, 0]), 0);
});

test('cosineSimilarity: clustering threshold behavior (>=0.78 groups, <0.78 does not)', () => {
  const a = [1, 0.5, 0.2];
  const near = [0.9, 0.45, 0.25];
  const far = [0.1, 0.9, 0.8];
  const THRESHOLD = 0.78;
  assert.ok(cosineSimilarity(a, near) >= THRESHOLD);
  assert.ok(cosineSimilarity(a, far) < THRESHOLD);
});

test('isoWeekKey: known week keys', () => {
  assert.equal(isoWeekKey(new Date('2026-08-14T12:00:00Z')), '2026-W33');
  assert.equal(isoWeekKey(new Date('2026-01-01T00:00:00Z')), '2026-W01');
});

test('isoWeekKey: ISO year boundary (Dec 29 2025 belongs to 2026-W01)', () => {
  assert.equal(isoWeekKey(new Date('2025-12-29T00:00:00Z')), '2026-W01');
});

test('isoWeekKey: New Year week rolls correctly (2024-01-01 is Monday)', () => {
  assert.equal(isoWeekKey(new Date('2024-01-01T00:00:00Z')), '2024-W01');
});

test('hashUrl: normalizes case + whitespace, stable 16-hex digest', () => {
  const a = hashUrl('  HTTPS://Example.com/Post/1  ');
  const b = hashUrl('https://example.com/post/1');
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{16}$/);
});

test('hashUrl: distinct URLs produce distinct hashes', () => {
  assert.notEqual(hashUrl('https://a.com/1'), hashUrl('https://a.com/2'));
});

test('calculateRadarScore: full-weight example', () => {
  const now = new Date().toISOString();
  const { totalScore, breakdown } = calculateRadarScore(5, now, 90, 85);
  assert.equal(totalScore, 96.0);
  assert.deepEqual(breakdown, {
    source_authority: 100,
    freshness_score: 100,
    ai_impact_score: 90,
    community_signal: 85
  });
});

test('calculateRadarScore: clamps source authority and impact ranges', () => {
  const now = new Date().toISOString();
  const high = calculateRadarScore(99, now, 500, 200);
  assert.equal(high.breakdown.source_authority, 100);
  assert.equal(high.breakdown.ai_impact_score, 100);
  assert.equal(high.breakdown.community_signal, 100);

  const low = calculateRadarScore(0, now, -10, -50);
  assert.equal(low.breakdown.source_authority, 20);
  assert.equal(low.breakdown.ai_impact_score, 0);
  assert.equal(low.breakdown.community_signal, 0);
});

test('calculateRadarScore: total never exceeds 99.9 or drops below 10', () => {
  const now = new Date().toISOString();
  assert.ok(calculateRadarScore(5, now, 100, 100).totalScore <= 99.9);
  assert.ok(calculateRadarScore(0, now, 0, 0).totalScore >= 10.0);
});

test('calculateRadarScore: freshness decays over time', () => {
  const future = new Date(Date.now() + 1000 * 60).toISOString();
  const now = new Date().toISOString();
  const old = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
  const fNow = calculateRadarScore(5, now, 50, 50);
  const fOld = calculateRadarScore(5, old, 50, 50);
  const fFuture = calculateRadarScore(5, future, 50, 50);
  assert.equal(fNow.breakdown.freshness_score, 100);
  assert.ok(fOld.breakdown.freshness_score < 50);
  assert.ok(fFuture.breakdown.freshness_score >= 100);
});
