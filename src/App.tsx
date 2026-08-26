import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ThankYou from "./pages/ThankYou";
import AdminStatus from "./pages/AdminStatus";
import Admin from "./pages/Admin";
import CompassionBackendProof from "./pages/CompassionBackendProof";
import RepPortal from "./pages/RepPortal";
import FullProject from "./pages/FullProject";
import UploadAssets from "./pages/UploadAssets";
import CustomerProofPortal from "./pages/CustomerProofPortal";
import CustomerInvoicePortal from "./pages/CustomerInvoicePortal";
import DesignerPacketPortal from "./pages/DesignerPacketPortal";
import LoginPlaceholder from "./pages/LoginPlaceholder";
import Logout from "./pages/Logout";
import RegisterPlaceholder from "./pages/RegisterPlaceholder";
import QuoteConfirmationFinal from "./components/QuoteConfirmationFinal";
import ShortIntakeFlow from "./components/ShortIntakeFlow";
import BannerQuoteFlow from "./components/BannerQuoteFlow";
import SignageQuoteFlow from "./components/SignageQuoteFlow";
import StickerQuoteFlow from "./components/StickerQuoteFlow";
import BrandChannelLanding from "./components/BrandChannelLanding";
import FullWrapQuoteFlow from "./components/FullWrapQuoteFlow";
import WheelersTowingLanding from "./pages/WheelersTowingLanding";
import ZoeWelcome from "./pages/ZoeWelcome";
import MusicBingo from "./pages/MusicBingo";
import RepPageIdeaPreview from "./pages/RepPageIdeaPreview";
import { WrapOrderAPI } from "@/components/WrapOrderAPI";
import { StorageBucketAPI } from "@/components/StorageBucketAPI";
import { getBrandChannel } from "@/lib/brandChannels";
import { getSafeStartOverPath, getStoredRepSlug, isRepPortalSessionActive } from "@/lib/repTracking";

const queryClient = new QueryClient();
const trapstarChannel = getBrandChannel('trapstar');
const jazzyChannel = getBrandChannel('jazzy');
const jarrelChannel = getBrandChannel('jarrel');
const anthonyChannel = getBrandChannel('anthony');
const adamChannel = getBrandChannel('adam');
const wesleyChannel = getBrandChannel('wesley');

const RootRoute = ({ isPreviewMode }: { isPreviewMode: boolean }) => {
  return <Index isPreviewMode={isPreviewMode} />;
};

const LegacyQuickQuoteRoute = () =>
  isRepPortalSessionActive()
    ? <Navigate to="/rep" replace />
    : <ShortIntakeFlow />;

