// Content script (classic script; normalize.js is loaded before it).
(function () {
  const normalize = globalThis.serpiffNormalizePrUrl;
  const isPrListPath = globalThis.serpiffIsPrListPath;
  const buildOpenUrl = globalThis.serpiffBuildOpenUrl;
  // The texts follow the language of Chrome (_locales/).
  const REVIEW_LABEL = chrome.i18n.getMessage('openInReview');
  const DEVELOP_LABEL = chrome.i18n.getMessage('openInDevelop');
  const MARK = 'data-serpiff-open'; // the page's R and D buttons
  const MODE_MARK = 'data-serpiff-mode'; // on each link of a group: review or develop
  const PR_ATTR = 'data-serpiff-pr'; // on a group: the PR URL its links point at

  const ROW_MARK = 'data-serpiff-row'; // list links; separate from MARK so the PR page's "exactly one" check ignores them
  const ROW_TITLE_CONTAINER = '[data-listview-item-title-container]';
  const ROW_TITLE_LINK = `${ROW_TITLE_CONTAINER} a[href*="/pull/"]`; // no data-testid on /pulls/inbox
  const HEADER_ACTIONS = '[data-component="PH_Actions"]';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  let lastIsPr = null;
  let button = null; // the button group this script inserted
  let observer = null;
  let hadRows = false; // whether this script may have inserted list links

  function currentPrUrl() {
    return normalize(location.href);
  }

  function reportState(isPr) {
    if (isPr === lastIsPr) return;
    lastIsPr = isPr;
    try {
      chrome.runtime.sendMessage({ type: 'serpiff:pr-page', isPr })?.catch(() => {});
    } catch {
      // The extension was reloaded; this script is orphaned.
    }
  }

  // The PR header's Code button: a button in the header actions whose text (aria-label when icon-only) is Code.
  // Found by label, not by GitHub's hashed class names, which change.
  function isCodeButton(element) {
    return (
      element.matches('button') &&
      (element.getAttribute('aria-label') === 'Code' || element.textContent.trim() === 'Code')
    );
  }

  function findCodeButton() {
    for (const candidate of document.querySelectorAll(`${HEADER_ACTIONS} button`)) {
      if (isCodeButton(candidate)) return candidate;
    }
    return null;
  }

  // Where the button goes, in order of preference (checked against GitHub's PR header, 2026-10-13; the Code
  // button is found by its label inside the header actions, since GitHub's hashed class names change):
  //  1. just after the Code button (the rightmost of the row), inside the gap-spaced row that holds it;
  //  2. the end of that row (the first child div of the React header's actions);
  //  3. the start of the classic header's actions (.gh-header-actions).
  // Returns { parent, before } (before === null means append), or null when nothing matches.
  function findSlot() {
    const code = findCodeButton();
    if (code && code.parentElement) {
      // Skip our own buttons, so a button already right after Code counts as in place.
      let before = code.nextSibling;
      while (before && before.nodeType === Node.ELEMENT_NODE && before.hasAttribute(MARK)) {
        before = before.nextSibling;
      }
      return { parent: code.parentElement, before };
    }
    const row = document.querySelector(`${HEADER_ACTIONS} > div`);
    if (row) return { parent: row, before: null };
    const legacy = document.querySelector('.gh-header-actions');
    if (legacy) return { parent: legacy, before: legacy.firstChild, legacy: true };
    return null;
  }

  function removeButtons() {
    for (const element of document.querySelectorAll(`[${MARK}]`)) element.remove();
  }

  function svgElement(name, attributes) {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  }

  // The R and D glyphs: a copy of web's ReviewModeIcon / DevelopModeIcon (16-unit viewBox, stroke 2.2, round; the
  // vertical stroke red, the rest green), kept here so this folder stays self-contained. The colors are GitHub's
  // danger / success variables (which follow its light and dark themes), falling back to serpiff's default
  // --diff-inline-removed-line / --diff-inline-added-line. Built with createElementNS (no innerHTML, which Trusted
  // Types blocks) and colored through element.style (no <style> element, whose class names would leak into the page).
  const ICONS = {
    review: 'M7.475 3.15H9.165A2.56 2.56 0 0 1 9.165 8.27H7.475L11.725 13.15',
    develop: 'M7.475 3.15A4.25 4.85 0 0 1 7.475 12.85',
  };

  function makeIcon(mode) {
    const icon = svgElement('svg', {
      viewBox: '0 0 16 16',
      width: '16',
      height: '16',
      fill: 'none',
      'stroke-width': '2.2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    });
    // Also in style: GitHub's CSS (`svg { fill: … }`) beats the attribute.
    icon.style.setProperty('fill', 'none');
    const bar = svgElement('path', { d: 'M4.275 3.15V12.85' });
    bar.style.setProperty('stroke', 'var(--fgColor-danger, #cf222e)');
    const rest = svgElement('path', { d: ICONS[mode] });
    rest.style.setProperty('stroke', 'var(--fgColor-success, #1a7f37)');
    icon.append(bar, rest);
    return icon;
  }

  // One half of the group: an icon-only link (Primer's `btn`), `size` px square.
  function makeModeLink(mode, size) {
    const link = document.createElement('a');
    link.setAttribute(MODE_MARK, mode);
    link.className = size === 28 ? 'btn btn-sm' : 'btn';
    const label = mode === 'develop' ? DEVELOP_LABEL : REVIEW_LABEL;
    link.setAttribute('aria-label', label);
    link.title = label;
    link.style.display = 'inline-flex';
    link.style.alignItems = 'center';
    link.style.justifyContent = 'center';
    link.style.width = `${size}px`;
    link.style.height = `${size}px`;
    link.style.padding = '0';
    link.append(makeIcon(mode));
    return link;
  }

  // The R and D buttons side by side, 4px apart (each a whole rounded button; kept apart at the user's request).
  // Once inserted, evenSpacing() widens the 4px to the gap of the surrounding row of buttons.
  // `prUrl` is kept on the group; setGroupPr() keeps the hrefs current.
  function makeGroup(markName, prUrl, size) {
    const group = document.createElement('span');
    group.setAttribute(markName, '');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'serpiff');
    group.style.display = 'inline-flex';
    group.style.flex = 'none';
    group.style.gap = '4px';
    group.append(makeModeLink('review', size), makeModeLink('develop', size));
    setGroupPr(group, prUrl);
    return group;
  }

  // Points the group's links at `prUrl`; a no-op when it already does.
  function setGroupPr(group, prUrl) {
    if (group.getAttribute(PR_ATTR) === prUrl) return;
    group.setAttribute(PR_ATTR, prUrl);
    for (const link of group.children) {
      link.setAttribute('href', buildOpenUrl(prUrl, link.getAttribute(MODE_MARK)));
    }
  }

  function makeButton(prUrl, legacy) {
    const group = makeGroup(MARK, prUrl, 32);
    if (legacy) group.style.marginRight = '8px';
    return group;
  }

  // True when `button` already sits exactly where `slot` wants it.
  function isInPlace(button, slot) {
    if (button.parentElement !== slot.parent) return false;
    return slot.before === null ? button.nextSibling === null : button.nextSibling === slot.before;
  }

  function syncButton(prUrl) {
    if (!prUrl) {
      // Not a PR page: nothing to scan for unless we inserted a button.
      if (button) {
        removeButtons();
        button = null;
      }
      return;
    }
    // Fast path: our button is still attached right after the Code button.
    if (
      button &&
      button.isConnected &&
      button.previousElementSibling &&
      isCodeButton(button.previousElementSibling) &&
      button.previousElementSibling.closest(HEADER_ACTIONS)
    ) {
      setGroupPr(button, prUrl);
      return;
    }
    const existing = document.querySelectorAll(`[${MARK}]`);
    const slot = findSlot();
    if (!slot) {
      if (existing.length > 0) removeButtons();
      button = null;
      return;
    }
    // Exactly one button, in the right place: only keep its href current.
    // Anything else (React re-rendered the row, a second copy, a stale place) is removed and re-inserted.
    if (existing.length === 1 && isInPlace(existing[0], slot)) {
      button = existing[0];
      setGroupPr(button, prUrl);
      return;
    }
    removeButtons();
    button = makeButton(prUrl, slot.legacy);
    slot.parent.insertBefore(button, slot.before);
    evenSpacing(button, true);
  }

  // Makes the space between R and D the gap of the surrounding flex row, and on the PR header (`fixLeft`) the
  // space between Code and R too (the user saw Code–R wider than D–bell and R–D). A row's left neighbour may be
  // an empty comment count, so the rows only get the R–D gap. The cause of the extra space is not known (GitHub's DOM is not ours),
  // so this measures: the gap between R and D becomes the parent's column-gap, and a wider space on the left is
  // taken back with a negative left margin. Runs once per insertion; a re-render re-inserts and re-measures.
  function evenSpacing(group, fixLeft) {
    const parent = group.parentElement;
    if (!parent) return;
    const gap = parseFloat(getComputedStyle(parent).columnGap);
    if (!(gap > 0)) return;
    group.style.gap = `${gap}px`;
    if (!fixLeft) return;
    const previous = group.previousElementSibling;
    if (!previous) return;
    const space = group.getBoundingClientRect().left - previous.getBoundingClientRect().right;
    if (space > gap + 0.5) group.style.marginLeft = `${gap - space}px`;
  }

  function makeRowLink(prUrl) {
    // The small variant of the PR page's buttons (28px square), so the rows stay their usual height.
    const group = makeGroup(ROW_MARK, prUrl, 28);
    // The metadata column spans the row's height and its items center themselves; a fixed-height button
    // would sit at the top, so center it too.
    group.style.alignSelf = 'center';
    // Keep the click from reaching the row's own handlers (no preventDefault: the link must still open).
    group.addEventListener('click', (event) => event.stopPropagation());
    return group;
  }

  // The row's right edge is the metadata column: the last child of the row's li (checked 2026-10-13; found by
  // structure, not by class name). Returns null when that child is the title container or holds the title.
  function rowMetaContainer(title) {
    const last = title.closest('li')?.lastElementChild;
    if (!last || last.contains(title) || last.matches(ROW_TITLE_CONTAINER)) return null;
    return last;
  }

  // The PR list: each row is li > ... [data-listview-item-title-container] a[href*="/pull/"]. The R and D buttons go at
  // the end of the row's metadata column.
  function syncRows() {
    if (!isPrListPath(location.pathname)) {
      // Not a list page: scan nothing unless links may have been inserted.
      if (hadRows) {
        for (const element of document.querySelectorAll(`[${ROW_MARK}]`)) element.remove();
        hadRows = false;
      }
      return;
    }
    // A title column may hold several PR links; only the first per row that normalizes to a PR (in DOM order;
    // normally the title) counts.
    const seen = new Set();
    for (const title of document.querySelectorAll(ROW_TITLE_LINK)) {
      const prUrl = normalize(title.href);
      const container = prUrl && rowMetaContainer(title);
      if (!container || seen.has(container)) continue;
      seen.add(container);
      const existing = container.querySelector(`:scope > [${ROW_MARK}]`);
      if (existing) {
        // Already there: update its links if the row now shows another PR.
        setGroupPr(existing, prUrl);
        // Something added after it (such as a comment count) would push it off the right end: move it back.
        if (existing !== container.lastElementChild) container.append(existing);
        continue;
      }
      const group = makeRowLink(prUrl);
      container.append(group);
      evenSpacing(group, false);
      hadRows = true;
    }
  }

  function update() {
    try {
      const prUrl = currentPrUrl();
      // After the extension is reloaded this script is orphaned: the chrome.* API is gone,
      // so stop reporting, but keep the page button's href current (it needs no extension API).
      if (chrome.runtime?.id) reportState(prUrl !== null);
      syncButton(prUrl);
      syncRows();
    } catch {
      // Never disturb the GitHub page.
    }
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === 'serpiff:get-pr-url') {
      sendResponse({ url: currentPrUrl() });
    }
  });

  // GitHub navigates inside the page: Turbo events, history, and DOM replacement.
  for (const type of ['turbo:load', 'turbo:render', 'popstate']) {
    document.addEventListener(type, schedule);
    window.addEventListener(type, schedule);
  }
  // Coming back from the bfcache: Chrome has cleared the tab's action state, so report again.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      lastIsPr = null;
      schedule();
    }
  });
  observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  update();
})();
