import React, { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { getRoleSafePostLoginRedirect, getSafeInternalRedirect } from '@/lib/repTracking';

interface LoginPlaceholderProps {
  defaultRedirect?: string;
  brandName?: string;
  brandSubtitle?: string;
  uppercaseBrandSubtitle?: boolean;
  eyebrow?: string;
  heading?: string;
  backLinkLabel?: string;
  backLinkTarget?: string;
  allowAccountSwitch?: boolean;
}

const LoginPlaceholder: React.FC<LoginPlaceholderProps> = ({
  defaultRedirect = '/admin',
  brandName = 'SlapWrapz',
  brandSubtitle = 'by Blue Woods Brands',
  uppercaseBrandSubtitle = true,
  eyebrow = 'Admin CRM',
  heading = 'Staff and sales rep login',
  backLinkLabel = 'Back to Home',
  backLinkTarget = '/',
  allowAccountSwitch = false
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = getSafeInternalRedirect(searchParams.get('redirect'), defaultRedirect);
  const isRepLoginRedirect = redirectPath === '/rep' || redirectPath.startsWith('/rep?');
  const shouldAllowAccountSwitch = allowAccountSwitch || isRepLoginRedirect;

  const getPostLoginRedirect = async () => {
    const { data } = await supabase.rpc('get_current_admin_user');
    const activeAdminUser = data?.[0] as { role?: string } | undefined;

    return getRoleSafePostLoginRedirect(redirectPath, activeAdminUser?.role, defaultRedirect);
  };

  useEffect(() => {
    const checkExistingSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        if (shouldAllowAccountSwitch) {
          setCheckingSession(false);
          return;
        }

        navigate(await getPostLoginRedirect(), { replace: true });
        return;
      }

      setCheckingSession(false);
    };

    void checkExistingSession();
  }, [navigate, redirectPath, shouldAllowAccountSwitch]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    navigate(await getPostLoginRedirect(), { replace: true });
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        <p className="text-sm text-slate-300">Checking session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/favicon/favicon1.png"
            alt="Blue Woods Brands logo"
            className="h-11 w-11 rounded-lg bg-white object-contain p-1"
          />
          <div>
            <p className="text-lg font-bold leading-none">{brandName}</p>
            <p className={`mt-1 text-xs font-medium tracking-wide text-cyan-200 ${uppercaseBrandSubtitle ? 'uppercase' : ''}`}>
              {brandSubtitle}
            </p>
          </div>
        </Link>

        <main>
          <Card className="border-white/15 bg-white/10 text-white shadow-2xl">
            <CardHeader>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-400 text-slate-950">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">{eyebrow}</p>
              <CardTitle className="text-3xl font-black leading-tight text-white md:text-4xl">
                {heading}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-100">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="border-white/20 bg-white text-slate-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-100">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="border-white/20 bg-white text-slate-950"
                  />
                </div>

                {error && (
                  <div className="rounded-md border border-red-300/40 bg-red-950/40 p-3 text-sm text-red-100">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="submit" disabled={loading} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                    {loading ? 'Signing in...' : 'Log In'}
                  </Button>
                  <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                    <Link to={backLinkTarget}>{backLinkLabel}</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default LoginPlaceholder;
