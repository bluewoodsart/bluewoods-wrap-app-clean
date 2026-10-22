import { Link } from 'react-router-dom';

const services = [
  {
    "slug": "vehicle-wraps",
    "name": "Vehicle wraps & fleet graphics",
    "intro": "Make your work vehicle part of your marketing. SlapWrapz helps businesses turn cars, vans, trucks, and trailers into recognizable advertising with custom vehicle wraps and fleet graphics."
  },
  {
    "slug": "custom-banners",
    "name": "Custom banners",
    "intro": "Give your event or promotion a clear focal point. SlapWrapz creates custom banner artwork and printing for business displays, family celebrations, community events, and temporary promotions."
  },
  {
    "slug": "vehicle-magnets",
    "name": "Vehicle magnets",
    "intro": "Put your business name on the road with removable vehicle magnets. A clear logo, a short service description, and readable contact information help turn a simple door magnet into a useful business sign."
  },
  {
    "slug": "stickers-decals",
    "name": "Custom stickers & decals",
    "intro": "Carry your brand onto packaging, promotional handouts, equipment, and other suitable surfaces. SlapWrapz helps you plan custom stickers and decals around the size, shape, and use of your project."
  },
  {
    "slug": "business-signs",
    "name": "Business signs",
    "intro": "Help people find your business, understand your offer, and know where to go next. SlapWrapz creates printed sign graphics for business promotions, events, and customer-facing spaces."
  },
  {
    "slug": "window-graphics",
    "name": "Window graphics & lettering",
    "intro": "Use your storefront windows to introduce your business before customers walk inside. Window lettering and printed graphics can display your name, hours, services, and current promotions."
  }
];
const faqs = [
  ['What do I need to request a quote?', 'Tell us the product you need, dimensions or vehicle details, quantity, and deadline. Photos, logos, and design examples help us understand the project.'],
  ['Can you help if I do not have finished artwork?', 'Share your logo, exact wording, brand colors, and ideas. Your representative can review the design work needed and include it in the project scope.'],
  ['Can I combine several products in one project?', 'Yes. List the wraps, banners, magnets, signs, or stickers you need, including sizes and quantities, so we can coordinate the artwork and review the scope.'],
  ['How much will my project cost?', 'Pricing depends on size, quantity, material, design work, finishing, and installation needs. Request a quote for your actual project so those details can be reviewed.'],
  ['How soon can my order be ready?', 'Include your required date when you request a quote. Timing depends on the project, artwork approval, materials, and production availability; confirm the schedule with your representative.']
];
export default function HomeSeoContent() {
  return <>
    <section id="services" aria-labelledby="services-heading" className="mx-auto max-w-7xl scroll-mt-6 px-4 py-16 md:px-8 md:py-24">
      <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">Print your brand. Make it visible.</p>
      <h2 id="services-heading" className="mt-3 text-3xl font-black md:text-5xl">Vehicle wraps, signs, and custom printing in Fayetteville, GA</h2>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">From a work van to a storefront window, your brand should be easy to recognize. SlapWrapz by Blue Woods Brands helps you plan graphics that communicate what you do and how customers can reach you. Start with one product or bring us a coordinated project for your business or event.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {services.map(service => <article key={service.slug} className="rounded-xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-xl font-bold">{service.name}</h3><p className="mt-4 leading-7 text-slate-300">{service.intro}</p>
          <a className="mt-5 inline-block font-bold text-cyan-300 underline underline-offset-4 hover:text-cyan-100" href={'/services/' + service.slug}>Explore {service.name.toLowerCase()}</a>
        </article>)}
      </div>
    </section>
    <section id="how-it-works" aria-labelledby="process-heading" className="border-y border-slate-800 bg-slate-900/60">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <h2 id="process-heading" className="text-3xl font-black md:text-4xl">A real conversation about your project</h2>
        <p className="mt-5 max-w-3xl leading-7 text-slate-300">The quote form starts the conversation. A person reviews your needs with you so the design, materials, and production details fit the job.</p>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {[['Tell us what you need', 'Choose your product and share dimensions, quantities, vehicle details, and your target date.'], ['Share your artwork and ideas', 'Send original logos, photographs, and design references. Let us know if you need help developing the artwork.'], ['Review the project together', 'Confirm the scope, price, artwork, and schedule with your representative before production.']].map(([title, text], i) =>
            <li key={title}><span className="font-black text-cyan-300">0{i+1}</span><h3 className="mt-3 text-xl font-bold">{title}</h3><p className="mt-3 leading-7 text-slate-300">{text}</p></li>)}
        </ol>
        <Link to="/wraps/full" className="mt-8 inline-block rounded-md bg-cyan-400 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-300">Start your project</Link>
      </div>
    </section>
    <section aria-labelledby="local-heading" className="mx-auto max-w-7xl px-4 py-16 md:px-8">
      <h2 id="local-heading" className="text-3xl font-black md:text-4xl">Built around your business, event, and location</h2>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">Planning vehicle graphics or custom printing in Fayetteville, Georgia, or the surrounding south Atlanta area? Tell us where your project is located and whether you need installation, pickup, or delivery so we can confirm the arrangements.</p>
      <p className="mt-5 max-w-3xl leading-7 text-slate-300">We welcome projects for contractors, service businesses, food trucks, retailers, churches, community groups, and family celebrations. Consistent logos, colors, and readable contact details help tie your vehicles, signs, and promotional materials together.</p>
    </section>
    <section aria-labelledby="faq-heading" className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
      <h2 id="faq-heading" className="mb-6 text-3xl font-black md:text-4xl">Questions before you get started?</h2>
      {faqs.map(([question, answer]) => <details key={question} className="border-b border-slate-700 py-5"><summary className="cursor-pointer text-lg font-bold text-white">{question}</summary><p className="mt-4 max-w-3xl leading-7 text-slate-300">{answer}</p></details>)}
    </section>
    <footer className="border-t border-slate-800 bg-slate-900 px-4 py-10 md:px-8"><div className="mx-auto max-w-7xl">
      <p className="text-xl font-bold">SlapWrapz <span className="text-sm font-normal text-slate-300">by Blue Woods Brands</span></p>
      <nav aria-label="Services" className="mt-6 flex flex-wrap gap-x-6 gap-y-4">{services.map(s => <a key={s.slug} href={'/services/' + s.slug} className="text-cyan-300 underline underline-offset-4">{s.name}</a>)}</nav>
      <p className="mt-6 text-sm text-slate-400">Custom graphics for vehicles, businesses, and events. Fayetteville, Georgia.</p>
    </div></footer>
  </>;
}
