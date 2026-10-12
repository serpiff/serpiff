import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const { normalizePrUrl } = createRequire(import.meta.url)('../normalize.js');

const PR = 'https://github.com/owner/name/pull/12';

test('accepts a PR URL as it is', () => {
  assert.equal(normalizePrUrl(PR), PR);
});

for (const [label, input] of [
  ['trailing slash', `${PR}/`],
  ['files tab', `${PR}/files`],
  ['files with fragment', `${PR}/files#diff-abc123R10`],
  ['commits path', `${PR}/commits/0123abcd`],
  ['commit under PR', `${PR}/changes/0123abcd..4567ef01`],
  ['checks', `${PR}/checks`],
  ['query', `${PR}?tab=files`],
  ['query and fragment', `${PR}?diff=split#issuecomment-1`],
  ['fragment', `${PR}#discussion_r1`],
  ['conversation anchor', `${PR}#event-123`],
  ['uppercase host', 'https://GitHub.com/owner/name/pull/12'],
  ['default port', 'https://github.com:443/owner/name/pull/12'],
]) {
  test(`accepts: ${label}`, () => assert.equal(normalizePrUrl(input), PR));
}

test('keeps dots, dashes and underscores in owner and name', () => {
  assert.equal(
    normalizePrUrl('https://github.com/my-org/my_repo.js/pull/7/files'),
    'https://github.com/my-org/my_repo.js/pull/7',
  );
});

test('accepts leading zeros and writes the canonical decimal', () => {
  assert.equal(normalizePrUrl('https://github.com/owner/name/pull/012'), PR);
});

test('accepts the largest safe integer', () => {
  assert.equal(
    normalizePrUrl('https://github.com/a/b/pull/9007199254740991'),
    'https://github.com/a/b/pull/9007199254740991',
  );
});

test('keeps a .git suffix as part of the repository name (no special case)', () => {
  assert.equal(normalizePrUrl('https://github.com/owner/name.git/pull/12'), 'https://github.com/owner/name.git/pull/12');
});

test('keeps large numbers', () => {
  assert.equal(normalizePrUrl('https://github.com/a/b/pull/123456'), 'https://github.com/a/b/pull/123456');
});

for (const [label, input] of [
  ['pulls list', 'https://github.com/owner/name/pulls'],
  ['pulls list with number', 'https://github.com/owner/name/pulls/12'],
  ['non-numeric', 'https://github.com/owner/name/pull/abc'],
  ['zero', 'https://github.com/owner/name/pull/0'],
  ['negative', 'https://github.com/owner/name/pull/-1'],
  ['only zeros', 'https://github.com/owner/name/pull/000'],
  ['overflow past the safe integer range', 'https://github.com/owner/name/pull/9007199254740993'],
  ['huge number', 'https://github.com/owner/name/pull/' + '9'.repeat(30)],
  ['host with a trailing dot', 'https://github.com./owner/name/pull/12'],
  ['uppercase PULL segment', 'https://github.com/owner/name/PULL/1'],
  ['encoded slash in the repository name', 'https://github.com/owner/na%2Fme/pull/1'],
  ['encoded slash instead of a separator', 'https://github.com/owner%2Fname/pull/1'],
  ['number with suffix', 'https://github.com/owner/name/pull/12abc'],
  ['decimal', 'https://github.com/owner/name/pull/1.5'],
  ['no number', 'https://github.com/owner/name/pull'],
  ['no number, trailing slash', 'https://github.com/owner/name/pull/'],
  ['issue', 'https://github.com/owner/name/issues/1'],
  ['repo root', 'https://github.com/owner/name'],
  ['github root', 'https://github.com/'],
  ['pull in owner position', 'https://github.com/pull/name/pull'],
  ['extra segment before pull', 'https://github.com/owner/name/x/pull/12'],
  ['gist', 'https://gist.github.com/owner/name/pull/12'],
  ['www', 'https://www.github.com/owner/name/pull/12'],
  ['enterprise host', 'https://github.example.com/owner/name/pull/12'],
  ['lookalike suffix', 'https://github.com.evil.test/owner/name/pull/12'],
  ['lookalike prefix', 'https://evilgithub.com/owner/name/pull/12'],
  ['userinfo', 'https://user@github.com/owner/name/pull/12'],
  ['other port', 'https://github.com:8443/owner/name/pull/12'],
  ['http', 'http://github.com/owner/name/pull/12'],
  ['serpiff scheme', 'serpiff://open?url=https%3A%2F%2Fgithub.com%2Fo%2Fn%2Fpull%2F1'],
  ['empty owner', 'https://github.com//name/pull/12'],
  ['bad characters in owner', 'https://github.com/ow%20ner/name/pull/12'],
  ['not a URL', 'github.com/owner/name/pull/12'],
  ['empty string', ''],
]) {
  test(`rejects: ${label}`, () => assert.equal(normalizePrUrl(input), null));
}

test('rejects non-strings', () => {
  for (const value of [undefined, null, 12, {}, ['x']]) assert.equal(normalizePrUrl(value), null);
});

test('is also exposed on globalThis for the content script', () => {
  assert.equal(typeof globalThis.serpiffNormalizePrUrl, 'function');
  assert.equal(globalThis.serpiffNormalizePrUrl, normalizePrUrl);
});
