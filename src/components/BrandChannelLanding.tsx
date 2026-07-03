import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Building2, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BrandChannel } from '@/lib/brandChannels';

interface BrandChannelLandingProps {
  channel: BrandChannel;
}

const BrandChannelLanding = ({ channel }: BrandChannelLandingProps) => {
  const isJazzyChannel = channel.slug === 'jazzy';
  const isTrapstarChannel = channel.slug === 'trapstar';

  if (isTrapstarChannel) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white">
        <header className="absolute left-0 right-0 top-0 z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/favicon/favicon1.png"
              alt="Blue Woods Brands logo"
              className="h-11 w-11 rounded-lg bg-white object-contain p-1"
            />
            <div>
              <p className="text-lg font-bold leading-none">{channel.name}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-yellow-200">{channel.headerSubtitle}</p>
            </div>
          </Link>
          <Button asChild className="border border-yellow-300/40 bg-yellow-300 text-neutral-950 hover:bg-yellow-200">
            <Link to="/rep">Rep Portal</Link>
          </Button>
        </header>

        <main>
          <section
            className="relative flex min-h-screen items-end overflow-hidden bg-cover bg-center px-5 pb-12 pt-28 md:px-8 md:pb-16"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(10,10,10,0.96) 0%, rgba(10,10,10,0.74) 42%, rgba(10,10,10,0.18) 78%), url('${channel.heroImagePath}')`
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_76%,rgba(234,179,8,0.24),transparent_32%),radial-gradient(circle_at_86%_16%,rgba(255,255,255,0.16),transparent_24%)]" />
            <div className="relative z-10 mx-auto w-full max-w-7xl">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-yellow-200">
                  {channel.eyebrow}
                </p>
                <h1 className="mt-5 text-5xl font-black leading-[0.98] text-white drop-shadow-2xl md:text-7xl">
                  Trapstar Customs LG
                </h1>
                <p className="mt-5 max-w-2xl text-3xl font-black uppercase leading-tight text-yellow-300 drop-shadow md:text-5xl">
                  {channel.headline}
                </p>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-100 drop-shadow md:text-xl">
                  {channel.description}
                </p>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="border border-yellow-300/35 bg-black/55 p-5 shadow-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-300 text-neutral-950">
                        <Zap className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-2xl font-black uppercase">Quick Quote</p>
                        <p className="text-sm text-yellow-100">Fast starting point for wrap pricing.</p>
                      </div>
                    </div>
                    <Button asChild className="mt-5 h-12 w-full bg-yellow-300 text-base font-black text-neutral-950 hover:bg-yellow-200">
                      <Link to={channel.wrapQuotePath}>
                        Start Quick Quote
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="border border-white/25 bg-white/10 p-5 shadow-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-950">
                        <Sparkles className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-2xl font-black uppercase">Full Project</p>
                        <p className="text-sm text-neutral-200">Photos, logos, artwork, and project details.</p>
                      </div>
                    </div>
                    <Button asChild className="mt-5 h-12 w-full border border-white/30 bg-white/10 text-base font-black text-white hover:bg-white/20">
                      <Link to={channel.fullProjectPath || channel.wrapQuotePath}>
                        Start Full Project
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="mt-8 grid gap-3 text-sm text-neutral-200 sm:grid-cols-3">
                  {channel.featureBullets.map((bullet) => (
                    <div key={bullet} className="border-l border-yellow-300/70 pl-4">
                      <p className="font-semibold">{bullet}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        {isJazzyChannel ? (
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Blue Woods Brands home">
              <img
                src="/favicon/favicon1.png"
                alt="Blue Woods Brands logo"
                className="h-11 w-11 rounded-lg bg-white object-contain p-1"
              />
            </Link>
            <div>
              <Link to="/" className="text-lg font-bold leading-none">
                {channel.name}
              </Link>
              <p className="mt-1 text-xs font-medium tracking-wide text-red-200">{channel.headerSubtitle}</p>
            </div>
          </div>
        ) : (
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/favicon/favicon1.png"
              alt="Blue Woods Brands logo"
              className="h-11 w-11 rounded-lg bg-white object-contain p-1"
            />
            <div>
              <p className="text-lg font-bold leading-none">{channel.name}</p>
              <p className="mt-1 text-xs font-medium tracking-wide text-red-200">{channel.headerSubtitle}</p>
            </div>
          </Link>
        )}
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
              {channel.poweredBy && <p>{channel.poweredBy}</p>}
            </div>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300 md:text-xl">
              {channel.headline}
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-400">
              {channel.description}
            </p>
            {channel.body?.map((paragraph) => (
              <p key={paragraph} className="mt-4 max-w-2xl text-base leading-7 text-neutral-400">
                {paragraph}
              </p>
            ))}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 bg-red-500 px-6 text-base font-bold text-white hover:bg-red-400">
                <Link to={channel.wrapQuotePath}>
                  Get a Wrap Quote
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {channel.bannerQuotePath && (
                <Button
                  asChild
                  className="h-12 border border-white/25 bg-white/10 px-6 text-base font-bold text-white hover:bg-white/20"
                >
                  <Link to={channel.bannerQuotePath}>
                    Get a Banner Quote
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
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
                    {channel.cardEyebrow}
                  </p>
                  <h2 className="mt-4 text-3xl font-black leading-tight text-white">
                    {channel.cardHeadline}
                  </h2>
                  <p className="mt-4 text-base leading-7 text-neutral-300">
                    {channel.cardDescription}
                  </p>
                </div>

                <div className="grid gap-3 text-sm text-neutral-300">
                  {channel.comingSoonTitle && (
                    <p className="font-semibold text-neutral-100">{channel.comingSoonTitle}</p>
                  )}
                  {(channel.comingSoonItems || channel.featureBullets).map((bullet) => (
                    <div key={bullet} className="flex items-start gap-3">
                      <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                      <p>{bullet}</p>
                    </div>
                  ))}
                  {channel.comingSoonNote && (
                    <p className="pt-1 text-neutral-400">{channel.comingSoonNote}</p>
                  )}
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
