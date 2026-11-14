// Keeps the phone screen from dimming while the game is open.
//
// 1. Screen Wake Lock API (iOS Safari 16.4+, Android Chrome). Needs HTTPS or
//    localhost, so it works on GitHub Pages but NOT on http://192.168.x.x.
// 2. Fallback: a tiny muted inline video playing in a loop, which most mobile
//    browsers treat as "don't sleep". Best effort only.
// 3. If neither works, the page shows a hint to change Auto-Lock.
//
// The lock is released whenever the page is hidden, so it's re-requested on
// every return to the page.

let mode = 'none'; // 'wakelock' | 'video' | 'none'
let sentinel = null;
let video = null;
let onChange = () => {};

export function keepAwake(listener = () => {}) {
  onChange = listener;
  acquire();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') acquire();
  });
  // Some browsers only allow it after a tap; retry on the first touches.
  const retry = () => {
    if (mode === 'none' || (mode === 'video' && video?.paused)) acquire();
  };
  document.addEventListener('pointerdown', retry, { passive: true });
}

export function wakeMode() {
  return mode;
}

async function acquire() {
  if ('wakeLock' in navigator && window.isSecureContext) {
    try {
      if (sentinel && !sentinel.released) return;
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        if (document.visibilityState === 'visible') acquire();
      });
      set('wakelock');
      return;
    } catch (err) {
      console.info('[wake] wake lock refused:', err.name);
    }
  }
  playVideoFallback();
}

function playVideoFallback() {
  try {
    if (!video) {
      // Generate the video from a canvas so no media file is needed.
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 2;
      const ctx = canvas.getContext('2d');
      if (!canvas.captureStream) return set('none');
      const stream = canvas.captureStream(1);
      // Repaint so the stream keeps producing frames.
      setInterval(() => {
        ctx.fillStyle = Date.now() % 2000 < 1000 ? '#000' : '#010101';
        ctx.fillRect(0, 0, 2, 2);
      }, 1000);
      video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('aria-hidden', 'true');
      video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0.01;pointer-events:none;bottom:0;left:0;';
      video.srcObject = stream;
      document.body.appendChild(video);
    }
    video.play().then(() => set('video'), () => set('none'));
  } catch (err) {
    console.info('[wake] video fallback failed', err);
    set('none');
  }
}

function set(m) {
  if (m === mode) return;
  mode = m;
  onChange(mode);
}
