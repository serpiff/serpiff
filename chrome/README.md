# serpiff for Chrome

A Chrome extension that opens the GitHub pull request you are viewing in
[serpiff](https://github.com/serpiff/serpiff), a local code review tool.

## What it does

- On a pull request page (`https://github.com/<owner>/<name>/pull/<n>` and the pages below it, such as
  `/files` and `/commits/<sha>`), the toolbar button is enabled. Clicking it opens
  `serpiff://open?url=<the PR's URL>`. serpiff opens the PR's session, creating it if it does not exist
  (the same as `serp session add <PR URL> --open`).
- A serpiff logo button (tooltip: `Open in serpiff`) is also added to the PR header, just after the Code button. It is a plain link to the same
  `serpiff://` URL. If the header is not found, nothing is added.
- On the pull request lists (`/pulls` and its tabs such as `/pulls/inbox`, and `/<owner>/<name>/pulls` with its
  `/<user>` and `/<filter>/<user>` paths, with or without query filters), each row gets a small serpiff logo button
  at the right end of its metadata. The toolbar button stays disabled there (it is not a single PR).
- On every other page the toolbar button is disabled (gray) and nothing is added.
- The URL passed to serpiff is always normalized to `https://github.com/<owner>/<name>/pull/<n>`
  (no trailing slash, sub-path, query or fragment).

GitHub moves between pages without reloading; the extension follows those moves.

## Requirements

- serpiff 0.1.4 or later: the bundled serpiff app (the `.app`), which registers the `serpiff://` URL scheme.
  If serpiff is not running, macOS starts it. `serpiffd serve` and the `app:dev` build do not receive the scheme.
- The pull request's repository must already be registered in serpiff.

## Install

1. Get this folder: it is published as `chrome/` on the `main` branch of
   [serpiff/serpiff](https://github.com/serpiff/serpiff) (for example, `git clone --depth 1 https://github.com/serpiff/serpiff`).
2. Open `chrome://extensions` and turn on Developer mode.
3. Choose "Load unpacked" and select `chrome/` (no build step).
4. Open a GitHub pull request and click the serpiff button in the toolbar (pin it from the puzzle-piece menu).

After installing or reloading the extension, reload any GitHub tabs that are already open.

Keep the loaded folder in place (Chrome reads it from there). To update, run `git pull` in your clone and then reload
the extension in `chrome://extensions`.

The page button opens `serpiff://` from github.com, so Chrome asks per site whether to open serpiff, and you can
choose "Always allow". The toolbar button opens it from the extension instead, so Chrome may ask in a different way
(possibly every time). Allow it when asked.

## Permissions

- Content script on `https://github.com/*` only. It reads the page's own URL and adds the page button.
- No host permissions, no `tabs`, no network access, no storage.
- The service worker only enables or disables the toolbar button for the tab that reports a PR page,
  and navigates that tab to the `serpiff://` URL when the button is clicked.

## Not supported

- Anything other than pull requests (issues, branches, compare pages).
- GitHub Enterprise (hosts other than `github.com`).

## Tests

No dependencies; Node 24 or later. In this folder (`chrome/` in serpiff/serpiff, `integrations/chrome/` in the source
repository):

```sh
node --test
```

`tests/normalize.test.mjs` covers the URL normalization in `normalize.js`.

## License

MIT. See [`LICENSE`](LICENSE).
