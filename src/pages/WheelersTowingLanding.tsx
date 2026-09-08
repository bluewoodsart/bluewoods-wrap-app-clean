import { FormEvent, useEffect, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import {
  BadgeCheck,
  Car,
  CheckCircle2,
  Clock3,
  Crosshair,
  Loader2,
  MapPin,
  MessageSquareText,
  Navigation,
  Phone,
  ShieldCheck,
  Truck,
  Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getRepAttributionForSlug } from '@/lib/salesReps';
import { supabase } from '@/lib/supabase';

const PHONE_DISPLAY = '(678) 201-2416';
const PHONE_LINK = '+16782012416';
const TRAPSTAR_REP_SLUG = 'trapstar';

type PickupCoordinates = {
  latitude: number;
  longitude: number;
};

const formatGpsLocation = ({ latitude, longitude }: PickupCoordinates) =>
  `GPS pickup: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

const getGoogleMapsUrl = ({ latitude, longitude }: PickupCoordinates) =>
  `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

const getDeviceMapsUrl = (coordinates: PickupCoordinates) => {
  const { latitude, longitude } = coordinates;
  if (typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
    return `https://maps.apple.com/?ll=${latitude},${longitude}&q=Pickup%20location`;
  }
  if (typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent)) {
    return `geo:${latitude},${longitude}?q=${latitude},${longitude}(Pickup%20location)`;
  }
  return getGoogleMapsUrl(coordinates);
};

const RecenterMap = ({ coordinates }: { coordinates: PickupCoordinates }) => {
  const map = useMap();

  useEffect(() => {
    map.setView([coordinates.latitude, coordinates.longitude], 17);
  }, [coordinates, map]);

  return null;
};

const PickupMap = ({ coordinates, onSelect }: { coordinates: PickupCoordinates; onSelect: (coordinates: PickupCoordinates) => void }) => {
  const MapClickHandler = () => {
    useMapEvents({
      click: (event) => onSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng })
    });
    return null;
  };

  return (
    <div className="overflow-hidden border border-neutral-300">
      <MapContainer center={[coordinates.latitude, coordinates.longitude]} zoom={17} scrollWheelZoom={false} className="h-48 w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker center={[coordinates.latitude, coordinates.longitude]} radius={10} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#e21b2d', fillOpacity: 1 }} />
        <RecenterMap coordinates={coordinates} />
        <MapClickHandler />
      </MapContainer>
      <p className="bg-slate-950 px-3 py-2 text-center text-xs font-semibold text-white">Tap the map to move the pickup marker.</p>
    </div>
  );
};

const createLeadNumber = () => {
  const now = new Date();
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('');
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0');
  return `TOW-${date}-${suffix}`;
};

const services = [
  { label: 'Emergency towing', icon: Truck },
  { label: 'Roadside assistance', icon: Wrench },
  { label: 'Vehicle hauling', icon: Car }
];

const serviceAreas = [
  'Douglasville',
  'Carrollton',
  'Villa Rica',
  'Newnan',
  'Dallas',
  'Hiram',
  'Powder Springs',
  'Whitesburg',
  'Metro Atlanta'
];

