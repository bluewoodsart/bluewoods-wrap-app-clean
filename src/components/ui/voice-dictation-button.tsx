import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Mic, MicOff, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const getSpeechRecognition = () => {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
};

const VoiceDictationButton = ({
  fieldName,
  disabled = false,
  compact = false,
  onTranscript
}: {
  fieldName: string;
  disabled?: boolean;
  compact?: boolean;
  onTranscript: (transcript: string) => void;
}) => {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [voiceMessage, setVoiceMessage] = useState('');
  const supported = Boolean(getSpeechRecognition());

  useEffect(() => () => recognitionRef.current?.abort(), []);
  useEffect(() => {
    if (!listening) return;
    const timer = window.setInterval(() => setElapsedSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [listening]);

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setVoiceMessage('Voice typing is not available in this browser. Try Chrome or Safari.');
      return;
    }
    if (!window.isSecureContext) {
      setVoiceMessage('Voice typing requires the secure website connection.');
      return;
    }

    setVoiceMessage('');
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';
    recognition.onstart = () => {
      setElapsedSeconds(0);
      setListening(true);
    };
    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) finalTranscript += event.results[index][0].transcript;
      }
      if (finalTranscript.trim()) onTranscript(finalTranscript);
    };
    recognition.onerror = (event) => {
      const message = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone access was blocked. Allow the microphone in your browser settings, then try again.'
        : event.error === 'no-speech'
          ? 'No speech was heard. Tap the microphone and try again.'
          : 'Voice typing stopped. Please tap the microphone to try again.';
      setVoiceMessage(message);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setVoiceMessage('Voice typing could not start. Please try again.');
    }
  };

  return <>
    <div className={compact ? 'flex shrink-0 flex-col' : 'flex flex-col items-start gap-1'}>
      <Button
        type="button"
        variant={listening ? 'default' : 'outline'}
        className={`${compact ? 'h-11 w-11 p-0' : 'min-h-11 touch-manipulation gap-2'} ${listening ? 'bg-red-600 text-white hover:bg-red-700' : ''}`}
        onClick={toggleListening}
        disabled={disabled}
        aria-label={listening ? `Stop voice typing for ${fieldName}` : `Start voice typing for ${fieldName}`}
        aria-pressed={listening}
        title={!supported ? 'Voice typing is not available in this browser' : listening ? 'Stop voice typing' : 'Start voice typing'}
      >
        {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        {!compact && <span>{listening ? 'Listening... tap to stop' : 'Use microphone'}</span>}
      </Button>
      {voiceMessage && <p role="status" className={`${compact ? 'w-44' : 'max-w-md'} text-xs font-semibold text-amber-700`}>{voiceMessage}</p>}
    </div>
    {listening && typeof document !== 'undefined' && createPortal((
      <div
        role="status"
        aria-live="polite"
        aria-label={`Listening for ${fieldName}`}
        className="fixed left-1/2 z-[100] flex w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 items-center gap-3 rounded-[1.35rem] border border-white/10 bg-[#282828]/95 px-3 py-2.5 text-white shadow-2xl shadow-black/45 backdrop-blur-md sm:px-4"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300">
          <Mic className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="relative flex h-9 min-w-0 flex-1 items-center justify-center gap-[2px] overflow-hidden" aria-hidden="true">
          <span className="absolute inset-x-0 top-1/2 border-t border-dotted border-slate-500/80" />
          {[4, 5, 4, 6, 5, 4, 5, 7, 4, 5, 8, 12, 7, 16, 9, 21, 13, 25, 10, 19, 8, 23, 14, 18, 9, 15, 7, 12, 6, 9, 5, 7, 4, 6, 5, 4].map((height, index) => (
            <span
              key={`${height}-${index}`}
              className="relative w-[2px] shrink-0 animate-pulse rounded-full bg-white motion-reduce:animate-none"
              style={{ height, animationDelay: `${index * 45}ms`, animationDuration: '520ms' }}
            />
          ))}
        </span>
        <span className="shrink-0 text-xs font-medium tabular-nums text-slate-300">
          {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
        </span>
        <button
          type="button"
          onClick={toggleListening}
          className="flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-full bg-[#3a3a3a] text-white transition hover:bg-[#484848]"
          aria-label={`Stop recording for ${fieldName}`}
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </button>
        <button
          type="button"
          onClick={toggleListening}
          className="flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-full bg-white text-slate-950 transition hover:bg-slate-200"
          aria-label={`Finish voice typing for ${fieldName}`}
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
    ), document.body)}
  </>;
};

export default VoiceDictationButton;
