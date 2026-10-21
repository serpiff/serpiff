# Changelog

User-facing changes to serpiff, listed by version. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

English | [日本語](https://github.com/serpiff/serpiff/blob/main/CHANGELOG-ja.md)

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
