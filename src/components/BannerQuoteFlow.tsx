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
import { getStoredRepSlug } from '@/lib/repTracking';
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

const createQuoteId = () =>
  `banner_${Date.now()}_${Math.random().toString(36).substring(2)}`;

const escapeSvgText = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const getPreviewPalette = (colors: string) => {
  const normalizedColors = colors.toLowerCase();

  if (normalizedColors.includes('gold') || normalizedColors.includes('charcoal')) {
    return { background: '#17140d', accent: '#d6c08a', secondary: '#f1e4bd' };
  }
  if (normalizedColors.includes('blue')) {
    return { background: '#0f2f57', accent: '#38bdf8', secondary: '#dbeafe' };
  }
  if (normalizedColors.includes('green')) {
    return { background: '#123326', accent: '#34d399', secondary: '#dcfce7' };
  }
  if (normalizedColors.includes('red')) {
    return { background: '#3b1111', accent: '#f87171', secondary: '#fee2e2' };
  }

  return { background: '#111827', accent: '#60a5fa', secondary: '#f8fafc' };
};

const parsePositiveNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const wrapText = (value: string, maxChars: number, maxLines: number) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
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
  return lines.slice(0, maxLines);
};

const looksLikeCreativeDirection = (value: string) =>
  /award-winning|creative director|your job|never create|always leave|senior advertising|dominant focal point/i.test(value);

