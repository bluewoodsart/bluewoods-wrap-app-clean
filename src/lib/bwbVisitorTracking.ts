// Privacy-first BWB analytics: no tracking until explicit consent.
// Does not collect names, emails, phone numbers, full URLs or form values.
const KEY = 'bwb_analytics_consent';
const SESSION = 'bwb_visitor_session';
type EventName = 'page_view' | 'quote_start' | 'quote_complete';
let started = false;
let previousPath = '';
function optedOut() {
  return navigator.doNotTrack === '1' || (navigator as Navigator & {globalPrivacyControl?:boolean}).globalPrivacyControl === true;
}
export function analyticsChoice(): 'granted'|'denied'|null {
  if (optedOut()) return 'denied';
  const choice = localStorage.getItem(KEY);
  return choice === 'granted' || choice === 'denied' ? choice : null;
}
function sessionId() {
  let id = sessionStorage.getItem(SESSION);
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(SESSION,id); }
  return id;
}
function safePath() { return window.location.pathname.slice(0,240); }
function referrerHost() { try { return document.referrer ? new URL(document.referrer).hostname.slice(0,120) : null; } catch { return null; } }
export function recordBwbEvent(event_type: EventName) {
  if (analyticsChoice() !== 'granted') return;
  const params = new URLSearchParams(window.location.search);
  const payload = {
    consent: true, session_id:sessionId(), event_type, path:safePath(),
    referrer_host:referrerHost(), utm_source:params.get('utm_source')?.slice(0,120),
    utm_medium:params.get('utm_medium')?.slice(0,120),
    utm_campaign:params.get('utm_campaign')?.slice(0,120),
  };
  void fetch('/api/visitor-event',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload),keepalive:true,credentials:'omit'}).catch(()=>{});
}
function visit() {
  const path = safePath();
  if (path === previousPath) return;
  previousPath = path;
  recordBwbEvent('page_view');
  if (/^\/(service-quote|quote|banner|banners)(\/|$)/.test(path)) recordBwbEvent('quote_start');
}
export function startBwbTracking() {
  if (started || analyticsChoice() !== 'granted') return;
  started = true;
  visit();
  const original = history.pushState.bind(history);
  history.pushState = (...args) => { original(...args); queueMicrotask(visit); };
  const replace = history.replaceState.bind(history);
  history.replaceState = (...args) => { replace(...args); queueMicrotask(visit); };
  window.addEventListener('popstate',visit);
}
export function setBwbAnalyticsConsent(granted:boolean) {
  localStorage.setItem(KEY,granted && !optedOut()?'granted':'denied');
  if (granted) startBwbTracking();
}
