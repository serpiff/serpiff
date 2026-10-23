// 機能紹介のカルーセルの操作（docs/design.md §17）。
// 依存なし、外部との通信なし、保存なし。JS が動かないときは CSS だけの自動スクロールのまま。
(function () {
  'use strict';

  var INTERVAL = 9500; // 自動で次へ移るまで（ミリ秒）。CSS の 1 枚あたりの周期（9.5 秒）と同じ
  // 停止中にモックを繰り返す間隔（ミリ秒）。表示してから CSS のモックの動きが終わるまで約 8.2 秒
  // （局所時間 8.7 秒で終わり、表示は局所時間 0.5 秒から始まる）に、0.5 秒ほどの待ちを足した値。
  // CSS の @keyframes（モックの動きの終わり）を変えたら、これも揃える。
  var LOOP = 8700;
  var SETTLE = 1000; // 横に送り終わるまで。送り終えた後に、前のスライドのモックを最初の状態に戻す

  function wrap(i, n) {
    return ((i % n) + n) % n;
  }
  function nextIndex(i, n) {
    return wrap(i + 1, n);
  }
  function prevIndex(i, n) {
    return wrap(i - 1, n);
  }

  var SVG = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
  var ICON_PREV = SVG + '<path d="M10 3L5 8l5 5"/></svg>';
  var ICON_NEXT = SVG + '<path d="M6 3l5 5-5 5"/></svg>';
  var ICON_PAUSE = SVG.replace('fill="none"', 'fill="currentColor"') + '<path d="M5 3v10M11 3v10"/></svg>';
  var ICON_PLAY = SVG.replace('fill="none"', 'fill="currentColor"') + '<path d="M5 3l8 5-8 5z"/></svg>';

  // 文は <html lang> が en のときだけ英語にする（ほかは日本語）
  var TEXTS = {
    ja: {
      controls: '機能紹介の操作',
      prev: '前へ',
      next: '次へ',
      pause: '停止',
      play: '再生',
      slide: function (n) {
        return n + '枚目';
      },
    },
    en: {
      controls: 'Feature tour controls',
      prev: 'Previous',
      next: 'Next',
      pause: 'Pause',
      play: 'Play',
      slide: function (n) {
        return 'Slide ' + n;
      },
    },
  };
  function texts() {
    return String(document.documentElement.lang || '').toLowerCase().split('-')[0] === 'en' ? TEXTS.en : TEXTS.ja;
  }

  function button(className, label, html) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.setAttribute('aria-label', label);
    if (html) b.innerHTML = html;
    return b;
  }

  function init(root) {
    var track = root.querySelector('.features');
    var bar = root.querySelector('.dots');
    var slides = Array.prototype.slice.call(root.querySelectorAll('.slide'));
    var n = slides.length;
    if (!track || !bar || n < 2) return;

    var T = texts();
    var index = 0;
    var timer = null;
    var settleTimer = null;
    var paused = false;
    var startedAt = 0;
    var holdSince = 0;
    var holding = false;
    var hovering = false;
    var focusing = false;

    // 装飾の点を、操作できる部品に置き換える
    bar.textContent = '';
    bar.removeAttribute('aria-hidden');
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', T.controls);
    var prev = button('arrow', T.prev, ICON_PREV);
    var next = button('arrow', T.next, ICON_NEXT);
    var toggle = button('toggle', T.pause, '<span class="i-pause">' + ICON_PAUSE + '</span><span class="i-play">' + ICON_PLAY + '</span>');
    var dots = slides.map(function (_, k) {
      var d = button('dot', T.slide(k + 1));
      d.addEventListener('click', function () {
        go(k);
      });
      return d;
    });
    bar.appendChild(prev);
    dots.forEach(function (d) {
      bar.appendChild(d);
    });
    bar.appendChild(next);
    bar.appendChild(toggle);
    root.classList.add('is-js');

    function hold() {
      return paused || hovering || focusing;
    }
    function schedule() {
      clearTimeout(timer);
      if (paused) {
        // 停止中は、表示中のスライドのモックを繰り返す（ホバーやフォーカスでは止めない）
        timer = setTimeout(function () {
          restart(slides[index]);
          schedule();
        }, Math.max(0, LOOP - (Date.now() - startedAt)));
        return;
      }
      if (hold()) return;
      timer = setTimeout(function () {
        show(nextIndex(index, n));
      }, INTERVAL);
    }
    function updateHold() {
      applyHold();
      schedule();
    }
    // 自動再生中のホバー・フォーカスでモックを止めた時間は、停止中のループの計算（startedAt）に数えない
    function applyHold() {
      var now = !paused && (hovering || focusing);
      if (now === holding) return;
      if (now) holdSince = Date.now();
      else startedAt += Date.now() - holdSince;
      holding = now;
      root.classList.toggle('is-hold', now);
    }
    // 表示するスライドのモックを最初から再生し直す
    function restart(slide) {
      startedAt = Date.now();
      slide.classList.add('is-restart');
      void slide.offsetWidth;
      slide.classList.remove('is-restart');
      slide.classList.add('is-active');
    }
    // 最初の状態（局所時間 0.5 秒の一時停止）に戻す。is-active を外すだけだと、終わった状態のまま止まる
    function reset(slide) {
      slide.classList.add('is-restart');
      void slide.offsetWidth;
      slide.classList.remove('is-restart');
      slide.classList.remove('is-active');
    }
    function show(i) {
      index = wrap(i, n);
      root.style.setProperty('--index', String(index));
      dots.forEach(function (d, k) {
        if (k === index) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
      restart(slides[index]);
      clearTimeout(settleTimer);
      settleTimer = setTimeout(function () {
        slides.forEach(function (s, k) {
          if (k !== index && s.classList.contains('is-active')) reset(s);
        });
      }, SETTLE);
      schedule();
    }

    function setPaused(p) {
      paused = p;
      toggle.setAttribute('aria-label', paused ? T.play : T.pause);
      toggle.classList.toggle('is-on', paused);
      applyHold();
    }
    // 利用者が点・矢印・キーで選んだら、自動再生を止めてそのスライドを見せる（停止中と同じくモックを繰り返す）
    function go(i) {
      setPaused(true);
      show(i);
    }

    prev.addEventListener('click', function () {
      go(prevIndex(index, n));
    });
    next.addEventListener('click', function () {
      go(nextIndex(index, n));
    });
    toggle.addEventListener('click', function () {
      setPaused(!paused);
      schedule();
    });
    // マウスのときだけ（タッチでは pointerleave が来ず、止まったままになるため）
    root.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      hovering = true;
      updateHold();
    });
    root.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      hovering = false;
      updateHold();
    });
    root.addEventListener('focusin', function (e) {
      var visible = true;
      try {
        visible = e.target.matches(':focus-visible');
      } catch (_) {
        visible = true;
      }
      focusing = visible;
      updateHold();
    });
    root.addEventListener('focusout', function (e) {
      if (!e.relatedTarget || !root.contains(e.relatedTarget)) {
        focusing = false;
        updateHold();
      }
    });
    root.addEventListener('keydown', function (e) {
      if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return; // ブラウザーの「戻る」などを奪わない
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(prevIndex(index, n));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(nextIndex(index, n));
      }
    });

    show(0);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { nextIndex: nextIndex, prevIndex: prevIndex, init: init };
  }
  if (typeof document === 'undefined') return;
  var reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var root = document.querySelector('.carousel');
  if (root) init(root);
})();
