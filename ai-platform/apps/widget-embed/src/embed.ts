/**
 * Auto-PR Feedback Widget — embed.js
 * Usage: <script src="https://widget.example.com/embed.js" data-app-id="xxx"></script>
 *
 * window.Feedback API: open / close / toggle / identify / reset / on / destroy
 * Queue pattern: window.FeedbackQueue = [['open'], ['identify', { email: '...' }]]
 */

// ── Types ─────────────────────────────────────────────────────────────────────
interface FeedbackConfig {
  appId:        string;
  widgetUrl?:   string;      // override widget SPA origin
  position?:    'bottom-right' | 'bottom-left';
  offsetX?:     number;
  offsetY?:     number;
  theme?:       'light' | 'dark';
  accent?:      string;      // CSS color
  locale?:      'en' | 'ko' | 'ja';
  zIndex?:      number;
  hideOnMobile?: boolean;
  launcher?:    'fab' | 'none';  // 'none' = headless, control via API
  strings?:     Record<string, string>;
}

type EventType = 'open' | 'close' | 'submitted' | 'ready';
type EventHandler = (payload?: unknown) => void;

// ── Constants ─────────────────────────────────────────────────────────────────
const WIDGET_URL = (typeof __WIDGET_URL__ !== 'undefined' ? __WIDGET_URL__ : '')
  || 'http://localhost:4173';
const FAB_SIZE   = 56;
const IFRAME_W   = 380;
const IFRAME_H   = 560;

// ── State ─────────────────────────────────────────────────────────────────────
let cfg: FeedbackConfig;
let fab: HTMLButtonElement | null       = null;
let iframe: HTMLIFrameElement | null    = null;
let overlay: HTMLDivElement | null      = null;
let isOpen   = false;
let isReady  = false;
let userCtx: Record<string, unknown>   = {};
const listeners: Map<EventType, EventHandler[]> = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────
function emit(event: EventType, payload?: unknown) {
  (listeners.get(event) ?? []).forEach((fn) => fn(payload));
}

function parseScript(): FeedbackConfig {
  const script = document.currentScript as HTMLScriptElement | null
    ?? document.querySelector('script[data-app-id]') as HTMLScriptElement;

  return {
    appId:        script?.dataset.appId        ?? '',
    widgetUrl:    script?.dataset.widgetUrl,
    position:     (script?.dataset.position as FeedbackConfig['position']) ?? 'bottom-right',
    offsetX:      Number(script?.dataset.offsetX  ?? 24),
    offsetY:      Number(script?.dataset.offsetY  ?? 24),
    theme:        (script?.dataset.theme as 'light' | 'dark') ?? 'light',
    accent:       script?.dataset.accent       ?? '#0A84FF',
    locale:       (script?.dataset.locale as FeedbackConfig['locale']) ?? 'ko',
    zIndex:       Number(script?.dataset.zIndex ?? 9999),
    hideOnMobile: script?.dataset.hideOnMobile === 'true',
    launcher:     (script?.dataset.launcher as 'fab' | 'none') ?? 'fab',
  };
}

function isMobile() { return window.innerWidth <= 768; }

// ── FAB ───────────────────────────────────────────────────────────────────────
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
    background:   cfg.accent ?? '#0A84FF',
    color:        '#fff',
    cursor:       'pointer',
    boxShadow:    '0 4px 24px rgba(0,0,0,0.18)',
    zIndex:       String(cfg.zIndex ?? 9999),
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    transition:   'transform 0.2s, box-shadow 0.2s',
    outline:      'none',
    ...(cfg.position === 'bottom-left'
      ? { left: `${cfg.offsetX ?? 24}px` }
      : { right: `${cfg.offsetX ?? 24}px` }),
    bottom: `${cfg.offsetY ?? 24}px`,
  });

  fab.innerHTML = iconChat();
  fab.addEventListener('click', toggle);
  fab.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') toggle(); });
  fab.addEventListener('mouseenter', () => { if (fab) fab.style.transform = 'scale(1.08)'; });
  fab.addEventListener('mouseleave', () => { if (fab) fab.style.transform = 'scale(1)'; });

  document.body.appendChild(fab);
}

