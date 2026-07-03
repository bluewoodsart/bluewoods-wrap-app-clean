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
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="absolute left-0 right-0 top-0 z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/favicon/favicon1.png"
            alt="Blue Woods Brands logo"
            className="h-11 w-11 rounded-lg bg-white object-contain p-1"
          />
          <div>
            <p className="text-lg font-bold leading-none">SlapWrapz</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-cyan-200">by Blue Woods Brands</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <Link to="/admin">Login</Link>
          </Button>
          <Button asChild className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
            <Link to="/register">Register</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section
          className="relative flex min-h-screen items-end overflow-hidden bg-cover bg-center px-5 pb-8 pt-28 md:px-8 md:pb-10"
          style={{
            backgroundImage: "linear-gradient(90deg, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.68) 42%, rgba(2,6,23,0.18) 78%), url('/slapwrapz/vehicle-wraps-hero-no-qr.png')"
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(249,115,22,0.2),transparent_28%)]" />
          <div className="relative z-10 mx-auto w-full max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">
              Wraps, fleet branding, banners, and sales-ready artwork
              </p>
              <h1 className="mt-5 text-5xl font-black leading-[1.02] text-white drop-shadow-2xl md:text-7xl">
                SlapWrapz makes your brand impossible to miss.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-100 drop-shadow md:text-xl">
                Vehicle wraps, fleet graphics, banners, and production-ready brand visibility. Start with a quote,
                send your artwork, and keep the project moving.
              </p>

              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                <div className="border border-cyan-300/40 bg-black/55 p-5 shadow-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400 text-slate-950">
                      <Zap className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-2xl font-black uppercase">Quick Quote</p>
                      <p className="text-sm text-cyan-100">Fast starting point. No full upload needed.</p>
                    </div>
                  </div>
                  <Button asChild className="mt-5 h-12 w-full bg-cyan-400 text-base font-black text-slate-950 hover:bg-cyan-300">
                    <Link to="/wraps">
                      Start Quick Quote
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="border border-white/25 bg-white/10 p-5 shadow-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-950">
                      <Sparkles className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-2xl font-black uppercase">Complete Project</p>
                      <p className="text-sm text-slate-100">Upload photos, logos, artwork, and project details.</p>
                    </div>
                  </div>
                  <Button asChild className="mt-5 h-12 w-full border border-white/35 bg-white/10 text-base font-black text-white hover:bg-white/20">
                    <Link to="/wraps/full">
                      Start Full Project
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 text-sm font-semibold text-cyan-100">
                <Clock3 className="h-5 w-5 text-cyan-300" />
                <span>You can save your progress and return later.</span>
              </div>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              {serviceTiles.map((tile) => (
                <Link
                  key={tile.label}
                  to={tile.label === 'Banners' ? '/banners' : tile.label === 'Signs' ? '/signs' : '/wraps'}
                  className={`min-h-24 border border-white/15 bg-gradient-to-br ${tile.accent} p-4 shadow-xl backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-cyan-300/60 hover:bg-white/15`}
                >
                  <p className="text-sm font-black uppercase leading-tight text-white">{tile.label}</p>
                </Link>
              ))}
            </div>

            <div className="mt-6 grid gap-2 border border-white/15 bg-black/35 p-3 backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-5">
              {trustBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <div key={badge.label} className="flex items-center gap-2 border-white/10 px-2 py-2 lg:border-r last:border-r-0">
                    <Icon className="h-5 w-5 shrink-0 text-cyan-300" />
                    <p className="text-xs font-bold uppercase leading-tight text-white">{badge.label}</p>
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
