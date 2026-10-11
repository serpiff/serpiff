import { expect, mock, test } from 'claude-code/testing'

type Run = { exitCode: number; stdout: string; stderr: string }

const done = (r: Run) => ({
  value: { ...r, isStdoutTruncated: false, isStderrTruncated: false },
})

// The shape `serp session status --json` prints: pretty JSON with a trailing newline.
const pr = (total: number, viewed: number, filesTotal = total, filesViewed = viewed) =>
  JSON.stringify(
    {
      head_sha: '85545bcd2a3f98a4b3a76f21ea74624443f17ffb',
      kind: { number: 42, type: 'pull_request' },
      files_total: filesTotal,
      files_viewed: filesViewed,
      session_id: 1,
      total,
      viewed,
    },
    null,
    2,
  ) + '\n'

const branch = (total: number, viewed: number, filesTotal = total, filesViewed = viewed) =>
  JSON.stringify({
    session_id: 2,
    kind: { type: 'local_branch', name: 'feat/x' },
    head_sha: '85545bcd2a3f98a4b3a76f21ea74624443f17ffb',
    files_total: filesTotal,
    files_viewed: filesViewed,
    total,
    viewed,
  })

const ok = (stdout: string) => done({ exitCode: 0, stdout, stderr: '' })

// Hooks the plugin runs beneath: records the footer modes and the argv of every serp call.
const setup = (on: any, answer: (argv: readonly string[], n: number) => any) => {
  const state = { invalidations: 0 }
  const calls: { argv: readonly string[]; init: any }[] = []
  on('session.cwd', () => ({ value: '/repo/wt' }))
  on('ui.invalidate', (_$: any, e: any, next: any) => {
    state.invalidations++
    return next(e)
  })
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'serpiff' } }))
  on('turn.complete', (_$: any, e: any) => ({ text: `answered ${e.answer}` }))
  on('process.run', (_$: any, e: any) => {
    calls.push({ argv: e.argv, init: e.init })
    return answer(e.argv, calls.length)
  })
  // The engine's own footer draws whatever modes reach it, as one Text.
  on('ui.render', (_$: any, e: any) => ({
    type: 'Text',
    props: {},
    children: [e.props.modes.join(' & ')],
  }))
  // A mounted footer keeps its drawing; the plugin's invalidate redraws it before the next read.
  const mountFooter = ($: any, modes: readonly string[] = [], surface: 'terminal' | 'desktop' = 'terminal') =>
    $.ui.mount({ plugin: 'serpiff', surface, component: 'SessionMode', props: { modes } })
  // All the text of a drawn tree, in order.
  const textOf = (node: any): string =>
    typeof node === 'string' ? node : (node.children ?? []).map(textOf).join('')
  let mounted: any
  // The tree of one footer kept across the test.
  const treeOf = async ($: any) => {
    mounted ??= await mountFooter($)
    return await mounted.drawn()
  }
  const footerTree = async ($: any, engineModes: readonly string[] = [], surface: 'terminal' | 'desktop' = 'terminal') =>
    await (await mountFooter($, engineModes, surface)).drawn()
  // What the footer says, or undefined when it is empty.
  const shown = async ($: any) => textOf(await treeOf($)) || undefined
  const footer = async ($: any, engineModes: readonly string[] = []) =>
    textOf(await footerTree($, engineModes))
  return { calls, state, footer, footerTree, treeOf, shown }
}

const start = ($: any) => $.session.start({ cwd: '/repo/wt', surface: null, isInteractive: false })

// A trigger returns before its refresh is done; let the refresh run out.
const settled = async (clock: any, p: Promise<any>) => {
  const r = await p
  await clock.settle()
  return r
}

const complete = ($: any) =>
  $.turn.complete({
    answer: 'x',
    durationMs: 1,
    isAborted: false,
    turnId: 't1',
    reason: 'answer',
  })

test('in progress shows files and units', async ($, on) => {
  const clock = mock.clock(on)
  const { shown } = setup(on, () => ok(pr(10, 3, 4, 1)))
  await settled(clock, start($))
  expect(await shown($)).toBe('PR #42 · 1/4 (3/10) viewed')
})

test('all viewed has the same form', async ($, on) => {
  const clock = mock.clock(on)
  const { shown } = setup(on, () => ok(pr(88, 88, 30, 30)))
  await settled(clock, start($))
  expect(await shown($)).toBe('PR #42 · 30/30 (88/88) viewed')
})

