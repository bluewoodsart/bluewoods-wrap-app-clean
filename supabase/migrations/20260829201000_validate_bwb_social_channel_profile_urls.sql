alter table public.bwb_social_channels
  add constraint bwb_social_channels_profile_url_http
  check (profile_url = '' or profile_url ~* '^https?://');
