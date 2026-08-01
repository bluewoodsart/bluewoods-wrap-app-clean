import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Gift,
  Headphones,
  MapPin,
  Music2,
  PartyPopper,
  Play,
  Radio,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  X,
} from 'lucide-react';

const songs = [
  { title: 'September', artist: 'Earth, Wind & Fire', year: '1978' },
  { title: 'Crazy in Love', artist: 'Beyoncé', year: '2003' },
  { title: 'Mr. Brightside', artist: 'The Killers', year: '2003' },
  { title: 'Dancing Queen', artist: 'ABBA', year: '1976' },
  { title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', year: '2014' },
  { title: 'Yeah!', artist: 'Usher', year: '2004' },
  { title: 'I Wanna Dance with Somebody', artist: 'Whitney Houston', year: '1987' },
  { title: 'Hey Ya!', artist: 'Outkast', year: '2003' },
  { title: 'Don’t Stop Believin’', artist: 'Journey', year: '1981' },
  { title: 'Toxic', artist: 'Britney Spears', year: '2003' },
  { title: 'No Scrubs', artist: 'TLC', year: '1999' },
  { title: 'Man! I Feel Like a Woman!', artist: 'Shania Twain', year: '1997' },
  { title: 'Shake It Off', artist: 'Taylor Swift', year: '2014' },
  { title: 'Juice', artist: 'Lizzo', year: '2019' },
  { title: 'This Is How We Do It', artist: 'Montell Jordan', year: '1995' },
  { title: 'Since U Been Gone', artist: 'Kelly Clarkson', year: '2004' },
  { title: 'Levitating', artist: 'Dua Lipa', year: '2020' },
  { title: 'Return of the Mack', artist: 'Mark Morrison', year: '1996' },
  { title: 'Flowers', artist: 'Miley Cyrus', year: '2023' },
  { title: 'Hot in Herre', artist: 'Nelly', year: '2002' },
  { title: 'Espresso', artist: 'Sabrina Carpenter', year: '2024' },
  { title: 'Wannabe', artist: 'Spice Girls', year: '1996' },
  { title: 'Watermelon Sugar', artist: 'Harry Styles', year: '2019' },
  { title: 'Shut Up and Dance', artist: 'WALK THE MOON', year: '2014' },
];

const winningLines = [
  [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24], [4, 8, 12, 16, 20],
];

type Screen = 'join' | 'game';

const MusicBingo = () => {
  const [screen, setScreen] = useState<Screen>('join');
  const [name, setName] = useState('');
  const [code, setCode] = useState('TACO22');
  const [marked, setMarked] = useState<Set<number>>(new Set([12]));
  const [songIndex, setSongIndex] = useState(0);
  const [showHow, setShowHow] = useState(false);
  const [showWin, setShowWin] = useState(false);

  const card = useMemo(() => {
    const result = [...songs.slice(0, 12), { title: 'FREE', artist: 'Good vibes', year: '★' }, ...songs.slice(12)];
    return result;
  }, []);

  const hasBingo = winningLines.some((line) => line.every((index) => marked.has(index)));
  const progress = Math.max(...winningLines.map((line) => line.filter((index) => marked.has(index)).length));

  const toggleSquare = (index: number) => {
    if (index === 12) return;
    const next = new Set(marked);
    next.has(index) ? next.delete(index) : next.add(index);
    setMarked(next);
  };

  const nextSong = () => {
    setSongIndex((current) => (current + 1) % songs.length);
  };

  const resetGame = () => {
    setMarked(new Set([12]));
    setSongIndex(0);
    setShowWin(false);
  };

  if (screen === 'join') {
    return (
      <main className="min-h-[100svh] bg-[#f4f0e8] text-[#17211a]">
        <div className="relative min-h-[100svh] overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#ffcc4d]" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-[#ff6846]" />
          <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 -rotate-3 items-center justify-center rounded-xl bg-[#17211a] text-[#ffcc4d] shadow-[3px_3px_0_#ff6846]">
                <Music2 className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-xl font-black leading-none tracking-[-0.04em]">BingoBeat</span>
                <span className="mt-1 block text-[0.48rem] font-black uppercase leading-none tracking-[0.07em] text-[#677169]">Brought to you by</span>
                <div className="mt-1 flex items-center gap-1.5" aria-label="BWB and Forbes Events">
                  <span className="relative h-7 w-16 overflow-hidden rounded bg-white">
                    <img src="/bwb-bluewoods-logo.png" alt="BWB Bluewoods" className="absolute inset-0 h-full w-full scale-150 object-contain" />
                  </span>
                  <span className="text-[0.55rem] font-black text-[#677169]">+</span>
                  <img src="/forbes-events-logo.png" alt="Forbes Events" className="h-7 w-9 rounded bg-black object-contain" />
                </div>
              </div>
            </div>
            <button onClick={() => setShowHow(true)} className="rounded-full border-2 border-[#17211a] bg-white/70 px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 hover:bg-white sm:px-4 sm:text-sm">
              How it works
            </button>
          </header>

          <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-5 pb-12 pt-8 md:grid-cols-[1.05fr_.95fr] md:px-8 md:pb-20 md:pt-16">
            <div>
              <div className="mb-5 inline-flex rotate-[-2deg] items-center gap-2 rounded-full bg-[#d9f99d] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] shadow-[3px_3px_0_#17211a]">
                <Radio className="h-4 w-4" /> Live at Anthony&apos;s Pizza
              </div>
              <h1 className="max-w-2xl text-5xl font-black leading-[0.91] tracking-[-0.065em] sm:text-6xl md:text-[5.3rem]">
                Hear it.
                <br />
                Mark it.
                <br />
                <span className="text-[#e7462b]">Win it.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg font-medium leading-7 text-[#526057]">
                Music bingo for the whole room. No app download, no paper cards—just songs, friends, and prizes.
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold">
                <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2"><Users className="h-4 w-4 text-[#e7462b]" /> 84 playing now</span>
                <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2"><Gift className="h-4 w-4 text-[#e7462b]" /> 3 prizes tonight</span>
              </div>
              <div className="mt-6 max-w-lg rounded-2xl border-2 border-[#17211a] bg-[#ffcc4d] p-4 shadow-[4px_4px_0_#17211a]">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em]"><CalendarDays className="h-4 w-4" /> This week at Anthony&apos;s</p>
                <p className="mt-2 text-xl font-black">Wednesday Night Music Bingo</p>
                <p className="mt-1 text-sm font-bold text-[#5b5131]">7:00 PM · Free to play · Pizza and drink prizes</p>
              </div>
            </div>

            <div className="rotate-[1deg] rounded-[2rem] border-2 border-[#17211a] bg-white p-6 shadow-[10px_10px_0_#17211a] sm:p-8">
              <div className="mb-7 flex items-start justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#e7462b]">Tonight’s game</p>
                  <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">Decades Dance-Off</h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffcc4d]">
                  <Headphones className="h-6 w-6" />
                </div>
              </div>
              <label className="block text-sm font-black" htmlFor="game-code">Game code</label>
              <input
                id="game-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                maxLength={8}
                className="mt-2 h-14 w-full rounded-xl border-2 border-[#17211a] bg-[#f4f0e8] px-4 text-center text-2xl font-black uppercase tracking-[0.2em] outline-none transition focus:ring-4 focus:ring-[#ffcc4d]/60"
              />
              <label className="mt-5 block text-sm font-black" htmlFor="player-name">Your first name</label>
              <input
                id="player-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Jordan"
                className="mt-2 h-14 w-full rounded-xl border-2 border-[#17211a] px-4 text-base font-bold outline-none transition placeholder:text-[#8c948e] focus:ring-4 focus:ring-[#ffcc4d]/60"
              />
              <button
                onClick={() => setScreen('game')}
                disabled={!name.trim() || code.length < 4}
                className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#17211a] bg-[#ff6846] text-base font-black text-white shadow-[4px_4px_0_#17211a] transition hover:-translate-y-0.5 hover:bg-[#f25738] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Join the game <ArrowRight className="h-5 w-5" />
              </button>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold text-[#677169]">
                <MapPin className="h-3.5 w-3.5" /> Anthony&apos;s Pizza · Atlanta, GA
              </p>
            </div>
          </section>
          <SponsorStrip light />
        </div>

        {showHow && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#17211a]/60 p-5 backdrop-blur-sm" onClick={() => setShowHow(false)}>
            <div className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">How to play</h2>
                <button onClick={() => setShowHow(false)} aria-label="Close" className="rounded-full bg-[#f4f0e8] p-2"><X className="h-5 w-5" /></button>
              </div>
              <ol className="mt-6 space-y-5">
                {[
                  ['Listen up', 'The host plays a song for everyone in the venue.'],
                  ['Find the song', 'If it’s on your card, tap the square to mark it.'],
                  ['Get five in a row', 'Across, down, or diagonal—then shout BINGO!'],
                ].map(([title, body], index) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ffcc4d] font-black">{index + 1}</span>
                    <div><p className="font-black">{title}</p><p className="mt-1 text-sm leading-5 text-[#677169]">{body}</p></div>
                  </li>
                ))}
              </ol>
              <button onClick={() => setShowHow(false)} className="mt-7 h-12 w-full rounded-xl bg-[#17211a] font-black text-white">Got it</button>
            </div>
          </div>
        )}
      </main>
    );
  }

  const nowPlaying = songs[songIndex];

  return (
    <main className="min-h-[100svh] bg-[#17211a] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#17211a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-7">
          <button onClick={() => setScreen('join')} className="flex items-center gap-2 font-black">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffcc4d] text-[#17211a]"><Music2 className="h-4 w-4" /></span>
            <span className="hidden text-left sm:block">
              <span className="block leading-none">BingoBeat</span>
              <span className="mt-1 block text-[0.48rem] uppercase tracking-[0.08em] text-[#aeb8b0]">Brought to you by BWB + Forbes Events</span>
            </span>
            <img src="/favicon/favicon1.png" alt="BWB Bluewoods" className="h-7 w-7 rounded-md object-cover" />
            <img src="/forbes-events-logo.png" alt="Forbes Events" className="h-7 w-7 rounded-md bg-black object-contain" />
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-black">Decades Dance-Off</p>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#aeb8b0]">Room {code} · 84 players</p>
          </div>
          <button onClick={resetGame} aria-label="Reset demo" className="rounded-full border border-white/15 p-2 text-[#d4ddd6] transition hover:bg-white/10"><RotateCcw className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-3 py-4 md:grid-cols-[minmax(0,1fr)_22rem] md:px-7 md:py-7">
        <section className="min-w-0">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#ffcc4d]">{name}’s card</p>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] md:text-3xl">Tap a song when you hear it</h1>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-black text-[#ffcc4d]">{progress}/5</p>
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[#aeb8b0]">best line</p>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-5 gap-1.5 px-1 text-center text-xs font-black tracking-[0.22em] text-[#ffcc4d] sm:text-base">
            {'BINGO'.split('').map((letter) => <span key={letter}>{letter}</span>)}
          </div>
          <div className="grid grid-cols-5 gap-1.5 rounded-2xl bg-white/10 p-1.5 sm:gap-2 sm:p-2">
            {card.map((song, index) => {
              const isMarked = marked.has(index);
              const isFree = index === 12;
              return (
                <button
                  key={`${song.title}-${index}`}
                  onClick={() => toggleSquare(index)}
                  aria-pressed={isMarked}
                  className={`relative flex aspect-square min-w-0 flex-col items-center justify-center overflow-hidden rounded-lg border p-1 text-center transition sm:rounded-xl sm:p-2 ${
                    isMarked
                      ? 'border-[#ffcc4d] bg-[#ffcc4d] text-[#17211a] shadow-[inset_0_-4px_0_rgba(0,0,0,.12)]'
                      : 'border-white/10 bg-[#f9f6ef] text-[#17211a] hover:-translate-y-0.5 hover:bg-white'
                  }`}
                >
                  {isMarked && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#17211a] text-[#ffcc4d] sm:h-5 sm:w-5"><Check className="h-3 w-3" /></span>}
                  {isFree ? <Sparkles className="mb-1 h-5 w-5 sm:h-7 sm:w-7" /> : null}
                  <span className="line-clamp-3 text-[0.55rem] font-black leading-[1.08] sm:text-xs md:text-sm">{song.title}</span>
                  {!isFree && <span className="mt-1 hidden line-clamp-1 text-[0.55rem] font-bold opacity-60 sm:block">{song.artist}</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:hidden">
            <NowPlaying song={nowPlaying} onNext={nextSong} />
          </div>
          <div className="mt-4 md:hidden"><SponsorStrip /></div>

          <button
            onClick={() => setShowWin(true)}
            disabled={!hasBingo}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#ffcc4d] bg-[#ff6846] font-black text-white shadow-[4px_4px_0_#ffcc4d] transition hover:-translate-y-0.5 disabled:border-white/20 disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none"
          >
            <Trophy className="h-5 w-5" /> {hasBingo ? 'I have BINGO!' : `Get ${5 - progress} more in a line`}
          </button>
        </section>

        <aside className="hidden space-y-4 md:block">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <NowPlaying song={nowPlaying} onNext={nextSong} />
          </div>
          <div className="rounded-2xl bg-[#d9f99d] p-5 text-[#17211a]">
            <div className="flex items-center gap-2"><Gift className="h-5 w-5" /><p className="font-black">Next prize</p></div>
            <p className="mt-4 text-2xl font-black leading-tight">Dinner for two</p>
            <p className="mt-2 text-sm font-bold opacity-65">$40 value · Anthony&apos;s Pizza</p>
          </div>
          <div className="rounded-2xl border border-white/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#aeb8b0]">Your table</p>
            <div className="mt-3 flex items-center justify-between"><span className="font-bold">Table 12</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">4 playing</span></div>
          </div>
          <SponsorStrip />
        </aside>
      </div>

      {showWin && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#17211a]/80 p-5 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-[#ffcc4d] text-center text-[#17211a] shadow-2xl">
            <div className="relative px-7 pb-8 pt-10">
              <PartyPopper className="mx-auto h-16 w-16 text-[#e7462b]" />
              <p className="mt-4 text-sm font-black uppercase tracking-[0.2em]">Winner!</p>
              <h2 className="mt-1 text-5xl font-black tracking-[-0.06em]">BINGO!</h2>
              <p className="mx-auto mt-3 max-w-xs font-bold leading-6 opacity-70">Nice work, {name}. Show this screen to the game host to verify your card.</p>
              <div className="mt-6 rounded-2xl border-2 border-dashed border-[#17211a]/40 bg-white/50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em]">Claim code</p>
                <p className="mt-1 text-3xl font-black tracking-[0.18em]">BEAT-814</p>
              </div>
              <button onClick={() => setShowWin(false)} className="mt-6 h-12 w-full rounded-xl bg-[#17211a] font-black text-white">Back to my card</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

const NowPlaying = ({ song, onNext }: { song: (typeof songs)[number]; onNext: () => void }) => (
  <>
    <div className="flex items-center justify-between">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#ffcc4d]"><Volume2 className="h-4 w-4" /> Now playing</p>
      <span className="flex items-center gap-1 rounded-full bg-[#ff6846]/20 px-2 py-1 text-[0.65rem] font-black uppercase text-[#ff8e75]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff6846]" /> Live</span>
    </div>
    <div className="mt-5 flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#ffcc4d] text-[#17211a] shadow-[4px_4px_0_#ff6846]"><Play className="ml-1 h-7 w-7 fill-current" /></div>
      <div className="min-w-0">
        <p className="truncate text-xl font-black">{song.title}</p>
        <p className="mt-1 truncate text-sm font-bold text-[#aeb8b0]">{song.artist} · {song.year}</p>
      </div>
    </div>
    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 rounded-full bg-[#ffcc4d]" /></div>
    <button onClick={onNext} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white/10 text-xs font-black transition hover:bg-white/15">
      Demo: play next song <ArrowRight className="h-4 w-4" />
    </button>
  </>
);

const SponsorStrip = ({ light = false }: { light?: boolean }) => (
  <section className={light ? 'relative z-10 mx-auto max-w-6xl px-5 pb-10 md:px-8' : ''} aria-label="Local partners">
    <div className={`rounded-2xl border p-4 ${light ? 'border-[#17211a]/15 bg-white/75 text-[#17211a]' : 'border-white/10 bg-white/5 text-white'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[0.65rem] font-black uppercase tracking-[0.16em] ${light ? 'text-[#677169]' : 'text-[#aeb8b0]'}`}>Local partners</p>
        <span className={`text-[0.6rem] font-bold ${light ? 'text-[#8b918c]' : 'text-white/35'}`}>Sponsored</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ['Fresh Slice', '2-for-1 Tuesdays'],
          ['City Auto Care', '10% off service'],
          ['Peachtree Dental', 'New patient special'],
        ].map(([business, offer]) => (
          <div key={business} className={`min-w-0 rounded-xl px-3 py-3 ${light ? 'bg-[#f4f0e8]' : 'bg-white/[0.06]'}`}>
            <p className="truncate text-xs font-black">{business}</p>
            <p className={`mt-1 line-clamp-2 text-[0.65rem] font-bold leading-tight ${light ? 'text-[#677169]' : 'text-[#aeb8b0]'}`}>{offer}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default MusicBingo;
