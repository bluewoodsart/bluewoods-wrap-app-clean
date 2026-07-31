export const appendDictation = (current: string, transcript: string) => {
  const spokenText = transcript.trim();
  if (!spokenText) return current;
  if (!current.trim()) return spokenText;
  return `${current}${/\s$/.test(current) ? '' : ' '}${spokenText}`;
};
