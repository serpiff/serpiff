# serpiff for Claude Code

A Claude Code mod (a function-hooks plugin) that lets a Claude Code session use
[serpiff](https://github.com/serpiff/serpiff), a local code review tool.

> The Claude Code mod API is in early access and may change between releases.

## What it does

- `/serpiff [<target>]` opens a review session in serpiff by running
  `serp session add <target> --open`.
  - With no argument (or only whitespace), `<target>` is the session's working directory,
    so the current worktree is opened.
  - With an argument, it is trimmed and passed as one value: a PR (`#12`), a branch name,
    or `<base>...<head>`.
- The command runs `serp` without a shell, so the argument is never interpreted as a command.
- The output of `serp` (stdout, then stderr) is shown in the session. Nothing is sent to the model.
  When serpiff runs as the app, `serp` returns as soon as the app accepts the request
  (`Opening in serpiff…`); notes and failures found by the app (for example, a branch that does not exist)
  are shown in the app.
  If `serp` succeeds without output, it shows `Opened in serpiff.`
  If `serp` exits with a non-zero code, the output is `serp exited with <code>` followed by its stderr
  (or stdout when stderr is empty). If `serp` cannot start or is still running after 60 seconds,
  the output is `Could not run serp: <reason>`.
- The prompt footer's mode labels (the dim text at the right end, beside `focus` and the like)
  show how far the review of the session's worktree has come, from
  `serp session status <cwd> --json` (10 second timeout, `<cwd>` read again each time):
  - `<label> · <files_viewed>/<files_total> (<viewed>/<total>) viewed` (e.g. `PR #42 · 12/30 (76/88) viewed`:
    12 of 30 files, 76 of 88 units such as declarations), in the same form when everything is Viewed
    (`PR #42 · 30/30 (88/88) viewed`), and `<label> · no changes` when there are none.
    `<label>` is `PR #<n>` for a PR session and the branch name for a branch session.
    It is added after the other modes (joined by ` & `), so it takes no extra line and has no warning mark.
    The label and `no changes` are dim like the other modes; the progress (`12/30 (76/88) viewed`) is the theme's
    `suggestion` color (blue), or `success` (green) when everything is Viewed, so they follow the light and dark themes.
    Only the terminal and desktop screens draw it, and the footer is drawn again only when the text changes.
  - It updates when the session starts, every 30 seconds, at the end of each turn of the main loop
    (not a subagent's), and right after `/serpiff` and again 5 seconds later (with the app, the session is
    created just after `serp session add --open` returns). Updates never hold anything back:
    the session start, the end of a turn and the output of `/serpiff` do not wait for `serp`.
  - Only one `serp session status` runs at a time. Requests that arrive during a run are folded into one more run after it.
  - If serpiff is not running, has no session for the worktree, or `serp` fails or times out, no mode is added.
    The mod never starts serpiff for this (`serp session status` does not), and keeps asking
    so the mode appears once a session exists.

## Requirements

- `serp` on the `PATH` of the Claude Code session. It starts serpiff if it is not running.
- Claude Code 2.1.296 (the version this mod was checked with).
- serp 0.1.0 or later for `/serpiff`; serp 0.1.3 or later for the progress mode (the first release with
  `serp session status`). With an older `serp` the mode is not shown and `/serpiff` works as before.
- A CLI session (the mod runs `serp` with `$.process.run`, which is available there only).

## Install

In a Claude Code terminal session, run:

```
/plugin install serpiff --marketplace serpiff/serpiff
```

Answer `y` when asked whether to add the marketplace, then choose a scope (the default is user).

## Developing

To load the mod from a checkout, for one run:

```sh
claude --plugin-dir <path-to-this-folder>
```

For every session (the value is an absolute path, `~` allowed; separate several with the OS path
separator, `:` on macOS and Linux), set `CLAUDE_CODE_PLUGIN_DIRS` in the `env` of `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "<path-to-this-folder>"
  }
}
```

When an interactive session loads the mod with `--plugin-dir`, the engine writes type definitions to
`.claude-plugin/types/` and, since the mod has no `tsconfig.json`, a `tsconfig.json` that extends them.
Both are generated and listed in this folder's `.gitignore`.
Nothing is written by `-p` runs or by `claude plugin validate` / `claude plugin test`.

## Checks

```sh
claude plugin validate <path-to-this-folder>
claude plugin test <path-to-this-folder>
```

`tests/serpiff.test.ts` runs against the engine with `serp` replaced by a test hook.
Optionally, after an interactive session has loaded the mod with `--plugin-dir`
(which writes the type definitions), `tsc -p <path-to-this-folder>` type-checks it.

## License

MIT. See [`LICENSE`](LICENSE).
