import React, { useEffect, useRef, useState } from 'react';
import { Facebook, ExternalLink, Loader2, AlertCircle, Smartphone } from 'lucide-react';

const FacebookPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Mobile Optimization States
  const [containerWidth, setContainerWidth] = useState(500);
  const [containerHeight, setContainerHeight] = useState(800);

  // --- SMART DEEP LINKING ---
  // Tries to open the native App first, falls back to Browser
  const openNativeApp = () => {
    const pageUrl = "https://www.facebook.com/JLYCCKingdomKids/";
    const pageId = "JLYCCKingdomKids"; // Using handle as fallback
    
    // Attempt to open App Scheme (Android/iOS)
    // Note: Modern iOS Universal Links handle the HTTPS url automatically, 
    // but this helps older Android versions.
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Try generic fb:// scheme (works on many Androids)
      window.location.href = `fb://facewebmodal/f?href=${pageUrl}`;
      
      // Fallback if app doesn't open (standard timeout hack)
      setTimeout(() => {
        window.open(pageUrl, '_blank');
      }, 500);
    } else {
      window.open(pageUrl, '_blank');
    }
  };

  useEffect(() => {
    // 1. DYNAMIC DIMENSIONS (Phone Compatible)
    const updateDimensions = () => {
      if (containerRef.current) {
        // Width: Clamp between 180px and 500px (Facebook limits)
        const width = containerRef.current.offsetWidth;
        const safeWidth = Math.min(Math.max(width, 180), 500);
        
        // Height: Calculate available vertical space so it fits on one screen
        // We subtract header height (approx 150px) + padding
        const availableHeight = window.innerHeight - 200; 
        const safeHeight = Math.max(availableHeight, 500); // Min height 500px

        setContainerWidth(safeWidth);
        setContainerHeight(safeHeight);
      }
    };

    updateDimensions();
    // Re-calculate on Rotate (Mobile) or Resize (Desktop)
    window.addEventListener('resize', updateDimensions);

    // 2. FACEBOOK SDK INITIALIZATION
    const initFacebook = () => {
      try {
        if (window.FB) {
          window.FB.XFBML.parse(containerRef.current);
          setIsLoading(false);
        } else {
          // @ts-ignore
          window.fbAsyncInit = function() {
            // @ts-ignore
            window.FB.init({ xfbml: true, version: 'v18.0' });
            setIsLoading(false);
          };

          const script = document.createElement('script');
          script.id = 'facebook-jssdk';
          script.src = 'https://connect.facebook.net/en_US/sdk.js';
          script.async = true;
          script.defer = true;
          script.crossOrigin = 'anonymous';
          script.onerror = () => {
            console.error("Ad Blocker Detected");
            setHasError(true);
            setIsLoading(false);
          };
          document.body.appendChild(script);
        }
      } catch (err) {
        setHasError(true);
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => initFacebook(), 100);
    
    // Shorter timeout for mobile (network can be flaky)
    const fallbackTimer = setTimeout(() => {
      if (isLoading) {
        setHasError(true); // Don't hide loading, just show error option
        setIsLoading(false);
      }
    }, 8000); 

    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    // Mobile Layout: p-3 (small padding) | Desktop: p-8
    <div className="bg-[#141414] min-h-[calc(100vh-6rem)] rounded-[1.5rem] md:rounded-[2.5rem] p-3 md:p-8 text-white shadow-2xl relative overflow-hidden animate-in fade-in duration-500 flex flex-col items-center">
      
      {/* Header - Stacked on Mobile, Row on Desktop */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between mb-6 gap-4 max-w-2xl text-center md:text-left">
        <div className="flex items-center gap-3">
          <div className="bg-[#1877F2] p-2 rounded-lg shadow-lg shadow-blue-900/20">
            <Facebook size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wide">Community Feed</h1>
            <p className="hidden md:block text-xs text-gray-400 font-medium tracking-wider">LATEST UPDATES FROM KINGDOM KIDS</p>
          </div>
        </div>
        
        <button 
          onClick={openNativeApp}
          className="w-full md:w-auto flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-[#202020] border border-gray-700 hover:border-white px-6 py-3 rounded-xl transition-all hover:bg-white hover:text-black active:scale-95"
        >
          <Smartphone size={14} /> Open App
        </button>
      </div>

      {/* Main Feed Container */}
      <div 
        ref={containerRef}
        className="w-full max-w-[500px] flex-1 bg-white rounded-xl overflow-hidden relative border border-gray-800 shadow-inner min-h-[500px]"
      >
        {/* Loading State */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#202020] gap-4">
            <Loader2 className="animate-spin text-pink-500" size={32} />
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest animate-pulse">Loading Feed...</p>
          </div>
        )}

        {/* Error / AdBlock State */}
        {hasError && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#202020] p-6 text-center space-y-4">
            <div className="bg-red-500/10 p-4 rounded-full">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h3 className="font-bold text-white text-lg">Connection Issue</h3>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              We couldn't load the feed inside the app. This is common on mobile data or if "Data Saver" is on.
            </p>
            <button 
              onClick={openNativeApp}
              className="mt-4 w-full bg-[#1877F2] text-white px-6 py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#1864cc] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
              Open Facebook App <ExternalLink size={14} />
            </button>
          </div>
        )}

        {/* The Actual Facebook Plugin */}
        {/* Key changes whenever width/height changes to force re-render */}
        <div key={`${containerWidth}-${containerHeight}`} className="w-full h-full bg-white overflow-y-auto" style={{WebkitOverflowScrolling: 'touch'}}>
            <div 
              className="fb-page" 
              data-href="https://www.facebook.com/JLYCCKingdomKids/" 
              data-tabs="timeline,events" 
              data-width={containerWidth}
              data-height={containerHeight}
              data-small-header="true" // Smaller header for mobile space
              data-adapt-container-width="false" // We handle width manually
              data-hide-cover="false" 
              data-show-facepile="false" // Hide faces to save vertical space on phone
            >
              <blockquote cite="https://www.facebook.com/JLYCCKingdomKids/" className="fb-xfbml-parse-ignore">
                <a href="https://www.facebook.com/JLYCCKingdomKids/">Kingdom Kids</a>
              </blockquote>
            </div>
        </div>
      </div>

      {/* Helper Script */}
      <script dangerouslySetInnerHTML={{__html: `
        window.fbAsyncInit = function() {
          FB.init({
            xfbml            : true,
            version          : 'v18.0'
          });
        };
      `}} />
    </div>
  );
};

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export default FacebookPage;