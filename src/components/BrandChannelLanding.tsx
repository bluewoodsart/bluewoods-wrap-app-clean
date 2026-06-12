import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BrandChannel } from '@/lib/brandChannels';

interface BrandChannelLandingProps {
  channel: BrandChannel;
}

const BrandChannelLanding = ({ channel }: BrandChannelLandingProps) => {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/favicon/favicon1.png"
            alt="Blue Woods Brands logo"
            className="h-11 w-11 rounded-lg bg-white object-contain p-1"
          />
          <div>
            <p className="text-lg font-bold leading-none">{channel.name}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-red-200">Blue Woods Brands</p>
          </div>
        </Link>
      </header>

      <main>
        <section className="mx-auto grid min-h-[calc(100vh-84px)] w-full max-w-7xl items-center gap-10 px-5 pb-12 pt-4 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:pb-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-red-200">
              {channel.eyebrow}
            </p>
            <h1 className="mt-5 text-5xl font-black leading-[1.02] text-white md:text-7xl">
              {channel.name}
            </h1>
            <div className="mt-5 space-y-2 text-base font-semibold text-neutral-200 md:text-lg">
              <p>{channel.parentBrand}</p>
              <p>{channel.poweredBy}</p>
            </div>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300 md:text-xl">
              {channel.headline}
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-400">
              {channel.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 bg-red-500 px-6 text-base font-bold text-white hover:bg-red-400">
                <Link to={channel.wrapQuotePath}>
                  Get a Wrap Quote
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                className="h-12 border border-white/25 bg-white/10 px-6 text-base font-bold text-white hover:bg-white/20"
              >
                <Link to={channel.bannerQuotePath}>
                  Get a Banner Quote
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="border border-white/15 bg-white/[0.06] p-6 shadow-2xl">
            <div className="aspect-[4/3] border border-red-300/25 bg-neutral-900 p-6">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500 text-white">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <p className="mt-8 text-sm font-semibold uppercase tracking-[0.22em] text-red-200">
                    Same system, branded entry
                  </p>
                  <h2 className="mt-4 text-3xl font-black leading-tight text-white">
                    Leads flow into SlapWrapz with Todd preserved.
                  </h2>
                </div>

                <div className="grid gap-3 text-sm text-neutral-300">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                    <p>Wrap requests go to /wraps?rep=todd.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                    <p>Banner requests go to /banners?rep=todd.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                    <p>Blue Woods Brands and SlapWrapz stay clearly connected.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BrandChannelLanding;
