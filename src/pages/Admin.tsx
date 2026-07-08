import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PricingCalculatorSandbox from '@/components/admin/PricingCalculatorSandbox';
import RepOnboardingPromptCard from '@/components/admin/RepOnboardingPromptCard';
import { supabase } from '@/lib/supabase';
import AdminStatus from './AdminStatus';

interface AdminUser {
  id: string;
  auth_user_id: string;
  email: string;
  display_name: string | null;
  role: 'owner_admin' | 'staff' | 'sales_rep' | 'rep_manager';
  rep_slug: string | null;
  is_active: boolean;
}

const formatRole = (role: AdminUser['role']) =>
  role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

class PricingSandboxErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Pricing sandbox render failed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Pricing Sandbox</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Pricing sandbox data is unavailable. Phase 3 pricing RPCs may not be installed yet.
            </p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

const Admin = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const loadAdminUser = async () => {
    setLoading(true);
    setError('');

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      setError(sessionError.message);
      setSession(null);
      setAdminUser(null);
      setLoading(false);
      return;
    }

    const activeSession = sessionData.session;
    setSession(activeSession);

    if (!activeSession) {
      setAdminUser(null);
      setLoading(false);
      return;
    }

    const { data, error: adminError } = await supabase.rpc('get_current_admin_user');

    if (adminError) {
      setError(adminError.message);
      setAdminUser(null);
      setLoading(false);
      return;
    }

    setAdminUser((data?.[0] as AdminUser | undefined) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void loadAdminUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void loadAdminUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 text-slate-700">
        <div className="flex items-center gap-3 text-sm font-medium">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Checking admin access...
        </div>
      </div>
    );
  }

  if (!session) {
    const redirect = encodeURIComponent(location.pathname);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin access check failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">{error}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => void loadAdminUser()}>Try Again</Button>
              <Button variant="outline" onClick={handleLogout} disabled={signingOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {signingOut ? 'Signing out...' : 'Log Out'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access not approved.</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              You are signed in, but this account is not approved for the Blue Woods admin CRM.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" asChild>
                <Link to="/">Back to Home</Link>
              </Button>
              <Button onClick={handleLogout} disabled={signingOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {signingOut ? 'Signing out...' : 'Log Out'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (adminUser.role === 'sales_rep' || adminUser.role === 'rep_manager') {
    return <Navigate to="/rep" replace />;
  }

  const canViewPricingSandbox = adminUser.role === 'owner_admin' || adminUser.role === 'staff';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Blue Woods Admin</p>
            <p className="text-sm text-slate-800">
              {adminUser.display_name || adminUser.email} · {formatRole(adminUser.role)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={signingOut}>
            <LogOut className="mr-2 h-4 w-4" />
            {signingOut ? 'Signing out...' : 'Log Out'}
          </Button>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <Tabs defaultValue="quote-requests" className="space-y-5">
          <TabsList className={canViewPricingSandbox ? 'grid w-full max-w-2xl grid-cols-3' : 'grid w-full max-w-md grid-cols-2'}>
            <TabsTrigger value="quote-requests">Quote Requests</TabsTrigger>
            <TabsTrigger value="rep-onboarding">Rep Onboarding</TabsTrigger>
            {canViewPricingSandbox && (
              <TabsTrigger value="pricing-sandbox">Pricing Sandbox</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="quote-requests" className="mt-0">
            <AdminStatus enableBulkActions currentAdminRole={adminUser.role} />
          </TabsContent>

          <TabsContent value="rep-onboarding" className="mt-0">
            <RepOnboardingPromptCard />
          </TabsContent>

          {canViewPricingSandbox && (
            <TabsContent value="pricing-sandbox" className="mt-0">
              <PricingSandboxErrorBoundary>
                <PricingCalculatorSandbox />
              </PricingSandboxErrorBoundary>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
