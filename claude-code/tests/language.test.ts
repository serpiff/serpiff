import { expect, mock, test } from 'claude-code/testing'
import { dictionary, fromAppleLanguages, t } from '../hooks/messages'

type Run = { exitCode: number; stdout: string; stderr: string }

const done = (r: Run) => ({
  value: { ...r, isStdoutTruncated: false, isStderrTruncated: false },
})
const ok = (stdout: string, stderr = '') => done({ exitCode: 0, stdout, stderr })
const failed = (stderr = '') => done({ exitCode: 1, stdout: '', stderr })

const status = (language?: unknown, total = 10, viewed = 3) =>
  JSON.stringify({
    ...(language === undefined ? {} : { language }),
    kind: { type: 'pull_request', number: 42 },
    files_total: total === 0 ? 0 : 4,
    files_viewed: total === 0 ? 0 : 1,
    total,
    viewed,
  })

const apple = (first: string) => ok(`(\n    "${first}",\n    "en-US"\n)\n`)

// The hooks the plugin runs beneath. `serp` answers `session status` with `statusAnswer()`
// and `session add` with `add()`; `defaults` is answered by `os()` and counted.
const setup = (
  on: any,
  opts: {
    status?: () => any
    add?: () => any
    os?: () => any
    register?: () => any
  } = {},
) => {
  const osCalls: { argv: readonly string[]; init: any }[] = []
  const registered: any[] = []
  const invalidations = { n: 0 }
  on('session.cwd', () => ({ value: '/repo/wt' }))
  on('ui.invalidate', (_$: any, e: any, next: any) => {
    invalidations.n++
    return next(e)
  })
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('command.register', (_$: any, e: any) => {
    registered.push(e)
    if (opts.register) return opts.register()
    return { value: { command: 'serpiff' } }
  })
  on('turn.complete', (_$: any, e: any) => ({ text: `answered ${e.answer}` }))
  on('process.run', (_$: any, e: any) => {
    if (e.argv[0] === 'defaults') {
      osCalls.push({ argv: e.argv, init: e.init })
      return (opts.os ?? (() => apple('en-US')))()
    }
    if (e.argv[2] === 'add') return (opts.add ?? (() => ok('')))()
    return (opts.status ?? (() => ok(status('en'))))()
  })
  on('ui.render', (_$: any, e: any) => ({
    type: 'Text',
    props: {},
    children: [e.props.modes.join(' & ')],
  }))
  const textOf = (node: any): string =>
    typeof node === 'string' ? node : (node.children ?? []).map(textOf).join('')
  let mounted: any
  const shown = async ($: any) => {
    mounted ??= await $.ui.mount({
      plugin: 'serpiff',
      surface: 'terminal',
      component: 'SessionMode',
      props: { modes: [] },
    })
    return textOf(await mounted.drawn()) || undefined
  }
  return { osCalls, registered, invalidations, shown }
}

