# Changelog

User-facing changes to serpiff, listed by version. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

English | [日本語](https://github.com/serpiff/serpiff/blob/main/CHANGELOG-ja.md)

## [0.3.2] - 2026-10-26

### Changed

- Peeking from a type's name (such as a TypeScript class) now shows the whole type declaration, including its methods, not just the declaration line and fields. In TypeScript, peeking from `new Counter()` now opens the class card instead of a list of two definitions (the class and its constructor)
- Text buttons now look and line up the same way across the app. Primary buttons share one tinted style, and button order, sizes, and the busy state (a small spinner before the label) are consistent. Buttons that open a step to confirm before running now end with "…"

### Fixed

- Peeking from the name of a class with no fields showed only the `class C {` line in the card

## [0.3.1] - 2026-10-25

### Changed

- Line breaks inside a comment paragraph are now shown as line breaks, as on GitHub (previously they were joined into one line with a space)

### Fixed

- Reopening a Viewed file with the ▾ in its file header now also opens its changed declarations
- Pressing Tab inside a dialog could move focus out of the dialog when macOS "Keyboard navigation" was off
- When dialogs were stacked, Tab, Escape, and shortcuts could reach a dialog behind the front one, and focus could be lost after one closed. The Orca error dialog now also takes focus correctly when it opens during the loading overlay
- The bottom of the focus ring on the Close button in the What's New dialog shown after an update could be cut off

## [0.3.0] - 2026-10-22

### Added

- Paid licenses are now on sale (¥500 a month or ¥3,000 a year). The buy button in the license dialog, the Free plan notice, and the monthly limit notice opens the checkout. After buying, `Manage subscription` lets you manage payments and registered devices. The buy button on the website works too

### Changed

- The app icon shown on macOS versions before macOS 26 now looks the same as the macOS 26 icon

### Fixed

- In the merge dialog, the Cancel button could wrap and overflow after choosing a merge method

## [0.2.8] - 2026-10-22

### Added

- The Callers panel is now Usages: besides the callers of functions and methods, it shows where types, constants, variables, and fields are used. The heading shows the count
- Option+click on an identifier in the diff, in peek cards, or in the full file view makes it the root of Usages
- In Unity projects, C# hover, peek, and Calls now resolve types in other files. serpiff provides the `.csproj` itself when the one the Unity editor generates is missing. When the matching Unity version is not found, a warning in the header says so

### Changed

- Child rows in the Calls and Usages trees always open as a peek, whether inside or outside the diff. The opened row highlights where the call or use is

### Fixed

- The key path on collapsed YAML rows could go wrong after multi-line strings, quoted values, flows (`[…]` and `{…}`), or values after `---`
- Switching back to the window refreshed its contents only the first time it got focus
- Pressing Esc while converting Japanese input in the branch picker closed the picker

## [0.2.7] - 2026-10-21

### Added

- Sessions can now be created automatically for pull requests where your review is requested. Turn it on under "Review requests" in the repository settings (off by default). When a managed worktree is free, it is prepared and the setup script runs, so you can start reading as soon as you open the session. Sessions you never opened are cleaned up when the request goes away
- Cmd+Option+click peeks the implementations of an interface method and the like. Add Shift to jump to the implementation. It works in the diff, in peek cards, and in the full file view
- The pull request picker can search with GitHub's search syntax (such as `is:open author:@me`). It also has menus for author, label, assignee, reviews, state, and sort, plus buttons for common filters. Closed or merged pull requests and other people's pull requests that are not listed can be picked without knowing their numbers
- In YAML diffs, the collapsed rows show the path of the keys around the rows below them (such as `spec.template.spec.containers[0]`). When a single line deep in the tree changes, you can tell which key it is under
- After the app updates and relaunches, it shows the changes in that version once (starting with updates from this version)

### Changed

- The server now refreshes the review request list periodically, even when no window is open
- Rows in the pull request picker show labels, closed and merged marks, and the review status
- The hover hint now mentions how to peek implementations
