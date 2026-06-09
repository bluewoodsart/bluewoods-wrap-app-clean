import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ImageSlideshow from '@/components/ImageSlideshow';

interface IndexProps {
  isPreviewMode?: boolean;
}

const Index: React.FC<IndexProps> = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-xl md:p-8">
          <div className="mx-auto max-w-4xl text-center">
            <img
              src="/favicon/favicon1.png"
              alt="Blue Woods Brands logo"
              className="mx-auto h-16 w-16 rounded-xl object-contain md:h-20 md:w-20"
            />
            <h1 className="mt-5 text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
              Transform Your Vehicle with Professional Wraps
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg font-medium leading-relaxed text-slate-700 md:text-xl">
              Get instant quotes, upload photos, and connect with wrap professionals.
              <span className="mt-2 block text-emerald-700">Premium quality wraps with nationwide coverage.</span>
            </p>
          </div>

          <div className="mt-8 grid items-stretch gap-5 md:grid-cols-2">
            <Card className="flex h-full flex-col border-blue-100 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-2xl">Quick Quote</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-6">
                <div className="space-y-4">
                  <p className="text-base text-slate-700">Get a fast estimate in under 60 seconds.</p>
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-900">For customers:</p>
                    <ul className="space-y-1 text-sm text-slate-600">
                      <li>- exploring pricing</li>
                      <li>- not near their vehicle</li>
                      <li>- needing guidance</li>
                    </ul>
                  </div>
                </div>
                <Button asChild className="w-full">
                  <Link to="/quick-quote">Start Quick Quote</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col border-emerald-100 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-2xl">Complete Project Submission</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-6">
                <div className="space-y-4">
                  <p className="text-base text-slate-700">Upload vehicle photos, logos, artwork, and project details.</p>
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-900">Best for customers:</p>
                    <ul className="space-y-1 text-sm text-slate-600">
                      <li>- ready for a detailed quote</li>
                      <li>- wanting a design proof</li>
                      <li>- with logos/photos already available</li>
                    </ul>
                  </div>
                  <p className="text-sm text-slate-500">Typically takes 5-10 minutes.</p>
                </div>
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Link to="/full-project">Start Full Project</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">You can save your progress and return later.</p>
        </section>

        <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg md:p-6">
          <ImageSlideshow />
        </section>
      </div>
    </div>
  );
};

export default Index;
