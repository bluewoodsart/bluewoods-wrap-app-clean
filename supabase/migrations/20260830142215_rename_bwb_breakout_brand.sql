update public.bwb_podcast_ideas
set title = 'BWB Breakout',
    concept = 'The flagship Blue Woods Brands show about breaking out, building brands, creating opportunities, and documenting the work in public.',
    updated_at = now()
where title = 'The Breakout';

update public.bwb_podcast_ideas
set title = 'BWB Breakout at Starr''s Mill: Night Light-Up',
    concept = replace(concept, 'Breakout field episode', 'BWB Breakout field episode'),
    updated_at = now()
where title = 'The Breakout at Starr''s Mill: Night Light-Up';

update public.bwb_podcast_ideas
set title = 'BWB Breakout Easter Egg Hunt',
    concept = replace(concept, 'Breakout content', 'BWB Breakout content'),
    updated_at = now()
where title = 'The Breakout Easter Egg Hunt';

comment on table public.bwb_podcast_ideas is
  'Blue Woods Podcast Central idea bank. BWB Breakout is the flagship working title while the final distinct show name is evaluated.';
