import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Clock3, Palette, ShieldCheck, Sparkles, Truck, Upload, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IndexProps {
  isPreviewMode?: boolean;
}

const Index: React.FC<IndexProps> = () => {
  const serviceTiles = [
    { label: 'Commercial Wraps', accent: 'from-cyan-400/25 to-blue-500/10' },
    { label: 'Color Changes', accent: 'from-orange-400/25 to-red-500/10' },
    { label: 'Truck & Trailer Wraps', accent: 'from-sky-400/25 to-cyan-500/10' },
    { label: 'Banners', accent: 'from-yellow-300/25 to-orange-500/10' },
    { label: 'Signs', accent: 'from-emerald-300/25 to-cyan-500/10' },
    { label: 'Stickers & Decals', accent: 'from-pink-400/25 to-orange-500/10' }
  ];

  const trustBadges = [
    { label: '30+ years experience', icon: ShieldCheck },
    { label: 'Rep-tracked quotes', icon: BadgeCheck },
    { label: 'Upload-ready workflow', icon: Upload },
    { label: 'Vibrant wrap finishes', icon: Palette },
    { label: 'Fleet & trailer capable', icon: Truck }
  ];

  return (
    <div className="min-h-[100svh] overflow-x-hidden bg-slate-950 text-white">
      <header className="absolute left-0 right-0 top-0 z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8 md:py-5">
        <Link to="/" className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
          <img
            src="/favicon/favicon1.png"
            alt="Blue Woods Brands logo"
            className="h-9 w-9 rounded-lg bg-white object-contain p-1 md:h-11 md:w-11"
          />
          <div>
            <p className="text-base font-bold leading-none md:text-lg">SlapWrapz</p>
            <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-wide text-cyan-200 md:text-xs">by Blue Woods Brands</p>
          </div>
        </Link>

        <nav className="hidden shrink-0 items-center gap-2 sm:flex">
          <Button asChild size="sm" variant="outline" className="h-9 border-white/30 bg-white/10 px-3 text-xs text-white hover:bg-white/20 hover:text-white md:text-sm">
            <Link to="/admin">Login</Link>
          </Button>
          <Button asChild size="sm" className="h-9 bg-cyan-400 px-3 text-xs text-slate-950 hover:bg-cyan-300 md:text-sm">
            <Link to="/register">Register</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section
          className="relative flex min-h-[100svh] items-end overflow-hidden bg-cover bg-[position:62%_center] px-4 pb-6 pt-24 sm:bg-[position:58%_center] md:bg-center md:px-8 md:pb-10 md:pt-28"
          style={{
            backgroundImage: "linear-gradient(180deg, rgba(2,6,23,0.88) 0%, rgba(2,6,23,0.58) 34%, rgba(2,6,23,0.92) 100%), url('/slapwrapz/vehicle-wraps-hero-no-qr.png')"
          }}
        >
          <div className="absolute inset-0 bg-black/10 md:bg-[linear-gradient(90deg,rgba(2,6,23,0.28),transparent_58%)]" />
          <div className="relative z-10 mx-auto w-full max-w-7xl overflow-hidden">
            <div className="max-w-[22rem] rounded-none sm:max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200 md:text-sm md:tracking-[0.22em]">
              Wraps, fleet branding, banners, and sales-ready artwork
              </p>
              <h1 className="mt-3 max-w-full break-words text-[1.7rem] font-black leading-[1.05] text-white drop-shadow-2xl sm:text-4xl md:mt-5 md:text-7xl">
                SlapWrapz makes your brand impossible to miss.
              </h1>
              <p className="mt-4 max-w-2xl break-words text-sm leading-6 text-slate-100 drop-shadow sm:text-base md:mt-6 md:text-xl md:leading-8">
                Vehicle wraps, fleet graphics, banners, and production-ready brand visibility. Start with a quote,
                send your artwork, and keep the project moving.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 md:mt-8 md:gap-4">
                <div className="border border-cyan-300/40 bg-black/55 p-4 shadow-2xl backdrop-blur-sm md:p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-slate-950 md:h-12 md:w-12">
                      <Zap className="h-5 w-5 md:h-6 md:w-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xl font-black uppercase md:text-2xl">Quick Quote</p>
                      <p className="text-xs text-cyan-100 md:text-sm">Fast starting point. No full upload needed.</p>
                    </div>
                  </div>
                  <Button asChild className="mt-4 h-11 w-full bg-cyan-400 text-sm font-black text-slate-950 hover:bg-cyan-300 md:mt-5 md:h-12 md:text-base">
                    <Link to="/wraps">
                      Start Quick Quote
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="border border-white/25 bg-white/10 p-4 shadow-2xl backdrop-blur-sm md:p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 md:h-12 md:w-12">
                      <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xl font-black uppercase md:text-2xl">Complete Project</p>
                      <p className="text-xs text-slate-100 md:text-sm">Upload photos, logos, artwork, and project details.</p>
                    </div>
                  </div>
                  <Button asChild className="mt-4 h-11 w-full border border-white/35 bg-white/10 text-sm font-black text-white hover:bg-white/20 md:mt-5 md:h-12 md:text-base">
                    <Link to="/wraps/full">
                      Start Full Project
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-cyan-100 md:gap-3 md:text-sm">
                <Clock3 className="h-4 w-4 shrink-0 text-cyan-300 md:h-5 md:w-5" />
                <span>You can save your progress and return later.</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:mt-8 md:gap-3 lg:grid-cols-6">
              {serviceTiles.map((tile) => (
                <Link
                  key={tile.label}
                  to={tile.label === 'Banners' ? '/banners' : tile.label === 'Signs' ? '/signs' : '/wraps'}
                  className={`min-h-16 border border-white/15 bg-gradient-to-br ${tile.accent} p-3 shadow-xl backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-cyan-300/60 hover:bg-white/15 md:min-h-24 md:p-4`}
                >
                  <p className="text-xs font-black uppercase leading-tight text-white md:text-sm">{tile.label}</p>
                </Link>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-1.5 border border-white/15 bg-black/35 p-2 backdrop-blur-sm sm:grid-cols-2 md:mt-6 md:gap-2 md:p-3 lg:grid-cols-5">
              {trustBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <div key={badge.label} className="flex items-center gap-2 border-white/10 px-1.5 py-1.5 md:px-2 md:py-2 lg:border-r last:border-r-0">
                    <Icon className="h-4 w-4 shrink-0 text-cyan-300 md:h-5 md:w-5" />
                    <p className="text-[0.65rem] font-bold uppercase leading-tight text-white md:text-xs">{badge.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