test('units all Viewed but a file is not stays in progress (blue)', async ($, on) => {
  const clock = mock.clock(on)
  const { footerTree } = setup(on, () => ok(pr(88, 88, 30, 29)))
  await settled(clock, start($))
  const tree = await footerTree($, [])
  expect(tree.children[1].props.color).toBe('suggestion')
  expect(tree.children[1].children).toEqual(['29/30 (88/88) viewed'])
})

test('no changes', async ($, on) => {
  const clock = mock.clock(on)
  const { shown } = setup(on, () => ok(pr(0, 0)))
  await settled(clock, start($))
  expect(await shown($)).toBe('PR #42 · no changes')
})

test('a branch session is labelled with the branch name', async ($, on) => {
  const clock = mock.clock(on)
  const { shown } = setup(on, () => ok(branch(4, 1)))
  await settled(clock, start($))
  expect(await shown($)).toBe('feat/x · 1/4 (1/4) viewed')
})

test('argv has cwd and --json, with a 10 s timeout', async ($, on) => {
  const clock = mock.clock(on)
  const { calls } = setup(on, () => ok(pr(1, 0)))
  await settled(clock, start($))
  expect(calls[0].argv).toEqual(['serp', 'session', 'status', '/repo/wt', '--json'])
  expect(calls[0].init.timeoutMs).toBe(10_000)
})

test('a non-zero exit code adds no mode', async ($, on) => {
  const clock = mock.clock(on)
  const { shown } = setup(on, () => done({ exitCode: 3, stdout: pr(1, 0), stderr: 'not running' }))
  await settled(clock, start($))
  expect(await shown($)).toBe(undefined)
})

test('an exception adds no mode', async ($, on) => {
  const clock = mock.clock(on)
  const { shown } = setup(on, () => {
    throw new Error('unavailable')
  })
  await settled(clock, start($))
  expect(await shown($)).toBe(undefined)
})

test('broken or mis-shaped JSON adds no mode', async ($, on) => {
  const clock = mock.clock(on)
  let n = 0
  const bodies = [
    '{not json',
    '',
    'null',
    JSON.stringify({ kind: { type: 'pull_request', number: 1 }, total: '3', viewed: 1, files_total: 1, files_viewed: 0 }),
    // Without the file counts (an older serp) nothing is shown.
    JSON.stringify({ kind: { type: 'pull_request', number: 1 }, total: 3, viewed: 1 }),
    JSON.stringify({ kind: { type: 'pull_request', number: 1 }, total: 3, viewed: 1, files_total: 1.5, files_viewed: 0 }),
    JSON.stringify({ kind: { type: 'other' }, total: 3, viewed: 1, files_total: 1, files_viewed: 0 }),
  ]
  const { shown } = setup(on, () => ok(bodies[n++]))
  const seen: (string | undefined)[] = []
  await settled(clock, start($))
  seen.push(await shown($))
  for (let i = 1; i < bodies.length; i++) {
    await settled(clock, complete($))
    seen.push(await shown($))
  }
  expect(seen).toEqual(bodies.map(() => undefined))
})

test('the cwd is read again on every refresh', async ($, on) => {
  const clock = mock.clock(on)
  const cwds = ['/a', '/b', '/c']
  let i = 0
  const calls: readonly string[][] = []
  on('session.cwd', () => ({ value: cwds[Math.min(i++, 2)] }))
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'serpiff' } }))
  on('turn.complete', (_$: any, e: any) => ({ text: `answered ${e.answer}` }))
  on('process.run', (_$: any, e: any) => {
    ;(calls as string[][]).push([...e.argv])
    return ok(pr(1, 0))
  })
  await settled(clock, start($))
  await settled(clock, complete($))
  expect(calls.map(c => c[3])).toEqual(['/a', '/b'])
})

test('turn.complete refreshes and passes the event on', async ($, on) => {
  const clock = mock.clock(on)
  let viewed = 0
  const { shown } = setup(on, () => ok(pr(3, viewed++)))
  await settled(clock, start($))
  const first = await shown($)
  const out = await settled(clock, complete($))
  expect(out.text).toBe('answered x')
  expect([first, await shown($)]).toEqual(['PR #42 · 0/3 (0/3) viewed', 'PR #42 · 1/3 (1/3) viewed'])
})

