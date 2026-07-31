import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, Gamepad2, LockKeyhole, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const ZOE_EMAIL = 'atomicadvertisingagency@gmail.com';

const ZoeWelcome = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)));
  }, []);

  const launchIntoPortal = async () => {
    setLaunching(true);
    await new Promise((resolve) => window.setTimeout(resolve, 3400));
    navigate('/rep', { replace: true });
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: ZOE_EMAIL, password });
    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    await launchIntoPortal();
  };

  return (
    <main className="zoe-welcome-shell min-h-[100svh] overflow-hidden bg-[#080b2b] text-white">
      <div className="zoe-sky-grid" aria-hidden="true" />
      <div className="zoe-orbit zoe-orbit-one" aria-hidden="true" />
      <div className="zoe-orbit zoe-orbit-two" aria-hidden="true" />
      <div className="zoe-star-field" aria-hidden="true" />

      <section className="relative z-10 mx-auto grid min-h-[100svh] max-w-7xl items-center gap-2 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(23rem,1.1fr)] lg:px-12">
        <div className="relative z-20 order-2 pb-6 lg:order-1 lg:py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-slate-950/55 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-200 backdrop-blur-md">
            <Gamepad2 className="h-4 w-4" /> Private BWB rep access
          </div>
          <button type="button" className="ml-0 mt-3 inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white shadow-[4px_4px_0_#fff] sm:ml-3 sm:mt-0" aria-label="BWB Field Agent identification">
            <ShieldCheck className="h-5 w-5" /> BWB Field Agent · Z-01
          </button>
          <p className="mt-6 text-sm font-black uppercase tracking-[0.32em] text-fuchsia-300">Zoe Launch Lab</p>
          <h1 className="mt-2 max-w-2xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.05em] sm:text-7xl lg:text-8xl">
            Ready to<br /><span className="text-cyan-300">level up?</span>
          </h1>
          <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-indigo-100 sm:text-lg">
            Welcome, Zoe. Your private rep portal, training missions, social home, and customer tools begin here.
          </p>

          <div className="mt-6 grid max-w-xl grid-cols-3 gap-2 text-center text-[0.68rem] font-black uppercase tracking-wide sm:text-xs">
            <div className="rounded-xl border border-cyan-300/25 bg-white/10 px-2 py-3 backdrop-blur"><ShieldCheck className="mx-auto mb-1 h-5 w-5 text-cyan-300" />Training access</div>
            <div className="rounded-xl border border-fuchsia-300/25 bg-white/10 px-2 py-3 backdrop-blur"><Sparkles className="mx-auto mb-1 h-5 w-5 text-fuchsia-300" />Mission rewards</div>
            <div className="rounded-xl border border-amber-300/25 bg-white/10 px-2 py-3 backdrop-blur"><Rocket className="mx-auto mb-1 h-5 w-5 text-amber-300" />Mobile ready</div>
          </div>

          {hasSession ? (
            <button type="button" onClick={() => void launchIntoPortal()} disabled={launching} className={`zoe-launch-button mt-7 min-h-14 w-full max-w-xl touch-manipulation rounded-sm bg-[#fff600] px-7 py-4 text-base font-black uppercase tracking-wide text-[#11152d] shadow-[0_12px_40px_rgba(255,246,0,0.32)] disabled:opacity-80 ${launching ? 'zoe-launch-button-active' : ''}`}>
              <span>{launching ? 'Launching...' : 'Enter the Launch Lab'}</span><Rocket className="h-5 w-5" />
            </button>
          ) : (
            <form onSubmit={handleLogin} className="mt-7 max-w-xl rounded-2xl border border-white/15 bg-slate-950/65 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-cyan-200"><LockKeyhole className="h-4 w-4" /> Zoe&apos;s secure sign-in</div>
              <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-indigo-200" htmlFor="zoe-email">Email</label>
              <input id="zoe-email" value={ZOE_EMAIL} readOnly className="mt-2 min-h-12 w-full rounded-lg border border-white/15 bg-white/95 px-4 text-base font-semibold text-slate-950" />
              <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-indigo-200" htmlFor="zoe-password">Password</label>
              <div className="relative mt-2">
                <input id="zoe-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="min-h-12 w-full rounded-lg border border-white/15 bg-white px-4 pr-12 text-base text-slate-950" />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-0 flex min-h-12 w-12 touch-manipulation items-center justify-center text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
              </div>
              {error && <p className="mt-3 rounded-lg border border-red-300/30 bg-red-950/60 p-3 text-sm text-red-100">{error}</p>}
              <button type="submit" disabled={loading || launching} className={`zoe-launch-button mt-5 min-h-14 w-full touch-manipulation rounded-sm bg-[#fff600] px-7 py-4 text-base font-black uppercase tracking-wide text-[#11152d] shadow-[0_12px_40px_rgba(255,246,0,0.32)] disabled:opacity-80 ${launching ? 'zoe-launch-button-active' : ''}`}>
                <span>{loading ? 'Checking access...' : launching ? 'Launching...' : 'Enter the Launch Lab'}</span><Rocket className="h-5 w-5" />
              </button>
            </form>
          )}
          <p className="mt-4 max-w-xl text-center text-xs text-indigo-300">Authorized for Zoe and BWB administration. Production changes still require Ashley&apos;s approval.</p>
        </div>

        <div className={`zoe-character-stage relative order-1 flex min-h-[43svh] items-end justify-center lg:order-2 lg:min-h-[90svh] ${launching ? 'zoe-character-launching' : ''}`} aria-label="Original Zoe Launch Lab character artwork">
          <div className="zoe-character-glow" aria-hidden="true" />
          <img src="/zoe/zoe-launch-character.png" alt="Zoe portrayed as an original masked BWB game character" className="zoe-character-image relative z-10 max-h-[52svh] w-auto max-w-full object-contain object-bottom drop-shadow-[0_24px_55px_rgba(34,211,238,0.35)] lg:max-h-[94svh]" />
          <div className="zoe-launch-trail" aria-hidden="true" />
        </div>
      </section>
    </main>
  );
};

export default ZoeWelcome;
