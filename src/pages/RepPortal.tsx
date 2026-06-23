import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { ExternalLink, FileText, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase';

interface AdminUser {
  id: string;
  auth_user_id: string;
  email: string;
  display_name: string | null;
  role: 'owner_admin' | 'staff' | 'sales_rep';
  rep_slug: string | null;
  is_active: boolean;
}

type QuoteSummary = Record<string, unknown>;

interface FileSummary {
  id?: string;
  name?: string;
  url?: string;
  type?: string;
  size?: number;
  tags?: string[];
}

interface RepQuoteRow {
  id: string;
  quote_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  preferred_contact: string | null;
  status: string;
  product_type: string | null;
  rep_slug: string;
  assigned_rep_name: string | null;
  quote_summary: QuoteSummary | null;
  file_summary: FileSummary[] | string | null;
  created_at: string;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));

const formatLabel = (value: string | null | undefined) =>
  value ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '-';

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const vehicleParts = [record.year, record.make, record.model].filter(Boolean);
    if (vehicleParts.length > 0) return vehicleParts.map(String).join(' ');
    return Object.entries(record)
      .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== '')
      .map(([key, entryValue]) => `${formatLabel(key)}: ${formatValue(entryValue)}`)
      .join(', ');
  }
  return String(value);
};

const getSummaryValue = (quote: RepQuoteRow, keys: string | string[]) => {
  const summary = quote.quote_summary;
  if (!summary) return undefined;
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const key of keyList) {
    if (Object.prototype.hasOwnProperty.call(summary, key)) {
      return summary[key];
    }
  }
  return undefined;
};

