import type { Hook, Register } from 'claude-code'

type Engine = Parameters<Hook<'session.start'>>[0]

type Kind = { type: 'pull_request'; number: number } | { type: 'local_branch'; name: string }

// What the footer shows for the session: the parts of the text, so the render hook can
// color each one.
type Progress = {
  label: string
  state: 'progress' | 'all' | 'none'
  viewed: number
  total: number
  filesViewed: number
  filesTotal: number
}

// The footer parts for `serp session status --json`, or undefined when the output is not
// the shape we know (nothing is added then).
const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0

const statusProgress = (stdout: string): Progress | undefined => {
  const data: unknown = JSON.parse(stdout)
  if (typeof data !== 'object' || data === null) return undefined
  const { kind, total, viewed, files_total: filesTotal, files_viewed: filesViewed } = data as {
    kind?: Kind
    total?: unknown
    viewed?: unknown
    files_total?: unknown
    files_viewed?: unknown
  }
  if (!isCount(total) || !isCount(viewed) || !isCount(filesTotal) || !isCount(filesViewed)) return undefined
  let label: string
  if (kind?.type === 'pull_request' && Number.isInteger(kind.number)) {
    label = `PR #${kind.number}`
  } else if (kind?.type === 'local_branch' && typeof kind.name === 'string' && kind.name !== '') {
    label = kind.name
  } else {
    return undefined
  }
  const counts = { viewed, total, filesViewed, filesTotal }
  if (total === 0) return { label, state: 'none', ...counts }
  // Green only when both the units and the files are done; a broken invariant (29/30 files
  // with every unit Viewed) stays blue, like the web header's file-based completion.
  if (viewed >= total && filesViewed >= filesTotal) return { label, state: 'all', ...counts }
  return { label, state: 'progress', ...counts }
}

const isSame = (a: Progress | undefined, b: Progress | undefined) =>
  a === b ||
  (a !== undefined &&
    b !== undefined &&
    a.label === b.label &&
    a.state === b.state &&
    a.viewed === b.viewed &&
    a.total === b.total &&
    a.filesViewed === b.filesViewed &&
    a.filesTotal === b.filesTotal)

// Module state: a reload starts these over, together with the timers.
let isRunning = false
let isPending = false
let isTimerStarted = false

// What the footer shows now. A module variable is enough: only the SessionMode hook reads
// it, and a reload starts it over (session.start comes again and refreshes it).
let progress: Progress | undefined

const setProgress = ($: Engine, next: Progress | undefined) => {
  if (isSame(next, progress)) return
  progress = next
  // Draw the footer again, only when the value changed.
  $.ui.invalidate('ui.render')
}

// Ask serp for the Viewed progress of the session's cwd and keep it for the footer.
// Anything that goes wrong removes the mode.
const refreshOnce = async ($: Engine) => {
  try {
    const cwd = await $.session.cwd()
    const result = await $.process.run(['serp', 'session', 'status', cwd, '--json'], {
      timeoutMs: 10_000,
    })
    setProgress($, result.exitCode === 0 ? statusProgress(result.stdout) : undefined)
  } catch {
    try {
      setProgress($, undefined)
    } catch {
      // nothing more to do
    }
  }
}

// Only one run at a time. A request that arrives during a run only marks it pending;
// when the run ends, one more run covers all of them.
const refresh = async ($: Engine) => {
  if (isRunning) {
    isPending = true
    return
  }
  isRunning = true
  try {
    do {
      isPending = false
      await refreshOnce($)
    } while (isPending)
  } finally {
    isRunning = false
  }
}

export const register: Register = on => {
  // The footer's mode labels: draw the engine's own as it does (dim, joined by " & "), then
  // ours. `modes` is strings only and cannot carry a color, so the tree is drawn here.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const current = progress
    if (current === undefined) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const lead = [...e.props.modes, ''].join(' & ')
    if (current.state === 'none') {
      return (
        <Box flexDirection="row" flexWrap="nowrap">
          <Text dimColor>{`${lead}${current.label} · no changes`}</Text>
        </Box>
      )
    }
    const isAll = current.state === 'all'
    return (
      <Box flexDirection="row" flexWrap="nowrap">
        <Text dimColor>{`${lead}${current.label} · `}</Text>
        <Text color={isAll ? 'success' : 'suggestion'}>
          {`${current.filesViewed}/${current.filesTotal} (${current.viewed}/${current.total}) viewed`}
        </Text>
      </Box>
    )
  })

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'serpiff',
      description: 'Open this worktree (or a PR / branch) as a review session in serpiff',
      argumentHint: '[<pr>|<branch>|<base>...<head>]',
    })
    // One timer per module load, even if session.start fires again.
    if (!isTimerStarted) {
      isTimerStarted = true
      $.clock.every(30_000, () => {
        void refresh($)
      })
    }
    // Not awaited: session.start is awaited before the first prompt, and serp may hang.
    void refresh($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    // Subagent turns are not the main loop's.
    if (e.agentId === undefined) void refresh($)
    return next(e)
  })

  on('command.run', { command: 'serpiff' }, async ($, e) => {
    const out = await runSerpiff($, e.args)
    // The output is unchanged and not held back. With the app, `serp session add --open`
    // returns once the app accepts the request and the session is made after that,
    // so ask right away and again after 5 seconds.
    void refresh($)
    $.clock.after(5_000, () => {
      void refresh($)
    })
    return out
  })
}

const runSerpiff = async ($: Engine, args: string): Promise<{ text: string }> => {
  try {
    // The target is one argv element: no shell, no splitting.
    const target = args.trim() || (await $.session.cwd())
    const result = await $.process.run(['serp', 'session', 'add', target, '--open'], {
      timeoutMs: 60_000,
    })
    const stdout = result.stdout.trim()
    const stderr = result.stderr.trim()

    if (result.exitCode === 0) {
      const text = [stdout, stderr].filter(s => s !== '').join('\n')
      return { text: text || 'Opened in serpiff.' }
    }

    const detail = stderr || stdout
    const head = `serp exited with ${result.exitCode}`
    return { text: detail ? `${head}\n${detail}` : head }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { text: `Could not run serp: ${reason}` }
  }
}
