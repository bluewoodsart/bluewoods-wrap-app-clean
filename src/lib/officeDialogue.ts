const UPSELL_PREFIX = '[[SLAPWRAPZ_UPSELL_IDEA_V1]]';

export interface UpsellImageIdea {
  title: string;
  message: string;
  imageUrl?: string;
  imageName?: string;
  images?: Array<{ url: string; name?: string }>;
}

export const getUpsellIdeaImages = (idea: UpsellImageIdea) => {
  const images = idea.images?.filter((image) => image.url) ?? [];
  if (images.length > 0) return images;
  return idea.imageUrl ? [{ url: idea.imageUrl, name: idea.imageName }] : [];
};

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
      imageName: idea.imageName,
      images: Array.isArray(idea.images)
        ? idea.images
            .filter((image) => image && typeof image.url === 'string' && image.url)
            .map((image) => ({
              url: image.url,
              name: typeof image.name === 'string' ? image.name : undefined
            }))
        : idea.imageUrl
          ? [{ url: idea.imageUrl, name: idea.imageName }]
          : undefined
    };
  } catch {
    return null;
  }
};

export const formatUpsellIdeaForEmail = (idea: UpsellImageIdea) => [
  `Upsell image idea: ${idea.title}`,
  idea.message,
  ...getUpsellIdeaImages(idea).map((image, index, images) =>
    `${images.length > 1 ? `Image ${index + 1}` : 'Image'}: ${image.url}`
  )
].filter(Boolean).join('\n\n');
