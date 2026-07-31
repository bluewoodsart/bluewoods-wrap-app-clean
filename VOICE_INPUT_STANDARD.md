# Voice Input Standard

## Product rule

When a new user-facing field accepts meaningful free-form writing, provide an optional microphone control so a person can dictate from a phone, tablet, or computer instead of typing.

## Required behavior

- Voice input is optional; normal typing must always continue to work.
- Dictation appends to existing text and never silently replaces it.
- The user must explicitly tap to start listening and can tap again to stop.
- Show a visible listening state and an accessible button label.
- Explain blocked microphone permission, insecure connections, no-speech results, and unsupported browsers in plain language.
- Never begin recording automatically.
- Stop or abort recognition when the field control leaves the page.
- Respect the field's maximum length and disabled/submitting state.
- Keep the microphone target at least 44 by 44 pixels for phone use.
- Verify desktop Chrome, Android Chrome, and iPhone Safari before production release.

## Exceptions

Do not add dictation to passwords, one-time codes, payment-card fields, hidden secrets, color/file controls, structured selectors, or fields where speech would create a privacy or security risk.

## Shared implementation

Use `src/components/ui/voice-dictation-button.tsx` and `src/lib/voiceDictation.ts` rather than creating a separate microphone implementation for each page.
