import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  ExternalLink,
  FileImage,
  Loader2,
  PackageOpen,
  Shirt,
  Sparkles,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

const BUCKET = 'bwb-brand-assets';
const MAX_FILE_SIZE = 25 * 1024 * 1024;

interface BrandDefinition {
  key: string;
  name: string;
  description: string;
  status: string;
  masterLogo?: string;
}

interface BrandAsset {
  id: string;
  name: string;
  path: string;
  signedUrl: string;
  isImage: boolean;
}

const brands: BrandDefinition[] = [
  { key: 'blue-woods-brands', name: 'Blue Woods Brands', description: 'Parent company identity, media network, and master brand system.', status: 'Master brand', masterLogo: '/bwb-bluewoods-logo.png' },
  { key: 'slapwrapz', name: 'SlapWrapz', description: 'Vehicle-wrap, signs, print, quote capture, and proof brand.', status: 'Active brand' },
  { key: 'client-brands', name: 'Client brands and managed projects', description: 'Brand kits developed or maintained for Blue Woods clients.', status: 'Growing library' },
  { key: 'new-concepts', name: 'New brand concepts', description: 'Early names, marks, directions, and business ideas under development.', status: 'Idea vault' },
];

const cleanFileName = (name: string) => name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const displayFileName = (name: string) => name.replace(/^[0-9a-f-]{36}-/i, '').replace(/[-_]+/g, ' ');

const BrandPortfolio = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeBrandKey, setActiveBrandKey] = useState('blue-woods-brands');
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [assetError, setAssetError] = useState('');
  const activeBrand = brands.find((brand) => brand.key === activeBrandKey) || brands[0];

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setAssetError('');
    const { data, error } = await supabase.storage.from(BUCKET).list(activeBrandKey, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error) {
      setAssets([]);
      setAssetError(error.message);
      setLoading(false);
      return;
    }

    const signedAssets = await Promise.all((data ?? []).filter((file) => file.id).map(async (file) => {
      const path = `${activeBrandKey}/${file.name}`;
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      const extension = file.name.split('.').pop()?.toLowerCase();
      return {
        id: file.id || path,
        name: file.name,
        path,
        signedUrl: signed?.signedUrl || '',
        isImage: ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(extension || ''),
      };
    }));
    setAssets(signedAssets);
    setLoading(false);
  }, [activeBrandKey]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const uploadAsset = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Brand assets must be 25 MB or smaller.');
      return;
    }
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'webp', 'svg', 'pdf'].includes(extension || '')) {
      toast.error('Upload a PNG, JPG, WEBP, SVG, or PDF brand file.');
      return;
    }

    setUploading(true);
    const path = `${activeBrandKey}/${crypto.randomUUID()}-${cleanFileName(file.name) || 'brand-asset'}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || (extension === 'pdf' ? 'application/pdf' : 'image/png'),
      cacheControl: '3600',
      upsert: false,
    });
    setUploading(false);
    if (error) {
      toast.error(error.message || 'The brand asset could not be uploaded.');
      return;
    }
    toast.success(`${file.name} was added to ${activeBrand.name}.`);
    await loadAssets();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void uploadAsset(file);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {brands.map((brand) => {
          const selected = activeBrandKey === brand.key;
          return (
            <button key={brand.key} type="button" onClick={() => setActiveBrandKey(brand.key)} className={`rounded-xl border p-4 text-left transition ${selected ? 'border-cyan-400 bg-cyan-50 ring-2 ring-cyan-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
              <div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{brand.name}</p><p className="mt-1 text-sm leading-5 text-slate-600">{brand.description}</p></div><span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-800">{brand.status}</span></div>
            </button>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 p-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center md:p-7">
          <div className="flex min-h-44 items-center justify-center rounded-2xl border border-white/15 bg-white p-4">
            {activeBrand.masterLogo ? <img src={activeBrand.masterLogo} alt={`${activeBrand.name} master logo`} className="w-full object-contain" /> : <Sparkles className="h-16 w-16 text-cyan-300" />}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Selected brand workspace</p>
            <h3 className="mt-2 text-3xl font-black">{activeBrand.name}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{activeBrand.description}</p>
            {activeBrand.masterLogo ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><a href={activeBrand.masterLogo} download="bwb-bluewoods-master-logo.png"><Download className="mr-2 h-4 w-4" />Download BWB logo</a></Button>
                <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white hover:text-slate-950"><a href={activeBrand.masterLogo} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open full size</a></Button>
              </div>
            ) : <p className="mt-4 text-sm font-bold text-amber-200">Master logo still needs to be added.</p>}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="border-cyan-200 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">Shared across computers</p><CardTitle className="mt-2">Brand Asset Vault</CardTitle><p className="mt-1 text-sm text-slate-600">Logos, social graphics, color references, brand guides, print files, and merchandise artwork.</p></div>
              <div><input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf" className="hidden" onChange={handleFileChange} /><Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload brand asset</Button></div>
            </div>
          </CardHeader>
          <CardContent>
            {assetError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{assetError}</div>}
            {loading && <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Loading brand assets...</div>}
            {!loading && assets.length === 0 && !assetError && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><FileImage className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-2 font-black text-slate-950">The private brand folder is ready.</p><p className="mt-1 text-sm text-slate-600">The built-in BWB master logo is already downloadable above. Add alternate logos, square social versions, or production artwork here.</p></div>}
            {!loading && assets.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{assets.map((asset) => <div key={asset.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">{asset.isImage && asset.signedUrl ? <img src={asset.signedUrl} alt="" className="h-12 w-14 rounded-lg border border-slate-200 object-contain" /> : <div className="rounded-lg bg-slate-100 p-3"><FileImage className="h-5 w-5" /></div>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-950">{displayFileName(asset.name)}</p><p className="text-xs text-slate-500">{activeBrand.name}</p></div>{asset.signedUrl && <Button size="icon" variant="ghost" asChild><a href={asset.signedUrl} target="_blank" rel="noreferrer" aria-label={`Open ${displayFileName(asset.name)}`}><ExternalLink className="h-4 w-4" /></a></Button>}</div>)}</div>}
          </CardContent>
        </Card>

        <Card className="border-violet-200 bg-violet-50/40 shadow-sm">
          <CardHeader><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-violet-800">Future products</p><CardTitle className="mt-2">Merchandise Lab</CardTitle></div><PackageOpen className="h-7 w-7 text-violet-700" /></div></CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-700">Develop branded products without mixing production artwork into social-media files.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {['Hats & patches', 'T-shirts', 'Hoodies & workwear', 'Stickers & decals', 'Cups & promo items', 'Event merchandise'].map((item) => <div key={item} className="flex items-center gap-2 rounded-lg border border-violet-200 bg-white p-3 text-sm font-black text-slate-800"><Shirt className="h-4 w-4 text-violet-700" />{item}</div>)}
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"><strong>Next asset set:</strong> transparent logo, square social avatar, dark-background version, one-color print mark, and embroidery-friendly mark.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BrandPortfolio;
