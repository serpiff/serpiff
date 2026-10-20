import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

const dir = new URL('..', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, dir), 'utf8');
const messages = (lang) => JSON.parse(read(`_locales/${lang}/messages.json`));
const en = messages('en');
const ja = messages('ja');

test('en and ja have the same keys, each with a message', () => {
  assert.deepEqual(Object.keys(ja).sort(), Object.keys(en).sort());
  for (const m of [en, ja]) {
    for (const [key, value] of Object.entries(m)) {
      assert.match(key, /^[a-z][A-Za-z0-9]*$/, key);
      assert.equal(typeof value.message, 'string', key);
      assert.ok(value.message.length > 0, key);
    }
  }
  assert.deepEqual(readdirSync(new URL('_locales', dir)).filter((name) => !name.startsWith('.')).sort(), ['en', 'ja']);
});

test('the manifest defaults to en and uses only messages that exist', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.default_locale, 'en');
  const used = [...read('manifest.json').matchAll(/__MSG_(\w+)__/g)].map((m) => m[1]);
  assert.deepEqual(used.sort(), ['extDescription', 'extName', 'openInSerpiff']);
  for (const key of used) assert.ok(key in en, key);
  assert.equal(manifest.name, '__MSG_extName__');
  assert.equal(manifest.description, '__MSG_extDescription__');
  assert.equal(manifest.action.default_title, '__MSG_openInSerpiff__');
});

test('every getMessage key in the scripts exists in en', () => {
  for (const file of ['content.js', 'background.js']) {
    for (const m of read(file).matchAll(/getMessage\(\s*'([^']+)'/g)) assert.ok(m[1] in en, `${file}: ${m[1]}`);
  }
  assert.match(read('content.js'), /getMessage\('openInSerpiff'\)/);
  assert.doesNotMatch(read('content.js'), /'Open in serpiff'/);
});

test('the English texts are the ones the extension had before', () => {
  assert.equal(en.extName.message, 'serpiff');
  assert.equal(en.extDescription.message, 'Open the GitHub pull request you are viewing in serpiff, a local code review tool.');
  assert.equal(en.openInSerpiff.message, 'Open in serpiff');
});

test('the Japanese texts keep the name and have no comma after は or を', () => {
  assert.equal(ja.extName.message, 'serpiff');
  assert.equal(ja.openInSerpiff.message, 'serpiffで開く');
  for (const { message } of Object.values(ja)) assert.doesNotMatch(message, /[はを]、/);
});
