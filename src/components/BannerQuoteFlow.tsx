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
  alignment: TextAlignment;
  showBorder: boolean;
  showBusinessName: boolean;
  showContact: boolean;
  uppercase: boolean;
}

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

const getPreviewStyle = (promptValue: string, brandColorsValue: string): PreviewStyle => {
  const prompt = promptValue.toLowerCase();
  const brandColors = brandColorsValue.toLowerCase();
  const combined = `${prompt} ${brandColors}`.trim();
  const listedBrandColors = extractColors(brandColors);

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

  let alignment: TextAlignment = 'center';
  if (/\b(?:left[- ]aligned|align(?:ed)?\s+left|left\s+alignment)\b/i.test(combined)) alignment = 'left';
  if (/\b(?:right[- ]aligned|align(?:ed)?\s+right|right\s+alignment)\b/i.test(combined)) alignment = 'right';
  if (/\b(?:centered|centred|center[- ]aligned|centre[- ]aligned|align(?:ed)?\s+(?:center|centre))\b/i.test(combined)) alignment = 'center';

  const suppressExtras = /(?:forget|remove|without|no)\s+(?:the\s+)?(?:bwb\s+)?(?:brand|branding|logo|business\s+name|company\s+name|contact(?:\s+info)?)|(?:white|black|red|blue|green|yellow)\s+background\s+only|background\s+only|only\s+(?:the\s+)?(?:words|text|message)/i.test(combined);
  const showBusinessName = !suppressExtras && /(?:include|show|add|display|use).{0,24}(?:business|company)\s+name/i.test(combined);
  const showContact = !suppressExtras && /(?:include|show|add|display|use).{0,24}(?:contact|phone|email|website)/i.test(combined);
  const showBorder = !/\b(?:no|without|remove)\s+(?:a\s+)?border\b/i.test(combined) && /\b(?:add|include|show|with|use)\s+(?:a\s+)?(?:thin\s+|thick\s+|simple\s+)?border\b/i.test(combined);

  return {
    background,
    text,
    accent: text,
    alignment,
    showBorder,
    showBusinessName,
    showContact,
    uppercase: /\b(?:all\s+caps|uppercase|upper-case)\b/i.test(combined)
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

const getTextLayout = (textValue: string, canvasWidth: number, canvasHeight: number, ratio: number) => {
  const maxChars = Math.max(10, Math.min(44, Math.round(ratio * 13)));
  const maxLines = ratio >= 4 ? 3 : ratio >= 1.5 ? 4 : 6;
  const lines = wrapText(textValue, maxChars, maxLines);
  const longestLineLength = Math.max(...lines.map((line) => line.length), 1);
  const horizontalFit = (canvasWidth * 0.84) / (longestLineLength * 0.58);
  const verticalFit = (canvasHeight * 0.66) / (Math.max(lines.length, 1) * 1.12);
  const fontSize = Math.max(42, Math.floor(Math.min(horizontalFit, verticalFit, canvasHeight * 0.48)));
  const lineHeight = fontSize * 1.08;
  const firstBaseline = canvasHeight / 2 - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.34;

  return { lines, fontSize, lineHeight, firstBaseline };
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
      const style = getPreviewStyle(banner.aiDesignPrompt, banner.brandColors);
      const widthValue = parsePositiveNumber(banner.width);
      const heightValue = parsePositiveNumber(banner.height);
      const canvas = getCanvasDimensions(widthValue, heightValue);
      const visibleText = style.uppercase ? exactText.toUpperCase() : exactText;
      const layout = getTextLayout(visibleText, canvas.width, canvas.height, canvas.ratio);
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
      const businessName = contactInfo.businessName.trim();
      const contactLine = contactInfo.phone.trim() || contactInfo.email.trim();
      const businessMarkup = style.showBusinessName && businessName
        ? `<text x="${textX}" y="${Math.round(canvas.height * 0.12)}" text-anchor="${textAnchor}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(24, Math.round(canvas.height * 0.065))}" font-weight="700" fill="${style.text}">${escapeSvgText(businessName)}</text>`
        : '';
      const contactMarkup = style.showContact && contactLine
        ? `<text x="${textX}" y="${Math.round(canvas.height * 0.91)}" text-anchor="${textAnchor}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(22, Math.round(canvas.height * 0.055))}" font-weight="700" fill="${style.text}">${escapeSvgText(contactLine)}</text>`
        : '';
      const titleMarkup = layout.lines
        .map((line, index) => `<text x="${textX}" y="${layout.firstBaseline + index * layout.lineHeight}" text-anchor="${textAnchor}" font-family="Arial, Helvetica, sans-serif" font-size="${layout.fontSize}" font-weight="900" fill="${style.text}">${escapeSvgText(line)}</text>`)
        .join('');
      const borderMarkup = style.showBorder
        ? `<rect x="${Math.round(padding * 0.55)}" y="${Math.round(padding * 0.55)}" width="${canvas.width - Math.round(padding * 1.1)}" height="${canvas.height - Math.round(padding * 1.1)}" rx="${Math.max(8, Math.round(canvas.height * 0.025))}" fill="none" stroke="${style.accent}" stroke-width="${Math.max(5, Math.round(canvas.height * 0.012))}"/>`
        : '';
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
          <rect width="${canvas.width}" height="${canvas.height}" fill="${style.background}"/>
          ${borderMarkup}
          ${businessMarkup}
          ${titleMarkup}
          ${contactMarkup}
        </svg>
      `;

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
                  placeholder="Example: White background, red letters, centered, as large as possible. No logo, business name, border, contact information, or BWB branding."
                />
                <p className="mt-2 text-sm text-slate-500">
                  Describe colors, alignment, size, style, and anything that should be included or removed.
                </p>
              </div>

              <div>
                <Label htmlFor="banner-colors">Brand Colors</Label>
                <Input
                  id="banner-colors"
                  value={banner.brandColors}
                  onChange={(event) => updateBanner('brandColors', event.target.value)}
                  className="mt-2"
                  placeholder="Example: red text, white background"
                />
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-950">Banner Proof Draft</h3>
                    <p className="text-sm text-slate-600">
                      Generates a clean banner using the exact banner text, size ratio, colors, and layout instructions.
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
