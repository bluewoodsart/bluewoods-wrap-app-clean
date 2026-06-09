import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Camera, X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { stringToUuid } from '@/lib/utils';

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  quoteId?: string;
  acceptedTypes?: string;
  maxFiles?: number;
  maxFileSizeMB?: number;
  title?: string;
  showCameraButton?: boolean;
  additionalTags?: string[];
}

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  tags: string[];
  preview?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFilesUploaded, 
  quoteId, 
  acceptedTypes = "image/*,.pdf,.svg",
  maxFiles = 10,
  maxFileSizeMB = 50,
  title = "Upload Your Files",
  showCameraButton = true,
  additionalTags = []
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        resolve('');
      }
    });
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;
    const oversizedFiles = Array.from(files).filter((file) => file.size > maxFileSizeBytes);

    if (oversizedFiles.length) {
      const fileNames = oversizedFiles.map((file) => file.name).join(', ');
      setError(
        `These files are over ${maxFileSizeMB}MB: ${fileNames}. Please upload a smaller preview/reference file here. For large print-ready files, we'll send you a separate secure upload link.`
      );
      setSuccess(null);
      return;
    }
    
    setUploading(true);
    setError(null);
    setSuccess(null);
    const newFiles: UploadedFile[] = [];

    try {
      for (const file of Array.from(files)) {
        if (uploadedFiles.length + newFiles.length >= maxFiles) break;
        
        console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
        
        // Create preview for images
        const preview = await createPreview(file);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('customer-uploads')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          if (uploadError.message.toLowerCase().includes('maximum allowed size')) {
            throw new Error(
              `That file is larger than the current ${maxFileSizeMB}MB upload limit. Please upload a smaller preview/reference file here. For large print-ready files, we'll send you a separate secure upload link.`
            );
          }
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        console.log('File uploaded to storage:', uploadData);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('customer-uploads')
          .getPublicUrl(fileName);

        console.log('Public URL:', publicUrl);

        const tags = Array.from(new Set([...getFileTags(file.name, file.type), ...additionalTags]));

        // Convert custom quoteId to valid UUID if provided
        const projectUuid = quoteId ? stringToUuid(quoteId) : null;
        
        console.log('Converting quoteId:', quoteId, 'to UUID:', projectUuid);

        // Insert into customer_files table
        const { data: dbData, error: dbError } = await supabase
          .from('customer_files')
          .insert({
            project_id: projectUuid,
            file_url: publicUrl,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            tags: tags
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database insert error:', dbError);
          throw new Error(`Database insert failed: ${dbError.message}`);
        }

        console.log('File record inserted:', dbData);

        const uploadedFile: UploadedFile = {
          id: dbData.id,
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size,
          tags,
          preview
        };

        newFiles.push(uploadedFile);
      }

      const allFiles = [...uploadedFiles, ...newFiles];
      setUploadedFiles(allFiles);
      onFilesUploaded(allFiles);
      setSuccess(`Successfully uploaded ${newFiles.length} file(s)!`);
      
    } catch (error) {
      console.error('Upload process error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getFileTags = (fileName: string, fileType: string): string[] => {
    const tags: string[] = [];
    const lowerName = fileName.toLowerCase();
    
    if (lowerName.includes('logo')) tags.push('logo');
    if (lowerName.includes('vehicle') || lowerName.includes('car')) tags.push('vehicle_photo');
    if (lowerName.includes('inspiration') || lowerName.includes('mockup')) tags.push('inspiration');
    if (fileType.startsWith('image/')) tags.push('image');
    if (fileType === 'application/pdf') tags.push('pdf');
    
    return tags.length ? tags : ['general'];
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const removeFile = async (fileId: string) => {
    try {
      // Remove from database
      const { error } = await supabase
        .from('customer_files')
        .delete()
        .eq('id', fileId);
      
      if (error) {
        console.error('Error removing file from database:', error);
      }
      
      const filtered = uploadedFiles.filter(f => f.id !== fileId);
      setUploadedFiles(filtered);
      onFilesUploaded(filtered);
    } catch (error) {
      console.error('Error removing file:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center text-red-700">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Upload Error:</span>
            </div>
            <p className="text-red-600 mt-1 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center text-green-700">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">{success}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card 
        className={`border-2 border-dashed transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-8 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg mb-4">Drag & drop files here, or click to select</p>
          
          <div className="space-y-2">
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || uploadedFiles.length >= maxFiles}
              className="mr-2"
            >
              {uploading ? 'Uploading...' : 'Choose Files'}
            </Button>
            
            {showCameraButton && acceptedTypes.includes('image') && (
              <Button 
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading || uploadedFiles.length >= maxFiles}
              >
                <Camera className="w-4 h-4 mr-2" />
                📸 Take Photo
              </Button>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple={maxFiles > 1}
            accept={acceptedTypes}
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
          />
          
          {showCameraButton && acceptedTypes.includes('image') && (
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
            />
          )}
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center mb-3">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-600 font-medium">
                ✅ {uploadedFiles.length} file(s) uploaded successfully!
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  {file.preview && (
                    <img 
                      src={file.preview} 
                      alt={file.name}
                      className="w-16 h-16 object-cover rounded border"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {file.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUpload;
