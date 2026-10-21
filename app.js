(function () {
  'use strict';

  var START_KEY = 'qb_session_start';
  var WATCHED_COUNT_KEY = 'qb_videos_watched';
  var WATCHED_IDS_KEY = 'qb_watched_video_ids';
  var SITE_URL = 'https://joshfortech.github.io/quiz-brainiac/';

  var playerApiReady = false;
  var playerErrored = false;
  var fallbackShown = false;
  var currentVideoId = null;

  /* ---------- Cosmetic session stats ---------- */

  function ensureSessionStart() {
    try {
      if (!sessionStorage.getItem(START_KEY)) {
        sessionStorage.setItem(START_KEY, String(Date.now()));
      }
    } catch (e) {
      /* sessionStorage unavailable: timer just starts at 0 */
    }
  }

  function formatElapsed(ms) {
    if (ms < 0) ms = 0;
    var total = Math.floor(ms / 1000);
    var h = String(Math.floor(total / 3600)).padStart(2, '0');
    var m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    var s = String(total % 60).padStart(2, '0');
    return h + ':' + m + ':' + s;
  }

  function renderStats() {
    var start = Number(sessionStorage.getItem(START_KEY)) || Date.now();
    var elapsed = formatElapsed(Date.now() - start);
    var watched = Number(sessionStorage.getItem(WATCHED_COUNT_KEY)) || 0;

    document.querySelectorAll('[data-stat="time"]').forEach(function (el) {
      el.textContent = elapsed;
    });
    document.querySelectorAll('[data-stat="videos"]').forEach(function (el) {
      el.textContent = String(watched);
    });
  }

  function getWatchedIds() {
    try {
      return JSON.parse(sessionStorage.getItem(WATCHED_IDS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function markVideoWatched(videoId) {
    if (!videoId) return;
    var ids = getWatchedIds();
    if (ids.indexOf(videoId) !== -1) return;
    ids.push(videoId);
    try {
      sessionStorage.setItem(WATCHED_IDS_KEY, JSON.stringify(ids));
      sessionStorage.setItem(WATCHED_COUNT_KEY, String((Number(sessionStorage.getItem(WATCHED_COUNT_KEY)) || 0) + 1));
    } catch (e) {
      /* ignore storage errors: counter is cosmetic */
    }
    renderStats();
  }

  /* ---------- Sidebar ---------- */

  function initSidebar() {
    var toggleBtns = document.querySelectorAll('[data-action="toggle-sidebar"]');
    var overlay = document.querySelector('.sidebar-overlay');
    var isMobile = function () {
      return window.matchMedia('(max-width: 768px)').matches;
    };

    function syncAria() {
      var open = isMobile()
        ? document.body.classList.contains('sidebar-open')
        : !document.body.classList.contains('sidebar-collapsed');
      toggleBtns.forEach(function (btn) {
        btn.setAttribute('aria-expanded', String(open));
      });
    }

    toggleBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (isMobile()) {
          document.body.classList.toggle('sidebar-open');
        } else {
          document.body.classList.toggle('sidebar-collapsed');
        }
        syncAria();
      });
    });

    syncAria();

    function closeDrawer() {
      document.body.classList.remove('sidebar-open');
    }

    if (overlay) overlay.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });

    var page = document.body.getAttribute('data-page');
    document.querySelectorAll('.nav-link[data-nav]').forEach(function (link) {
      if (link.getAttribute('data-nav') === page) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  /* ---------- Back / Forward ---------- */

  function initNavButtons() {
    var backBtn = document.querySelector('[data-action="go-back"]');
    var forwardBtn = document.querySelector('[data-action="go-forward"]');

    if (backBtn) {
      backBtn.addEventListener('click', function () {
        if (window.history.length > 1) window.history.back();
      });
    }
    if (forwardBtn) {
      forwardBtn.addEventListener('click', function () {
        window.history.forward();
      });
    }
  }

  /* ---------- Lesson video ---------- */

  function isLocalFile() {
    return window.location.protocol === 'file:';
  }

  function showVideoMessage(html) {
    var frame = document.querySelector('.video-frame');
    if (!frame) return;
    frame.innerHTML = '<div class="video-fallback">' + html + '</div>';
  }

  function videoErrorHtml(title, videoId) {
    var html =
      '<p><strong>' + title + '</strong></p>' +
      '<p>You can still take the quiz, or open the video on YouTube:</p>' +
      '<a class="btn btn-cream" href="https://youtu.be/' + videoId + '" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>';

    if (isLocalFile()) {
      html +=
        '<p class="fallback-hint">Open the online version of the site instead: ' +
        '<a href="' + SITE_URL + '">' + SITE_URL + '</a> - videos work there.</p>';
    } else {
      html += '<p class="fallback-hint">If it still does not play, refresh the page or check your internet connection.</p>';
    }

    return html;
  }

  function showFallback(videoId) {
    if (fallbackShown) return;
    fallbackShown = true;
    showVideoMessage(videoErrorHtml('The video player could not load.', videoId));
  }

  function handlePlayerError(videoId, code) {
    playerErrored = true;
    var title =
      code === 153
        ? 'YouTube reported a video configuration error (153).'
        : 'The video could not be played (error ' + code + ').';
    showVideoMessage(videoErrorHtml(title, videoId));
  }

  function initLessonPlayer(videoId) {
    currentVideoId = videoId;
    var container = document.getElementById('player');
    if (!container) return;

    if (isLocalFile()) {
      fallbackShown = true;
      showVideoMessage(
        videoErrorHtml(
          'This page was opened directly as a file (file://), and YouTube refuses to play videos there.',
          videoId
        )
      );
      return;
    }

    container.innerHTML = '<div class="video-placeholder">Loading video...</div>';

    var failTimer = setTimeout(function () {
      if (!playerApiReady) showFallback(videoId);
    }, 6000);

    window.onYouTubeIframeAPIReady = function () {
      if (fallbackShown || !document.getElementById('player')) return;
      if (typeof YT === 'undefined' || !YT.Player) return;

      var playerInstance = new YT.Player('player', {
        videoId: videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: function () {
            playerApiReady = true;
            clearTimeout(failTimer);
            var frame =
              playerInstance && playerInstance.getIframe && playerInstance.getIframe();
            if (frame && frame.setAttribute) {
              frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
              frame.setAttribute(
                'allow',
                'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
              );
              frame.setAttribute('allowfullscreen', '');
            }
          },
          onStateChange: function (e) {
            if (e.data === YT.PlayerState.ENDED) markVideoWatched(videoId);
          },
          onError: function (e) {
            clearTimeout(failTimer);
            handlePlayerError(videoId, e.data);
          }
        }
      });
    };

    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  /* ---------- Reveal quiz ---------- */

  function initQuizReveal() {
    var btn = document.getElementById('reveal-quiz');
    var section = document.getElementById('quiz-section');
    if (!btn || !section) return;

    btn.addEventListener('click', function () {
      section.hidden = false;
      btn.disabled = true;
      btn.textContent = 'Quiz below!';
      if ((!playerApiReady || playerErrored) && currentVideoId) markVideoWatched(currentVideoId);
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ---------- Boot ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    ensureSessionStart();
    renderStats();
    setInterval(renderStats, 1000);

    initSidebar();
    initNavButtons();
    initQuizReveal();

    currentVideoId = document.body.getAttribute('data-video-id');

    if (isLocalFile()) {
      window.location.replace(SITE_URL);
      return;
    }

    if (currentVideoId) initLessonPlayer(currentVideoId);
  });
})();
