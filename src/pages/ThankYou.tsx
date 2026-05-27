import { Button } from '@/components/ui/button';
import { CheckCircle, Home, Mail, Palette, Timer } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface ThankYouLocationState {
  customerEmail?: string;
}

const ThankYou = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ThankYouLocationState | null;
  const customerEmail = state?.customerEmail;
  const thankYouImage = '/thankyou-your-information-has-been-saved-1/thankyou-your-information-has-been-saved-1.png';

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-10">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 text-center">
        <div className="space-y-4 pt-4">
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

        <div className="w-full rounded-2xl border border-purple-100 bg-white p-6 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-gray-950">What Happens Next</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-purple-50 p-5">
              <Timer className="mx-auto h-7 w-7 text-purple-700" />
              <h3 className="mt-3 font-semibold text-gray-950">Proof Review</h3>
              <p className="mt-2 text-sm text-gray-700">
                You will see a proof within the next 30 minutes.
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 p-5">
              <Palette className="mx-auto h-7 w-7 text-blue-700" />
              <h3 className="mt-3 font-semibold text-gray-950">Custom Design</h3>
              <p className="mt-2 text-sm text-gray-700">
                Our team will review your vehicle details and files.
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-5">
              <Mail className="mx-auto h-7 w-7 text-emerald-700" />
              <h3 className="mt-3 font-semibold text-gray-950">We’ll Be in Touch</h3>
              <p className="mt-2 text-sm text-gray-700">
                We’ll follow up shortly to confirm the details.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl aspect-[2.75/1]">
          <img
            src={thankYouImage}
            alt="Blue Woods vehicle wrap banner"
            className="h-full w-full object-cover object-[center_70%]"
          />
        </div>

        <div className="grid w-full gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-blue-100 bg-white p-5 text-left shadow-sm">
            <div className="mb-3 flex items-center gap-3 text-blue-700">
              <Mail className="h-5 w-5" />
              <h2 className="font-semibold">Confirm your details</h2>
            </div>
            <p className="text-gray-700">
              Check your email to confirm your details
              {customerEmail ? ` at ${customerEmail}` : ''}.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-white p-5 text-left shadow-sm">
            <div className="mb-3 flex items-center gap-3 text-emerald-700">
              <Timer className="h-5 w-5" />
              <h2 className="font-semibold">Proof timing</h2>
            </div>
            <p className="text-gray-700">
              You will see a proof within the next 30 minutes.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => navigate('/')}
            className="bg-blue-700 px-8 text-white hover:bg-blue-800"
            size="lg"
          >
            <Home className="mr-2 h-4 w-4" />
            Return to Home
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
