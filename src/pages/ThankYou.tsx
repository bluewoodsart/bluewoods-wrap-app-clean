import { Button } from '@/components/ui/button';
import { BadgeCheck, CheckCircle, HandHeart, Home, MailCheck, MessagesSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBrandChannel } from '@/lib/brandChannels';
import { getSafeStartOverPath, getStoredRepSlug } from '@/lib/repTracking';

const ThankYou = () => {
  const navigate = useNavigate();
  const repSlug = getStoredRepSlug();
  const repChannel = repSlug ? getBrandChannel(repSlug) : undefined;
  const thankYouImage = repChannel?.heroImagePath || '/thankyou-your-information-has-been-saved-1.png';
  const thankYouImageAlt = repChannel
    ? `${repChannel.name} vehicle wrap confirmation`
    : 'Blue Woods vehicle wrap thank-you confirmation';

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col items-center justify-center gap-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-9 w-9 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gray-950 md:text-6xl">Thank You!</h1>
            <p className="text-xl font-semibold text-blue-700 md:text-2xl">
              Your Information Has Been Received.
            </p>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl">
          <img
            src={thankYouImage}
            alt={thankYouImageAlt}
            className="h-auto w-full object-cover"
          />
        </div>

        <div className="w-full rounded-2xl border border-blue-100 bg-white p-6 text-left shadow-sm md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <MailCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-950 md:text-2xl">Here's what to do next:</h2>
              <p className="mt-2 text-lg font-semibold text-gray-700">Check your email.</p>
            </div>
          </div>

          <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-900">
            This process helps us collect the right details, communicate clearly, and give you more accurate help throughout your project.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-700">
              <BadgeCheck className="h-5 w-5 shrink-0 text-blue-700" />
              Accurate quote preparation
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-700">
              <MessagesSquare className="h-5 w-5 shrink-0 text-blue-700" />
              Clear next steps by email
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-700">
              <HandHeart className="h-5 w-5 shrink-0 text-blue-700" />
              Personal help from your rep
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => navigate(getSafeStartOverPath())}
            className="bg-blue-700 px-8 text-white hover:bg-blue-800"
            size="lg"
          >
            <Home className="mr-2 h-4 w-4" />
            Return to SlapWrapz Home
          </Button>
          <p className="text-sm font-medium text-gray-600">
            Thank you for choosing Blue Woods Brands.
          </p>
        </div>
      </section>
    </main>
  );
};

export default ThankYou;
