import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BriefcaseBusiness, ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Project {
  id: string;
  name: string;
  description: string;
  liveUrl: string | null;
  backend?: string;
  note: string;
  initials: string;
  platform: string;
}

// Curated directory: keep unverified backend URLs empty rather than guessing routes.
// Update this inventory when a project is built, published, or its backend is verified.
const projects: Project[] = [
  {
    "id": "slapwrapz",
    "name": "SlapWrapz",
    "liveUrl": "https://www.slapwrapz.com",
    "description": "Vehicle wraps, signs, print leads, and customer quotes.",
    "backend": "/admin?tab=quotes",
    "note": "Shared BWB quote inbox, customer records, and follow-up work.",
    "initials": "SW",
    "platform": "BWB / Vercel"
  },
  {
    "id": "appgprj_6ad770a0d0508191b8d7b16b568dea5c",
    "name": "BWB Sticker Studio",
    "liveUrl": "https://bwb-sticker-studio.bluewoodsart.chatgpt.site",
    "description": "Sticker designs, customer orders, and store settings.",
    "note": "BWB Sticker Store manages orders and checkout settings.",
    "initials": "SS",
    "platform": "ChatGPT Sites",
    "backend": "/admin?tab=stickers"
  },
  {
    "id": "appgprj_6ad3d8143fa48191b38fa21dc605fcee",
    "name": "Happy Dolly Ween — Holiday Sticker Packs",
    "liveUrl": null,
    "description": "Website and project workspace.",
    "note": "Backend location unverified. Add a management link after it has been located and checked.",
    "initials": "HD",
    "platform": "ChatGPT Sites"
  },
  {
    "id": "appgprj_6a944c7387208191ae0ffef53c1b8dae",
    "name": "SlapWrapz Labor Day Banner Rush",
    "liveUrl": "https://slapwrapz-labor-day-banner-rush.bluewoodsart.chatgpt.site",
    "description": "Banner campaign and quote requests.",
    "note": "Shared BWB quote inbox. Use the banner filters to find banner requests.",
    "initials": "BB",
    "platform": "ChatGPT Sites",
    "backend": "/admin?tab=quotes"
  },
  {
    "id": "appgprj_6a8c7bbd40888191af64446239cff84e",
    "name": "Wings & Things Artwork",
    "liveUrl": null,
    "description": "Jeff Morris quote artwork and design proofs",
    "note": "Backend location unverified. Add a management link after it has been located and checked.",
    "initials": "W&",
    "platform": "ChatGPT Sites"
  },
  {
    "id": "appgprj_6a87191f8d7881919c063e52356d1890",
    "name": "Compassion Ministries Front End V1",
    "liveUrl": "https://compassion-ministries-proof.bluewoodsart.chatgpt.site",
    "description": "Food pantry website and client workspace.",
    "note": "Open the Compassion Ministries workspace in BWB.",
    "initials": "CM",
    "platform": "ChatGPT Sites",
    "backend": "/admin?tab=clients&client=compassion-ministries"
  },
  {
    "id": "appgprj_6a86191f95608191b5f513b17d3e1689",
    "name": "ElectricLaw Tribal Nations Portal",
    "liveUrl": "https://electriclaw-tribal-nations.bluewoodsart.chatgpt.site",
    "description": "A sovereign governance and Tribal Nations discovery portal.",
    "note": "Backend location unverified. Add a management link after it has been located and checked.",
    "initials": "ET",
    "platform": "ChatGPT Sites"
  },
  {
    "id": "appgprj_6a835da28df08191ba4d0d2329cd02db",
    "name": "Master Front End",
    "liveUrl": "https://master-front-end-blue-woods.bluewoodsart.chatgpt.site",
    "description": "Blue Woods website and campaign landing pages.",
    "note": "BWB marketing workspace for the master front end.",
    "initials": "BW",
    "platform": "ChatGPT Sites",
    "backend": "/admin?tab=marketing&section=master-front-end"
  },
  {
    "id": "appgprj_6a7f3fbe64f88191bf7f9073a1b21419",
    "name": "Riley Cleaning Portal",
    "liveUrl": null,
    "description": "Website and project workspace.",
    "note": "Backend location unverified. Add a management link after it has been located and checked.",
    "initials": "RC",
    "platform": "ChatGPT Sites"
  },
  {
    "id": "appgprj_6a7e57f952208191a6e2bb6fdc15e177",
    "name": "Sandy Creek Sports Customer Review",
    "liveUrl": "https://sandy-creek-sports-review.bluewoodsart.chatgpt.site",
    "description": "Public disclaimer-marked customer review preview for Sandy Creek sports print and sponsorship concepts.",
    "note": "Backend location unverified. Add a management link after it has been located and checked.",
    "initials": "SC",
    "platform": "ChatGPT Sites"
  },
  {
    "id": "appgprj_6a7bb51f65148191bd448559f368d049",
    "name": "BWB Video Corrections Review",
    "liveUrl": "https://bwb-video-corrections-review.bluewoodsart.chatgpt.site",
    "description": "Private testing server for the Press Play robot and countdown update, SlapWrapz approaching-car animation, and scheduled-task course lesson.",
    "note": "Backend location unverified. Add a management link after it has been located and checked.",
    "initials": "BV",
    "platform": "ChatGPT Sites"
  },
  {
    "id": "appgprj_6a7baac38a488191906dc4a88ae82ed8",
    "name": "BWB Cleaning Company Portal",
    "liveUrl": "https://bwb-cleaning-private-preview.bluewoodsart.chatgpt.site",
    "description": "Private working preview of the BWB cleaning business owner, cleaner, and customer portal.",
    "note": "Backend location unverified. Add a management link after it has been located and checked.",
    "initials": "BC",
    "platform": "ChatGPT Sites"
  },
  {
    "id": "appgprj_6a6b45f80d288191a42055875f78cc1a",
    "name": "Philly Me Up Water Ice",
    "liveUrl": "https://phillymeup.slapwrapz.com",
    "description": "Water ice orders and the staff order queue.",
    "backend": "https://phillymeup.slapwrapz.com/phillymeup/staff",
    "note": "Existing staff queue (truck PIN required). Receives customer names, flavors, instructions, order status, and estimated wait times. Customers pay at pickup.",
    "initials": "PM",
    "platform": "ChatGPT Sites"
  },
  {
    "id": "appgprj_6a62b9818610819189e2d04bf716b43a",
    "name": "Need to Need",
    "liveUrl": "https://need-to-need-social.bluewoodsart.chatgpt.site",
    "description": "A warm social video-sharing site for posting and playing authentic everyday moments.",
    "note": "Backend location unverified. Add a management link after it has been located and checked.",
    "initials": "Nt",
    "platform": "ChatGPT Sites"
  }
];