const start = ($: any) => $.session.start({ cwd: '/repo/wt', surface: null, isInteractive: false })
const settled = async (clock: any, p: Promise<any>) => {
  const r = await p
  await clock.settle()
  return r
}
const complete = ($: any) =>
  $.turn.complete({ answer: 'x', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
const run = ($: any, args = '') => $.command.run({ command: 'serpiff', args })

test('the dictionary has the same keys and placeholders in both languages', () => {
  const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort()
  expect(Object.keys(dictionary.ja).sort()).toEqual(Object.keys(dictionary.en).sort())
  for (const key of Object.keys(dictionary.en) as (keyof typeof dictionary.en)[]) {
    expect([key, placeholders(dictionary.ja[key])]).toEqual([key, placeholders(dictionary.en[key])])
  }
})

test('placeholders are replaced in one scan; braces in a value stay', () => {
  expect(t('en', 'run.failed', { reason: 'bad {code} {reason}' })).toBe('Could not run serp: bad {code} {reason}')
  expect(t('ja', 'run.exited', { code: 3 })).toBe('serpが終了コード3で終了しました')
  expect(t('en', 'run.exited')).toBe('serp exited with {code}')
})

test('the first AppleLanguages element decides', () => {
  expect(fromAppleLanguages('(\n    "ja-JP",\n    "en-US"\n)\n')).toBe('ja')
  expect(fromAppleLanguages('(\n    ja\n)\n')).toBe('ja')
  expect(fromAppleLanguages('(\n    "en-US",\n    "ja-JP"\n)\n')).toBe('en')
  expect(fromAppleLanguages('')).toBe('en')
  expect(fromAppleLanguages('(\n    "jam"\n)\n')).toBe('en')
  expect(fromAppleLanguages('(\n    "JA_jp"\n)\n')).toBe('ja')
  expect(fromAppleLanguages('(\n    "ja@calendar=x"\n)\n')).toBe('ja')
  expect(fromAppleLanguages('(\n    "jp-JP"\n)\n')).toBe('en')
})

test('Japanese footer: progress, all viewed and no changes', async ($, on) => {
  const clock = mock.clock(on)
  const bodies = [status('ja'), status('ja', 5, 5), status('ja', 0, 0)]
  let n = 0
  const { shown, osCalls } = setup(on, { status: () => ok(bodies[n++]) })
  await settled(clock, start($))
  expect(await shown($)).toBe('PR #42 · 1/4 (3/10)がViewed')
  await settled(clock, complete($))
  expect(await shown($)).toBe('PR #42 · 1/4 (5/5)がViewed')
  await settled(clock, complete($))
  expect(await shown($)).toBe('PR #42 · 変更なし')
  // The language came from `session status`, so the OS was never asked.
  expect(osCalls.length).toBe(0)
})

test('an unknown language is English', async ($, on) => {
  const clock = mock.clock(on)
  const { shown, osCalls } = setup(on, { status: () => ok(status('fr')) })
  await settled(clock, start($))
  expect(await shown($)).toBe('PR #42 · 1/4 (3/10) viewed')
  expect(osCalls.length).toBe(0)
})

test('Japanese /serpiff sentences follow the language from status', async ($, on) => {
  const clock = mock.clock(on)
  let add: () => any = () => ok('')
  setup(on, { status: () => ok(status('ja')), add: () => add() })
  await settled(clock, start($))
  expect((await run($)).text).toBe('serpiffで開きました。')
  add = () => failed('no such PR\n')
  expect((await run($)).text).toBe('serpが終了コード1で終了しました\nno such PR')
  add = () => {
    throw new Error('spawn serp ENOENT {code}')
  }
  expect((await run($)).text).toStartWith('serpを実行できませんでした（')
})

test('/serpiff before any status run uses the OS language', async ($, on) => {
  const { osCalls } = setup(on, { status: () => failed(), os: () => apple('ja-JP'), add: () => ok('') })
  expect((await run($)).text).toBe('serpiffで開きました。')
  expect((await run($)).text).toBe('serpiffで開きました。')
  expect(osCalls.length).toBe(1)
  expect(osCalls[0].argv).toEqual(['defaults', 'read', '-g', 'AppleLanguages'])
  expect(osCalls[0].init.timeoutMs).toBe(5_000)
})

test('a failing status falls back to the OS language (Japanese)', async ($, on) => {
  const clock = mock.clock(on)
  const { osCalls, shown } = setup(on, { status: () => failed('not running'), os: () => apple('ja-JP') })
  await settled(clock, start($))
  await settled(clock, complete($))
  await settled(clock, complete($))
  expect(osCalls.length).toBe(1)
  expect(await shown($)).toBe(undefined)
  expect((await run($)).text).toBe('serpiffで開きました。')
})

test('an unreadable or language-less status falls back to the OS language', async ($, on) => {
  const clock = mock.clock(on)
  const bodies = ['{broken', status(undefined), status(7)]
  let n = 0
  const { osCalls, registered } = setup(on, { status: () => ok(bodies[n++]), os: () => apple('ja-JP') })
  await settled(clock, start($))
  await settled(clock, complete($))
  await settled(clock, complete($))
  expect(osCalls.length).toBe(1)
  expect(registered.at(-1).description).toStartWith('このワークツリー')
})

test('the OS fallback is English for another language', async ($, on) => {
  const clock = mock.clock(on)
  const { shown, osCalls } = setup(on, { status: () => ok(status(undefined)), os: () => apple('en-US') })
  await settled(clock, start($))
  expect(await shown($)).toBe('PR #42 · 1/4 (3/10) viewed')
  expect(osCalls.length).toBe(1)
})

test('defaults failing is English', async ($, on) => {
  setup(on, { os: () => failed('nope') })
  expect((await run($)).text).toBe('Opened in serpiff.')
})

test('defaults throwing is English', async ($, on) => {
  setup(on, {
    os: () => {
      throw new Error('no defaults')
    },
  })
  expect((await run($)).text).toBe('Opened in serpiff.')
})

test('the OS question is asked once even when needed at the same time', async ($, on) => {
  const clock = mock.clock(on)
  const { osCalls } = setup(on, {
    status: () => failed(),
    os: () => clock.sleep(1_000).then(() => apple('ja-JP')),
  })
  const both = Promise.all([run($), run($)])
  await clock.advance(1_000)
  const [a, b] = await both
  expect([a.text, b.text]).toEqual(['serpiffで開きました。', 'serpiffで開きました。'])
  expect(osCalls.length).toBe(1)
})

test('after status gave a language, a failing status goes back to the OS language', async ($, on) => {
  const clock = mock.clock(on)
  const answers = [ok(status('en')), failed('gone')]
  let n = 0
  const { shown, osCalls } = setup(on, { status: () => answers[n++], os: () => apple('ja-JP'), add: () => ok('') })
  await settled(clock, start($))
  expect(await shown($)).toBe('PR #42 · 1/4 (3/10) viewed')
  expect(osCalls.length).toBe(0)
  // The status run now fails: the language is the OS's (Japanese) and the mode goes away.
  await settled(clock, complete($))
  expect(osCalls.length).toBe(1)
  expect(await shown($)).toBe(undefined)
  expect((await run($)).text).toBe('serpiffで開きました。')
})

test('the command is registered again only when the language changes', async ($, on) => {
  const clock = mock.clock(on)
  const bodies = [status('en'), status('en'), status('ja'), status('ja'), status('en')]
  let n = 0
  const { registered } = setup(on, { status: () => ok(bodies[Math.min(n++, 4)]) })
  const descriptions = () => registered.map(r => r.description)
  const en = 'Open this worktree (or a PR / branch) as a review session in serpiff'
  const ja = 'このワークツリー（またはPR / ブランチ）をserpiffのレビューセッションとして開く'
  await settled(clock, start($))
  expect(descriptions()).toEqual([en])
  await settled(clock, complete($))
  expect(descriptions()).toEqual([en])
  await settled(clock, complete($))
  expect(descriptions()).toEqual([en, ja])
  await settled(clock, complete($))
  expect(descriptions()).toEqual([en, ja])
  await settled(clock, complete($))
  expect(descriptions()).toEqual([en, ja, en])
  expect(registered.every(r => r.name === 'serpiff' && r.argumentHint === '[<pr>|<branch>|<base>...<head>]')).toBe(true)
})

test('session.start registers with the language known by then', async ($, on) => {
  const clock = mock.clock(on)
  const { registered } = setup(on, { status: () => ok(status('ja')) })
  await settled(clock, start($))
  await settled(clock, start($))
  // First start: English (nothing is known yet); the status run then switches it to Japanese.
  // The second start registers with the Japanese already known.
  expect(registered.map(r => r.description.slice(0, 4))).toEqual(['Open', 'このワー', 'このワー'])
})

test('a failing registration does not break the footer and is tried again', async ($, on) => {
  const clock = mock.clock(on)
  let attempts = 0
  const { shown } = setup(on, {
    status: () => ok(status('ja')),
    // A deny reaches the mod as a rejection of its `$.command.register`.
    register: () => {
      attempts++
      return { deny: 'refused' }
    },
  })
  await settled(clock, start($))
  expect(await shown($)).toBe('PR #42 · 1/4 (3/10)がViewed')
  // session.start (en), then the refresh (ja) both failed.
  expect(attempts).toBe(2)
  // The footer keeps working, and the next refresh registers again.
  await settled(clock, complete($))
  expect(attempts).toBe(3)
  expect(await shown($)).toBe('PR #42 · 1/4 (3/10)がViewed')
})

test('a language change alone does not redraw an empty footer', async ($, on) => {
  const clock = mock.clock(on)
  const { invalidations } = setup(on, { status: () => failed('gone'), os: () => apple('ja-JP') })
  await settled(clock, start($))
  await settled(clock, complete($))
  expect(invalidations.n).toBe(0)
})

// While `serp session add` runs (1 s), a refresh finds the language from `session status`;
// the sentence follows it, not the OS language asked before.
const whileServRuns = async ($: any, on: any, statusLanguage: string, osFirst: string) => {
  const clock = mock.clock(on)
  let isFirst = true
  const { osCalls } = setup(on, {
    status: () => (isFirst ? ((isFirst = false), failed()) : ok(status(statusLanguage))),
    os: () => apple(osFirst),
    add: () => clock.sleep(1_000).then(() => ok('')),
  })
  const pending = run($)
  // The first status run is a failure, so the OS is asked and the language is the OS's.
  await complete($)
  await clock.settle()
  await complete($)
  await clock.advance(1_000)
  return { text: (await pending).text, osCalls }
}

test('/serpiff takes the language status decides while serp runs (status ja, OS en)', async ($, on) => {
  const { text, osCalls } = await whileServRuns($, on, 'ja', 'en-US')
  expect(text).toBe('serpiffで開きました。')
  expect(osCalls.length).toBe(1)
})

test('/serpiff takes the language status decides while serp runs (status en, OS ja)', async ($, on) => {
  const { text } = await whileServRuns($, on, 'en', 'ja-JP')
  expect(text).toBe('Opened in serpiff.')
})

test('the footer is redrawn when only the language changes', async ($, on) => {
  const clock = mock.clock(on)
  const bodies = [status('en'), status('en'), status('ja')]
  let n = 0
  const { invalidations } = setup(on, { status: () => ok(bodies[n++]) })
  const counts: number[] = []
  await settled(clock, start($))
  counts.push(invalidations.n)
  await settled(clock, complete($))
  counts.push(invalidations.n)
  await settled(clock, complete($))
  counts.push(invalidations.n)
  expect(counts).toEqual([1, 1, 2])
})
