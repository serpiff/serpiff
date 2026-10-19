// Normalizes a GitHub pull request URL to https://github.com/<owner>/<name>/pull/<n>, and tells whether a
// pathname is a pull request list (/pulls, /pulls/<tab>, /<owner>/<name>/pulls[/<user>|/<filter>/<user>]).
// A classic script: the content script loads it before content.js and reads
// globalThis.serpiffNormalizePrUrl and globalThis.serpiffIsPrListPath; Node tests read module.exports.
(function () {
  const NAME = /^[A-Za-z0-9._-]+$/;
  const NUMBER = /^[0-9]+$/;

  // Returns the normalized URL, or null when `input` is not a github.com pull request URL.
  // Trailing slashes, paths below the PR (/files, /commits/<sha>), the query and the fragment are dropped.
  function normalizePrUrl(input) {
    if (typeof input !== 'string') return null;
    let url;
    try {
      url = new URL(input);
    } catch {
      return null;
    }
    if (url.protocol !== 'https:' || url.hostname !== 'github.com') return null;
    if (url.port !== '' || url.username !== '' || url.password !== '') return null;
    const parts = url.pathname.split('/');
    // ['', owner, name, 'pull', n, ...rest]
    if (parts.length < 5 || parts[0] !== '' || parts[3] !== 'pull') return null;
    const [, owner, name, , digits] = parts;
    if (!NAME.test(owner) || !NAME.test(name) || !NUMBER.test(digits)) return null;
    // Leading zeros are accepted (the app reads the number as an integer); the output is canonical decimal.
    const number = Number(digits);
    if (!Number.isSafeInteger(number) || number < 1) return null;
    return `https://github.com/${owner}/${name}/pull/${number}`;
  }

  // `[^/]+` takes any tab, user or filter name, so tabs are not listed. /o/n/pulls/12 is a list too (the user "12"),
  // never a PR; only /pull/<n> is a PR.
  const LIST_PATH = /^\/(?:[^/]+\/[^/]+\/)?pulls(?:\/[^/]+){0,2}\/?$/;

  // True when `pathname` (location.pathname: no query or fragment) is a pull request list page.
  function isPrListPath(pathname) {
    return typeof pathname === 'string' && LIST_PATH.test(pathname);
  }

  globalThis.serpiffNormalizePrUrl = normalizePrUrl;
  globalThis.serpiffIsPrListPath = isPrListPath;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { normalizePrUrl, isPrListPath };
  }
})();
