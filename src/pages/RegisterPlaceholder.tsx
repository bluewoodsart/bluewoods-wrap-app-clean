import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const RegisterPlaceholder: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
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

        <main className="rounded-lg border border-white/15 bg-white/10 p-6 shadow-2xl md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">Invite-only access</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">Registration is invite-only and coming soon.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
            Rep and staff accounts will be created through a controlled approval process in a later phase.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default RegisterPlaceholder;
