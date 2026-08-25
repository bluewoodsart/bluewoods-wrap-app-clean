import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Pencil, Save, UploadCloud, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import FileUpload from './FileUpload';
import { supabase } from '@/lib/supabase';
import { getRepAwareBackTarget, getStoredRepSlug } from '@/lib/repTracking';
import { getRepAttributionForSlug } from '@/lib/salesReps';
import { stringToUuid } from '@/lib/utils';
import { UploadedFile } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface ContactInfo {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  preferredContact: 'email';
}

type BannerDesignStyle =
  | 'auto'
  | 'bold-retail'
  | 'italian-deli'
  | 'vintage-sign-painter'
  | 'modern-clean'
  | 'elegant'
  | 'sports';

type ResolvedBannerDesignStyle = Exclude<BannerDesignStyle, 'auto'>;

interface BannerDetails {
  width: string;
  height: string;
  unit: 'inches' | 'feet';
  quantity: string;
  indoorOutdoor: string;
  sides: string;
  grommets: string;
  hemmedEdges: string;
  polePockets: string;
  materialPreference: string;
  designNeeded: string;
  aiDesignPrompt: string;
  bannerText: string;
  designStyle: BannerDesignStyle;
  brandColors: string;
  placementNotes: string;
  deadline: string;
  deliveryMethod: string;
  notes: string;
}

type TextAlignment = 'left' | 'center' | 'right';

interface PreviewStyle {
  background: string;
  text: string;
  accent: string;
  secondary: string;
  alignment: TextAlignment;
  showBorder: boolean;
  showBusinessName: boolean;
  showContact: boolean;
  showDecorations: boolean;
  uppercase: boolean;
  designStyle: ResolvedBannerDesignStyle;
}

interface StyledLine {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  fill: string;
  stroke: string;
  strokeWidth: number;
  letterSpacing: number;
  shadow: boolean;
  lineHeight: number;
}

const BANNER_STYLE_OPTIONS: Array<{ value: BannerDesignStyle; label: string }> = [
  { value: 'auto', label: 'Auto — detect from the request' },
  { value: 'italian-deli', label: 'Italian Deli / Restaurant' },
  { value: 'vintage-sign-painter', label: 'Vintage Sign Painter' },
  { value: 'bold-retail', label: 'Bold Retail / Grand Opening' },
  { value: 'modern-clean', label: 'Modern Clean' },
  { value: 'elegant', label: 'Elegant / Upscale' },
  { value: 'sports', label: 'Sports / High Energy' }
];

const BANNER_STYLE_LABELS: Record<ResolvedBannerDesignStyle, string> = {
  'bold-retail': 'Bold Retail',
  'italian-deli': 'Italian Deli',
  'vintage-sign-painter': 'Vintage Sign Painter',
  'modern-clean': 'Modern Clean',
  elegant: 'Elegant',
  sports: 'Sports / High Energy'
};

const createQuoteId = () =>
  `banner_${Date.now()}_${Math.random().toString(36).substring(2)}`;

const escapeSvgText = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const parsePositiveNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const COLOR_MAP: Record<string, string> = {
  'dark blue': '#0f2f57',
  'light blue': '#60a5fa',
  'royal blue': '#1d4ed8',
  'hot pink': '#ec4899',
  'light pink': '#f9a8d4',
  'forest green': '#166534',
  'lime green': '#65a30d',
  charcoal: '#1f2937',
  burgundy: '#7f1d1d',
  maroon: '#7f1d1d',
  navy: '#172554',
  teal: '#0f766e',
  turquoise: '#0d9488',
  purple: '#7e22ce',
  violet: '#7c3aed',
  orange: '#ea580c',
  yellow: '#eab308',
  gold: '#ca8a04',
  silver: '#94a3b8',
  gray: '#64748b',
  grey: '#64748b',
  black: '#000000',
  white: '#ffffff',
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  pink: '#db2777',
  brown: '#78350f',
  cream: '#fff7ed',
  beige: '#f5f5dc'
};

const COLOR_NAMES = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);
const COLOR_TOKEN = `(?:#[0-9a-f]{3,8}|${COLOR_NAMES.map((name) => name.replace(/\s+/g, '\\s+')).join('|')})`;

