<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://serpiff.com/img/readme/serpiff-wordmark-dark-glass.png">
  <img src="https://serpiff.com/img/readme/serpiff-wordmark-light-glass.png" alt="serpiff" width="295">
</picture>

English | [日本語](https://github.com/serpiff/serpiff/blob/main/README-ja.md)

A tool for efficiently reviewing GitHub pull requests locally. It lets you read through pull requests and local branches declaration by declaration, such as functions and types.

- Download and how to use: <https://serpiff.com/en/>
- Release files: [Releases](https://github.com/serpiff/serpiff/releases/latest)

This repository holds only the downloads, the files used to publish the site, the Claude Code mod and the Chrome extension. **The source code of the app is not public.** The Claude Code mod in `claude-code/` and the Chrome extension in `chrome/` are MIT licensed.

## Install

serpiff is for Macs with Apple silicon (macOS 27.0 or later). `git` and `gh` must be installed and on your PATH, and you must be logged in with `gh auth login`. Run the following command in a terminal.

```
gh release download -R serpiff/serpiff -p install.sh -O - | sh
```

For more, including how to install the dmg manually, see [serpiff.com](https://serpiff.com/en/#install).

## The name

**serpiff** blends *serpit* (Latin for "it creeps") and *diff*. Like the logo, it stands for a snake.

## The logo

The Japanese proverb *hebi ni niramareta kaeru* (蛇に睨まれた蛙) describes a frog frozen under a snake's glare. In serpiff's logo, the S-shaped snake glares at a diff (one removed line, one added line) instead of a frog. It stands for the reviewer's gaze: nothing in the diff slips past.

## Features

### Viewed per declaration

On GitHub, Viewed works per file. serpiff goes finer. In Go, each changed declaration (function, method, type and so on) has its own Viewed checkbox, and in Markdown each changed section does. Check one and the declaration folds into a single line. Once every changed declaration in a file is Viewed, the whole file folds away.

<kbd>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://serpiff.com/img/readme/viewed-dark.gif">
  <img src="https://serpiff.com/img/readme/viewed-light.gif" alt="Marking Greet, titleCase and Farewell as Viewed: each one folds, then the whole file folds">
</picture>
</kbd>

### Review while following the flow

Ctrl+click (Cmd+click on macOS) a call to open its definition right below that line (a peek). Inside a peek you can open the next call, and the next, as deep as the code goes. Each peek of a changed declaration has its own Viewed checkbox. Checking it closes that peek and any Viewed levels around it, stepping you back out to the level you still need to read.

<kbd>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://serpiff.com/img/readme/peek-dark.gif">
  <img src="https://serpiff.com/img/readme/peek-light.gif" alt="Ctrl+clicking Greet, titleCase and splitWords opens three nested peeks; marking each one Viewed closes it">
</picture>
</kbd>

### Read Markdown as rendered

Markdown file diffs are compared block by block as a rendered document instead of as raw source. You can comment right in the rendered view, on a paragraph, a list item, a table row or a line of code. You can mark each section Viewed, and switch to the source whenever you need the exact lines.

<kbd>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://serpiff.com/img/readme/markdown-dark.gif">
  <img src="https://serpiff.com/img/readme/markdown-light.gif" alt="Adding a comment in a rendered Markdown diff and opening it">
</picture>
</kbd>

### Indentation changes that stay readable

Wrap code in a new block and GitHub shows every line inside it as removed and re-added, even though only the wrapping lines actually changed. serpiff matches lines by their content with leading whitespace stripped, so only the lines that were truly added, removed or changed are highlighted green or red. Lines that only got reindented show up dimmed, with a mark for every space (`·`) or tab (`→`) of indent gained or lost. Only the presentation changes. Reindented lines still count as changes, stay in view and still need to be marked Viewed.

<kbd>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://serpiff.com/img/readme/indent-dark.png">
  <img src="https://serpiff.com/img/readme/indent-light.png" alt="A diff wrapping a component's markup in a new div and conditional. Only the new lines and an h2-to-h3 change are green, while the lines in between that only got reindented are dimmed with marks for the added indent">
</picture>
</kbd>

### Always see only what is new

When a later push changes a declaration you already marked Viewed, serpiff flags it with `!` and opens it as the diff from what you viewed to what is there now, not the whole diff against the base again. A heading row marks the left side as the version you viewed and the right as now. Lines you already read stay uncolored, and only what changed since then is highlighted, including lines that were removed. This doesn't depend on Git history. serpiff saves the declaration's own text the moment you mark it Viewed, so the diff since then still shows up even if a force push, rebase or squash later erases the commit that was there when you viewed it. The `from viewed` / `from base` switch takes a declaration back to the full diff against the base, and the `s` key switches every flagged declaration at once.

<kbd>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://serpiff.com/img/readme/since-viewed-dark.gif">
  <img src="https://serpiff.com/img/readme/since-viewed-light.gif" alt="Load and the file's import header, each headed Since last viewed, with the version you viewed on the left and now on the right. The import switch stays on from viewed throughout, showing log swapped for fmt since it was viewed. Load's switch toggles between from viewed (only what changed since viewing is colored: the removed log.Printf line and the read error rewritten as fmt.Errorf) and from base (the full diff against the base, also coloring the data = normalize(data) line). normalize and parse stay Viewed and folded since that push didn't touch them">
</picture>
</kbd>

### Compare Storybook

When a diff includes a Storybook story file, or the component paired with one (`Button.tsx` with `Button.stories.tsx`), that file's header gets a `▶ Stories` toggle. Turn it on to open a panel below the diff with each story's base and head rendered side by side. You can see how a change to props or markup altered the appearance while reading the code that caused it. Building a story runs the pull request's own code, so it only happens for a trusted session (your own pull requests, local branches, external worktrees, or one you trusted explicitly). Otherwise the panel first asks you to trust the session.

<kbd>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://serpiff.com/img/readme/storybook-dark.png">
  <img src="https://serpiff.com/img/readme/storybook-light.png" alt="A diff of Button.stories.tsx (Primary's args changed) with its Stories panel open below, showing Primary and Secondary base and head side by side, and every head button restyled by a Button.tsx change">
</picture>
</kbd>

## Supported languages

Files in these languages are split into declarations (sections for Markdown), each with its own Viewed checkbox. Hover docs, peeks and the Calls tree come from the language server in the table.

| Language   | Extensions                         | Language server             | Needs trust |
| ---------- | ---------------------------------- | --------------------------- | ----------- |
| C / C++    | `.c`, `.cpp`, `.cc`, `.hpp`, `.h`  | clangd                      | Yes         |
| C#         | `.cs`                              | roslyn-language-server      | Yes         |
| Go         | `.go`                              | gopls                       | No          |
| Java       | `.java`                            | jdtls                       | Yes         |
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs`      | tsc (TypeScript 7, `--lsp`) | No          |
| Kotlin     | `.kt`, `.kts`                      | kotlin-lsp                  | Yes         |
| Markdown   | `.md`, `.markdown`                 | —                           | —           |
| Perl       | `.pl`, `.pm`, `.t`, `.PL`, `.psgi` | perl-lsp                    | No          |
| Python     | `.py`, `.pyi`                      | ty                          | No          |
| Rust       | `.rs`                              | rust-analyzer               | Yes         |
| Swift      | `.swift`                           | sourcekit-lsp               | Yes         |
| TypeScript | `.ts`, `.mts`, `.cts`, `.tsx`      | tsc (TypeScript 7, `--lsp`) | No          |

A language that needs trust starts its language server only for a trusted session (your own pull requests, local branches, external worktrees, or one you trusted explicitly), because starting it can already run the pull request's code. That means MSBuild files, NuGet restore, analyzers and source generators for C#, the full clang front end parsing the sources and headers for C and C++, the Gradle or Maven build for Java, the Gradle build for Kotlin, build scripts and proc macros for Rust, and `Package.swift`, macros and build plugins for Swift.

C and C++ also need a `compile_commands.json` (from CMake, Meson, Bear and so on) in the worktree or in the original repository. serpiff never generates one, and says how to make one when it is missing.

> [!NOTE]
> The images and animations above may not match the latest version.

## Claude Code mod

Run `/serpiff` in a Claude Code terminal session to open a worktree or a pull request in serpiff. The prompt footer shows how far the review of the session's worktree has come, as the number of Viewed items. The progress display needs serpiff 0.1.3 or later. Install the mod by running the following command in Claude Code.

```
/plugin install serpiff --marketplace serpiff/serpiff
```

When asked whether to add the marketplace, answer `y`, then choose a scope. For more, see [`claude-code/README.md`](https://github.com/serpiff/serpiff/blob/main/claude-code/README.md).

## Chrome extension

On a GitHub pull request page, you can open that pull request in serpiff from the toolbar button or from the serpiff logo button in the header (on pull request lists, the logo button at the right end of each row). It needs serpiff 0.1.4 or later. Get this repository with `git clone --depth 1 https://github.com/serpiff/serpiff`, turn on Developer mode in `chrome://extensions`, choose "Load unpacked" and select `chrome/`. For more, see [`chrome/README.md`](https://github.com/serpiff/serpiff/blob/main/chrome/README.md).

## Contact

You can send questions and bug reports to support@serpiff.com. Support is not promised ([License Agreement (Japanese)](https://serpiff.com/legal/eula), Article 10), and whether to reply is up to the provider. Requests about cancellation, refunds and personal information are handled as the License Agreement and the Privacy Policy provide.

- [License Agreement (Japanese)](https://serpiff.com/legal/eula)
- [Privacy Policy (Japanese)](https://serpiff.com/legal/privacy)
- [Legal Notice (Japanese)](https://serpiff.com/legal/tokushoho)