type ProjectFilter = 'all' | 'available' | 'unverified';

export default function MyProjects() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const available = projects.filter((project) => project.backend).length;
  const search = query.trim().toLowerCase();
  const visible = projects.filter((project) =>
    (filter === 'all' || (filter === 'available' ? Boolean(project.backend) : !project.backend))
    && [project.name, project.description, project.platform].join(' ').toLowerCase().includes(search)
  );

  return (
    <section aria-labelledby="my-projects-title" className="space-y-5">
      <div className="rounded-2xl bg-slate-950 p-5 text-white sm:p-7">
        <p className="text-xs font-black uppercase tracking-widest text-cyan-300">BWB Owner Command Center</p>
        <h1 id="my-projects-title" className="mt-2 text-3xl font-black">My Projects</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Everything you build, in one place. Open a website or jump straight to its management workspace.</p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[['Projects', projects.length], ['Backend available', available], ['Needs verification', projects.length - available]].map(([label, count]) => (
            <div key={label} className="rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-2xl font-black text-cyan-200">{count}</p>
              <p className="mt-1 text-xs text-slate-300">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="project-search" className="sr-only">Search projects</label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input id="project-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects..." className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        </div>
        <div>
          <label htmlFor="project-filter" className="sr-only">Filter by backend status</label>
          <select id="project-filter" value={filter} onChange={(event) => setFilter(event.target.value as ProjectFilter)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="all">All projects</option>
            <option value="available">Backend available</option>
            <option value="unverified">Needs verification</option>
          </select>
        </div>
      </div>
      <p role="status" className="text-sm text-slate-600">{visible.length} of {projects.length} projects shown</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((project) => (
          <article key={project.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 p-4">
              <div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-lg font-black text-cyan-300">{project.initials}</div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">{project.platform}</p>
                <h2 className="mt-1 break-words font-black text-slate-950">{project.name}</h2>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <p className="text-sm leading-6 text-slate-600">{project.description}</p>
              <span className={`self-start rounded-full px-2.5 py-1 text-xs font-bold ${project.backend ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>{project.backend ? 'Backend available' : 'Backend location unverified'}</span>
              <p className="text-xs leading-5 text-slate-500">{project.note}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {project.liveUrl ? <Button asChild variant="outline" size="sm"><a href={project.liveUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${project.name} website in a new tab`}><ExternalLink aria-hidden="true" className="mr-2 h-4 w-4" />Live website</a></Button> : <Button variant="outline" size="sm" disabled>Not published</Button>}
                {project.backend ? <Button asChild size="sm">{project.backend.startsWith('https://') ? <a href={project.backend} target="_blank" rel="noopener noreferrer" aria-label={`Open ${project.name} backend in a new tab`}><ArrowUpRight aria-hidden="true" className="mr-2 h-4 w-4" />Open backend</a> : <Link to={project.backend} aria-label={`Open ${project.name} backend`}><ArrowUpRight aria-hidden="true" className="mr-2 h-4 w-4" />Open backend</Link>}</Button> : <Button size="sm" disabled>Backend link needed</Button>}
              </div>
            </div>
          </article>
        ))}
      </div>
      {visible.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><BriefcaseBusiness aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-bold text-slate-900">No matching projects</p><p className="mt-1 text-sm text-slate-600">Try a different search or choose All projects.</p><Button variant="outline" className="mt-4" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</Button></div>}
      <p className="text-xs leading-5 text-slate-500">This is a curated directory. Backend available means a management destination is recorded; it is not a live connection check. New projects and verified backend links must be added to the directory. Each destination keeps its own access requirements.</p>
    </section>
  );
}