test('/serpiff refreshes afterwards and keeps its output', async ($, on) => {
  const clock = mock.clock(on)
  const { shown, calls } = setup(on, argv =>
    argv[2] === 'add' ? ok('http://x/s/1\n') : ok(pr(2, 1)),
  )
  const out = await settled(clock, $.command.run({ command: 'serpiff', args: '' }))
  expect(out.text).toBe('http://x/s/1')
  expect(calls.map(c => c.argv[2])).toEqual(['add', 'status'])
  expect(await shown($)).toBe('PR #42 · 1/2 (1/2) viewed')
})

test('the clock refreshes every 30 s, with one timer even if session.start repeats', async ($, on) => {
  const clock = mock.clock(on)
  let viewed = 0
  const { shown, calls } = setup(on, () => ok(pr(10, viewed++)))
  await settled(clock, start($))
  await settled(clock, start($))
  const before = calls.length
  await clock.advance(29_999)
  expect(calls.length).toBe(before)
  await clock.advance(1)
  expect(calls.length).toBe(before + 1)
  await clock.advance(30_000)
  expect(calls.length).toBe(before + 2)
  expect(await shown($)).toBe(`PR #42 · ${before + 1}/10 (${before + 1}/10) viewed`)
})

test('requests during a run are folded into one more run after it', async ($, on) => {
  const clock = mock.clock(on)
  const { calls } = setup(on, argv =>
    argv[2] === 'add' ? ok('') : clock.sleep(40_000).then(() => ok(pr(1, 0))),
  )
  const statuses = () => calls.filter(c => c.argv[2] === 'status').length
  await start($)
  await clock.settle()
  expect(statuses()).toBe(1)
  // While the first run is pending: the 30 s timer, a /serpiff and its 5 s follow-up.
  await clock.advance(30_000)
  await $.command.run({ command: 'serpiff', args: '' })
  await clock.advance(10_000 - 1)
  expect(statuses()).toBe(1)
  // The first run ends: one more run covers every request made meanwhile.
  await clock.advance(1)
  expect(statuses()).toBe(2)
})

test('triggers return while serp is still running', async ($, on) => {
  const clock = mock.clock(on)
  const { calls } = setup(on, argv =>
    argv[2] === 'add' ? ok('') : clock.sleep(60_000).then(() => ok(pr(1, 0))),
  )
  // Each of these resolves with the status run still pending.
  await start($)
  await complete($)
  const out = await $.command.run({ command: 'serpiff', args: '' })
  expect(out.text).toBe('Opened in serpiff.')
  expect(calls.some(c => c.argv[2] === 'status')).toBe(true)
})

test('/serpiff asks again 5 seconds later', async ($, on) => {
  const clock = mock.clock(on)
  const { calls } = setup(on, argv => (argv[2] === 'add' ? ok('') : ok(pr(2, 1))))
  await settled(clock, $.command.run({ command: 'serpiff', args: '' }))
  expect(calls.map(c => c.argv[2])).toEqual(['add', 'status'])
  await clock.advance(4_999)
  expect(calls.length).toBe(2)
  await clock.advance(1)
  expect(calls.map(c => c.argv[2])).toEqual(['add', 'status', 'status'])
})

test('a subagent turn does not refresh', async ($, on) => {
  const clock = mock.clock(on)
  const { calls } = setup(on, () => ok(pr(1, 0)))
  await settled(
    clock,
    $.turn.complete({
      answer: 'x',
      durationMs: 1,
      isAborted: false,
      turnId: 't2',
      agentId: 'sub1',
      reason: 'answer',
    }),
  )
  expect(calls.length).toBe(0)
})

test('a branch session: all viewed and no changes', async ($, on) => {
  const clock = mock.clock(on)
  const bodies = [branch(3, 3), branch(0, 0), JSON.stringify({ kind: { type: 'pull_request', number: 1.5 }, total: 1, viewed: 0, files_total: 1, files_viewed: 0 })]
  let n = 0
  const { shown } = setup(on, () => ok(bodies[n++]))
  const seen: (string | undefined)[] = []
  await settled(clock, start($))
  seen.push(await shown($))
  await settled(clock, complete($))
  seen.push(await shown($))
  await settled(clock, complete($))
  seen.push(await shown($))
  expect(seen).toEqual(['feat/x · 3/3 (3/3) viewed', 'feat/x · no changes', undefined])
})