const WheelersTowingLanding = () => {
  const [service, setService] = useState('Emergency towing');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedLeadNumber, setSubmittedLeadNumber] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupCoordinates, setPickupCoordinates] = useState<PickupCoordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const selectPickupCoordinates = (coordinates: PickupCoordinates) => {
    setPickupCoordinates(coordinates);
    setPickupLocation(formatGpsLocation(coordinates));
    setLocationStatus('Exact pickup point selected. You can tap the map to adjust it.');
  };

  const locateCustomer = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Location sharing is not supported on this device. Please enter the pickup location manually.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Finding your current location…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        selectPickupCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setLocationStatus('We could not access your location. Allow location permission or enter the pickup location manually.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const leadNumber = createLeadNumber();
    const repAttribution = getRepAttributionForSlug(TRAPSTAR_REP_SLUG);
    const submittedPickupLocation = String(formData.get('location') || '').trim();
    const vehicle = String(formData.get('vehicle') || '').trim();
    const details = String(formData.get('details') || '').trim();

    setIsSubmitting(true);
    setSubmitError('');

    const { error } = await supabase.rpc('finalize_quote_request_public', {
      p_quote_id: leadNumber,
      p_customer_name: String(formData.get('name') || '').trim(),
      p_customer_email: String(formData.get('email') || '').trim(),
      p_customer_phone: String(formData.get('phone') || '').trim(),
      p_preferred_contact: 'text',
      p_rep_slug: repAttribution.rep_slug,
      p_rep_email: repAttribution.rep_email,
      p_assigned_rep_name: repAttribution.assigned_rep_name,
      p_quote_data: {
        quoteId: leadNumber,
        productType: 'towing_lead',
        quoteType: 'wheelers_towing_lead',
        intakeType: 'local_business_lead',
        intakeFlow: 'wheelers_towing_page',
        selectedService: service,
        companyName: "Wheeler's Towing",
        repSlug: TRAPSTAR_REP_SLUG,
        pickupLocation: submittedPickupLocation,
        pickupCoordinates,
        mapsUrl: pickupCoordinates ? getGoogleMapsUrl(pickupCoordinates) : null,
        vehicle,
        details,
        sourcePage: '/zone6/local/wheelers-towing'
      },
      p_uploaded_files: [],
      p_product_type: 'towing_lead'
    });

    setIsSubmitting(false);

    if (error) {
      console.error('Wheeler towing lead save failed:', error);
      setSubmitError("We could not send your request. Please call Wheeler's Towing for immediate help.");
      return;
    }

    form.reset();
    setService('Emergency towing');
    setPickupLocation('');
    setPickupCoordinates(null);
    setLocationStatus('');
    setSubmittedLeadNumber(leadNumber);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080a0d] text-white">
      <header className="border-b border-white/10 bg-[#080a0d]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <img
            src="/wheelers/wheelers-towing-logo.png"
            alt="Wheeler's Towing"
            className="h-14 w-auto max-w-[12rem] object-contain object-left md:h-16 md:max-w-[15rem]"
          />
          <a href={`tel:${PHONE_LINK}`} className="flex items-center gap-2 text-sm font-black text-white md:text-base">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e21b2d]">
              <Phone className="h-4 w-4" />
            </span>
            {PHONE_DISPLAY}
          </a>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_25%,rgba(226,27,45,0.22),transparent_28%),linear-gradient(135deg,#11151b_0%,#080a0d_58%)]" />
          <div className="absolute -right-24 top-16 -z-10 h-80 w-80 rotate-12 border-[54px] border-[#e21b2d]/10" />
          <div className="mx-auto grid w-full max-w-7xl gap-9 px-4 py-10 md:px-8 md:py-16 lg:grid-cols-[1.05fr_0.78fr] lg:items-center lg:gap-14">
            <div>
              <div className="inline-flex items-center gap-2 border border-[#e21b2d]/40 bg-[#e21b2d]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-200">
                <Clock3 className="h-4 w-4" />
                Mon–Fri · 7am–6pm · Special hours available
              </div>

              <p className="mt-8 text-sm font-black uppercase tracking-[0.28em] text-[#f14655]">Wheeler's Towing · Douglasville, GA</p>
              <h1 className="mt-3 max-w-3xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.055em] sm:text-6xl md:text-8xl">
                Stranded?
                <span className="block text-[#e21b2d]">We’ll get you moving.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-300 md:text-xl md:leading-8">
                Family-operated towing, roadside help, and vehicle hauling backed by 35 years of experience across West Georgia and Metro Atlanta’s Southside.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-14 rounded-none bg-[#e21b2d] px-7 text-base font-black uppercase text-white hover:bg-[#f02b3c]">
                  <a href={`tel:${PHONE_LINK}`}>
                    <Phone className="mr-2 h-5 w-5" /> Call for help now
                  </a>
                </Button>
                <Button asChild className="h-14 rounded-none border border-white/20 bg-white/5 px-7 text-base font-black uppercase text-white hover:bg-white/10">
                  <a href="#request-help">
                    <MessageSquareText className="mr-2 h-5 w-5" /> Send a tow request
                  </a>
                </Button>
              </div>

              <div className="mt-9 grid gap-3 sm:grid-cols-3">
                {services.map(({ label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3 border-l-2 border-[#e21b2d] bg-white/[0.035] px-4 py-3 text-sm font-bold text-neutral-100">
                    <Icon className="h-5 w-5 shrink-0 text-[#f14655]" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div id="request-help" className="scroll-mt-6 border border-white/15 bg-white p-5 text-[#111318] shadow-2xl sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e21b2d]">Fast request</p>
              <h2 className="mt-2 text-3xl font-black uppercase leading-none tracking-[-0.035em]">Tell us where you are.</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">Send your details to Wheeler's so the team can review the request and follow up.</p>

              {submittedLeadNumber ? (
                <div className="mt-6 border border-emerald-200 bg-emerald-50 p-5 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                  <h3 className="mt-3 text-xl font-black uppercase text-slate-950">Request sent</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Your information has been sent to Wheeler's for follow-up.</p>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wide text-emerald-800">Lead {submittedLeadNumber}</p>
                  <Button type="button" variant="outline" className="mt-4 rounded-none border-emerald-300 bg-white" onClick={() => setSubmittedLeadNumber('')}>
                    Send another request
                  </Button>
                  <p className="mt-4 text-xs leading-5 text-slate-500">For immediate roadside assistance, call {PHONE_DISPLAY}.</p>
                </div>
              ) : (
              <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-xs font-black uppercase tracking-wide">Your name</Label>
                    <Input id="name" name="name" required autoComplete="name" placeholder="First and last name" className="h-12 rounded-none border-neutral-300 bg-white" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-xs font-black uppercase tracking-wide">Email</Label>
                    <Input id="email" name="email" required type="email" autoComplete="email" placeholder="you@example.com" className="h-12 rounded-none border-neutral-300 bg-white" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="phone" className="text-xs font-black uppercase tracking-wide">Callback number</Label>
                    <Input id="phone" name="phone" required type="tel" autoComplete="tel" placeholder="(678) 555-0123" className="h-12 rounded-none border-neutral-300 bg-white" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location" className="text-xs font-black uppercase tracking-wide">Pickup location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-[#e21b2d]" />
                      <Input
                        id="location"
                        name="location"
                        required
                        value={pickupLocation}
                        onChange={(event) => {
                          setPickupLocation(event.target.value);
                          if (pickupCoordinates) {
                            setPickupCoordinates(null);
                            setLocationStatus('Manual pickup location entered.');
                          }
                        }}
                        placeholder="Street, landmark, or nearest exit"
                        className="h-12 rounded-none border-neutral-300 bg-white pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={locateCustomer}
                    disabled={isLocating}
                    className="h-12 rounded-none border-red-200 bg-red-50 font-black uppercase text-red-700 hover:bg-red-100"
                  >
                    {isLocating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Crosshair className="mr-2 h-5 w-5" />}
                    {isLocating ? 'Finding your location' : 'Use my current location'}
                  </Button>
                  {locationStatus && <p role="status" className="text-xs leading-5 text-neutral-600">{locationStatus}</p>}
                  {pickupCoordinates && (
                    <>
                      <PickupMap coordinates={pickupCoordinates} onSelect={selectPickupCoordinates} />
                      <Button asChild type="button" variant="outline" className="h-11 rounded-none border-neutral-300 bg-white font-bold text-slate-800">
                        <a href={getDeviceMapsUrl(pickupCoordinates)} target="_blank" rel="noreferrer">
                          <Navigation className="mr-2 h-4 w-4 text-[#e21b2d]" />
                          Open exact point in Maps
                        </a>
                      </Button>
                    </>
                  )}
                </div>

                <fieldset>
                  <legend className="text-xs font-black uppercase tracking-wide">What do you need?</legend>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {['Emergency towing', 'Roadside help', 'Vehicle hauling'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setService(option)}
                        aria-pressed={service === option}
                        className={`min-h-12 border px-2 py-2 text-xs font-bold transition ${service === option ? 'border-[#e21b2d] bg-[#e21b2d] text-white' : 'border-neutral-300 bg-neutral-50 text-neutral-700 hover:border-neutral-500'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="grid gap-2">
                  <Label htmlFor="vehicle" className="text-xs font-black uppercase tracking-wide">Vehicle</Label>
                  <Input id="vehicle" name="vehicle" required placeholder="Year, make, model, and color" className="h-12 rounded-none border-neutral-300 bg-white" />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="details" className="text-xs font-black uppercase tracking-wide">Anything we should know?</Label>
                  <Textarea id="details" name="details" placeholder="What happened? Is the vehicle in a safe location?" className="min-h-20 rounded-none border-neutral-300 bg-white" />
                </div>

                {submitError && <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{submitError}</p>}

                <Button type="submit" disabled={isSubmitting} className="h-14 rounded-none bg-[#e21b2d] text-base font-black uppercase text-white hover:bg-[#f02b3c] disabled:opacity-70">
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending request</>
                  ) : (
                    <>Send to Wheeler's <MessageSquareText className="ml-2 h-5 w-5" /></>
                  )}
                </Button>
                <p className="text-center text-xs leading-5 text-neutral-500">Your request will be sent to Wheeler's team. For immediate help, call {PHONE_DISPLAY}.</p>
              </form>
              )}
            </div>
          </div>
        </section>

        <section className="bg-[#11151b] px-4 py-12 md:px-8 md:py-16">
          <div className="mx-auto grid w-full max-w-7xl gap-9 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#f14655]">Why Wheeler’s</p>
              <h2 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-[-0.04em] md:text-6xl">Real people. Honest help.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-neutral-300">Large enough to handle the job. Local enough to treat you like a neighbor.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, title: '35 years', copy: 'Experienced, fully insured towing and hauling.' },
                { icon: BadgeCheck, title: 'Fair rates', copy: 'Safe, correct work at a reasonable cost.' },
                { icon: MapPin, title: 'Local reach', copy: 'Douglas, Carroll, Paulding, Henry, and nearby areas.' }
              ].map(({ icon: Icon, title, copy }) => (
                <div key={title} className="border border-white/10 bg-[#080a0d] p-5">
                  <Icon className="h-7 w-7 text-[#e21b2d]" />
                  <h3 className="mt-6 text-xl font-black uppercase">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#080a0d] px-4 py-10 md:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">Serving drivers across</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {serviceAreas.map((area) => (
                <span key={area} className="border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-neutral-300">{area}</span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#e21b2d] px-4 py-8 text-white md:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-2xl font-black uppercase tracking-[-0.03em]">Wheeler’s Towing</p>
            <p className="mt-1 text-sm font-semibold text-red-100">Family-operated towing across West Georgia.</p>
          </div>
          <a href={`tel:${PHONE_LINK}`} className="inline-flex items-center gap-3 text-2xl font-black">
            <Phone className="h-6 w-6" /> {PHONE_DISPLAY}
          </a>
        </div>
        <div className="mx-auto mt-7 flex w-full max-w-7xl items-center gap-3 border-t border-white/25 pt-5">
          <div className="flex h-10 w-16 items-center justify-center overflow-hidden rounded bg-white px-1.5">
            <img src="/wheelers/bluewoods-brands-logo.png" alt="Blue Woods Brands" className="h-full w-full object-contain" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-50">Brought to you by Blue Woods Brands</p>
        </div>
      </footer>

      <a href={`tel:${PHONE_LINK}`} className="fixed bottom-4 left-4 right-4 z-30 flex h-14 items-center justify-center gap-2 bg-[#e21b2d] text-base font-black uppercase text-white shadow-2xl sm:hidden">
        <Phone className="h-5 w-5" /> Call Wheeler’s now
      </a>
    </div>
  );
};

export default WheelersTowingLanding;