const App = () => {
  useEffect(() => {
    getStoredRepSlug();
  }, []);

  // Check if we're in preview mode (accessed via QR code)
  const isPreviewMode = window.location.search.includes('preview=true');
  
  // Check if we're in API demo mode
  const isAPIMode = window.location.search.includes('api=true');
  
  // Check if we're in storage mode
  const isStorageMode = window.location.search.includes('storage=true');
  
  if (isStorageMode) {
    return (
      <ThemeProvider defaultTheme="light">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <StorageBucketAPI />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }
  
  if (isAPIMode) {
    return (
      <ThemeProvider defaultTheme="light">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <WrapOrderAPI />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }
  
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootRoute isPreviewMode={isPreviewMode} />} />
              <Route path="/trapstar" element={<BrandChannelLanding channel={trapstarChannel} />} />
              <Route path="/trapstar/local/wheelers-towing" element={<WheelersTowingLanding />} />
              <Route path="/jazzy" element={<BrandChannelLanding channel={jazzyChannel} />} />
              <Route path="/jarrel" element={<BrandChannelLanding channel={jarrelChannel} />} />
              <Route path="/anthony" element={<BrandChannelLanding channel={anthonyChannel} />} />
              <Route path="/adam" element={<BrandChannelLanding channel={adamChannel} />} />
              <Route path="/wesley" element={<BrandChannelLanding channel={wesleyChannel} />} />
              <Route path="/zoe" element={<ZoeWelcome />} />
              <Route path="/zoe/login" element={<ZoeWelcome />} />
              <Route path="/music-bingo" element={<MusicBingo />} />
              <Route path="/wraps" element={<LegacyQuickQuoteRoute />} />
              <Route path="/wraps/full" element={<FullWrapQuoteFlow />} />
              <Route path="/quick-quote" element={<LegacyQuickQuoteRoute />} />
              <Route path="/full-project" element={<FullProject />} />
              <Route path="/banners" element={<BannerQuoteFlow />} />
              <Route path="/signs" element={<SignageQuoteFlow />} />
              <Route path="/stickers-decals" element={<StickerQuoteFlow />} />
              <Route path="/compassion-backend-proof" element={<CompassionBackendProof />} />
              <Route path="/login" element={<LoginPlaceholder allowAccountSwitch />} />
              <Route path="/logout" element={<Logout />} />
              <Route
                path="/jazzy/login"
                element={(
                  <LoginPlaceholder
                    defaultRedirect="/rep"
                    brandName="Jazzy Automotive"
                    brandSubtitle="Powered by Blue Woods Apps"
                    uppercaseBrandSubtitle={false}
                    eyebrow="Jazzy Portal"
                    heading="Jazzy Portal Login"
                    backLinkLabel="Back to Jazzy"
                    backLinkTarget="/jazzy"
                    allowAccountSwitch
                  />
                )}
              />
              <Route
                path="/jarrel/login"
                element={(
                  <LoginPlaceholder
                    defaultRedirect="/rep"
                    brandName="Jarrel Wraps"
                    brandSubtitle="Powered by SlapWrapz"
                    uppercaseBrandSubtitle={false}
                    eyebrow="Jarrel Portal"
                    heading="Jarrel Portal Login"
                    backLinkLabel="Back to Jarrel"
                    backLinkTarget="/jarrel"
                    allowAccountSwitch
                  />
                )}
              />
              <Route
                path="/trapstar/login"
                element={(
                  <LoginPlaceholder
                    defaultRedirect="/rep"
                    brandName="Trapstar Wraps"
                    brandSubtitle="Blue Woods Brands"
                    uppercaseBrandSubtitle={false}
                    eyebrow="Trapstar Portal"
                    heading="Trapstar Portal Login"
                    backLinkLabel="Back to Trapstar"
                    backLinkTarget="/trapstar"
                    allowAccountSwitch
                  />
                )}
              />
              <Route
                path="/anthony/login"
                element={(
                  <LoginPlaceholder
                    defaultRedirect="/rep"
                    brandName="SlapWrapz"
                    brandSubtitle="Powered by Blue Woods Brands"
                    uppercaseBrandSubtitle={false}
                    eyebrow="Anthony Portal"
                    heading="Anthony Portal Login"
                    backLinkLabel="Back to Anthony"
                    backLinkTarget="/anthony"
                    allowAccountSwitch
                  />
                )}
              />
              <Route
                path="/adam/login"
                element={(
                  <LoginPlaceholder
                    defaultRedirect="/rep"
                    brandName="SlapWrapz"
                    brandSubtitle="Powered by Blue Woods Brands"
                    uppercaseBrandSubtitle={false}
                    eyebrow="Adam Portal"
                    heading="Adam Portal Login"
                    backLinkLabel="Back to Adam"
                    backLinkTarget="/adam"
                    allowAccountSwitch
                  />
                )}
              />
              <Route
                path="/wesley/login"
                element={(
                  <LoginPlaceholder
                    defaultRedirect="/rep"
                    brandName="SlapWrapz"
                    brandSubtitle="Powered by Blue Woods Brands"
                    uppercaseBrandSubtitle={false}
                    eyebrow="Wesley Portal"
                    heading="Wesley Portal Login"
                    backLinkLabel="Back to Wesley"
                    backLinkTarget="/wesley"
                    allowAccountSwitch
                  />
                )}
              />
              <Route path="/register" element={<RegisterPlaceholder />} />
              <Route path="/test-short-intake" element={<ShortIntakeFlow />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/rep-page-preview/:ideaId" element={<RepPageIdeaPreview />} />
              <Route path="/admin-status" element={<AdminStatus />} />
              <Route path="/rep" element={<RepPortal />} />
              <Route path="/upload-assets/:token" element={<UploadAssets />} />
              <Route path="/proof/:token" element={<CustomerProofPortal />} />
              <Route path="/invoice/:token" element={<CustomerInvoicePortal />} />
              <Route path="/designer/:token" element={<DesignerPacketPortal />} />
              <Route path="/thank-you" element={<ThankYou />} />
              <Route path="/confirmation" element={<QuoteConfirmationFinal onStartNewQuote={() => window.location.href = getSafeStartOverPath()} />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
