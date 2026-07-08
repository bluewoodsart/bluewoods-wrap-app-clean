import { useMemo, useState } from 'react';
import { Check, Clipboard, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

const jarrelChatGptPrompt = `I am working with Blue Woods Brands / SlapWrapz to build my custom rep cover page at www.slapwrapz.com/jarrel.

The page should mix my own taste, passions, personality, and audience with vehicle wraps, banners, business visibility, and real results.

Act like a creative director. Ask me up to 10 quick questions about:
- my personal style and interests
- colors, music, sports, cars, business, culture, or visuals I like
- what kind of customers I want to attract
- the energy I want the page to have
- what I do not want the page to look or sound like

After I answer, turn my answers into a clean creative brief with:
1. overall vibe
2. color direction
3. image/background ideas
4. headline ideas
5. short page copy
6. words or themes to avoid
7. the kind of lead/customer this page should attract
8. anything Blue Woods Brands should know before updating my page`;

const emailPreview = `Hi Jarrel,

During the exciting onboarding process of BWB Brands, we go straight to the results.

Your starter rep page is live at www.slapwrapz.com/jarrel. Now we want the cover page to feel more like you, not just a placeholder.

Log into your rep portal at www.slapwrapz.com/rep and use the Prompt Your Cover Page section. You can write your idea there directly, or use the AI prompt below in ChatGPT, Claude, Gemini, or another AI tool first.

BWB reviews your direction before anything changes live. Once approved, Codex can use it to update the front end of your Jarrel page.`;

const RepOnboardingPromptCard = () => {
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailMessage, setEmailMessage] = useState('');

  const fullSnippet = useMemo(
    () => `${emailPreview}\n\nCHATGPT PROMPT\n\n${jarrelChatGptPrompt}`,
    []
  );

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(fullSnippet);
    setCopyState('copied');
    window.setTimeout(() => setCopyState('idle'), 1800);
  };

  const sendEmail = async () => {
    setEmailState('sending');
    setEmailMessage('');

    try {
      const response = await fetch('/api/send-rep-onboarding-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ repSlug: 'jarrel' })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Email failed');
      }

      setEmailState('sent');
      setEmailMessage('Jarrel was sent the cover page direction prompt.');
    } catch (error) {
      setEmailState('error');
      setEmailMessage(error instanceof Error ? error.message : 'Email failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jarrel Cover Page Direction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p>
              This onboarding section gives Jarrel a simple ChatGPT prompt so he can describe
              the personal taste, passions, visuals, and customer energy that should shape
              his cover page.
            </p>
            <p>
              He should submit his idea from the rep portal, or reply to the email with the
              creative brief. BWB reviews it before Codex updates the front end of <span className="font-semibold text-slate-900">www.slapwrapz.com/jarrel</span>.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={sendEmail} disabled={emailState === 'sending'}>
                {emailState === 'sending' ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : emailState === 'sent' ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                {emailState === 'sending' ? 'Sending...' : 'Email Jarrel'}
              </Button>
              <Button variant="outline" onClick={copyPrompt}>
                {copyState === 'copied' ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Clipboard className="mr-2 h-4 w-4" />
                )}
                {copyState === 'copied' ? 'Copied' : 'Copy Snippet'}
              </Button>
            </div>
            {emailMessage && (
              <p className={emailState === 'error' ? 'text-sm font-medium text-red-600' : 'text-sm font-medium text-emerald-700'}>
                {emailMessage}
              </p>
            )}
          </div>

          <Textarea
            readOnly
            value={fullSnippet}
            className="min-h-[360px] resize-none bg-slate-50 font-mono text-xs leading-5 text-slate-700"
            aria-label="Jarrel ChatGPT prompt and onboarding email snippet"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default RepOnboardingPromptCard;
