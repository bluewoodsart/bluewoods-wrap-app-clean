import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock, UploadCloud } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FileUpload from '@/components/FileUpload';
import { supabase } from '@/lib/supabase';
import { UploadedFile } from '@/types';

const REQUEST_ITEM_LABELS: Record<string, string> = {
  vehicle_photos: 'Vehicle photos',
  logo_artwork: 'Logo / artwork',
  better_quality_artwork: 'Better quality artwork',
  measurements: 'Measurements',
  other: 'Other files or information'
};

interface UploadTokenDetails {
  valid: boolean;
  status: string;
  requested_items: string[] | null;
  expires_at: string;
  customer_first_name: string | null;
}

const formatExpiration = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));

const getRequestedItemLabels = (items: string[] | null) => {
  if (!items || items.length === 0) return ['Requested files'];
  return items.map((item) => REQUEST_ITEM_LABELS[item] || item);
};

const getUploadTagsForRequestedItems = (items: string[] | null) => {
  const tags = new Set(['customer_upload_portal']);

  items?.forEach((item) => {
    if (item === 'vehicle_photos') {
      tags.add('vehicle_photo');
    }

    if (item === 'logo_artwork') {
      tags.add('logo');
      tags.add('artwork');
    }

    if (item === 'better_quality_artwork') {
      tags.add('artwork');
      tags.add('better_quality_artwork');
    }

    if (item === 'measurements') {
      tags.add('measurement');
    }
  });

  return Array.from(tags);
};

const UploadAssets = () => {
  const { token = '' } = useParams();
  const [tokenDetails, setTokenDetails] = useState<UploadTokenDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attaching, setAttaching] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const loadToken = async () => {
      setLoading(true);
      setError('');

      const { data, error: tokenError } = await supabase
        .rpc('get_quote_upload_token_public', {
          p_token: token
        });

      setLoading(false);

      if (tokenError) {
        console.error('Upload token validation failed:', tokenError);
        setError('This upload link could not be checked. Please contact SlapWrapz for a new link.');
        return;
      }

      const details = data?.[0] as UploadTokenDetails | undefined;
      if (!details || !details.valid) {
        setTokenDetails(details ?? null);
        setError('This upload link is invalid or expired. Please contact SlapWrapz for a new link.');
        return;
      }

      setTokenDetails(details);
    };

    void loadToken();
  }, [token]);

  const attachUploadedFiles = async (files: UploadedFile[]) => {
    if (!files.length || attaching) return;

    setAttaching(true);
    setError('');
    setSuccessMessage('Saving uploaded files to your quote...');

    const { error: attachError } = await supabase
      .rpc('attach_uploaded_files_to_quote_public', {
        p_token: token,
        p_file_ids: files.map((file) => file.id)
      });

    setAttaching(false);

    if (attachError) {
      console.error('Uploaded file attach failed:', {
        message: attachError.message,
        details: attachError.details,
        hint: attachError.hint,
        code: attachError.code,
        fileIds: files.map((file) => file.id)
      });
      setSuccessMessage('');
      setError(`Your files uploaded, but we could not attach them to your quote. Supabase error: ${attachError.message}`);
      return;
    }

    setSuccessMessage('Files uploaded and attached to your quote. Thank you.');
  };

  const requestedLabels = getRequestedItemLabels(tokenDetails?.requested_items ?? null);
  const uploadTags = getUploadTagsForRequestedItems(tokenDetails?.requested_items ?? null);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="border-blue-100 shadow-lg">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-3 text-blue-700">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl">Upload Files for Your Wrap Quote</CardTitle>
                <p className="mt-2 text-sm text-slate-600">
                  {tokenDetails?.customer_first_name ? `Hi ${tokenDetails.customer_first_name}, ` : ''}
                  upload the requested files here so our team can keep your quote moving.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                Checking upload link...
              </div>
            ) : error && !tokenDetails?.valid ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  Upload link unavailable
                </div>
                <p className="mt-1">{error}</p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="mb-3 text-sm font-semibold uppercase text-slate-500">Requested Items</p>
                  <div className="flex flex-wrap gap-2">
                    {requestedLabels.map((label) => (
                      <span key={label} className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                        {label}
                      </span>
                    ))}
                  </div>
                  {tokenDetails?.expires_at && (
                    <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      Link expires {formatExpiration(tokenDetails.expires_at)}
                    </p>
                  )}
                </div>

                <FileUpload
                  onFilesUploaded={attachUploadedFiles}
                  acceptedTypes="image/*,.pdf,.ai,.eps,.svg,.psd"
                  maxFiles={20}
                  maxFileSizeMB={25}
                  title="Upload Requested Files"
                  showCameraButton={true}
                  additionalTags={uploadTags}
                  enforceMaxFilesError={true}
                />

                {attaching && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    Saving files to your quote...
                  </div>
                )}
                {successMessage && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      {successMessage}
                    </div>
                  </div>
                )}
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default UploadAssets;