const getFiles = (quote: RepQuoteRow): FileSummary[] => {
  if (Array.isArray(quote.file_summary)) return quote.file_summary;
  if (typeof quote.file_summary === 'string') {
    try {
      const parsed = JSON.parse(quote.file_summary);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const isImageFile = (file: FileSummary) => {
  if (file.type?.toLowerCase().startsWith('image/')) return true;

  const imagePath = `${file.name || ''} ${file.url || ''}`.toLowerCase();
  return /\.(png|jpe?g|webp)(\?.*)?$/.test(imagePath);
};

const DetailField = ({ label, value }: { label: string; value: unknown }) => (
  <div>
    <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
    <dd className="mt-1 text-sm text-slate-900">{formatValue(value)}</dd>
  </div>
);

const RepPortal = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [quotes, setQuotes] = useState<RepQuoteRow[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<RepQuoteRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const loadPortal = async () => {
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
      setQuotes([]);
      setLoading(false);
      return;
    }

    const { data: userData, error: userError } = await supabase.rpc('get_current_admin_user');

    if (userError) {
      setError(userError.message);
      setAdminUser(null);
      setQuotes([]);
      setLoading(false);
      return;
    }

    const activeAdminUser = (userData?.[0] as AdminUser | undefined) ?? null;
    setAdminUser(activeAdminUser);

    if (activeAdminUser?.role !== 'sales_rep') {
      setQuotes([]);
      setLoading(false);
      return;
    }

    setLoadingQuotes(true);
    const { data: quoteData, error: quoteError } = await supabase.rpc('get_rep_assigned_quote_requests');
    setLoadingQuotes(false);

    if (quoteError) {
      setError(quoteError.message);
      setQuotes([]);
      setLoading(false);
      return;
    }

    setQuotes((quoteData ?? []) as RepQuoteRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadPortal();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void loadPortal();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    navigate('/login?redirect=/rep', { replace: true });
  };

  const selectedFiles = useMemo(() => (selectedQuote ? getFiles(selectedQuote) : []), [selectedQuote]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 text-slate-700">
        <div className="flex items-center gap-3 text-sm font-medium">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Checking rep access...
        </div>
      </div>
    );
  }

  if (!session) {
    const redirect = encodeURIComponent(location.pathname);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (adminUser && adminUser.role !== 'sales_rep') {
    return <Navigate to="/admin" replace />;
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
              This account is not approved for the SlapWrapz rep portal.
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">SlapWrapz Rep Portal</p>
            <p className="text-sm text-slate-800">
              {adminUser.display_name || adminUser.email} - Assigned quotes only
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={signingOut}>
            <LogOut className="mr-2 h-4 w-4" />
            {signingOut ? 'Signing out...' : 'Log Out'}
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Assigned Quote Requests</CardTitle>
              <p className="mt-1 text-sm text-slate-600">
                Showing quotes currently assigned to your rep account.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadPortal()} disabled={loadingQuotes}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loadingQuotes ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {quotes.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-600">
                No currently assigned quotes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Files</TableHead>
                      <TableHead>Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((quote) => (
                      <TableRow
                        key={quote.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedQuote(quote)}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900">{quote.customer_name}</p>
                            <p className="text-xs text-slate-500">{quote.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm text-slate-900">
                              {formatValue(getSummaryValue(quote, ['selectedService', 'quoteType', 'intakeType']))}
                            </p>
                            <p className="text-xs text-slate-500">{quote.quote_id || quote.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {formatLabel(quote.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-sm text-slate-700">
                            <FileText className="h-4 w-4" />
                            {getFiles(quote).length}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{formatDate(quote.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={Boolean(selectedQuote)} onOpenChange={(open) => !open && setSelectedQuote(null)}>
        {selectedQuote && (
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedQuote.quote_id || selectedQuote.customer_name}</DialogTitle>
              <DialogDescription>Read-only assigned quote details</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-950">Customer</h3>
                <dl className="grid gap-4 md:grid-cols-3">
                  <DetailField label="Name" value={selectedQuote.customer_name} />
                  <DetailField label="Email" value={selectedQuote.customer_email} />
                  <DetailField label="Phone" value={selectedQuote.customer_phone} />
                  <DetailField label="Preferred Contact" value={selectedQuote.preferred_contact} />
                  <DetailField label="Status" value={formatLabel(selectedQuote.status)} />
                  <DetailField label="Received" value={formatDate(selectedQuote.created_at)} />
                </dl>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-950">Project</h3>
                <dl className="grid gap-4 md:grid-cols-2">
                  <DetailField label="Service" value={getSummaryValue(selectedQuote, ['selectedService', 'quoteType', 'intakeType'])} />
                  <DetailField label="Product" value={selectedQuote.product_type || getSummaryValue(selectedQuote, 'productType')} />
                  <DetailField label="Company" value={getSummaryValue(selectedQuote, 'companyName')} />
                  <DetailField label="Vehicle Type" value={getSummaryValue(selectedQuote, 'vehicleType')} />
                  <DetailField label="Vehicle" value={getSummaryValue(selectedQuote, 'vehicle')} />
                  <DetailField label="Budget" value={getSummaryValue(selectedQuote, 'budget')} />
                  <DetailField label="Timeline" value={getSummaryValue(selectedQuote, 'timeline')} />
                  <DetailField label="Design Needs" value={getSummaryValue(selectedQuote, ['designNeeds', 'hasArtwork', 'artworkStatus'])} />
                  <DetailField label="Project Notes" value={getSummaryValue(selectedQuote, 'goal')} />
                  <DetailField label="Banner Details" value={getSummaryValue(selectedQuote, 'banner')} />
                </dl>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-950">Files</h3>
                {selectedFiles.length === 0 ? (
                  <p className="text-sm text-slate-600">No uploaded files on this quote.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <a
                        key={file.id || file.url || index}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-800 hover:bg-slate-50"
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-3">
                          {file.url && isImageFile(file) ? (
                            <img
                              src={file.url}
                              alt=""
                              loading="lazy"
                              className="h-14 w-14 flex-none rounded-md border border-slate-200 bg-slate-100 object-cover"
                            />
                          ) : (
                            <FileText className="h-5 w-5 flex-none text-slate-500" />
                          )}
                          <span className="min-w-0 flex-1 truncate">{file.name || file.url || `File ${index + 1}`}</span>
                        </span>
                        <ExternalLink className="h-4 w-4 flex-none text-slate-500" />
                      </a>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default RepPortal;
