# serpiff for Chrome

English | [日本語](README-ja.md)

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

- serpiff 0.3.10 or later: the bundled serpiff app (the `.app`), which carries this extension and registers the `serpiff://` URL scheme.
  If serpiff is not running, macOS starts it. `serpiffd serve` and the `app:dev` build do not receive the scheme.
- The pull request's repository must already be registered in serpiff.

## Install

The extension is not on the Chrome Web Store. The serpiff app bundles it and writes it to
`~/.local/share/serpiff/chrome-extension/` on every launch. See <https://serpiff.com/en/#chrome> as well.

1. Launch serpiff once.
2. Open `chrome://extensions` and turn on Developer mode.
3. In serpiff, choose Help > "Show Chrome Extension in Finder", then click "Load unpacked" in Chrome and select that
   folder. The folder is inside the hidden `.local` folder, so drag it from Finder into the dialog, or paste its path
   with ⌘⇧G.
4. Open a GitHub pull request and click the serpiff button in the toolbar (pin it from the puzzle-piece menu).

After installing or reloading the extension, reload any GitHub tabs that are already open.

To update, update serpiff (it rewrites the folder on launch), then click the reload button (↻) on serpiff's card in
`chrome://extensions`. Do not move the folder; Chrome reads it from there.

If you installed the Chrome Web Store version, remove it before loading this one. The IDs differ, so having both shows
the button twice.

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
