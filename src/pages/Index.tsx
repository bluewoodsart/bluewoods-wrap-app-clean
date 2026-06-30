import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ImageSlideshow from '@/components/ImageSlideshow';

interface IndexProps {
  isPreviewMode?: boolean;
}

const Index: React.FC<IndexProps> = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-8">
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
        <section className="mx-auto grid min-h-[calc(100vh-84px)] w-full max-w-7xl items-center gap-10 px-5 pb-10 pt-4 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:pb-14">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">
              Wraps, fleet branding, banners, and sales-ready artwork
            </p>
            <h1 className="mt-5 text-5xl font-black leading-[1.02] text-white md:text-7xl">
              SlapWrapz makes your brand impossible to miss.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 md:text-xl">
              A Blue Woods Brands specialty channel for vehicle wraps, fleet graphics, banners, and production-ready
              brand visibility. Start with a quote, send your artwork, and keep the project moving.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button asChild className="h-12 bg-cyan-400 text-base font-bold text-slate-950 hover:bg-cyan-300">
                <Link to="/wraps">Get Wrap Quote</Link>
              </Button>
              <Button asChild className="h-12 bg-white text-base font-bold text-slate-950 hover:bg-slate-100">
                <Link to="/banners">Get Banner Quote</Link>
              </Button>
              <Button asChild className="h-12 bg-emerald-300 text-base font-bold text-slate-950 hover:bg-emerald-200">
                <Link to="/signs">Get Sign Quote</Link>
              </Button>
              <Button asChild className="h-12 border border-white/30 bg-white/10 text-base font-bold text-white hover:bg-white/20">
                <Link to="/wraps">Start Quote to Upload</Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
              <div className="border-l border-cyan-300/50 pl-4">
                <p className="font-bold text-white">Fleet-ready</p>
                <p className="mt-1">Built for work trucks, trailers, vans, and branded crews.</p>
              </div>
              <div className="border-l border-cyan-300/50 pl-4">
                <p className="font-bold text-white">Rep tracked</p>
                <p className="mt-1">Sales links keep the right rep attached to each lead.</p>
              </div>
              <div className="border-l border-cyan-300/50 pl-4">
                <p className="font-bold text-white">Upload ready</p>
                <p className="mt-1">Customer upload links stay active for project files.</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/15 bg-white/10 p-3 shadow-2xl">
            <ImageSlideshow />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
