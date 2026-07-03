import { Button } from '@/components/ui/button';
import { CheckCircle, Home, Mail, Timer } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface ThankYouLocationState {
  customerEmail?: string;
}

const ThankYou = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ThankYouLocationState | null;
  const customerEmail = state?.customerEmail;
  const thankYouImage = '/thankyou-your-information-has-been-saved-1.png';

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
            alt="Blue Woods vehicle wrap thank-you confirmation"
            className="h-auto w-full object-cover"
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
