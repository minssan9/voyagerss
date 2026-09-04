/**
 * Auto-PR Feedback Widget — embed.js
 * Serves as the loader to dynamically insert the FAB button and iframe widget.
 */
(function() {
  const FAB_SIZE = 56;
  const IFRAME_W = 380;
  const IFRAME_H = 560;

  let cfg = {};
  let fab = null;
  let iframe = null;
  let overlay = null;
  let isOpen = false;
  let isReady = false;
  let userCtx = {};
  const listeners = new Map();

  function emit(event, payload) {
    (listeners.get(event) ?? []).forEach((fn) => fn(payload));
  }

  function parseScript() {
    const script = document.currentScript || document.querySelector('script[data-app-id]');
    const scriptUrl = script ? new URL(script.src) : new URL(window.location.href);
    
    // Automatically point to /aipr/widget on the same origin where the script is served from
    const defaultWidgetUrl = `${scriptUrl.protocol}//${scriptUrl.host}/aipr/widget`;

    return {
      appId:        script?.dataset.appId        || '',
      widgetUrl:    script?.dataset.widgetUrl    || defaultWidgetUrl,
      position:     script?.dataset.position     || 'bottom-right',
      offsetX:      Number(script?.dataset.offsetX  || 24),
      offsetY:      Number(script?.dataset.offsetY  || 24),
      theme:        script?.dataset.theme        || 'light',
      accent:       script?.dataset.accent       || '#0A84FF',
      locale:       script?.dataset.locale       || 'ko',
      zIndex:       Number(script?.dataset.zIndex || 9999),
      hideOnMobile: script?.dataset.hideOnMobile === 'true',
      launcher:     script?.dataset.launcher     || 'fab',
    };
  }

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function createFab() {
    fab = document.createElement('button');
    fab.id = 'fb-fab';
    fab.setAttribute('aria-label', 'Open feedback');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-haspopup', 'dialog');

    Object.assign(fab.style, {
      position:     'fixed',
      width:        `${FAB_SIZE}px`,
      height:       `${FAB_SIZE}px`,
      borderRadius: '50%',
      border:       'none',
      background:   cfg.accent,
      color:        '#fff',
      cursor:       'pointer',
      boxShadow:    '0 4px 24px rgba(0,0,0,0.18)',
      zIndex:       String(cfg.zIndex),
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'center',
      transition:   'transform 0.2s, box-shadow 0.2s',
      outline:      'none',
      ...(cfg.position === 'bottom-left'
        ? { left: `${cfg.offsetX}px` }
        : { right: `${cfg.offsetX}px` }),
      bottom: `${cfg.offsetY}px`,
    });

    fab.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    fab.addEventListener('click', toggle);
    fab.addEventListener('mouseenter', () => { if (fab) fab.style.transform = 'scale(1.08)'; });
    fab.addEventListener('mouseleave', () => { if (fab) fab.style.transform = 'scale(1)'; });

    document.body.appendChild(fab);
  }

  function createIframe() {
    overlay = document.createElement('div');
    overlay.id = 'fb-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0',
      zIndex:   String(cfg.zIndex - 1),
      display:  'none',
    });
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('click', close);
    document.body.appendChild(overlay);

    const url = new URL(cfg.widgetUrl);
    url.searchParams.set('appId',  cfg.appId);
    url.searchParams.set('locale', cfg.locale);
    url.searchParams.set('accent', cfg.accent);
    url.searchParams.set('theme',  cfg.theme);
    if (userCtx.email) url.searchParams.set('email', String(userCtx.email));

    iframe = document.createElement('iframe');
    iframe.id  = 'fb-iframe';
    iframe.src = url.toString();
    iframe.setAttribute('title', 'Feedback widget');
    iframe.setAttribute('aria-label', 'Feedback form');
    iframe.setAttribute('allow', 'clipboard-write');
    iframe.setAttribute('loading', 'lazy');

    Object.assign(iframe.style, {
      position:     'fixed',
      width:        `${IFRAME_W}px`,
      height:       `${IFRAME_H}px`,
      maxWidth:     'calc(100vw - 32px)',
      maxHeight:    'calc(100vh - 100px)',
      border:       'none',
      borderRadius: '16px',
      boxShadow:    '0 8px 40px rgba(0,0,0,0.16)',
      zIndex:       String(cfg.zIndex),
      display:      'none',
      transition:   'opacity 0.2s, transform 0.2s',
      opacity:      '0',
      transform:    'translateY(12px)',
      ...(cfg.position === 'bottom-left'
        ? { left: `${cfg.offsetX}px` }
        : { right: `${cfg.offsetX}px` }),
      bottom: `${cfg.offsetY + FAB_SIZE + 12}px`,
    });

    document.body.appendChild(iframe);
    window.addEventListener('message', onMessage);
  }

  function onMessage(e) {
    if (!iframe || e.source !== iframe.contentWindow) return;
    const { type, payload } = e.data || {};

    if (type === 'ready') {
      isReady = true;
      emit('ready');
    }
    if (type === 'resize' && iframe && payload?.height) {
      const maxH = window.innerHeight - 120;
      iframe.style.height = `${Math.min(payload.height, maxH)}px`;
    }
    if (type === 'close') close();
    if (type === 'submitted') { emit('submitted', payload); }
  }

  function open() {
    if (isOpen) return;
    if (!iframe) createIframe();

    isOpen = true;
    if (fab) {
      fab.setAttribute('aria-expanded', 'true');
      fab.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M2 2l16 16M18 2L2 18" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`;
    }

    iframe.style.display = 'block';
    overlay.style.display = 'block';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        iframe.style.opacity   = '1';
        iframe.style.transform = 'translateY(0)';
      });
    });

    iframe.focus();
    emit('open');
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    if (fab) {
      fab.setAttribute('aria-expanded', 'false');
      fab.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
          stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    }

    if (iframe) {
      iframe.style.opacity   = '0';
      iframe.style.transform = 'translateY(12px)';
      setTimeout(() => { if (iframe) iframe.style.display = 'none'; }, 200);
    }
    if (overlay) overlay.style.display = 'none';

    fab?.focus();
    emit('close');
  }

  function toggle() {
    isOpen ? close() : open();
  }

  const API = {
    open,
    close,
    toggle,
    identify(ctx) {
      userCtx = { ...userCtx, ...ctx };
      iframe?.contentWindow?.postMessage({ type: 'identify', payload: ctx }, '*');
    },
    reset() {
      userCtx = {};
      iframe?.contentWindow?.postMessage({ type: 'reset' }, '*');
    },
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(handler);
    },
    off(event, handler) {
      const arr = listeners.get(event) || [];
      listeners.set(event, arr.filter((h) => h !== handler));
    },
    destroy() {
      window.removeEventListener('message', onMessage);
      fab?.remove();
      iframe?.remove();
      overlay?.remove();
      fab = iframe = overlay = null;
      isOpen = isReady = false;
      listeners.clear();
    },
  };

  function init() {
    cfg = parseScript();

    if (cfg.hideOnMobile && isMobile()) return;
    if (cfg.launcher !== 'none') createFab();

    const queue = window.FeedbackQueue || [];
    queue.forEach(([method, ...args]) => {
      if (method in API) API[method](...args);
    });

    window.Feedback = API;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
