import portfolio from '@/data/wrapPortfolio.json';

export default function WrapPortfolio() {
  return <section aria-labelledby="wrap-portfolio-heading" className="mx-auto max-w-7xl px-4 py-16 md:px-8">
    <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">Our completed work</p>
    <h2 id="wrap-portfolio-heading" className="mt-3 text-3xl font-black md:text-5xl">Real vehicles. Real business graphics.</h2>
    <p className="mt-5 max-w-3xl leading-7 text-slate-300">Explore historical wrap and graphics projects from our previous shop. Bring your next vehicle graphics project to SlapWrapz by Blue Woods Brands in Fayetteville, Georgia.</p>
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {portfolio.filter(photo=>photo.featured).map(photo=><figure key={photo.id} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        <a href="/services/vehicle-wraps#completed-wraps"><img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" className="h-60 w-full bg-slate-950 object-contain" /></a>
        <figcaption className="p-4 text-sm leading-6 text-slate-300">{photo.caption}</figcaption>
      </figure>)}
    </div>
    <a href="/services/vehicle-wraps#completed-wraps" className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-cyan-400 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-300">View all 29 projects</a>
  </section>;
}
