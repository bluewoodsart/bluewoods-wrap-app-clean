import { ExternalLink, LogOut, Mail, MessageSquareText, Phone, QrCode, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DavidLead {
  id: string;
  quote_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  preferred_contact: string | null;
  status: string;
  quote_summary: Record<string, unknown> | null;
  created_at: string;
}

interface Props {
  displayName: string;
  leads: DavidLead[];
  loading: boolean;
  signingOut: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

const qrDestination = 'https://www.slapwrapz.com/go/david';
const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=900x900&margin=24&data=${encodeURIComponent(qrDestination)}`;

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    new: 'Nuevo',
    partial: 'Nuevo',
    quote_requested: 'Cotización solicitada',
    quote_sent: 'Cotización enviada',
    approved: 'Aprobado',
    completed: 'Completado'
  };
  return labels[status] || status.replace(/_/g, ' ');
};

const contactHref = (lead: DavidLead) => {
  if (lead.customer_phone) return `sms:${lead.customer_phone}`;
  if (lead.customer_email) return `mailto:${lead.customer_email}`;
  return null;
};

const DavidBannerRepPortal = ({ displayName, leads, loading, signingOut, onRefresh, onLogout }: Props) => (
  <div className="min-h-screen bg-[#f4f1e8] text-slate-950">
    <header className="border-b-4 border-emerald-700 bg-slate-950 px-4 py-4 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">SlapWrapz · Portal de David</p>
          <h1 className="mt-1 text-2xl font-black">Hola, {displayName}</h1>
          <p className="text-xs text-slate-300">Your banner sales portal</p>
        </div>
        <Button variant="outline" size="sm" className="border-white/30 bg-white/10 text-white hover:text-slate-950" onClick={onLogout} disabled={signingOut}>
          <LogOut className="mr-2 h-4 w-4" />Salir
        </Button>
      </div>
    </header>

    <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="overflow-hidden border-emerald-200 shadow-md">
        <div className="h-2 bg-gradient-to-r from-emerald-700 via-white to-red-600" />
        <CardHeader>
          <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-800">Tu código QR</p>
          <CardTitle>Muéstralo. Ellos se registran.</CardTitle>
          <p className="text-sm text-slate-500">Show it. They sign up.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mx-auto max-w-[280px] rounded-2xl border-2 border-slate-950 bg-white p-3">
            <img src={qrImage} alt="Código QR permanente de David" className="h-auto w-full" />
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <p className="font-black text-emerald-900">slapwrapz.com/go/david</p>
            <p className="mt-1 text-xs text-emerald-800">Este enlace siempre te da el crédito.</p>
            <p className="text-xs text-slate-500">This link always gives you credit.</p>
          </div>
          <Button asChild className="w-full bg-emerald-700 hover:bg-emerald-800">
            <a href={qrDestination} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Abrir página del cliente</a>
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-5">
        <Card className="border-slate-200 shadow-md">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700"><Users className="h-7 w-7" /></span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Personas registradas</p>
                <p className="text-4xl font-black">{leads.length}</p>
                <p className="text-xs text-slate-500">People signed up through your rep account</p>
              </div>
            </div>
            <Button variant="outline" onClick={onRefresh} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-md">
          <CardHeader className="border-b border-slate-200">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">Tus personas</p>
            <CardTitle>Clientes de banners</CardTitle>
            <p className="text-sm text-slate-500">Your banner customers</p>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Cargando registros…</div>
            ) : leads.length === 0 ? (
              <div className="p-8 text-center">
                <QrCode className="mx-auto h-9 w-9 text-emerald-700" />
                <p className="mt-3 font-black">Todavía no hay registros.</p>
                <p className="mt-1 text-sm text-slate-500">Cuando alguien use tu QR, aparecerá aquí.</p>
                <p className="text-xs text-slate-400">When someone uses your QR, they will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {leads.map((lead) => {
                  const href = contactHref(lead);
                  return (
                    <article key={lead.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black">{lead.customer_name}</p>
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase text-emerald-800">{statusLabel(lead.status)}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{lead.customer_phone || lead.customer_email || 'Contacto pendiente'}</p>
                        <p className="mt-1 text-xs text-slate-400">{lead.quote_id || 'Solicitud de banner'} · {new Date(lead.created_at).toLocaleDateString('es-US')}</p>
                      </div>
                      {href && (
                        <Button asChild variant="outline" size="sm">
                          <a href={href}>{lead.customer_phone ? <Phone className="mr-2 h-4 w-4" /> : <Mail className="mr-2 h-4 w-4" />}Contactar</a>
                        </Button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="flex gap-3"><MessageSquareText className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">Tu trabajo por ahora: comparte el QR.</p><p>El equipo de SlapWrapz prepara el precio, diseño y producción.</p><p className="mt-1 text-xs text-amber-800">For now, share the QR. SlapWrapz handles pricing, design, and production.</p></div></div>
        </div>
      </section>
    </main>
  </div>
);

export default DavidBannerRepPortal;
