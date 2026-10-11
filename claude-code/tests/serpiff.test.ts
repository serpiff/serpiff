import { expect, test } from 'claude-code/testing'

type Run = { exitCode: number; stdout: string; stderr: string }

const done = (r: Run) => ({
  value: { ...r, isStdoutTruncated: false, isStderrTruncated: false },
})

test('no args uses the session cwd as the target', async ($, on) => {
  const calls: { argv: string[]; init: unknown }[] = []
  on('session.cwd', () => ({ value: '/repo/wt' }))
  on('process.run', (_$, e) => {
    // The footer mode refresh after the command also runs serp; this file looks at `add` only.
    if (e.argv[2] === 'add') calls.push({ argv: e.argv, init: e.init })
    return done({ exitCode: 0, stdout: '', stderr: '' })
  })

  await $.command.run({ command: 'serpiff', args: '' })
  await $.command.run({ command: 'serpiff', args: '   \t ' })

  expect(calls.map(c => c.argv)).toEqual([
    ['serp', 'session', 'add', '/repo/wt', '--open'],
    ['serp', 'session', 'add', '/repo/wt', '--open'],
  ])
})

test('args become one trimmed argv element with a 60 s timeout', async ($, on) => {
  const calls: { argv: string[]; init: any }[] = []
  on('session.cwd', () => ({ value: '/repo/wt' }))
  on('process.run', (_$, e) => {
    // The footer mode refresh after the command also runs serp; this file looks at `add` only.
    if (e.argv[2] === 'add') calls.push({ argv: e.argv, init: e.init })
    return done({ exitCode: 0, stdout: '', stderr: '' })
  })

  await $.command.run({ command: 'serpiff', args: '  main...feature/x  ' })
  await $.command.run({ command: 'serpiff', args: '#12; rm -rf x' })

  expect(calls[0].argv).toEqual(['serp', 'session', 'add', 'main...feature/x', '--open'])
  expect(calls[1].argv).toEqual(['serp', 'session', 'add', '#12; rm -rf x', '--open'])
  expect(calls[0].init.timeoutMs).toBe(60_000)
  expect(calls[0].init.cwd).toBeUndefined()
})

test('success prints stdout then stderr', async ($, on) => {
  on('session.cwd', () => ({ value: '/repo/wt' }))
  on('process.run', () => done({ exitCode: 0, stdout: 'http://x/s/1\n', stderr: 'Using the existing worktree\n' }))

  const out = await $.command.run({ command: 'serpiff', args: '' })

  expect(out.text).toBe('http://x/s/1\nUsing the existing worktree')
  expect(out.context).toBeUndefined()
})

test('success with no output says it opened', async ($, on) => {
  on('session.cwd', () => ({ value: '/repo/wt' }))
  on('process.run', () => done({ exitCode: 0, stdout: ' \n', stderr: '' }))

  const out = await $.command.run({ command: 'serpiff', args: '' })

  expect(out.text).toBe('Opened in serpiff.')
})

test('failure prints the exit code and stderr', async ($, on) => {
  on('session.cwd', () => ({ value: '/repo/wt' }))
  on('process.run', () => done({ exitCode: 2, stdout: 'ignored', stderr: 'no such PR\n' }))

  const out = await $.command.run({ command: 'serpiff', args: '#99' })

  expect(out.text).toBe('serp exited with 2\nno such PR')
  expect(out.context).toBeUndefined()
})

test('failure with empty stderr falls back to stdout', async ($, on) => {
  on('session.cwd', () => ({ value: '/repo/wt' }))
  on('process.run', () => done({ exitCode: 1, stdout: 'something\n', stderr: '' }))
  const withStdout = await $.command.run({ command: 'serpiff', args: '' })
  expect(withStdout.text).toBe('serp exited with 1\nsomething')
})

test('failure with no output prints only the exit code', async ($, on) => {
  on('session.cwd', () => ({ value: '/repo/wt' }))
  on('process.run', () => done({ exitCode: 1, stdout: '', stderr: '' }))

  const out = await $.command.run({ command: 'serpiff', args: '' })

  expect(out.text).toBe('serp exited with 1')
})

test('serp that cannot start is reported', async ($, on) => {
  on('session.cwd', () => ({ value: '/repo/wt' }))
  on('process.run', () => {
    throw new Error('spawn serp ENOENT')
  })

  const out = await $.command.run({ command: 'serpiff', args: '' })

  // A throwing test hook is skipped, so the plugin's call rejects with the engine's error.
  expect(out.text).toStartWith('Could not run serp: ')
})

test('the command is registered on session start', async ($, on) => {
  const registered: unknown[] = []
  on('session.start', () => ({ cwd: '/from-next' }))
  on('command.register', (_$, e) => {
    registered.push(e)
    return { value: { command: 'serpiff' } }
  })

  const started = await $.session.start({ cwd: '/repo/wt', surface: null, isInteractive: false })

  // The hook passes the event on with next(e).
  expect(started.cwd).toBe('/from-next')

  expect(registered).toEqual([
    {
      name: 'serpiff',
      description: 'Open this worktree (or a PR / branch) as a review session in serpiff',
      argumentHint: '[<pr>|<branch>|<base>...<head>]',
    },
  ])
})
