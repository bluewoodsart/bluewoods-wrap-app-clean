type ProofDirection = {
  label: string;
  image: string;
  note: string;
};

type SignGroup = {
  title: string;
  before: string;
  directions: ProofDirection[];
};

const signGroups: SignGroup[] = [
  {
    title: 'Storefront sign',
    before: '/wesley/wings-and-things/storefront-sign-before.jpg',
    directions: [
      { label: 'Version 1 · Original Chicken + Wings Photography', image: '/wesley/wings-and-things/storefront-sign-proof-v4-original-chicken-food-photo.png', note: 'Dark, appetite-driven wings photography with the established chicken identity.' },
      { label: 'Version 2 · Original Chicken Brand System', image: '/wesley/wings-and-things/storefront-sign-proof-v5-original-chicken-brand-system.png', note: 'Clean red-and-cream system designed to scale across all locations.' },
      { label: 'Version 3 · Full Menu + Cocktail', image: '/wesley/wings-and-things/storefront-sign-proof-v6-full-menu-cocktail.png', note: 'Wings, burger, fries, and a cocktail present the broader restaurant experience.' }
    ]
  },
  {
    title: 'Hours sign',
    before: '/wesley/wings-and-things/hours-sign-before.jpg',
    directions: [
      { label: 'Version 1 · Wings Photography', image: '/wesley/wings-and-things/hours-sign-proof-v2-wings-photo.png', note: 'Matches the photography-led storefront direction.' },
      { label: 'Version 2 · Seven-Store Brand System', image: '/wesley/wings-and-things/hours-sign-proof-v3-brand-system.png', note: 'Matches the repeatable red-and-cream brand direction.' },
      { label: 'Version 3 · Full Menu + Drink', image: '/wesley/wings-and-things/hours-sign-proof-v4-full-menu-drink.png', note: 'Matches the full-menu storefront direction.' }
    ]
  },
  {
    title: 'Entrance doors',
    before: '/wesley/wings-and-things/entrance-door-before.jpg',
    directions: [
      { label: 'Version 1 · Wings Photography', image: '/wesley/wings-and-things/entrance-door-proof-v1-wings-photo.png', note: 'Food-led entrance treatment with the established chicken identity.' },
      { label: 'Version 2 · Seven-Store Brand System', image: '/wesley/wings-and-things/entrance-door-proof-v2-brand-system.png', note: 'Clean entrance system for consistent use across all locations.' },
      { label: 'Version 3 · Full Menu + Drink', image: '/wesley/wings-and-things/entrance-door-proof-v3-full-menu-drink.png', note: 'Full-menu entrance treatment with wings, burger, fries, and a drink.' }
    ]
  }
];

const WesleyWingsProofGallery = () => (
  <section className="rounded-xl border-2 border-orange-300 bg-orange-50/40 p-4 sm:p-5" aria-labelledby="wings-proof-gallery-title">
    <div className="mb-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700">Restored customer concepts</p>
      <h3 id="wings-proof-gallery-title" className="mt-1 text-xl font-black text-slate-950">Wings and Things · Three Sign Directions</h3>
      <p className="mt-1 text-sm text-slate-600">The original photo and all three designed versions are shown together for each sign.</p>
    </div>
    <div className="space-y-7">
      {signGroups.map((group) => (
        <article key={group.title} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-slate-950 px-4 py-3 text-white">
            <h4 className="text-lg font-black">{group.title}</h4>
          </header>
          <div className="grid gap-4 p-4 lg:grid-cols-4">
            <figure className="min-w-0">
              <a href={group.before} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <img src={group.before} alt={`${group.title} before redesign`} className="aspect-[4/3] w-full object-cover" />
              </a>
              <figcaption className="mt-2 text-sm font-black text-slate-700">Original / Before</figcaption>
            </figure>
            {group.directions.map((direction) => (
              <figure key={direction.label} className="min-w-0">
                <a href={direction.image} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-orange-200 bg-slate-100">
                  <img src={direction.image} alt={`${group.title} ${direction.label}`} className="aspect-[4/3] w-full object-cover" />
                </a>
                <figcaption className="mt-2">
                  <p className="text-sm font-black text-orange-900">{direction.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{direction.note}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </article>
      ))}
    </div>
  </section>
);

export default WesleyWingsProofGallery;
