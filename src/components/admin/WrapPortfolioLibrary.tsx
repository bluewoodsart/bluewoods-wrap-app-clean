import portfolio from '@/data/wrapPortfolio.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function WrapPortfolioLibrary() {
  return <Card><CardHeader><CardTitle>Vehicle wrap portfolio — 29 SEO photos</CardTitle>
    <p className="text-sm text-slate-600">Published portfolio photos with descriptive filenames and individual alt text. Six featured projects appear on the homepage; all 29 appear on the vehicle-wraps page.</p>
    <div className="flex flex-wrap gap-4 text-sm text-blue-700 underline"><a href="/" target="_blank" rel="noreferrer">View homepage</a><a href="/services/vehicle-wraps#completed-wraps" target="_blank" rel="noreferrer">View Fayetteville vehicle-wraps page</a><a href="/portfolio/vehicle-wraps/seo-catalog.csv" download>Download SEO catalog</a></div>
  </CardHeader><CardContent><details><summary className="cursor-pointer py-3 font-semibold">Browse all 29 photos and their alt text</summary><div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
    {portfolio.map(photo=><article key={photo.id} className="min-w-0 rounded-lg border p-3"><img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" className="h-48 w-full rounded bg-slate-100 object-contain" /><h3 className="mt-3 font-bold">{photo.title}</h3><p className="mt-2 text-xs font-semibold text-emerald-700">{photo.featured?'Homepage + vehicle-wraps page':'Vehicle-wraps page'}</p><p className="mt-2 text-sm"><strong>Alt text:</strong> {photo.alt}</p><a className="mt-3 inline-block text-sm text-blue-700 underline" href={photo.src} download>Download photo</a></article>)}
  </div></details></CardContent></Card>;
}
