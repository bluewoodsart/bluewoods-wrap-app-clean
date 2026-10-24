/** Only an explicitly supplied external folder URL may be used here. */
export function getDesignerCloudFolderUrl(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    // Token portals are not cloud folders, including links saved by older clients.
    const path = decodeURIComponent(url.pathname);
    if (/\/(proof|designer|customer-upload|upload-assets|client-video-upload|invoice)(\/|$)/i.test(path)) return null;
    return candidate;
  } catch {
    return null;
  }
}
