import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { BadgeCheck, BriefcaseBusiness, ExternalLink, LogOut, Megaphone, Network, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CompassionMinistriesWorkspace from '@/components/admin/CompassionMinistriesWorkspace';
import BlueWoodsMarketingWorkspace from '@/components/admin/BlueWoodsMarketingWorkspace';
import ClientCrmDirectory from '@/components/admin/ClientCrmDirectory';
import PricingCalculatorSandbox from '@/components/admin/PricingCalculatorSandbox';
import RepOnboardingPromptCard from '@/components/admin/RepOnboardingPromptCard';
import VideoInstructionReview from '@/components/admin/VideoInstructionReview';
import ProductionHub from '@/components/admin/ProductionHub';
import BusinessCardNetworking from '@/components/admin/BusinessCardNetworking';
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
      // Supabase calls made before this callback returns can deadlock auth-js.
      window.setTimeout(() => {
        void loadAdminUser();
      }, 0);
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
  const selectedClientWorkspace = routeParams.get('client');
  const activeTab = requestedTab === 'marketing'
    ? 'owner-marketing'
    : requestedTab === 'clients'
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
              : requestedTab === 'networking'
                ? 'networking'
              : 'staff-feed';

  const changeAdminTab = (nextTab: string) => {
    const nextParams = new URLSearchParams(location.search);
    const tabValue = nextTab === 'owner-marketing'
      ? 'marketing'
      : nextTab === 'clients'
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
                : nextTab === 'networking'
                  ? 'networking'
                : 'social';
    nextParams.set('tab', tabValue);
    nextParams.delete('section');
    if (nextTab !== 'clients') nextParams.delete('client');
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

  const openOwnerDestination = (tab: string, section?: string) => {
    const nextParams = new URLSearchParams();
    nextParams.set('tab', tab);
    if (section) nextParams.set('section', section);
    navigate({ pathname: '/admin', search: `?${nextParams.toString()}` });
  };

  const openCompassionWorkspace = () => {
    navigate({ pathname: '/admin', search: '?tab=clients&client=compassion-ministries' });
  };

  const openClientCrm = () => {
    navigate({ pathname: '/admin', search: '?tab=clients' });
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
      {adminUser.role === 'owner_admin' && (
        <div className="border-b border-slate-800 bg-slate-950 px-4 py-3 text-white md:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">Owner Command Center</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <Button variant="outline" asChild className="justify-start border-white/20 bg-white/10 text-white hover:bg-white hover:text-slate-950">
                <Link to="/"><ExternalLink className="mr-2 h-4 w-4" />Main Website</Link>
              </Button>
              <Button variant="outline" onClick={() => openOwnerDestination('marketing')} className={`justify-start border-white/20 hover:bg-white hover:text-slate-950 ${activeTab === 'owner-marketing' ? 'bg-white text-slate-950' : 'bg-white/10 text-white'}`}>
                <Megaphone className="mr-2 h-4 w-4" />Marketing
              </Button>
              <Button variant="outline" onClick={() => openOwnerDestination('networking')} className="justify-start border-white/20 bg-white/10 text-white hover:bg-white hover:text-slate-950">
                <Network className="mr-2 h-4 w-4" />Networking
              </Button>
              <Button variant="outline" onClick={() => openOwnerDestination('clients')} className="justify-start border-white/20 bg-white/10 text-white hover:bg-white hover:text-slate-950">
                <BriefcaseBusiness className="mr-2 h-4 w-4" />Clients
              </Button>
              <Button variant="outline" onClick={() => openOwnerDestination('quotes')} className="col-span-2 justify-start border-white/20 bg-white/10 text-white hover:bg-white hover:text-slate-950 sm:col-span-1">
                <BadgeCheck className="mr-2 h-4 w-4" />Quotes
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto min-w-0 max-w-7xl overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6 md:px-8">
        <Tabs value={activeTab} onValueChange={changeAdminTab} className="space-y-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <TabsList className="flex h-auto w-full max-w-5xl overflow-x-auto">
              <TabsTrigger value="clients" className="min-h-11 min-w-max flex-1 px-3">Clients</TabsTrigger>
              <TabsTrigger value="staff-feed" className="min-h-11 min-w-max flex-1 px-3">Staff Feed</TabsTrigger>
              {/* Video Instructions is archived: its direct route and records remain available for restoration. */}
              <TabsTrigger value="quote-requests" className="min-h-11 min-w-max flex-1 px-3">Quote Requests</TabsTrigger>
              <TabsTrigger value="rep-onboarding" className="min-h-11 min-w-max flex-1 px-3">Reps</TabsTrigger>
              <TabsTrigger value="production" className="min-h-11 min-w-max flex-1 px-3">Production</TabsTrigger>
              <TabsTrigger value="networking" className="min-h-11 min-w-max flex-1 px-3">Networking</TabsTrigger>
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
            {selectedClientWorkspace === 'compassion-ministries' ? (
              <div className="space-y-4">
                <Button variant="outline" onClick={openClientCrm}>Back to Client CRM</Button>
                <CompassionMinistriesWorkspace initialSection="dashboard" />
              </div>
            ) : (
              <ClientCrmDirectory onOpenCompassionWorkspace={openCompassionWorkspace} />
            )}
          </TabsContent>

          <TabsContent value="owner-marketing" className="mt-0">
            <BlueWoodsMarketingWorkspace adminUserId={adminUser.id} />
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

          <TabsContent value="networking" className="mt-0">
            <BusinessCardNetworking adminUserId={adminUser.id} />
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
