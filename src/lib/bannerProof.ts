/** A bounded layout preview, not an AI image generator or print-ready artwork. */
export interface BannerProofInput {
  bannerText: string;
  aiDesignPrompt: string;
  brandColors: string;
  width: string;
  height: string;
}

const colors: Record<string, string> = {
  red: '#dc2626', white: '#ffffff', black: '#000000', blue: '#2563eb',
  green: '#15803d', yellow: '#facc15', orange: '#ea580c', purple: '#9333ea',
  gold: '#d4af37', charcoal: '#36454f', gray: '#6b7280', grey: '#6b7280',
};
const colorPattern = `(?:${Object.keys(colors).join('|')}|#[a-f0-9]{6}|#[a-f0-9]{3})`;
const colorValue = (value: string) => colors[value.toLowerCase()] || value;
const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function resolveBannerProof(input: BannerProofInput) {
  const prompt = input.aiDesignPrompt.trim();
  // Never treat arbitrary design instructions as customer-facing copy.
  const quoted = prompt.match(/[“"]([^”"]+)[”"]/);
  const familiarHeadline = prompt.match(/\b(now open|coming soon|grand opening)\b/i);
  const text = input.bannerText.trim() || quoted?.[1]?.trim() || familiarHeadline?.[1] || '';
  if (!text) throw new Error('Add the exact words to Banner Text before generating a layout preview.');
  const width = Number(input.width);
  const height = Number(input.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Enter a valid banner width and height before generating a layout preview.');
  }

  // Role-based directions take precedence over unassigned brand-color names.
  const direction = `${prompt} ${input.brandColors}`.toLowerCase();
  const background = direction.match(new RegExp(`(${colorPattern})\\s+(?:background|backdrop)\\b`))?.[1]
    || direction.match(new RegExp(`background\\s*(?:is|:|=|in)?\\s*(${colorPattern})\\b`))?.[1];
  const foreground = direction.match(new RegExp(`(${colorPattern})\\s+(?:letters|lettering|text|type)\\b`))?.[1]
    || direction.match(new RegExp(`(?:letters|lettering|text)\\s*(?:is|:|=|in)?\\s*(${colorPattern})\\b`))?.[1];
  const backgroundColor = background ? colorValue(background) : '#ffffff';
  const textColor = foreground ? colorValue(foreground) : (backgroundColor === '#000000' ? '#ffffff' : '#000000');
  const fontFamily = /\bimpact\b/i.test(prompt) ? 'Impact, Haettenschweiler, Arial Narrow, sans-serif'
    : /\bgeorgia\b/i.test(prompt) ? 'Georgia, serif' : 'Arial, sans-serif';
  return { text, backgroundColor, textColor, fontFamily, aspectRatio: width / height };
}

export function createBannerProofSvg(input: BannerProofInput) {
  const proof = resolveBannerProof(input);
  // Preserve both portrait and very wide ratios instead of silently cropping/clamping.
  const width = 1600;
  const height = width / proof.aspectRatio;
  const margin = Math.min(width, height) * 0.08;
  const maxLineChars = Math.max(12, Math.floor(28 * Math.sqrt(proof.aspectRatio)));
  const lines = proof.text.split(/\r?\n/).flatMap((paragraph) => {
    const result: string[] = [];
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && line.length + word.length + 1 > maxLineChars) { result.push(line); line = ''; }
      line = line ? `${line} ${word}` : word;
    }
    return [...result, line];
  });
  // Conservative width estimate prevents long words and multi-line copy overflowing.
  const fontSize = Math.min((width - margin * 2) / (Math.max(...lines.map(line => line.length), 1) * 0.85),
    (height - margin * 2) / (lines.length * 1.2));
  const start = height / 2 - (lines.length - 1) * fontSize * 0.6;
  const markup = lines.map((line, index) => `<text x="800" y="${start + index * fontSize * 1.2}" text-anchor="middle" dominant-baseline="central" font-family="${proof.fontFamily}" font-size="${fontSize}" font-weight="900" fill="${proof.textColor}">${escapeText(line)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${proof.backgroundColor}"/>${markup}</svg>`;
}