test('the mode keeps updating after a failure', async ($, on) => {
  const clock = mock.clock(on)
  const { shown } = setup(on, (_argv, n) =>
    n === 1 ? done({ exitCode: 1, stdout: '', stderr: 'no session' }) : ok(pr(2, 2)),
  )
  await settled(clock, start($))
  const first = await shown($)
  await settled(clock, complete($))
  expect([first, await shown($)]).toEqual([undefined, 'PR #42 · 2/2 (2/2) viewed'])
})

test('the mode is joined to the engine\'s own modes with " & ", all dim', async ($, on) => {
  const clock = mock.clock(on)
  const { footer, footerTree } = setup(on, () => ok(pr(10, 3)))
  await settled(clock, start($))
  expect(await footer($, ['focus', 'memory paused'])).toBe('focus & memory paused & PR #42 · 3/10 (3/10) viewed')
  const tree = await footerTree($, ['focus'])
  expect(tree.children[0].props.dimColor).toBe(true)
  expect(tree.children[0].children).toEqual(['focus & PR #42 · '])
})

test('with no engine modes only ours is drawn', async ($, on) => {
  const clock = mock.clock(on)
  const { footer } = setup(on, () => ok(pr(10, 3)))
  await settled(clock, start($))
  expect(await footer($)).toBe('PR #42 · 3/10 (3/10) viewed')
})

test('colors: progress is suggestion, all is success, the label is dim', async ($, on) => {
  const clock = mock.clock(on)
  const bodies = [pr(10, 3, 4, 1), pr(5, 5)]
  let n = 0
  const { footerTree } = setup(on, () => ok(bodies[n++]))
  await settled(clock, start($))
  // Neither surface refuses the tree.
  for (const surface of ['terminal', 'desktop'] as const) {
    const progress = await footerTree($, [], surface)
    expect(progress.children[0].props.dimColor).toBe(true)
    expect(progress.children[0].children).toEqual(['PR #42 · '])
    expect(progress.children[1].props.color).toBe('suggestion')
    expect(progress.children[1].children).toEqual(['1/4 (3/10) viewed'])
  }
  await settled(clock, complete($))
  for (const surface of ['terminal', 'desktop'] as const) {
    const all = await footerTree($, [], surface)
    expect(all.children[1].props.color).toBe('success')
    expect(all.children[1].children).toEqual(['5/5 (5/5) viewed'])
  }
})

test('no changes is one dim text', async ($, on) => {
  const clock = mock.clock(on)
  const { treeOf } = setup(on, () => ok(pr(0, 0)))
  await settled(clock, start($))
  const tree = await treeOf($)
  expect(tree.children.length).toBe(1)
  expect(tree.children[0].props.dimColor).toBe(true)
  expect(tree.children[0].children).toEqual(['PR #42 · no changes'])
})

test('with nothing to show the engine\'s own drawing is kept', async ($, on) => {
  const clock = mock.clock(on)
  const { footer, footerTree } = setup(on, () => done({ exitCode: 1, stdout: '', stderr: 'no session' }))
  await settled(clock, start($))
  expect(await footer($, ['focus'])).toBe('focus')
  expect((await footerTree($, ['focus'])).props).toEqual({})
  expect(await footer($)).toBe('')
})

test('the mode goes away when a later run fails', async ($, on) => {
  const clock = mock.clock(on)
  const { shown } = setup(on, (_argv, n) =>
    n === 1 ? ok(pr(2, 1)) : done({ exitCode: 1, stdout: '', stderr: 'gone' }),
  )
  await settled(clock, start($))
  expect(await shown($)).toBe('PR #42 · 1/2 (1/2) viewed')
  await settled(clock, complete($))
  expect(await shown($)).toBe(undefined)
})

test('the footer is redrawn only when the value changes', async ($, on) => {
  const clock = mock.clock(on)
  const bodies = [pr(10, 3), pr(10, 3), pr(10, 4), pr(10, 4), '{broken', '{broken']
  let n = 0
  const { state } = setup(on, () => ok(bodies[n++]))
  const counts: number[] = []
  await settled(clock, start($))
  counts.push(state.invalidations)
  for (let i = 1; i < bodies.length; i++) {
    await settled(clock, complete($))
    counts.push(state.invalidations)
  }
  // set, same, changed, same, removed, still removed
  expect(counts).toEqual([1, 1, 2, 2, 3, 3])
})
