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
  const isRepHeroChannel = channel.slug === 'jarrel' || channel.slug === 'anthony';

  if (isTrapstarChannel) {
    return (
      <div className="min-h-[100svh] overflow-x-hidden bg-neutral-950 text-white">
        <header className="absolute left-0 right-0 top-0 z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8 md:py-5">
          <Link to="/" className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
            <img
              src="/favicon/favicon1.png"
              alt="Blue Woods Brands logo"
              className="h-9 w-9 rounded-lg bg-white object-contain p-1 md:h-11 md:w-11"
            />
            <div className="min-w-0">
              <p className="truncate text-base font-bold leading-none md:text-lg">{channel.name}</p>
              <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-wide text-yellow-200 md:text-xs">{channel.headerSubtitle}</p>
            </div>
          </Link>
          <Button asChild size="sm" className="hidden h-9 shrink-0 border border-yellow-300/40 bg-yellow-300 px-3 text-xs text-neutral-950 hover:bg-yellow-200 sm:inline-flex md:text-sm">
            <Link to="/rep">Rep Portal</Link>
          </Button>
        </header>

        <main>
          <section
            className="relative flex min-h-[100svh] items-end overflow-hidden bg-cover bg-[position:56%_center] px-4 pb-6 pt-24 sm:bg-[position:52%_center] md:bg-center md:px-8 md:pb-16 md:pt-28"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(10,10,10,0.9) 0%, rgba(10,10,10,0.62) 34%, rgba(10,10,10,0.94) 100%), url('${channel.heroImagePath}')`
            }}
          >
            <div className="absolute inset-0 bg-black/10 md:bg-[linear-gradient(90deg,rgba(10,10,10,0.32),transparent_60%)]" />
            <div className="relative z-10 mx-auto w-full max-w-7xl overflow-hidden">
              <div className="max-w-[22rem] sm:max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-200 md:text-sm md:tracking-[0.24em]">
                  {channel.eyebrow}
                </p>
                <h1 className="mt-3 max-w-full break-words text-3xl font-black leading-[1.02] text-white drop-shadow-2xl sm:text-5xl md:mt-5 md:text-7xl">
                  Trapstar Customs LG
                </h1>
                <p className="mt-3 max-w-2xl break-words text-xl font-black uppercase leading-tight text-yellow-300 drop-shadow sm:text-3xl md:mt-5 md:text-5xl">
                  {channel.headline}
                </p>
                <p className="mt-4 max-w-2xl break-words text-sm leading-6 text-neutral-100 drop-shadow sm:text-base md:mt-6 md:text-xl md:leading-8">
                  {channel.description}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 md:mt-8 md:gap-4">
                  <div className="border border-yellow-300/35 bg-black/55 p-4 shadow-2xl backdrop-blur-sm md:p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-neutral-950 md:h-11 md:w-11">
                        <Zap className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xl font-black uppercase md:text-2xl">Quick Quote</p>
                        <p className="text-xs text-yellow-100 md:text-sm">Fast starting point for wrap pricing.</p>
                      </div>
                    </div>
                    <Button asChild className="mt-4 h-11 w-full bg-yellow-300 text-sm font-black text-neutral-950 hover:bg-yellow-200 md:mt-5 md:h-12 md:text-base">
                      <Link to={channel.wrapQuotePath}>
                        Start Quick Quote
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="border border-white/25 bg-white/10 p-4 shadow-2xl backdrop-blur-sm md:p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-neutral-950 md:h-11 md:w-11">
                        <Sparkles className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xl font-black uppercase md:text-2xl">Full Project</p>
                        <p className="text-xs text-neutral-200 md:text-sm">Photos, logos, artwork, and project details.</p>
                      </div>
                    </div>
                    <Button asChild className="mt-4 h-11 w-full border border-white/30 bg-white/10 text-sm font-black text-white hover:bg-white/20 md:mt-5 md:h-12 md:text-base">
                      <Link to={channel.fullProjectPath || channel.wrapQuotePath}>
                        Start Full Project
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-2 text-xs text-neutral-200 sm:grid-cols-3 md:mt-8 md:gap-3 md:text-sm">
                  {channel.featureBullets.map((bullet) => (
                    <div key={bullet} className="border-l border-yellow-300/70 pl-3 md:pl-4">
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

  if (isRepHeroChannel) {
    return (
      <div className="min-h-[100svh] overflow-x-hidden bg-neutral-950 text-white">
        <header className="absolute left-0 right-0 top-0 z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8 md:py-5">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img
              src="/favicon/favicon1.png"
              alt="Blue Woods Brands logo"
              className="h-10 w-10 rounded-lg bg-white object-contain p-1 md:h-11 md:w-11"
            />
            <div className="min-w-0">
              <p className="truncate text-base font-black leading-none md:text-lg">{channel.name}</p>
              <p className="mt-1 text-[0.7rem] font-bold uppercase tracking-wide text-red-200 md:text-xs">{channel.headerSubtitle}</p>
            </div>
          </Link>
          <Button asChild size="sm" className="h-9 shrink-0 border border-red-300/40 bg-red-500 px-3 text-xs font-black text-white hover:bg-red-400 md:text-sm">
            <Link to="/rep">Rep Portal</Link>
          </Button>
        </header>

        <main>
          <section
            className="relative flex min-h-[100svh] items-end overflow-hidden bg-cover bg-[position:68%_center] px-4 pb-6 pt-24 md:bg-center md:px-8 md:pb-12 md:pt-28"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(4,4,5,0.98) 0%, rgba(4,4,5,0.88) 35%, rgba(4,4,5,0.36) 68%, rgba(4,4,5,0.84) 100%), url('${channel.heroImagePath}')`
            }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,4,5,0.92),rgba(4,4,5,0.25)_42%,rgba(4,4,5,0.94))]" />
            <div className="relative z-10 mx-auto grid w-full max-w-7xl items-end gap-6 lg:grid-cols-[1.02fr_0.72fr]">
              <div className="max-w-3xl pb-2 md:pb-8">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-red-200 md:text-sm">
                  {channel.eyebrow}
                </p>
                <h1 className="mt-4 max-w-4xl break-words text-5xl font-black leading-[0.95] text-white drop-shadow-2xl md:mt-5 md:text-7xl">
                  SlapWrapz
                </h1>
                <p className="mt-5 max-w-2xl break-words text-xl font-black leading-tight text-red-200 drop-shadow md:text-4xl">
                  {channel.headline}
                </p>
                <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-100 drop-shadow md:text-xl md:leading-8">
                  {channel.description}
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="h-12 bg-red-500 px-6 text-base font-black text-white hover:bg-red-400">
                    <Link to={channel.wrapQuotePath}>
                      Get a Wrap Quote
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  {channel.bannerQuotePath && (
                    <Button
                      asChild
                      className="h-12 border border-white/25 bg-white/10 px-6 text-base font-black text-white hover:bg-white/20"
                    >
                      <Link to={channel.bannerQuotePath}>
                        Get a Banner Quote
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              <div className="mb-2 border border-red-300/35 bg-black/58 p-4 shadow-2xl backdrop-blur-sm md:mb-8 md:p-5">
                <div className="border border-red-200/20 bg-neutral-950/78 p-5 md:p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-500 text-white">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-red-200 md:text-sm">
                    {channel.cardEyebrow}
                  </p>
                  <h2 className="mt-3 break-words text-3xl font-black leading-tight text-white md:text-4xl">
                    {channel.cardHeadline}
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-neutral-200 md:text-base md:leading-7">
                    {channel.cardDescription}
                  </p>
                  <div className="mt-6 grid gap-3 text-sm text-neutral-100">
                    {channel.featureBullets.map((bullet) => (
                      <div key={bullet} className="flex items-start gap-3">
                        <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                        <p>{bullet}</p>
                      </div>
                    ))}
                  </div>
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

          <div className="border border-white/15 bg-white/[0.06] p-4 shadow-2xl sm:p-5 md:p-6">
            <div className="min-h-[26rem] border border-red-300/25 bg-neutral-900 p-5 sm:p-6 md:min-h-[28rem]">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-500 text-white md:h-12 md:w-12">
                    <Building2 className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-red-200 md:mt-7 md:text-sm md:tracking-[0.22em]">
                    {channel.cardEyebrow}
                  </p>
                  <h2 className="mt-3 break-words text-2xl font-black leading-tight text-white md:mt-4 md:text-3xl">
                    {channel.cardHeadline}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-neutral-300 md:mt-4 md:text-base md:leading-7">
                    {channel.cardDescription}
                  </p>
                </div>

                <div className="mt-6 grid gap-2.5 text-sm text-neutral-300 md:gap-3">
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
