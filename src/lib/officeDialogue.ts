const UPSELL_PREFIX = '[[SLAPWRAPZ_UPSELL_IDEA_V1]]';

export interface UpsellImageIdea {
  title: string;
  message: string;
  imageUrl?: string;
  imageName?: string;
}

export const encodeUpsellImageIdea = (idea: UpsellImageIdea) =>
  `${UPSELL_PREFIX}\n${JSON.stringify(idea)}`;

export const parseUpsellImageIdea = (noteText: string): UpsellImageIdea | null => {
  if (!noteText.startsWith(`${UPSELL_PREFIX}\n`)) return null;

  try {
    const idea = JSON.parse(noteText.slice(UPSELL_PREFIX.length + 1)) as Partial<UpsellImageIdea>;
    if (!idea.title) return null;
    return {
      title: idea.title,
      message: idea.message || '',
      imageUrl: idea.imageUrl || undefined,
      imageName: idea.imageName
    };
  } catch {
    return null;
  }
};

export const formatUpsellIdeaForEmail = (idea: UpsellImageIdea) => [
  `Upsell image idea: ${idea.title}`,
  idea.message,
  idea.imageUrl ? `Image: ${idea.imageUrl}` : ''
].filter(Boolean).join('\n\n');
