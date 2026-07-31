import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Calculator, Coins, FlaskConical, Gift, Share2, Star, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const STEPS_KEY = 'bwb_zoe_mission_one_steps_v2';
const REFERRAL_KEY = 'bwb_zoe_invite_bonus';

interface ZoeGameHubProps {
  onStartQuote: () => void;
}

const readCompletedSteps = () => {
  try {
    const value = JSON.parse(window.localStorage.getItem(STEPS_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => Number.isInteger(item)).length : 0;
  } catch {
    return 0;
  }
};

const ZoeGameHub = ({ onStartQuote }: ZoeGameHubProps) => {
  const [completedSteps, setCompletedSteps] = useState(readCompletedSteps);
  const [inviteBonus, setInviteBonus] = useState(() => window.localStorage.getItem(REFERRAL_KEY) === 'earned');
  const [shareMessage, setShareMessage] = useState('');
  const coins = completedSteps * 20 + (inviteBonus ? 50 : 0);
  const stars = completedSteps >= 5 ? 1 : 0;
  const rank = useMemo(() => stars ? 'Mission Tester I' : completedSteps ? 'Field Trainee' : 'New Recruit', [completedSteps, stars]);

  useEffect(() => {
    const refreshRewards = () => setCompletedSteps(readCompletedSteps());
    window.addEventListener('bwb-zoe-rewards-updated', refreshRewards);
    window.addEventListener('storage', refreshRewards);
    return () => {
      window.removeEventListener('bwb-zoe-rewards-updated', refreshRewards);
      window.removeEventListener('storage', refreshRewards);
    };
  }, []);

  const startTesting = () => {
    document.getElementById('zoe-mission-one')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const inviteFriend = async () => {
    const shareData = {
      title: 'BWB Launch Lab',
      text: 'I am testing BWB mobile tools. Ask Ashley for a private invitation to join the team.',
      url: 'https://www.slapwrapz.com/'
    };

    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        setShareMessage('Invitation message copied.');
      }
      window.localStorage.setItem(REFERRAL_KEY, 'earned');
      setInviteBonus(true);
      window.dispatchEvent(new Event('bwb-zoe-rewards-updated'));
      if (!shareMessage) setShareMessage('Invite bonus unlocked.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareMessage('The share sheet could not open. Try again from your phone.');
    }
  };

  return (
    <Card className="overflow-hidden border-2 border-slate-950 bg-[#080b2b] text-white shadow-xl">
      <div className="border-b border-white/10 bg-gradient-to-r from-slate-950 via-indigo-950 to-fuchsia-950 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button type="button" className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full border-2 border-white bg-black px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white shadow-[4px_4px_0_#fff]" aria-label="BWB Field Agent identification">
              <BadgeCheck className="h-5 w-5" /> BWB Field Agent · Z-01
            </button>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Zoe Launch Lab</p>
            <h2 className="mt-1 text-3xl font-black uppercase leading-none sm:text-4xl">Beat the game.<br />Build the system.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-100">Test the real portal on your phone, report what happens, and earn prototype rewards as each mission is cleared.</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-200">Current rank</p>
            <p className="mt-1 font-black text-cyan-300">{rank}</p>
          </div>
        </div>
      </div>

      <CardContent className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-center"><Coins className="mx-auto h-6 w-6 text-amber-300" /><p className="mt-2 text-2xl font-black">{coins}</p><p className="text-[10px] font-black uppercase text-amber-100">Coins</p></div>
            <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-center"><Star className="mx-auto h-6 w-6 text-cyan-300" /><p className="mt-2 text-2xl font-black">{stars}</p><p className="text-[10px] font-black uppercase text-cyan-100">Stars</p></div>
            <div className="rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/10 p-3 text-center"><Gift className="mx-auto h-6 w-6 text-fuchsia-300" /><p className="mt-2 text-2xl font-black">{inviteBonus ? 1 : 0}</p><p className="text-[10px] font-black uppercase text-fuchsia-100">Bonuses</p></div>
          </div>

          <button type="button" onClick={startTesting} className="mt-4 flex min-h-20 w-full touch-manipulation items-center justify-between rounded-md bg-[#fff600] px-5 py-4 text-left text-[#11152d] shadow-[0_10px_30px_rgba(255,246,0,.22)] transition hover:-translate-y-0.5">
            <span><span className="block text-xs font-black uppercase tracking-[0.14em]">Mission 01</span><span className="mt-1 block text-xl font-black uppercase">Start UI Testing</span></span>
            <FlaskConical className="h-8 w-8" />
          </button>
          <p className="mt-2 text-xs text-indigo-200">Each completed test step awards 20 coins. Clear all five to earn your first star.</p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/5 p-4">
          <div className="flex items-center gap-3"><Trophy className="h-8 w-8 text-amber-300" /><div><p className="text-xs font-black uppercase text-indigo-200">Next unlock</p><p className="font-black">100 coins + 1 star</p></div></div>
          <Button type="button" onClick={onStartQuote} className="min-h-12 touch-manipulation bg-cyan-300 font-black text-slate-950 hover:bg-cyan-200"><Calculator className="mr-2 h-5 w-5" /> Create Wrap Quote</Button>
          <Button type="button" onClick={() => void inviteFriend()} variant="outline" className="min-h-12 touch-manipulation border-white/25 bg-white/10 font-black text-white hover:bg-white/20 hover:text-white"><Share2 className="mr-2 h-5 w-5" /> Invite a Friend</Button>
          <p className="text-xs leading-5 text-indigo-200">Friends still need Ashley&apos;s approval before receiving any BWB access.</p>
          {shareMessage && <p className="rounded-lg bg-emerald-300/10 p-2 text-xs font-bold text-emerald-200">{shareMessage}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default ZoeGameHub;
