# Changelog

User-facing changes to serpiff, listed by version. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

English | [日本語](https://github.com/serpiff/serpiff/blob/main/CHANGELOG-ja.md)

## [0.3.9] - 2026-11-09

### Added

- The Reviewers section of the sidebar is now Details, with Assignees, Labels and Milestone sections below Reviewers. You can see and add, remove or change the PR's assignees, labels and milestone from serpiff
- Details now has a Projects section. It shows the Projects the PR is in with their Status, and lets you add the PR to a project, remove it, and change its Status. When the token lacks the `project` scope, it shows the command to add it

### Fixed

- On a big diff, opening, closing and typing in the Conversation and CheckRun pop-outs was slow
- After closing a dialog or the Conversation pop-out opened with the mouse, focus did not return to the button that was clicked
- In Details and Reviewers, making changes in quick succession could leave a removed label or similar on screen until the next refresh (60 seconds)

## [0.3.8] - 2026-11-06

### Fixed

- In the Markdown rendered view, the part before the first heading (such as front matter) could not be folded. It now folds with ▾ like a section and reads `header · N ブロック` when folded. Files without headings now get the sticky bar too

## [0.3.7] - 2026-11-04

### Added

- While waiting for the language server, the clicked identifier now shows a moving dotted underline (when there is no answer within 200ms)
- When peek, implementation, jump or ⌥+click has no result, the reason (still starting, `No definition found`, and so on) is now shown in a bubble at the clicked position instead of a toast at the bottom right

### Changed

- Cmd+click, ⌥+click and similar clicks on a word inside a keyword, string or comment now do nothing instead of asking the language server
- Go methods are now labeled as Go method expressions, `func (*Server).Handle`, instead of `method Server.Handle`

### Fixed

- A comment inside a Go receiver type or package clause broke the method or package name. Methods that had the broken name lose their Viewed mark once
- On lines with emoji or similar characters before a word, hover, peek and Usages answered for a different word

## [0.3.6] - 2026-11-02

### Added

- When a diff's hidden-lines row (`⋯ N lines hidden`) falls inside a declaration, its left edge now shows the declaration's name (`func Foo` in Go), so you can tell which function or method the changes after the hidden lines belong to

### Fixed

- Setting Viewed from the checkbox on a stuck file header or a declaration's sticky bar left the folded row above the top of the screen. It now scrolls back to where the folded row is visible
- In the Comments and ✦ Questions tabs below a diff line, pressing ← →, Home or End while a draft with text was open elsewhere left focus on a tab that was not selected. Focus now stays on the selected tab

## [0.3.5] - 2026-10-29

### Added

- In the sidebar's Conversations, a review's card now shows the line-comment and file-comment threads that the review started. You can expand, reply to, resolve and edit them in place, and clicking `path:line` jumps to the thread in the diff. Threads with replies and resolved threads are shown collapsed
- Question cards now have "Post as comment", which opens a line-comment draft at the same position with the memo and the question and answer as its body. Sending it removes the question

### Changed

- Below a diff line, "Comments" and "✦ Questions" tabs now appear whenever there is at least one comment or question (even when one side has none). A new draft's editor is also placed inside those tabs
- In the sidebar's Conversations, the description and each item are now separated as cards
- Buttons, text inputs, selects, checkboxes, tabs, small labels, and error and hint text now look and behave the same across the app. Tabs can also be moved between with ← →, Home and End
- In the review requests dialog, the dot marking a new request moved to the avatar's top right

### Fixed

- When the auto-run of Viewed patterns showed its confirm dialog, you had to wait before Apply became clickable
- Focus rings were cut off or hidden on the search bar's `Aa` and `.*`, on panel-heading buttons, and on buttons in the popovers opened from the notice list

## [0.3.4] - 2026-10-28

### Added

- Two new ways to reach the setting that creates sessions automatically from review requests. The bottom of the review requests dialog now has a checkbox for each registered repository that you can toggle in place (shown even when there are no requests). The header's gear menu now ends with "Repository settings…", which opens the settings of the session's repository

### Changed

- Creating a session for a PR now makes fewer fetches and GitHub calls, so it is faster. For PRs with a review request, the head and base are fetched ahead of time while polling, so their sessions are created right away
- Popovers opened from the header (Settings, the "…" menu, the ⚠ notice list, and others) now close and look the same way. Settings and the menu no longer run off the screen in a short window, and open upward when there is no room below. Pressing Escape in a nested popover closes only the inner one

### Fixed

- In the Unified view of a rendered diff, adding or removing rows (such as expanding or collapsing a file) had become slow (since 0.3.3)

## [0.3.3] - 2026-10-28

### Added

- A right panel beside the diff, holding a Claude chat. When closed it keeps a slim column of icons (a rail) to open it from. It runs your local `claude` in the session's worktree, and you can switch the model and mode, answer tool permission requests, and load past conversations
- The in-app terminal can now open several shells per session, in tabs that can be split side by side. Its toggle moved to the right of the footer

### Changed

- The left sidebar now keeps a slim column of icons (a rail) when closed, and opens one panel at a time. The header button that toggled the sidebar is gone; open panels from the rail. Suggestions and Questions moved to the right panel
- Dialogs now share the same header and ✕ button, and handle keys and focus the same way across the app
- Dragging a selection in the Split view now copies only the side where the selection starts (as in GitHub's Split view). Copying from the Unified view no longer includes line numbers and markers

### Fixed

- In Go, files with syntax errors confined to function bodies (such as Go 1.26's `new(expr)`) fell back to a whole-file view instead of being split into declarations
- In the Markdown Split view, the center line shifted when switching between rendered and raw
- The Claude chat could not find past conversations in worktrees with long paths
- Reconnecting the Claude chat dropped the permission cards you had already answered. Quickly changing the model or mode twice could also leave the display out of sync with the actual state
- When pop-outs or dialogs were stacked, acting on the dialog on top (Escape, a click, or picking an emoji candidate) could also close the pop-out or popover beneath it
- While a pop-out was open, a dialog opened inside the sidebar card could stay hidden yet take keys; the card is now dimmed and inert while covered
- Pressing `u` while dragging a column border half-applied the Split / Unified switch; it is now ignored during the drag

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