const getBannerHeadline = (bannerText: string, businessName: string, aiPrompt: string) => {
  const directText = bannerText.trim();

  if (/coming soon/i.test(directText)) return 'Coming Soon';
  if (/grand opening/i.test(directText)) return 'Grand Opening';
  if (/now open/i.test(directText)) return 'Now Open';
  if (/sale/i.test(directText)) return directText.split(/[.!?]/)[0].slice(0, 46);

  if (directText) {
    return directText
      .replace(/\b\d+\s*x\s*\d+\s*(?:ft|feet|inches|inch|in|')?\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(/[.!?]/)[0]
      .slice(0, 54);
  }

  const promptText = aiPrompt.trim();
  if (promptText && !looksLikeCreativeDirection(promptText)) {
    return promptText.split(/[.!?]/)[0].slice(0, 54);
  }

  return businessName.trim() || 'Your Message Here';
};

const getProofDirection = (aiPrompt: string) => {
  const promptText = aiPrompt.trim();
  if (!promptText) return 'Clean, readable layout with strong contrast and room for logo/contact info.';
  if (looksLikeCreativeDirection(promptText)) {
    return 'Premium agency-style direction saved. Keep headline readable, uncluttered, and production-ready.';
  }
  return promptText.split(/[.!?]/)[0].slice(0, 110);
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
  const aiPromptRef = useRef<HTMLTextAreaElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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
    setIsGeneratingDesign(true);
    setDesignPreviewSaved(false);
    setGeneratedProofFile(null);

    window.setTimeout(() => {
      const palette = getPreviewPalette(banner.brandColors);
      const widthValue = parsePositiveNumber(banner.width);
      const heightValue = parsePositiveNumber(banner.height);
      const aspectRatio = widthValue && heightValue ? Math.min(Math.max(widthValue / heightValue, 1.4), 8) : 4;
      const proofWidth = 1600;
      const proofHeight = Math.round(proofWidth / aspectRatio);
      const canvasHeight = Math.max(proofHeight, 360);
      const headline = getBannerHeadline(banner.bannerText, contactInfo.businessName, banner.aiDesignPrompt);
      const titleLines = wrapText(headline, aspectRatio > 3 ? 28 : 20, 2);
      const styleLines = wrapText(getProofDirection(banner.aiDesignPrompt), 92, 2);
      const placementLines = wrapText(banner.placementNotes || 'Placement photos guide scale, spacing, and proof direction.', 92, 2);
      const businessName = escapeSvgText((contactInfo.businessName || 'Business Name').trim().slice(0, 54));
      const contactLine = escapeSvgText(contactInfo.phone || contactInfo.email || 'Contact info');
      const titleFontSize = aspectRatio > 4 ? 136 : aspectRatio > 2.4 ? 112 : 84;
      const titleStartY = Math.max(152, Math.round(canvasHeight * 0.45) - ((titleLines.length - 1) * titleFontSize * 0.42));
      const titleMarkup = titleLines
        .map((line, index) => `<text x="86" y="${titleStartY + index * titleFontSize * 0.92}" font-family="Arial, sans-serif" font-size="${titleFontSize}" font-weight="900" fill="${palette.secondary}">${escapeSvgText(line)}</text>`)
        .join('');
      const styleMarkup = styleLines
        .map((line, index) => `<text x="88" y="${canvasHeight - 128 + index * 28}" font-family="Arial, sans-serif" font-size="23" fill="#e5e7eb">${escapeSvgText(line)}</text>`)
        .join('');
      const placementMarkup = placementLines
        .map((line, index) => `<text x="88" y="${canvasHeight - 60 + index * 24}" font-family="Arial, sans-serif" font-size="20" fill="#cbd5e1">${escapeSvgText(line)}</text>`)
        .join('');
      const sizeLabel = escapeSvgText(`${banner.width || '?'} x ${banner.height || '?'} ${banner.unit}`);
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${proofWidth}" height="${canvasHeight}" viewBox="0 0 ${proofWidth} ${canvasHeight}">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="${palette.background}"/>
              <stop offset="1" stop-color="#020617"/>
            </linearGradient>
            <radialGradient id="glow" cx="78%" cy="12%" r="70%">
              <stop offset="0" stop-color="${palette.accent}" stop-opacity="0.42"/>
              <stop offset="1" stop-color="${palette.accent}" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="${proofWidth}" height="${canvasHeight}" fill="url(#bg)"/>
          <rect width="${proofWidth}" height="${canvasHeight}" fill="url(#glow)"/>
          <rect x="44" y="44" width="${proofWidth - 88}" height="${canvasHeight - 88}" rx="28" fill="none" stroke="${palette.accent}" stroke-width="8"/>
          <rect x="86" y="76" width="210" height="46" rx="23" fill="${palette.accent}"/>
          <text x="191" y="106" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="800" fill="${palette.background}">PROOF DRAFT</text>
          <text x="${proofWidth - 86}" y="114" text-anchor="end" font-family="Arial, sans-serif" font-size="25" font-weight="800" fill="${palette.accent}">${sizeLabel}</text>
          <text x="88" y="184" font-family="Arial, sans-serif" font-size="42" font-weight="900" letter-spacing="3" fill="${palette.accent}">${businessName}</text>
          ${titleMarkup}
          <text x="${proofWidth - 86}" y="${canvasHeight - 88}" text-anchor="end" font-family="Arial, sans-serif" font-size="38" font-weight="900" fill="${palette.accent}">${contactLine}</text>
          ${styleMarkup}
          ${placementMarkup}
          <path d="M${proofWidth - 360} 110 C${proofWidth - 220} 160 ${proofWidth - 210} ${canvasHeight - 210} ${proofWidth - 94} ${canvasHeight - 96}" fill="none" stroke="${palette.accent}" stroke-width="18" stroke-linecap="round" opacity="0.44"/>
          <circle cx="${proofWidth - 216}" cy="168" r="92" fill="${palette.accent}" opacity="0.16"/>
        </svg>
      `;

      setDesignPreviewSvg(svg);
      setDesignPreviewUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      setIsGeneratingDesign(false);
    }, 900);
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
        aiDesignPreviewUrl: designPreviewSaved ? designPreviewUrl : '',
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
          onClick={() => navigate('/')}
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
                <Label htmlFor="banner-ai-prompt">AI Design Prompt</Label>
                <Textarea
                  ref={aiPromptRef}
                  id="banner-ai-prompt"
                  value={banner.aiDesignPrompt}
                  onChange={(event) => updateBanner('aiDesignPrompt', event.target.value)}
                  className="mt-2"
                  rows={5}
                  placeholder="Describe the banner look you want. Example: Create a refined hotel renovation banner for a lobby refresh. Use a clean luxury style, gold and charcoal colors, bold readable text, and a professional call-to-action."
                />
                <p className="mt-2 text-sm text-slate-500">
                  Tell us the style, audience, colors, message, and feeling. This gives the design team a stronger starting point.
                </p>
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-950">Banner Proof Draft</h3>
                      <p className="text-sm text-slate-600">
                        Generate a proof-style banner draft using the actual text, size ratio, colors, prompt, and placement notes.
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

                  {designPreviewUrl && (
                    <div className="mt-4 space-y-3">
                      <div className="overflow-hidden rounded-xl border border-blue-200 bg-white p-2 shadow-sm">
                        <img
                          src={designPreviewUrl}
                          alt="Generated banner proof draft"
                          className="h-auto w-full rounded-lg"
                        />
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
                          Edit Prompt
                        </Button>
                      </div>
                      <p className={`text-sm font-medium ${designPreviewSaved ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {designPreviewSaved
                          ? 'Saved as an attached proof draft file. Submit the quote to send it with the banner request.'
                          : 'Review the proof draft. Save it if this is the direction, or edit the prompt and generate again.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="banner-text">Banner Text</Label>
                <Textarea
                  id="banner-text"
                  value={banner.bannerText}
                  onChange={(event) => updateBanner('bannerText', event.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="banner-colors">Brand Colors</Label>
                <Input
                  id="banner-colors"
                  value={banner.brandColors}
                  onChange={(event) => updateBanner('brandColors', event.target.value)}
                  className="mt-2"
                />
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

            {error && (
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