function iconChat() {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
      stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function iconClose() {
  return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M2 2l16 16M18 2L2 18" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;
}

// ── Iframe + Overlay ──────────────────────────────────────────────────────────
function createIframe() {
  // Overlay (click-outside to close)
  overlay = document.createElement('div');
  overlay.id = 'fb-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    zIndex:   String((cfg.zIndex ?? 9999) - 1),
    display:  'none',
  });
  overlay.setAttribute('aria-hidden', 'true');
  overlay.addEventListener('click', close);
  document.body.appendChild(overlay);

  // Build widget URL with config params
  const url = new URL(cfg.widgetUrl ?? WIDGET_URL);
  url.searchParams.set('appId',  cfg.appId);
  url.searchParams.set('locale', cfg.locale ?? 'ko');
  url.searchParams.set('accent', cfg.accent ?? '#0A84FF');
  url.searchParams.set('theme',  cfg.theme  ?? 'light');
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
    zIndex:       String(cfg.zIndex ?? 9999),
    display:      'none',
    transition:   'opacity 0.2s, transform 0.2s',
    opacity:      '0',
    transform:    'translateY(12px)',
    ...(cfg.position === 'bottom-left'
      ? { left: `${cfg.offsetX ?? 24}px` }
      : { right: `${cfg.offsetX ?? 24}px` }),
    bottom: `${(cfg.offsetY ?? 24) + FAB_SIZE + 12}px`,
  });

  document.body.appendChild(iframe);

  // Listen for postMessages from widget
  window.addEventListener('message', onMessage);
}

function onMessage(e: MessageEvent) {
  if (!iframe || e.source !== iframe.contentWindow) return;
  const { type, payload } = e.data ?? {};

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

// ── Open / Close ──────────────────────────────────────────────────────────────
function open() {
  if (isOpen) return;
  if (!iframe) createIframe();

  isOpen = true;
  if (fab) { fab.setAttribute('aria-expanded', 'true'); fab.innerHTML = iconClose(); }

  iframe!.style.display = 'block';
  overlay!.style.display = 'block';

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      iframe!.style.opacity   = '1';
      iframe!.style.transform = 'translateY(0)';
    });
  });

  // Focus trap: move focus into iframe
  iframe!.focus();
  emit('open');
}

function close() {
  if (!isOpen) return;
  isOpen = false;
  if (fab) { fab.setAttribute('aria-expanded', 'false'); fab.innerHTML = iconChat(); }

  if (iframe) {
    iframe.style.opacity   = '0';
    iframe.style.transform = 'translateY(12px)';
    setTimeout(() => { if (iframe) iframe.style.display = 'none'; }, 200);
  }
  if (overlay) overlay.style.display = 'none';

  // Return focus to FAB
  fab?.focus();
  emit('close');
}

function toggle() { isOpen ? close() : open(); }

// ── Public API ────────────────────────────────────────────────────────────────
const API = {
  open,
  close,
  toggle,

  identify(ctx: Record<string, unknown>) {
    userCtx = { ...userCtx, ...ctx };
    // Relay to iframe if already loaded
    iframe?.contentWindow?.postMessage({ type: 'identify', payload: ctx }, '*');
  },

  reset() {
    userCtx = {};
    if (iframe) {
      iframe.contentWindow?.postMessage({ type: 'reset' }, '*');
    }
  },

  on(event: EventType, handler: EventHandler) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event)!.push(handler);
  },

  off(event: EventType, handler: EventHandler) {
    const arr = listeners.get(event) ?? [];
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

// ── Boot ──────────────────────────────────────────────────────────────────────
function init() {
  cfg = parseScript();

  if (cfg.hideOnMobile && isMobile()) return;
  if (cfg.launcher !== 'none') createFab();

  // Drain pre-load queue: window.FeedbackQueue = [['open'], ['identify', {...}]]
  const queue: [keyof typeof API, ...unknown[]][] = (window as any).FeedbackQueue ?? [];
  queue.forEach(([method, ...args]) => {
    if (method in API) (API[method] as Function)(...args);
  });

  // Expose global
  (window as any).Feedback = API;
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export default API;

// ── Type shim ─────────────────────────────────────────────────────────────────
declare const __WIDGET_URL__: string;
