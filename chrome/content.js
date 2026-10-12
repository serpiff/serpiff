// Content script (classic script; normalize.js is loaded before it).
(function () {
  const normalize = globalThis.serpiffNormalizePrUrl;
  const MARK = 'data-serpiff-open';

  const ROW_MARK = 'data-serpiff-row'; // list links; separate from MARK so the PR page's "exactly one" check ignores them
  const LIST_PATH = /^\/(?:[^/]+\/[^/]+\/)?pulls\/?$/; // /pulls and /<owner>/<name>/pulls (the query is not in pathname)
  const ROW_TITLE_LINK = 'a[data-testid="listitem-title-link"]';
  const ROW_META = '[class*="MetadataContainer-module__container"]';
  const CODE_BUTTON = 'button[class*="PullRequestCodeButton"]';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  let lastIsPr = null;
  let button = null; // the button this script inserted
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

  // Where the button goes, in order of preference (checked against GitHub's PR header, 2026-10-12):
  //  1. just after the Code button (the rightmost of the row), inside the gap-spaced row that holds it;
  //  2. the end of that row (the first child div of the React header's actions);
  //  3. the start of the classic header's actions (.gh-header-actions).
  // Returns { parent, before } (before === null means append), or null when nothing matches.
  function findSlot() {
    const code = document.querySelector(CODE_BUTTON);
    if (code && code.parentElement) {
      // Skip our own buttons, so a button already right after Code counts as in place.
      let before = code.nextSibling;
      while (before && before.nodeType === Node.ELEMENT_NODE && before.hasAttribute(MARK)) {
        before = before.nextSibling;
      }
      return { parent: code.parentElement, before };
    }
    const row = document.querySelector('[data-component="PH_Actions"] > div');
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

  // The serpiff logo from logo.js. Built with createElementNS (no innerHTML, which Trusted Types blocks) and
  // colored through element.style (no <style> element, whose class names would leak into the page).
  function makeLogo() {
    const logo = globalThis.serpiffLogo;
    const icon = svgElement('svg', { viewBox: logo.viewBox, width: '16', height: '16', 'aria-hidden': 'true' });
    const group = svgElement('g', { transform: logo.transform });
    const body = svgElement('path', { 'fill-rule': 'evenodd', d: logo.body.d });
    body.style.setProperty('fill', logo.body.fill);
    group.append(body);
    for (const { fill, ...geometry } of logo.rects) {
      const rect = svgElement('rect', geometry);
      rect.style.setProperty('fill', fill);
      group.append(rect);
    }
    icon.append(group);
    return icon;
  }

  // An icon-only button in the look of Primer's icon buttons: 32px square, same height as the Code button.
  function makeButton(href, legacy) {
    const link = document.createElement('a');
    link.setAttribute(MARK, '');
    link.className = 'btn';
    link.href = href;
    link.setAttribute('aria-label', 'Open in serpiff');
    link.title = 'Open in serpiff';
    link.style.display = 'inline-flex';
    link.style.alignItems = 'center';
    link.style.justifyContent = 'center';
    link.style.width = '32px';
    link.style.height = '32px';
    link.style.padding = '0';
    if (legacy) link.style.marginRight = '8px';
    link.append(makeLogo());
    return link;
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
    const href = `serpiff://open?url=${encodeURIComponent(prUrl)}`;
    // Fast path: our button is still attached right after the Code button.
    if (
      button &&
      button.isConnected &&
      button.previousElementSibling &&
      button.previousElementSibling.matches(CODE_BUTTON)
    ) {
      if (button.getAttribute('href') !== href) button.setAttribute('href', href);
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
      if (button.getAttribute('href') !== href) button.setAttribute('href', href);
      return;
    }
    removeButtons();
    button = makeButton(href, slot.legacy);
    slot.parent.insertBefore(button, slot.before);
  }

  function makeRowLink(href) {
    const link = document.createElement('a');
    link.setAttribute(ROW_MARK, href);
    link.href = href;
    link.setAttribute('aria-label', 'Open in serpiff');
    link.title = 'Open in serpiff';
    // The small variant of the PR page's button, so the rows stay their usual height.
    link.className = 'btn btn-sm';
    link.style.display = 'inline-flex';
    link.style.alignItems = 'center';
    link.style.justifyContent = 'center';
    link.style.width = '28px';
    link.style.height = '28px';
    link.style.padding = '0';
    // The metadata column spans the row's height and its items center themselves; a fixed-height button
    // would sit at the top, so center it too.
    link.style.alignSelf = 'center';
    // Keep the click from reaching the row's own handlers (no preventDefault: the link must still open).
    link.addEventListener('click', (event) => event.stopPropagation());
    link.append(makeLogo());
    return link;
  }

  // The PR list (checked 2026-10-12): each row is li > ... a[data-testid="listitem-title-link"], and the row's
  // right edge is its MetadataContainer (a flex row with a gap). The logo link goes at the end of it.
  function syncRows() {
    if (!LIST_PATH.test(location.pathname)) {
      // Not a list page: scan nothing unless links may have been inserted.
      if (hadRows) {
        for (const element of document.querySelectorAll(`[${ROW_MARK}]`)) element.remove();
        hadRows = false;
      }
      return;
    }
    for (const title of document.querySelectorAll(ROW_TITLE_LINK)) {
      const prUrl = normalize(title.href);
      const container = prUrl && title.closest('li')?.querySelector(ROW_META);
      if (!container) continue;
      const href = `serpiff://open?url=${encodeURIComponent(prUrl)}`;
      const existing = container.querySelector(`:scope > [${ROW_MARK}]`);
      if (existing) {
        // Already there: compare with the value kept in the marker, and update it if the row now shows another PR.
        if (existing.getAttribute(ROW_MARK) !== href) {
          existing.setAttribute(ROW_MARK, href);
          existing.setAttribute('href', href);
        }
        // Something added after it (such as a comment count) would push it off the right end: move it back.
        if (existing !== container.lastElementChild) container.append(existing);
        continue;
      }
      container.append(makeRowLink(href));
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
