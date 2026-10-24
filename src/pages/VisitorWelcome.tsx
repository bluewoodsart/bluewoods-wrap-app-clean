import { FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

function newSession() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return { conversationId: crypto.randomUUID(), token: Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') };
}
function attribution() {
  const params = new URLSearchParams(window.location.search);
  let referrerHost = '';
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch { /* No usable referrer. */ }
  return { landingPath: window.location.pathname, referrerHost,
    utmSource: (params.get('utm_source') || '').slice(0, 240), utmMedium: (params.get('utm_medium') || '').slice(0, 240),
    utmCampaign: (params.get('utm_campaign') || '').slice(0, 240), qr: (params.get('qr') || '').slice(0, 240) };
}
export default function VisitorWelcome() {
  const [session] = useState(newSession);
  const [source] = useState(attribution);
  const [message, setMessage] = useState('');
  const [exchanges, setExchanges] = useState<Array<{ visitor: string; guide: string }>>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reportedSource, setReportedSource] = useState('');
  const [reportedSearch, setReportedSearch] = useState('');
  const pending = useRef<{ signature: string; requestId: string } | null>(null);
  const inFlight = useRef(false);
  async function send(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    const text = message.trim() || (contactOpen ? 'Please have your team follow up with me about this conversation.' : '');
    if (!text) return;
    const payload = { ...session, message: text, attribution: source, reportedSource, reportedSearch,
      ...(contactOpen ? { contact: { name, email, requestFollowUp: true } } : {}) };
    const signature = JSON.stringify(payload);
    if (pending.current?.signature !== signature) pending.current = { signature, requestId: crypto.randomUUID() };
    inFlight.current = true; setBusy(true); setError('');
    try {
      const response = await fetch('/api/visitor-conversation', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, requestId: pending.current.requestId }), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your message could not be saved. Please retry.');
      setExchanges(items => [...items, { visitor: text, guide: result.reply }]);
      setMessage(''); setSaved(Boolean(result.followUpSaved)); setContactOpen(false); pending.current = null;
    } catch (err) { setError(err instanceof Error ? err.message : 'Your message could not be saved. Please retry.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
    <div className="mx-auto max-w-2xl space-y-7">
      <Link to="/" className="text-cyan-300">SlapWrapz · Home</Link>
      <header><h1 className="text-4xl font-black">Why did you come here today?</h1>
        <p className="mt-3 text-lg text-slate-300">Have something in mind—or just curious? Either way, welcome.</p></header>
      {!exchanges.length && <div className="flex flex-wrap gap-2">{['I need something', 'Something caught my eye', 'I’m just looking'].map(text =>
        <Button key={text} type="button" variant="secondary" disabled={busy} onClick={() => setMessage(text)}>{text}</Button>)}</div>}
      <div aria-live="polite" className="space-y-4">{exchanges.map((item, i) => <div key={i} className="space-y-3">
        <p className="whitespace-pre-wrap rounded-xl bg-slate-800 p-4"><strong>You:</strong> {item.visitor}</p>
        <p className="whitespace-pre-wrap rounded-xl border border-cyan-800 p-4"><strong>SlapWrapz guide:</strong> {item.guide}</p>
      </div>)}</div>
      <form onSubmit={send} className="space-y-4">
        <label className="block">Tell us in your own words
          <textarea className="mt-2 min-h-28 w-full rounded-xl bg-white p-3 text-slate-950" maxLength={2000} required={!contactOpen}
            disabled={busy} value={message} onChange={e => setMessage(e.target.value)} /></label>
        <details><summary className="cursor-pointer text-cyan-200">Want to tell us how you found us? (Optional)</summary>
          <div className="mt-3 space-y-3">
            <label className="block">What brought you our way?
              <input className="mt-1 w-full rounded bg-white p-3 text-slate-950" placeholder="Search, an ad, a link, a vehicle…" maxLength={240} disabled={busy} value={reportedSource} onChange={e => setReportedSource(e.target.value)} /></label>
            <label className="block">If you searched, what did you type?
              <input className="mt-1 w-full rounded bg-white p-3 text-slate-950" placeholder="Your best recollection is fine." maxLength={240} disabled={busy} value={reportedSearch} onChange={e => setReportedSearch(e.target.value)} /></label>
          </div>
        </details>
        {contactOpen && <fieldset disabled={busy} className="space-y-3 rounded-xl border border-slate-600 p-4">
          <legend>Ask our team to follow up</legend>
          <label className="block">Name<input className="mt-1 w-full rounded bg-white p-3 text-slate-950" autoComplete="name" required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="block">Email<input className="mt-1 w-full rounded bg-white p-3 text-slate-950" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>
          <p className="text-sm text-slate-300">Sending this requests an email response about your inquiry. It does not sign you up for marketing.</p>
        </fieldset>}
        {error && <p role="alert" className="rounded border border-red-400 p-3">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <Button disabled={busy} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200" type="submit">{busy ? 'Saving…' : contactOpen ? 'Send follow-up request' : 'Send'}</Button>
          {!saved && <Button disabled={busy} type="button" variant="secondary" onClick={() => setContactOpen(v => !v)}>{contactOpen ? 'Keep exploring' : 'Ask for follow-up'}</Button>}
        </div>
        {saved && <p role="status" className="text-cyan-200">Your follow-up request is saved.</p>}
        <p className="text-xs leading-5 text-slate-400">BWB saves this conversation and available referral information to help with your inquiry and improve our services. Conversation records expire after 90 days and are removed by daily cleanup; requested contact and job records may be kept longer. Please don’t share sensitive information. You can browse without sending a message.</p>
      </form>
      <nav aria-label="Explore services" className="flex flex-wrap gap-4 border-t border-slate-700 pt-5 text-cyan-200">
        <Link to="/#services">Explore our services</Link><Link to="/banners">Banners</Link><Link to="/signs">Signs</Link><Link to="/wraps">Vehicle wraps</Link>
      </nav>
    </div>
  </main>;
}