const normalizeColor = (value: string | undefined) => {
  if (!value) return '';
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  if (/^#[0-9a-f]{3,8}$/i.test(normalized)) return normalized;
  return COLOR_MAP[normalized] || '';
};

const extractColors = (value: string) => {
  const matches = value.toLowerCase().match(new RegExp(COLOR_TOKEN, 'gi')) || [];
  return matches.map((match) => normalizeColor(match)).filter(Boolean);
};

const uniqueColors = (colors: string[]) => {
  const seen = new Set<string>();
  return colors.filter((color) => {
    const normalized = color.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const findContextColor = (value: string, target: 'background' | 'text') => {
  const patterns = target === 'background'
    ? [
        new RegExp(`\\b(${COLOR_TOKEN})\\b\\s+(?:background|backdrop)`, 'i'),
        new RegExp(`(?:background|backdrop)(?:\\s+color)?\\s*(?:is|:|=|of)?\\s*(${COLOR_TOKEN})`, 'i'),
        new RegExp(`(?:on|over)\\s+(?:a\\s+)?(${COLOR_TOKEN})\\s+(?:background|field|backdrop)?`, 'i')
      ]
    : [
        new RegExp(`\\b(${COLOR_TOKEN})\\b\\s+(?:letters?|text|wording|type|font)`, 'i'),
        new RegExp(`(?:letters?|text|wording|type|font)(?:\\s+color)?\\s*(?:is|:|=|in)?\\s*(${COLOR_TOKEN})`, 'i')
      ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    const color = normalizeColor(match?.[1]);
    if (color) return color;
  }

  return '';
};

const inferBannerTextFromPrompt = (value: string) => {
  const prompt = value.replace(/\s+/g, ' ').trim();
  if (!prompt) return '';

  const explicitPatterns = [
    /(?:exact\s+(?:banner\s+)?text|banner\s+text|wording|message)\s*(?:is|:|=|should\s+be)?\s*["“']([^"”']{1,140})["”']/i,
    /(?:say|says|read|reads|should\s+say)\s*["“']([^"”']{1,140})["”']/i,
    /(?:say|says|read|reads|should\s+say)\s*(?:is|:|=)?\s*([^,.;]{1,100})/i
  ];

  for (const pattern of explicitPatterns) {
    const match = prompt.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  const quoted = prompt.match(/["“']([^"”']{1,100})["”']/);
  if (quoted?.[1]?.trim()) return quoted[1].trim();

  const firstClause = prompt.split(/[,;\n]/)[0].trim();
  const cleanedFirstClause = firstClause
    .replace(/^(?:please\s+)?(?:create|design|make|generate)\s+(?:a\s+)?(?:banner\s+)?(?:that\s+)?/i, '')
    .trim();

  const beginsAsDesignDirection = /^(?:use|with|on|in|make|keep|place|center|centre|align|bold|clean|modern|simple|white\s+background|black\s+background|red\s+(?:text|letters)|blue\s+(?:text|letters))/i.test(firstClause);

  if (!beginsAsDesignDirection && cleanedFirstClause.length > 0 && cleanedFirstClause.length <= 80) {
    return cleanedFirstClause;
  }

  return '';
};

const wrapText = (value: string, maxChars: number, maxLines: number) => {
  const paragraphs = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const lines: string[] = [];

  const addParagraph = (paragraph: string) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let currentLine = '';

    words.forEach((word) => {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;
      if (nextLine.length > maxChars && currentLine) {
        lines.push(currentLine);
        currentLine = word;
        return;
      }
      currentLine = nextLine;
    });

    if (currentLine) lines.push(currentLine);
  };

  if (paragraphs.length > 0) {
    paragraphs.forEach(addParagraph);
  } else if (value.trim()) {
    addParagraph(value.trim());
  }

  if (lines.length <= maxLines) return lines;

  const shortened = lines.slice(0, maxLines);
  shortened[maxLines - 1] = `${shortened[maxLines - 1].replace(/[.\s]+$/, '')}…`;
  return shortened;
};

const resolveDesignStyle = (
  requestedStyle: BannerDesignStyle,
  promptValue: string,
  businessName: string,
  bannerText: string
): ResolvedBannerDesignStyle => {
  if (requestedStyle !== 'auto') return requestedStyle;

  const prompt = promptValue.toLowerCase();
  const context = `${businessName} ${bannerText}`.toLowerCase();

  if (/\b(?:italian|deli|sub shop|submarine|hoagie|pizzeria|pizza shop|restaurant style)\b/i.test(prompt)) {
    return 'italian-deli';
  }
  if (/\b(?:vintage|retro|old[- ]school|sign[- ]?painter|hand[- ]painted|hand[- ]lettered|classic roadside)\b/i.test(prompt)) {
    return 'vintage-sign-painter';
  }
  if (/\b(?:luxury|elegant|upscale|refined|formal|boutique|hotel|wedding)\b/i.test(prompt)) {
    return 'elegant';
  }
  if (/\b(?:sport|sports|athletic|racing|race|speed|high energy|team)\b/i.test(prompt)) {
    return 'sports';
  }
  if (/\b(?:modern|minimal|minimalist|clean|corporate|contemporary|tech)\b/i.test(prompt)) {
    return 'modern-clean';
  }
  if (/\b(?:bold|retail|grand opening|sale|attention grabbing|high impact)\b/i.test(prompt)) {
    return 'bold-retail';
  }

  if (/\b(?:italian|philly|deli|subs?|hoagie|pizza|pizzeria|restaurant|food|bakery)\b/i.test(context)) {
    return 'italian-deli';
  }
  if (/\b(?:sport|sports|athletic|racing|race|team|fitness|gym)\b/i.test(context)) {
    return 'sports';
  }
  if (/\b(?:hotel|salon|spa|luxury|boutique|wedding)\b/i.test(context)) {
    return 'elegant';
  }

  return 'bold-retail';
};

const getPreviewStyle = (
  promptValue: string,
  brandColorsValue: string,
  requestedStyle: BannerDesignStyle,
  businessName: string,
  bannerText: string
): PreviewStyle => {
  const prompt = promptValue.toLowerCase();
  const brandColors = brandColorsValue.toLowerCase();
  const combined = `${prompt} ${brandColors}`.trim();
  const listedBrandColors = extractColors(brandColors);
  const promptColors = extractColors(prompt);

  const backgroundFromPrompt = findContextColor(prompt, 'background');
  const textFromPrompt = findContextColor(prompt, 'text');
  const backgroundFromBrand = findContextColor(brandColors, 'background');
  const textFromBrand = findContextColor(brandColors, 'text');

  let background = backgroundFromPrompt || backgroundFromBrand || '#ffffff';
  let text = textFromPrompt || textFromBrand || '#111827';

  if (!backgroundFromPrompt && !backgroundFromBrand && listedBrandColors.length > 1) {
    background = listedBrandColors[1];
  }
  if (!textFromPrompt && !textFromBrand && listedBrandColors.length > 0) {
    text = listedBrandColors[0];
  }

  if (background.toLowerCase() === text.toLowerCase()) {
    text = background.toLowerCase() === '#ffffff' ? '#111827' : '#ffffff';
  }

  const paletteCandidates = uniqueColors([...listedBrandColors, ...promptColors]);
  const accent = paletteCandidates.find(
    (color) => color.toLowerCase() !== background.toLowerCase() && color.toLowerCase() !== text.toLowerCase()
  ) || (background.toLowerCase() === '#ffffff' ? '#111827' : '#ffffff');
  const secondary = paletteCandidates.find(
    (color) =>
      color.toLowerCase() !== background.toLowerCase() &&
      color.toLowerCase() !== text.toLowerCase() &&
      color.toLowerCase() !== accent.toLowerCase()
  ) || text;

  let alignment: TextAlignment = 'center';
  if (/\b(?:left[- ]aligned|align(?:ed)?\s+left|left\s+alignment)\b/i.test(combined)) alignment = 'left';
  if (/\b(?:right[- ]aligned|align(?:ed)?\s+right|right\s+alignment)\b/i.test(combined)) alignment = 'right';
  if (/\b(?:centered|centred|center[- ]aligned|centre[- ]aligned|align(?:ed)?\s+(?:center|centre))\b/i.test(combined)) alignment = 'center';

  const suppressExtras = /(?:forget|remove|without|no)\s+(?:the\s+)?(?:bwb\s+)?(?:brand|branding|logo|business\s+name|company\s+name|contact(?:\s+info)?)|(?:white|black|red|blue|green|yellow)\s+background\s+only|background\s+only|only\s+(?:the\s+)?(?:words|text|message)/i.test(combined);
  const showBusinessName = !suppressExtras && /(?:include|show|add|display|use).{0,24}(?:business|company)\s+name/i.test(combined);
  const showContact = !suppressExtras && /(?:include|show|add|display|use).{0,24}(?:contact|phone|email|website)/i.test(combined);
  const showBorder = !/\b(?:no|without|remove)\s+(?:a\s+)?border\b/i.test(combined) && /\b(?:add|include|show|with|use)\s+(?:a\s+)?(?:thin\s+|thick\s+|simple\s+)?border\b/i.test(combined);
  const showDecorations = !/\b(?:no|without|remove)\s+(?:extra\s+)?(?:graphics|decorations|accents|stripes|flourishes)\b|\bplain\s+text\s+only\b/i.test(combined);

  return {
    background,
    text,
    accent,
    secondary,
    alignment,
    showBorder,
    showBusinessName,
    showContact,
    showDecorations,
    uppercase: /\b(?:all\s+caps|uppercase|upper-case)\b/i.test(combined),
    designStyle: resolveDesignStyle(requestedStyle, promptValue, businessName, bannerText)
  };
};

const getCanvasDimensions = (widthValue: number, heightValue: number) => {
  const ratio = widthValue > 0 && heightValue > 0 ? widthValue / heightValue : 4;
  const boundedRatio = Math.min(Math.max(ratio, 0.55), 8);
  const maxWidth = 1600;
  const maxHeight = 1100;

  let width = maxWidth;
  let height = Math.round(width / boundedRatio);

  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * boundedRatio);
  }

  return {
    width: Math.max(width, 600),
    height: Math.max(height, 320),
    ratio: boundedRatio
  };
};

const getBaseTextLayout = (textValue: string, canvasWidth: number, canvasHeight: number, ratio: number) => {
  const maxChars = Math.max(10, Math.min(46, Math.round(ratio * 14)));
  const maxLines = ratio >= 4 ? 3 : ratio >= 1.5 ? 4 : 6;
  const lines = wrapText(textValue, maxChars, maxLines);
  const longestLineLength = Math.max(...lines.map((line) => line.length), 1);
  const horizontalFit = (canvasWidth * 0.84) / (longestLineLength * 0.58);
  const verticalFit = (canvasHeight * 0.65) / (Math.max(lines.length, 1) * 1.1);
  const fontSize = Math.max(42, Math.floor(Math.min(horizontalFit, verticalFit, canvasHeight * 0.46)));

  return { lines, fontSize };
};

const fitFontSize = (
  text: string,
  desiredSize: number,
  canvasWidth: number,
  characterWidthFactor: number
) => {
  const availableWidth = canvasWidth * 0.84;
  const estimatedCharacters = Math.max(text.length, 1) * characterWidthFactor;
  const widthFit = availableWidth / estimatedCharacters;
  return Math.max(30, Math.floor(Math.min(desiredSize, widthFit)));
};

const getStyledLines = (
  lines: string[],
  baseFontSize: number,
  canvasWidth: number,
  style: PreviewStyle
): StyledLine[] => {
  const hasMultipleLines = lines.length > 1;

  return lines.map((line, index) => {
    const isLeadLine = hasMultipleLines && index === 0;
    let fontFamily = 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif';
    let multiplier = isLeadLine ? 0.72 : 1.04;
    let fontWeight = 900;
    let fontStyle: 'normal' | 'italic' = 'normal';
    let fill = style.text;
    let stroke = style.accent;
    let strokeFraction = 0.015;
    let letterSpacing = isLeadLine ? 2.5 : 1;
    let shadow = true;
    let characterWidthFactor = 0.55;
    let lineHeightFactor = 1.04;

    if (style.designStyle === 'italian-deli') {
      if (isLeadLine) {
        fontFamily = 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif';
        multiplier = 0.58;
        fontWeight = 800;
        fill = style.accent;
        stroke = 'none';
        strokeFraction = 0;
        letterSpacing = 6;
        shadow = false;
        characterWidthFactor = 0.54;
        lineHeightFactor = 0.96;
      } else {
        fontFamily = '"Cooper Black", Georgia, "Times New Roman", serif';
        multiplier = 1.03;
        fontWeight = 900;
        fontStyle = 'italic';
        fill = style.text;
        stroke = style.accent;
        strokeFraction = 0.011;
        letterSpacing = 0.5;
        shadow = true;
        characterWidthFactor = 0.62;
        lineHeightFactor = 1.02;
      }
    }

    if (style.designStyle === 'vintage-sign-painter') {
      if (isLeadLine) {
        fontFamily = '"Arial Narrow", Impact, sans-serif';
        multiplier = 0.56;
        fontWeight = 800;
        fill = style.accent;
        stroke = 'none';
        strokeFraction = 0;
        letterSpacing = 5;
        shadow = false;
        characterWidthFactor = 0.5;
        lineHeightFactor = 0.96;
      } else {
        fontFamily = '"Brush Script MT", "Segoe Script", cursive';
        multiplier = 1.12;
        fontWeight = 700;
        fill = style.text;
        stroke = style.background;
        strokeFraction = 0.01;
        letterSpacing = 0;
        shadow = true;
        characterWidthFactor = 0.52;
        lineHeightFactor = 1.08;
      }
    }

    if (style.designStyle === 'modern-clean') {
      fontFamily = '"Trebuchet MS", Arial, Helvetica, sans-serif';
      multiplier = isLeadLine ? 0.68 : 1;
      fontWeight = isLeadLine ? 700 : 800;
      fill = isLeadLine ? style.accent : style.text;
      stroke = 'none';
      strokeFraction = 0;
      letterSpacing = isLeadLine ? 4 : 0.4;
      shadow = false;
      characterWidthFactor = 0.56;
      lineHeightFactor = 1.12;
    }

    if (style.designStyle === 'elegant') {
      fontFamily = 'Georgia, "Times New Roman", serif';
      multiplier = isLeadLine ? 0.54 : 0.98;
      fontWeight = isLeadLine ? 600 : 700;
      fontStyle = isLeadLine ? 'normal' : 'italic';
      fill = isLeadLine ? style.accent : style.text;
      stroke = 'none';
      strokeFraction = 0;
      letterSpacing = isLeadLine ? 5 : 1.2;
      shadow = false;
      characterWidthFactor = 0.59;
      lineHeightFactor = 1.12;
    }

    if (style.designStyle === 'sports') {
      fontFamily = 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif';
      multiplier = isLeadLine ? 0.7 : 1.04;
      fontWeight = 900;
      fontStyle = 'italic';
      fill = isLeadLine ? style.secondary : style.text;
      stroke = style.accent;
      strokeFraction = 0.015;
      letterSpacing = isLeadLine ? 3 : 1.2;
      shadow = true;
      characterWidthFactor = 0.56;
      lineHeightFactor = 1.02;
    }

    const fontSize = fitFontSize(line, baseFontSize * multiplier, canvasWidth, characterWidthFactor);

    return {
      text: line,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      fill,
      stroke,
      strokeWidth: strokeFraction > 0 ? Math.max(1, fontSize * strokeFraction) : 0,
      letterSpacing,
      shadow,
      lineHeight: fontSize * lineHeightFactor
    };
  });
};

const getDecorationMarkup = (
  style: PreviewStyle,
  canvasWidth: number,
  canvasHeight: number,
  padding: number
) => {
  if (!style.showDecorations) return '';

  if (style.designStyle === 'italian-deli') {
    const wideStripe = Math.max(8, Math.round(canvasHeight * 0.022));
    const narrowStripe = Math.max(5, Math.round(canvasHeight * 0.014));
    const bottomWideY = canvasHeight - wideStripe;
    const bottomNarrowY = bottomWideY - narrowStripe;
    return `
      <rect x="0" y="0" width="${canvasWidth}" height="${wideStripe}" fill="${style.secondary}"/>
      <rect x="0" y="${wideStripe}" width="${canvasWidth}" height="${narrowStripe}" fill="${style.text}"/>
      <rect x="0" y="${bottomNarrowY}" width="${canvasWidth}" height="${narrowStripe}" fill="${style.text}"/>
      <rect x="0" y="${bottomWideY}" width="${canvasWidth}" height="${wideStripe}" fill="${style.secondary}"/>
      <path d="M${padding} ${Math.round(canvasHeight * 0.79)} H${canvasWidth - padding}" stroke="${style.secondary}" stroke-width="${Math.max(5, Math.round(canvasHeight * 0.012))}" stroke-linecap="round"/>
    `;
  }

  if (style.designStyle === 'vintage-sign-painter') {
    const flourishYTop = Math.round(canvasHeight * 0.18);
    const flourishYBottom = Math.round(canvasHeight * 0.82);
    const center = canvasWidth / 2;
    return `
      <path d="M${padding} ${flourishYTop} C${Math.round(canvasWidth * 0.24)} ${flourishYTop - 18} ${Math.round(canvasWidth * 0.31)} ${flourishYTop + 18} ${center - 58} ${flourishYTop}" fill="none" stroke="${style.accent}" stroke-width="${Math.max(3, Math.round(canvasHeight * 0.008))}" stroke-linecap="round"/>
      <circle cx="${center}" cy="${flourishYTop}" r="${Math.max(5, Math.round(canvasHeight * 0.012))}" fill="${style.secondary}"/>
      <path d="M${center + 58} ${flourishYTop} C${Math.round(canvasWidth * 0.69)} ${flourishYTop + 18} ${Math.round(canvasWidth * 0.76)} ${flourishYTop - 18} ${canvasWidth - padding} ${flourishYTop}" fill="none" stroke="${style.accent}" stroke-width="${Math.max(3, Math.round(canvasHeight * 0.008))}" stroke-linecap="round"/>
      <path d="M${Math.round(canvasWidth * 0.23)} ${flourishYBottom} Q${center} ${flourishYBottom + 30} ${Math.round(canvasWidth * 0.77)} ${flourishYBottom}" fill="none" stroke="${style.secondary}" stroke-width="${Math.max(4, Math.round(canvasHeight * 0.009))}" stroke-linecap="round"/>
    `;
  }

  if (style.designStyle === 'modern-clean') {
    const barWidth = Math.max(12, Math.round(canvasWidth * 0.012));
    return `
      <rect x="${padding}" y="${Math.round(canvasHeight * 0.2)}" width="${barWidth}" height="${Math.round(canvasHeight * 0.6)}" rx="${barWidth / 2}" fill="${style.secondary}"/>
      <rect x="${padding + barWidth + 12}" y="${Math.round(canvasHeight * 0.2)}" width="${Math.max(5, Math.round(barWidth * 0.42))}" height="${Math.round(canvasHeight * 0.6)}" rx="3" fill="${style.text}" opacity="0.28"/>
    `;
  }

  if (style.designStyle === 'elegant') {
    return `
      <line x1="${padding}" y1="${Math.round(canvasHeight * 0.18)}" x2="${canvasWidth - padding}" y2="${Math.round(canvasHeight * 0.18)}" stroke="${style.accent}" stroke-width="${Math.max(2, Math.round(canvasHeight * 0.005))}"/>
      <line x1="${padding}" y1="${Math.round(canvasHeight * 0.82)}" x2="${canvasWidth - padding}" y2="${Math.round(canvasHeight * 0.82)}" stroke="${style.accent}" stroke-width="${Math.max(2, Math.round(canvasHeight * 0.005))}"/>
      <circle cx="${canvasWidth / 2}" cy="${Math.round(canvasHeight * 0.18)}" r="${Math.max(5, Math.round(canvasHeight * 0.012))}" fill="${style.secondary}"/>
      <circle cx="${canvasWidth / 2}" cy="${Math.round(canvasHeight * 0.82)}" r="${Math.max(5, Math.round(canvasHeight * 0.012))}" fill="${style.secondary}"/>
    `;
  }

  if (style.designStyle === 'sports') {
    return `
      <polygon points="0,0 ${Math.round(canvasWidth * 0.26)},0 ${Math.round(canvasWidth * 0.12)},${canvasHeight}" fill="${style.accent}" opacity="0.08"/>
      <polygon points="${Math.round(canvasWidth * 0.82)},0 ${canvasWidth},0 ${canvasWidth},${canvasHeight} ${Math.round(canvasWidth * 0.68)},${canvasHeight}" fill="${style.secondary}" opacity="0.12"/>
      <path d="M${Math.round(canvasWidth * 0.72)} ${Math.round(canvasHeight * 0.22)} L${canvasWidth - padding} ${Math.round(canvasHeight * 0.22)}" stroke="${style.secondary}" stroke-width="${Math.max(7, Math.round(canvasHeight * 0.018))}" stroke-linecap="round"/>
      <path d="M${Math.round(canvasWidth * 0.68)} ${Math.round(canvasHeight * 0.28)} L${canvasWidth - padding} ${Math.round(canvasHeight * 0.28)}" stroke="${style.text}" stroke-width="${Math.max(4, Math.round(canvasHeight * 0.011))}" stroke-linecap="round" opacity="0.7"/>
    `;
  }

  return `
    <polygon points="0,0 ${Math.round(canvasWidth * 0.16)},0 0,${Math.round(canvasHeight * 0.44)}" fill="${style.accent}" opacity="0.09"/>
    <polygon points="${canvasWidth},${canvasHeight} ${Math.round(canvasWidth * 0.84)},${canvasHeight} ${canvasWidth},${Math.round(canvasHeight * 0.56)}" fill="${style.secondary}" opacity="0.1"/>
  `;
};

const BannerQuoteFlow: React.FC = () => {
  const navigate = useNavigate();
  const [quoteId] = useState(createQuoteId);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    preferredContact: 'email'
  });
  const [banner, setBanner] = useState<BannerDetails>({
    width: '',
    height: '',
    unit: 'inches',
    quantity: '',
    indoorOutdoor: '',
    sides: '',
    grommets: '',
    hemmedEdges: '',
    polePockets: '',
    materialPreference: '',
    designNeeded: '',
    aiDesignPrompt: '',
    bannerText: '',
    designStyle: 'auto',
    brandColors: '',
    placementNotes: '',
    deadline: '',
    deliveryMethod: '',
    notes: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<UploadedFile[]>([]);
  const [designPreviewUrl, setDesignPreviewUrl] = useState('');
  const [designPreviewSvg, setDesignPreviewSvg] = useState('');
  const [designPreviewSaved, setDesignPreviewSaved] = useState(false);
  const [generatedProofFile, setGeneratedProofFile] = useState<UploadedFile | null>(null);
  const [generatedStyleLabel, setGeneratedStyleLabel] = useState('');
  const [isGeneratingDesign, setIsGeneratingDesign] = useState(false);
  const [isSavingDesignPreview, setIsSavingDesignPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const bannerTextRef = useRef<HTMLTextAreaElement | null>(null);
  const aiPromptRef = useRef<HTMLTextAreaElement | null>(null);

  const handleBack = () => {
    navigate(getRepAwareBackTarget());
  };

  const updateContact = (key: keyof ContactInfo, value: string) => {
    setContactInfo((current) => ({ ...current, [key]: value }));
  };

  const updateBanner = (key: keyof BannerDetails, value: string) => {
    setBanner((current) => ({ ...current, [key]: value }));
  };

  const hasValidContact = () =>
    contactInfo.name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.email.trim()) &&
    contactInfo.phone.trim().length > 0;

  const validate = () => {
    if (!hasValidContact()) {
      setError('Please add a name, valid email, and phone number.');
      return false;
    }

    if (!banner.width.trim() || !banner.height.trim() || !banner.quantity.trim()) {
      setError('Please add the banner width, height, and quantity.');
      return false;
    }

    setError('');
    return true;
  };

  const generateDesignPreview = () => {
    const inferredText = inferBannerTextFromPrompt(banner.aiDesignPrompt);
    const exactText = banner.bannerText.trim() || inferredText;

    if (!exactText) {
      setError('Add the exact words that should appear on the banner before generating the proof. Design instructions are never printed as banner copy.');
      window.setTimeout(() => {
        bannerTextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        bannerTextRef.current?.focus();
      }, 0);
      return;
    }

    if (!banner.bannerText.trim() && inferredText) {
      setBanner((current) => ({ ...current, bannerText: inferredText }));
    }

    setError('');
    setIsGeneratingDesign(true);
    setDesignPreviewSaved(false);
    setGeneratedProofFile(null);

    window.setTimeout(() => {
      const style = getPreviewStyle(
        banner.aiDesignPrompt,
        banner.brandColors,
        banner.designStyle,
        contactInfo.businessName,
        exactText
      );
      const widthValue = parsePositiveNumber(banner.width);
      const heightValue = parsePositiveNumber(banner.height);
      const canvas = getCanvasDimensions(widthValue, heightValue);
      const visibleText = style.uppercase ? exactText.toUpperCase() : exactText;
      const baseLayout = getBaseTextLayout(visibleText, canvas.width, canvas.height, canvas.ratio);
      const styledLines = getStyledLines(baseLayout.lines, baseLayout.fontSize, canvas.width, style);
      const padding = Math.max(36, Math.round(canvas.width * 0.055));
      const textX = style.alignment === 'left'
        ? padding
        : style.alignment === 'right'
          ? canvas.width - padding
          : canvas.width / 2;
      const textAnchor = style.alignment === 'left'
        ? 'start'
        : style.alignment === 'right'
          ? 'end'
          : 'middle';
      const totalTextHeight = styledLines.reduce((total, line) => total + line.lineHeight, 0);
      let lineTop = canvas.height / 2 - totalTextHeight / 2;
      const titleMarkup = styledLines
        .map((line) => {
          const baseline = lineTop + line.fontSize * 0.82;
          lineTop += line.lineHeight;
          const strokeAttributes = line.strokeWidth > 0 && line.stroke !== 'none'
            ? `stroke="${line.stroke}" stroke-width="${line.strokeWidth}" paint-order="stroke fill"`
            : '';
          const shadowAttribute = line.shadow ? 'filter="url(#textShadow)"' : '';
          return `<text x="${textX}" y="${baseline}" text-anchor="${textAnchor}" font-family="${escapeSvgText(line.fontFamily)}" font-size="${line.fontSize}" font-weight="${line.fontWeight}" font-style="${line.fontStyle}" letter-spacing="${line.letterSpacing}" fill="${line.fill}" ${strokeAttributes} ${shadowAttribute}>${escapeSvgText(line.text)}</text>`;
        })
        .join('');
      const businessName = contactInfo.businessName.trim();
      const contactLine = contactInfo.phone.trim() || contactInfo.email.trim();
      const businessMarkup = style.showBusinessName && businessName
        ? `<text x="${textX}" y="${Math.round(canvas.height * 0.11)}" text-anchor="${textAnchor}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(24, Math.round(canvas.height * 0.06))}" font-weight="700" fill="${style.accent}">${escapeSvgText(businessName)}</text>`
        : '';
      const contactMarkup = style.showContact && contactLine
        ? `<text x="${textX}" y="${Math.round(canvas.height * 0.92)}" text-anchor="${textAnchor}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(22, Math.round(canvas.height * 0.052))}" font-weight="700" fill="${style.accent}">${escapeSvgText(contactLine)}</text>`
        : '';
      const borderMarkup = style.showBorder
        ? `<rect x="${Math.round(padding * 0.55)}" y="${Math.round(padding * 0.55)}" width="${canvas.width - Math.round(padding * 1.1)}" height="${canvas.height - Math.round(padding * 1.1)}" rx="${Math.max(8, Math.round(canvas.height * 0.025))}" fill="none" stroke="${style.accent}" stroke-width="${Math.max(5, Math.round(canvas.height * 0.012))}"/>`
        : '';
      const decorationMarkup = getDecorationMarkup(style, canvas.width, canvas.height, padding);
      const shadowOffset = Math.max(3, Math.round(canvas.height * 0.012));
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
          <defs>
            <filter id="textShadow" x="-20%" y="-20%" width="150%" height="150%">
              <feDropShadow dx="${shadowOffset}" dy="${shadowOffset}" stdDeviation="${Math.max(1.5, shadowOffset * 0.32)}" flood-color="${style.accent}" flood-opacity="0.32"/>
            </filter>
          </defs>
          <rect width="${canvas.width}" height="${canvas.height}" fill="${style.background}"/>
          ${decorationMarkup}
          ${borderMarkup}
          ${businessMarkup}
          ${titleMarkup}
          ${contactMarkup}
        </svg>
      `;

      setGeneratedStyleLabel(BANNER_STYLE_LABELS[style.designStyle]);
      setDesignPreviewSvg(svg);
      setDesignPreviewUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      setIsGeneratingDesign(false);
    }, 350);
  };

  const saveDesignPreview = async () => {
    if (!designPreviewSvg) return;

    setIsSavingDesignPreview(true);
    setError('');

    try {
      const fileRecordId = uuidv4();
      const fileName = `${quoteId}-banner-proof-${Date.now()}.svg`;
      const proofBlob = new Blob([designPreviewSvg], { type: 'image/svg+xml' });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('customer-uploads')
        .upload(fileName, proofBlob, { contentType: 'image/svg+xml' });

      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage
        .from('customer-uploads')
        .getPublicUrl(uploadData.path);

      const proofFile: UploadedFile = {
        id: fileRecordId,
        name: 'Generated banner proof draft.svg',
        url: publicUrlData.publicUrl,
        type: 'image/svg+xml',
        size: proofBlob.size,
        tags: ['banner', 'ai_generated_proof', 'proof_image', 'print_proof_draft']
      };

      const { error: dbError } = await supabase
        .from('customer_files')
        .insert({
          id: fileRecordId,
          project_id: stringToUuid(quoteId),
          file_url: proofFile.url,
          file_name: proofFile.name,
          file_type: proofFile.type,
          file_size: proofFile.size,
          tags: proofFile.tags
        });

      if (dbError) throw new Error(dbError.message);

      setUploadedFiles((current) => {
        const withoutOldProofs = current.filter((file) => !file.tags?.includes('ai_generated_proof'));
        return [...withoutOldProofs, proofFile];
      });
      setGeneratedProofFile(proofFile);
      setDesignPreviewSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the generated proof.');
    } finally {
      setIsSavingDesignPreview(false);
    }
  };

  const editDesignPrompt = () => {
    setDesignPreviewSaved(false);
    setGeneratedProofFile(null);
    setGeneratedStyleLabel('');
    setDesignPreviewUrl('');
    setDesignPreviewSvg('');
    setUploadedFiles((current) => current.filter((file) => !file.tags?.includes('ai_generated_proof')));

    window.setTimeout(() => {
      aiPromptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      aiPromptRef.current?.focus();
    }, 0);
  };

  const sendQuoteEmails = async (
    finalContactInfo: ContactInfo,
    quoteDetails: Record<string, unknown>,
    files: UploadedFile[]
  ) => {
    const response = await fetch('/api/send-quote-emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contactInfo: finalContactInfo,
        quoteDetails,
        uploadedFiles: files.map((file) => ({
          name: file.name,
          url: file.url,
          type: file.type,
          size: file.size
        }))
      })
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(
        `Quote request was saved, but email sending failed. Status: ${response.status}. Response: ${responseBody || 'No response body'}`
      );
    }
  };

  const submitBannerQuote = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    setError('');

    const repSlug = getStoredRepSlug();
    const repAttribution = getRepAttributionForSlug(repSlug);
    const allUploadedFiles = [
      ...uploadedFiles,
      ...(generatedProofFile && !uploadedFiles.some((file) => file.id === generatedProofFile.id) ? [generatedProofFile] : []),
      ...referenceFiles
    ];
    const uploadedFilePayload = allUploadedFiles.map((file) => ({
      id: file.id,
      name: file.name,
      url: file.url,
      type: file.type,
      size: file.size,
      tags: file.tags
    }));
    const quoteDetails = {
      quoteId,
      productType: 'banner',
      quoteType: 'banner_quote',
      intakeType: 'banner_quote',
      selectedService: 'Banner',
      companyName: contactInfo.businessName,
      repSlug,
      uploadedFileCount: allUploadedFiles.length,
      banner: {
        ...banner,
        generatedStyleLabel,
        aiDesignPreviewSaved: designPreviewSaved,
        aiDesignPreviewUrl: designPreviewSaved ? (generatedProofFile?.url || designPreviewUrl) : '',
        aiDesignPreviewType: designPreviewUrl ? 'instant_banner_preview' : ''
      }
    };

    const { error: finalizeError } = await supabase
      .rpc('finalize_quote_request_public', {
        p_quote_id: quoteId,
        p_customer_name: contactInfo.name,
        p_customer_email: contactInfo.email,
        p_customer_phone: contactInfo.phone,
        p_preferred_contact: contactInfo.preferredContact,
        p_rep_slug: repAttribution.rep_slug,
        p_rep_email: repAttribution.rep_email,
        p_assigned_rep_name: repAttribution.assigned_rep_name,
        p_quote_data: quoteDetails,
        p_uploaded_files: uploadedFilePayload,
        p_product_type: 'banner'
      });

    if (finalizeError) {
      console.error('Banner quote finalize failed:', finalizeError);
      setIsSubmitting(false);
      setError(finalizeError.message);
      return;
    }

    if (allUploadedFiles.length > 0) {
      const { error: fileContactError } = await supabase.rpc('attach_contact_to_customer_files', {
        file_ids: allUploadedFiles.map((file) => file.id),
        submitted_quote_id: quoteId,
        submitted_customer_name: contactInfo.name,
        submitted_customer_email: contactInfo.email,
        submitted_customer_phone: contactInfo.phone,
        submitted_preferred_contact: contactInfo.preferredContact
      });

      if (fileContactError) {
        console.error('Banner file contact update failed:', fileContactError);
      }
    }

    try {
      await sendQuoteEmails(contactInfo, { ...quoteDetails, ...repAttribution }, allUploadedFiles);
    } catch (emailError) {
      console.error('Banner quote email send failed after quote save:', {
        error: emailError,
        quoteId,
        customerEmail: contactInfo.email,
        endpoint: '/api/send-quote-emails'
      });
      setIsSubmitting(false);
      setError('Your banner quote was saved, but the confirmation email could not be sent. Please try again or contact us directly.');
      return;
    }

    setIsSubmitting(false);
    navigate('/thank-you', {
      state: {
        customerEmail: contactInfo.email
      }
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Button
          type="button"
          variant="ghost"
          className="mb-4 text-slate-700"
          onClick={handleBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="border-blue-100 shadow-xl">
          <CardHeader>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Blue Woods Brands
            </p>
            <CardTitle className="text-3xl text-slate-950">Banner Quote Request</CardTitle>
            <p className="text-sm text-slate-600">
              Printed banner details, artwork, timing, and contact information.
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Customer Info</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="banner-name">Name *</Label>
                  <Input
                    id="banner-name"
                    value={contactInfo.name}
                    onChange={(event) => updateContact('name', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-business">Business Name</Label>
                  <Input
                    id="banner-business"
                    value={contactInfo.businessName}
                    onChange={(event) => updateContact('businessName', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-phone">Phone *</Label>
                  <Input
                    id="banner-phone"
                    type="tel"
                    value={contactInfo.phone}
                    onChange={(event) => updateContact('phone', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-email">Email *</Label>
                  <Input
                    id="banner-email"
                    type="email"
                    value={contactInfo.email}
                    onChange={(event) => updateContact('email', event.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Banner Specs</h2>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="banner-width">Width *</Label>
                  <Input
                    id="banner-width"
                    value={banner.width}
                    onChange={(event) => updateBanner('width', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-height">Height *</Label>
                  <Input
                    id="banner-height"
                    value={banner.height}
                    onChange={(event) => updateBanner('height', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-unit">Unit</Label>
                  <Select value={banner.unit} onValueChange={(value) => updateBanner('unit', value)}>
                    <SelectTrigger id="banner-unit" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inches">Inches</SelectItem>
                      <SelectItem value="feet">Feet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="banner-quantity">Quantity *</Label>
                  <Input
                    id="banner-quantity"
                    value={banner.quantity}
                    onChange={(event) => updateBanner('quantity', event.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="banner-location">Indoor or Outdoor</Label>
                  <Select value={banner.indoorOutdoor} onValueChange={(value) => updateBanner('indoorOutdoor', value)}>
                    <SelectTrigger id="banner-location" className="mt-2">
                      <SelectValue placeholder="Select one" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indoor">Indoor</SelectItem>
                      <SelectItem value="outdoor">Outdoor</SelectItem>
                      <SelectItem value="both">Both / not sure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="banner-sides">Sides</Label>
                  <Select value={banner.sides} onValueChange={(value) => updateBanner('sides', value)}>
                    <SelectTrigger id="banner-sides" className="mt-2">
                      <SelectValue placeholder="Select one" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single-sided">Single-sided</SelectItem>
                      <SelectItem value="double-sided">Double-sided</SelectItem>
                      <SelectItem value="not-sure">Not sure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ['grommets', 'Grommets'],
                  ['hemmedEdges', 'Hemmed Edges'],
                  ['polePockets', 'Pole Pockets']
                ].map(([key, label]) => (
                  <div key={key} className="rounded-lg border border-slate-200 bg-white p-4">
                    <Label className="mb-3 block">{label}</Label>
                    <RadioGroup
                      value={banner[key as keyof BannerDetails]}
                      onValueChange={(value) => updateBanner(key as keyof BannerDetails, value)}
                      className="flex gap-5"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id={`${key}-yes`} />
                        <Label htmlFor={`${key}-yes`}>Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id={`${key}-no`} />
                        <Label htmlFor={`${key}-no`}>No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                ))}
              </div>

              <div>
                <Label htmlFor="banner-material">Material Preference</Label>
                <Input
                  id="banner-material"
                  placeholder="Example: 13oz vinyl, mesh, not sure"
                  value={banner.materialPreference}
                  onChange={(event) => updateBanner('materialPreference', event.target.value)}
                  className="mt-2"
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Artwork / Design</h2>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <Label className="mb-3 block">Need design help?</Label>
                <RadioGroup
                  value={banner.designNeeded}
                  onValueChange={(value) => updateBanner('designNeeded', value)}
                  className="grid gap-3 sm:grid-cols-3"
                >
                  {[
                    ['yes', 'Yes'],
                    ['no', 'No'],
                    ['not-sure', 'Not sure']
                  ].map(([value, label]) => (
                    <div key={value} className="flex items-center space-x-2">
                      <RadioGroupItem value={value} id={`design-${value}`} />
                      <Label htmlFor={`design-${value}`}>{label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="banner-text">Exact Banner Text</Label>
                <Textarea
                  ref={bannerTextRef}
                  id="banner-text"
                  value={banner.bannerText}
                  onChange={(event) => updateBanner('bannerText', event.target.value)}
                  className="mt-2"
                  rows={4}
                  placeholder="Example: OPEN MONDAYS"
                />
                <p className="mt-2 text-sm font-medium text-slate-600">
                  Only these words are printed on the banner. Design instructions below are never used as banner copy.
                </p>
              </div>

              <div>
                <Label htmlFor="banner-ai-prompt">Design Instructions — Not Printed</Label>
                <Textarea
                  ref={aiPromptRef}
                  id="banner-ai-prompt"
                  value={banner.aiDesignPrompt}
                  onChange={(event) => updateBanner('aiDesignPrompt', event.target.value)}
                  className="mt-2"
                  rows={5}
                  placeholder="Example: White background, red letters, centered, as large as possible. Use a vintage Italian deli sign-painter style. No logo, business name, border, contact information, or BWB branding."
                />
                <p className="mt-2 text-sm text-slate-500">
                  Describe colors, alignment, size, style, and anything that should be included or removed.
                </p>
              </div>

              <div>
                <Label htmlFor="banner-design-style">Design Style</Label>
                <Select
                  value={banner.designStyle}
                  onValueChange={(value) => updateBanner('designStyle', value)}
                >
                  <SelectTrigger id="banner-design-style" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BANNER_STYLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-sm text-slate-500">
                  Auto reads the instructions, business name, and wording. Choose a preset when you want a stronger visual direction.
                </p>
              </div>

              <div>
                <Label htmlFor="banner-colors">Brand Colors</Label>
                <Input
                  id="banner-colors"
                  value={banner.brandColors}
                  onChange={(event) => updateBanner('brandColors', event.target.value)}
                  className="mt-2"
                  placeholder="Example: red, white, black, and green"
                />
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-950">Banner Proof Draft</h3>
                    <p className="text-sm text-slate-600">
                      Generates a styled banner using the exact text, size ratio, colors, typography, and selected design direction.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={generateDesignPreview}
                    disabled={isGeneratingDesign}
                    className="bg-blue-700 text-white hover:bg-blue-600"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    {isGeneratingDesign ? 'Building Proof...' : 'Generate Banner Proof'}
                  </Button>
                </div>

                {error.startsWith('Add the exact words') && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {designPreviewUrl && (
                  <div className="mt-4 space-y-3">
                    <div className="overflow-hidden rounded-xl border border-blue-200 bg-white p-2 shadow-sm">
                      <img
                        src={designPreviewUrl}
                        alt="Generated banner proof draft"
                        className="h-auto w-full rounded-lg"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                        {banner.width || '?'} × {banner.height || '?'} {banner.unit}
                      </span>
                      {generatedStyleLabel && (
                        <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                          {generatedStyleLabel} style
                        </span>
                      )}
                      <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                        Exact copy only
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                        No automatic BWB branding
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        onClick={() => void saveDesignPreview()}
                        disabled={isSavingDesignPreview}
                        className="bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-70"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {isSavingDesignPreview ? 'Saving...' : designPreviewSaved ? 'Proof Saved' : 'Save Proof'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={editDesignPrompt}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Design Inputs
                      </Button>
                    </div>
                    <p className={`text-sm font-medium ${designPreviewSaved ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {designPreviewSaved
                        ? 'Saved as an attached proof draft file. Submit the quote to send it with the banner request.'
                        : 'Review the proof draft. Save it if this is the direction, or edit the text and instructions and generate again.'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="banner-placement">Building / Placement Notes</Label>
                <Textarea
                  id="banner-placement"
                  value={banner.placementNotes}
                  onChange={(event) => updateBanner('placementNotes', event.target.value)}
                  className="mt-2"
                  rows={3}
                  placeholder="Example: This banner is going above the front entrance, on the right side of the building, or across the temporary construction fence."
                />
              </div>

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-blue-700" />
                  <h3 className="font-semibold text-slate-950">Upload Logo / Artwork</h3>
                </div>
                <FileUpload
                  onFilesUploaded={setUploadedFiles}
                  quoteId={quoteId}
                  acceptedTypes="image/*,.pdf,.ai,.eps,.svg,.psd"
                  maxFiles={20}
                  maxFileSizeMB={50}
                  title="Upload Banner Files"
                  showCameraButton={false}
                  additionalTags={['banner', 'artwork']}
                  enforceMaxFilesError={true}
                />
              </div>

              <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-amber-700" />
                  <div>
                    <h3 className="font-semibold text-slate-950">Upload Building / Placement Reference Photos</h3>
                    <p className="text-sm text-slate-600">
                      Add photos of the wall, window, storefront, fence, lobby, or area where the banner will go.
                    </p>
                  </div>
                </div>
                <FileUpload
                  onFilesUploaded={setReferenceFiles}
                  quoteId={quoteId}
                  acceptedTypes="image/*,.pdf"
                  maxFiles={12}
                  maxFileSizeMB={50}
                  title="Upload Building Reference Photos"
                  showCameraButton={true}
                  additionalTags={['banner', 'reference_image', 'location_photo', 'building_photo']}
                  enforceMaxFilesError={true}
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Deadline / Delivery</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="banner-deadline">Needed By</Label>
                  <Input
                    id="banner-deadline"
                    type="date"
                    value={banner.deadline}
                    onChange={(event) => updateBanner('deadline', event.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-delivery">Pickup, Delivery, or Install Request</Label>
                  <Select value={banner.deliveryMethod} onValueChange={(value) => updateBanner('deliveryMethod', value)}>
                    <SelectTrigger id="banner-delivery" className="mt-2">
                      <SelectValue placeholder="Select one" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="shipping">Shipping</SelectItem>
                      <SelectItem value="install-request">Install request</SelectItem>
                      <SelectItem value="not-sure">Not sure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="banner-notes">Notes</Label>
                <Textarea
                  id="banner-notes"
                  value={banner.notes}
                  onChange={(event) => updateBanner('notes', event.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>
            </section>

            {error && !error.startsWith('Add the exact words') && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              onClick={submitBannerQuote}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white"
              size="lg"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Banner Quote Request'}
              {!isSubmitting && <CheckCircle className="ml-2 h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default BannerQuoteFlow;
