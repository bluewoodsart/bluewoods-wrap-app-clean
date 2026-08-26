import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { BadgeCheck, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CompassionMinistriesWorkspace from '@/components/admin/CompassionMinistriesWorkspace';
import PricingCalculatorSandbox from '@/components/admin/PricingCalculatorSandbox';
import RepOnboardingPromptCard from '@/components/admin/RepOnboardingPromptCard';
import VideoInstructionReview from '@/components/admin/VideoInstructionReview';
import ProductionHub from '@/components/admin/ProductionHub';
import StaffFeed from '@/components/StaffFeed';
import { supabase } from '@/lib/supabase';
import { runMobileTouchAction } from '@/lib/mobileTouch';
import { clearClientAuthStorage, isClientForceLoggedOut, markClientForceLoggedOut } from '@/lib/repTracking';
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
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const loadAdminUser = async () => {
    setLoading(true);
    setError('');

    if (isClientForceLoggedOut()) {
      setSession(null);
      setAdminUser(null);
      setLoading(false);
      return;
    }

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

  useEffect(() => {
    if (!adminUser || adminUser.role === 'sales_rep' || adminUser.role === 'rep_manager') return;

    const loadApprovalCount = async () => {
      setApprovalsLoading(true);
      const { data, error: approvalError } = await supabase.rpc('list_admin_rep_page_ideas_v1', {
        p_rep_slug: null
      });
      if (!approvalError) {
        setPendingApprovalCount((data ?? []).filter((idea: { status?: string }) => idea.status === 'pending_review').length);
      }
      setApprovalsLoading(false);
    };

    void loadApprovalCount();
    const refreshApprovals = () => void loadApprovalCount();
    window.addEventListener('bwb-approvals-updated', refreshApprovals);
    return () => window.removeEventListener('bwb-approvals-updated', refreshApprovals);
  }, [adminUser]);

  const handleLogout = () => {
    setSigningOut(true);
    markClientForceLoggedOut();
    clearClientAuthStorage();
    window.location.assign('/logout');
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
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
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
              <Button variant="outline" onClick={handleLogout} onTouchEnd={(event) => runMobileTouchAction(event, () => void handleLogout())} disabled={signingOut}>
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
              <Button onClick={handleLogout} onTouchEnd={(event) => runMobileTouchAction(event, () => void handleLogout())} disabled={signingOut}>
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
  const routeParams = new URLSearchParams(location.search);
  const requestedTab = routeParams.get('tab');
  const activeTab = requestedTab === 'clients'
    ? 'clients'
    : routeParams.has('rep') || requestedTab === 'reps'
      ? 'rep-onboarding'
      : requestedTab === 'quotes'
        ? 'quote-requests'
        : requestedTab === 'pricing'
          ? 'pricing-sandbox'
          : requestedTab === 'video-reviews'
            ? 'video-reviews'
            : requestedTab === 'production'
              ? 'production'
              : 'staff-feed';

  const changeAdminTab = (nextTab: string) => {
    const nextParams = new URLSearchParams(location.search);
    const tabValue = nextTab === 'clients'
      ? 'clients'
      : nextTab === 'rep-onboarding'
        ? 'reps'
        : nextTab === 'quote-requests'
          ? 'quotes'
          : nextTab === 'pricing-sandbox'
            ? 'pricing'
            : nextTab === 'video-reviews'
              ? 'video-reviews'
              : nextTab === 'production'
                ? 'production'
                : 'social';
    nextParams.set('tab', tabValue);
    if (nextTab !== 'rep-onboarding') {
      nextParams.delete('rep');
      nextParams.delete('approvals');
    }
    navigate({ pathname: '/admin', search: `?${nextParams.toString()}` });
  };

  const openApprovals = () => {
    const nextParams = new URLSearchParams(location.search);
    nextParams.set('tab', 'reps');
    nextParams.set('approvals', '1');
    nextParams.delete('rep');
    navigate({ pathname: '/admin', search: `?${nextParams.toString()}` });
  };

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
          <Button variant="outline" size="sm" onClick={handleLogout} onTouchEnd={(event) => runMobileTouchAction(event, () => void handleLogout())} disabled={signingOut}>
            <LogOut className="mr-2 h-4 w-4" />
            {signingOut ? 'Signing out...' : 'Log Out'}
          </Button>
        </div>
      </div>
      <div className="mx-auto min-w-0 max-w-7xl overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6 md:px-8">
        <Tabs value={activeTab} onValueChange={changeAdminTab} className="space-y-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <TabsList className="flex h-auto w-full max-w-5xl overflow-x-auto">
              <TabsTrigger value="clients" className="min-h-11 min-w-max flex-1 px-3">Clients</TabsTrigger>
              <TabsTrigger value="staff-feed" className="min-h-11 min-w-max flex-1 px-3">Staff Feed</TabsTrigger>
              <TabsTrigger value="video-reviews" className="min-h-11 min-w-max flex-1 px-3">Video Instructions</TabsTrigger>
              <TabsTrigger value="quote-requests" className="min-h-11 min-w-max flex-1 px-3">Quote Requests</TabsTrigger>
              <TabsTrigger value="rep-onboarding" className="min-h-11 min-w-max flex-1 px-3">Reps</TabsTrigger>
              <TabsTrigger value="production" className="min-h-11 min-w-max flex-1 px-3">Production</TabsTrigger>
              {canViewPricingSandbox && (
                <TabsTrigger value="pricing-sandbox" className="min-h-11 min-w-max flex-1 px-3">Pricing Sandbox</TabsTrigger>
              )}
            </TabsList>
            <button
              type="button"
              onClick={openApprovals}
              className={`flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 lg:w-auto ${pendingApprovalCount > 0 ? 'border-red-700 bg-red-600 text-white focus-visible:ring-red-300' : 'border-emerald-700 bg-emerald-500 text-emerald-950 focus-visible:ring-emerald-300'}`}
              aria-label={pendingApprovalCount > 0 ? `${pendingApprovalCount} approvals pending` : 'Approvals are all clear'}
            >
              {pendingApprovalCount > 0 ? <ShieldAlert className="h-5 w-5" /> : <BadgeCheck className="h-5 w-5" />}
              {approvalsLoading ? 'Checking Approvals...' : pendingApprovalCount > 0 ? `Approvals · ${pendingApprovalCount} Pending` : 'Approvals · All Clear'}
            </button>
          </div>

          <TabsContent value="clients" className="mt-0">
            <CompassionMinistriesWorkspace />
          </TabsContent>

          <TabsContent value="staff-feed" className="mt-0">
            <StaffFeed />
          </TabsContent>

          <TabsContent value="video-reviews" className="mt-0">
            <VideoInstructionReview currentAdminRole={adminUser.role} />
          </TabsContent>

          <TabsContent value="quote-requests" className="mt-0">
            <AdminStatus enableBulkActions currentAdminRole={adminUser.role} />
          </TabsContent>

          <TabsContent value="rep-onboarding" className="mt-0">
            <RepOnboardingPromptCard />
          </TabsContent>

          <TabsContent value="production" className="mt-0">
            <ProductionHub />
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
