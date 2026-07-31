const MEBIBYTE = 1024 * 1024;

export const STAFF_IMAGE_MAX_BYTES = 25 * MEBIBYTE;
export const STAFF_VIDEO_MAX_BYTES = 50 * MEBIBYTE;
export const STAFF_IMAGE_OPTIMIZE_THRESHOLD = 10 * MEBIBYTE;

const TARGET_IMAGE_BYTES = 8 * MEBIBYTE;
const MAX_IMAGE_EDGE = 2400;
const OPTIMIZABLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MEDIA_BY_MIME: Record<string, { kind: 'image' | 'video'; extension: string; contentType: string }> = {
  'image/png': { kind: 'image', extension: 'png', contentType: 'image/png' },
  'image/jpeg': { kind: 'image', extension: 'jpg', contentType: 'image/jpeg' },
  'image/webp': { kind: 'image', extension: 'webp', contentType: 'image/webp' },
  'image/gif': { kind: 'image', extension: 'gif', contentType: 'image/gif' },
  'image/heic': { kind: 'image', extension: 'heic', contentType: 'image/heic' },
  'image/heif': { kind: 'image', extension: 'heif', contentType: 'image/heif' },
  'video/mp4': { kind: 'video', extension: 'mp4', contentType: 'video/mp4' },
  'video/webm': { kind: 'video', extension: 'webm', contentType: 'video/webm' },
  'video/quicktime': { kind: 'video', extension: 'mov', contentType: 'video/quicktime' }
};
const MEDIA_BY_EXTENSION = Object.values(MEDIA_BY_MIME).reduce<Record<string, { kind: 'image' | 'video'; extension: string; contentType: string }>>(
  (current, media) => ({ ...current, [media.extension]: media, ...(media.extension === 'jpg' ? { jpeg: media } : {}) }),
  {}
);

export type StaffMediaPhase = 'idle' | 'optimizing' | 'ready' | 'uploading' | 'finalizing';

export const getStaffMediaDetails = (file: File) => {
  const normalizedType = file.type.toLowerCase();
  if (MEDIA_BY_MIME[normalizedType]) return MEDIA_BY_MIME[normalizedType];
  if (normalizedType && normalizedType !== 'application/octet-stream') return null;
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return MEDIA_BY_EXTENSION[extension] || null;
};

const isGifFile = (file: File) =>
  getStaffMediaDetails(file)?.extension === 'gif';

const replaceExtension = (name: string, extension: string) => {
  const basename = name.replace(/\.[^.]+$/, '') || 'social-image';
  return `${basename}.${extension}`;
};

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('This browser could not optimize the image.')),
      'image/webp',
      quality
    );
  });

export async function prepareStaffMedia(
  file: File,
  onPhase?: (phase: StaffMediaPhase) => void
): Promise<File> {
  const mediaDetails = getStaffMediaDetails(file);
  if (!mediaDetails) {
    throw new Error('Use a PNG, JPG, WEBP, GIF, HEIC, HEIF, MP4, WEBM, or MOV file.');
  }

  if (mediaDetails.kind === 'video') {
    if (file.size > STAFF_VIDEO_MAX_BYTES) {
      throw new Error('Videos must be smaller than 50 MB.');
    }
    return file;
  }

  if (file.size > STAFF_IMAGE_MAX_BYTES) {
    throw new Error('Photos must be smaller than 25 MB.');
  }

  // Animated GIFs must never pass through canvas because that removes animation.
  if (isGifFile(file) || file.size <= STAFF_IMAGE_OPTIMIZE_THRESHOLD) {
    return file;
  }

  if (!OPTIMIZABLE_IMAGE_TYPES.has(mediaDetails.contentType)) {
    throw new Error('Choose a smaller HEIC/HEIF image, or convert it to JPG, PNG, or WEBP before uploading.');
  }

  onPhase?.('optimizing');
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const initialScale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * initialScale));
    let height = Math.max(1, Math.round(bitmap.height * initialScale));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('This browser could not prepare the image.');

    let bestBlob: Blob | null = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      const quality = Math.max(0.58, 0.86 - (attempt * 0.06));
      const blob = await canvasToBlob(canvas, quality);
      if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
      if (blob.size <= TARGET_IMAGE_BYTES) break;
      width = Math.max(1, Math.round(width * 0.86));
      height = Math.max(1, Math.round(height * 0.86));
    }

    if (!bestBlob || bestBlob.size > STAFF_IMAGE_MAX_BYTES) {
      throw new Error('The image is still too large after optimization. Choose a smaller image.');
    }

    return new File([bestBlob], replaceExtension(file.name, 'webp'), {
      type: 'image/webp',
      lastModified: Date.now()
    });
  } catch (error) {
    if (error instanceof Error && /smaller|prepare|optimiz/i.test(error.message)) throw error;
    throw new Error('This browser could not optimize that image. Choose a smaller JPG, PNG, or WEBP file.');
  } finally {
    bitmap?.close();
  }
}
