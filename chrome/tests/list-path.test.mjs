import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const { normalizePrUrl, isPrListPath } = createRequire(import.meta.url)('../normalize.js');

for (const path of [
  '/pulls',
  '/pulls/',
  '/pulls/inbox',
  '/pulls/authored',
  '/pulls/assigned',
  '/pulls/involves',
  '/pulls/reviews',
  '/pulls/search',
  '/o/n/pulls',
  '/o/n/pulls/',
  '/o/n/pulls/williammartin',
  '/o/n/pulls/assigned/u',
  '/o/n/pulls/mentioned/u',
  '/o/n/pulls/review-requested/u',
  '/o/n/pulls/assigned/u/',
  '/pulls/a/b', // passes the path check; the row DOM narrows it down
]) {
  test(`list path: ${path}`, () => {
    assert.equal(isPrListPath(path), true);
  });
}

test('/o/n/pulls/12 is a list (user "12"), not a PR', () => {
  assert.equal(isPrListPath('/o/n/pulls/12'), true);
  assert.equal(normalizePrUrl('https://github.com/o/n/pulls/12'), null);
});

for (const path of [
  '/o/n/pull/1',
  '/o/n/pull/1/files',
  '/o/n/issues',
  '/o/n/pulls/a/b/c',
  '/o/n',
  '/',
  '/o/pulls',
  '/pullsx',
  '/o/n/pullsx',
  '//pulls',
  '/pulls//x',
]) {
  test(`not a list path: ${path}`, () => {
    assert.equal(isPrListPath(path), false);
  });
}

test('non-string input is not a list path', () => {
  assert.equal(isPrListPath(undefined), false);
});
