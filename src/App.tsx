import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ThankYou from "./pages/ThankYou";
import QuoteConfirmationFinal from "./components/QuoteConfirmationFinal";
import ShortIntakeFlow from "./components/ShortIntakeFlow";
import { WrapOrderAPI } from "@/components/WrapOrderAPI";
import { StorageBucketAPI } from "@/components/StorageBucketAPI";

const queryClient = new QueryClient();

const App = () => {
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
              <Route path="/" element={<Index isPreviewMode={isPreviewMode} />} />
              <Route path="/test-short-intake" element={<ShortIntakeFlow />} />
              <Route path="/thank-you" element={<ThankYou />} />
              <Route path="/confirmation" element={<QuoteConfirmationFinal onStartNewQuote={() => window.location.href = '/'} />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
