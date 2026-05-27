export type UserType = 'customer' | 'shop';

export interface VehicleInfo {
  year: string;
  make: string;
  model: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  tags: string[];
}

// Database types matching Supabase schema
export interface Project {
  id: string;
  customer_id: string;
  shop_id?: string;
  project_type: 'vehicle_wrap' | 'banner' | 'sign';
  status: string;
  title?: string;
  description?: string;
  estimated_total?: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerData {
  quoteId?: string;
  vehicle: VehicleInfo;
  year?: string;
  make?: string;
  model?: string;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleNotListed?: boolean;
  customVehicleDescription?: string;
  manualVehicleDescription?: string;
  vehicleColor?: string;
  vehicleType?: string;
  specialVehicles?: string[];
  otherVehicleDescription?: string;
  ppfType?: string;
  services: string[];
  selectedService?: string;
  partialWrapType?: string;
  partialWrapDescription?: string;
  goal: string;
  designVision: string;
  hasLogo: boolean;
  logoFile?: File;
  vehiclePhoto?: File;
  uploadedFiles?: UploadedFile[];
  vehiclePhotos?: UploadedFile[];
  logoFiles?: UploadedFile[];
  logoOption?: string;
  hasArtwork?: string;
  artworkFiles?: UploadedFile[];
  hasQRCode?: string;
  qrCodeUrl?: string;
  specialtyFilm?: string;
  designComplexity: string;
  addOns: string[];
  ppfAreas: string;
  ppfFinish: string;
  budget: string;
  compareQuotes: boolean;
  bannerType?: string;
  bannerSize?: string;
  bannerMaterial?: string;
  bannerFinishing?: string[];
  signType?: string;
  signSize?: string;
  signMaterial?: string;
  signMounting?: string[];
  signLighting?: string;
  quoteType?: string;
}

export interface ShopData {
  businessName: string;
  address: string;
  services: string[];
  listingType: string;
  pricingFile?: File;
  turnaroundTime: string;
  finishOptions: string[];
  aiQuotes: boolean;
}

export interface PriceEstimate {
  low: number;
  high: number;
  breakdown: string[];
}
