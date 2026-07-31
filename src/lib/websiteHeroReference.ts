export interface WebsiteHeroReferenceFile {
  name?: string;
  url?: string;
}

export const WEBSITE_HERO_REFERENCE_RULE = `MANDATORY WEBSITE HERO REFERENCE RULE
- Use the uploaded reference image in the website hero; do not replace it with an unrelated image.
- Clean up the supplied image and remove its background so the final hero asset has a transparent background.
- Preserve the entire logo or subject. Do not crop off letters, marks, edges, or important details.
- Keep the complete logo readable at phone size with safe space around every edge.
- Verify the hero on Android Chrome and iPhone Safari in portrait and landscape before publishing.`;

export const formatWebsiteHeroReferences = (files: WebsiteHeroReferenceFile[]) =>
  files
    .filter((file) => Boolean(file.url))
    .map((file, index) => `${index + 1}. ${file.name || `Website hero reference ${index + 1}`}: ${file.url}`)
    .join('\n');
