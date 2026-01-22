import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, ExternalLink, RefreshCw, Facebook, AlertTriangle } from 'lucide-react';
import { audio } from '../services/audio.service';

const FB_PAGE_URL = "https://www.facebook.com/JLYCCKingdomKids/";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

const FacebookPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(500); // Default max width for FB Plugin
  const [status, setStatus] = useState<'LOADING' | 'READY' | 'ERROR'>('LOADING');
  const [resizeKey, setResizeKey] = useState(0); // Used to force re-render of plugin on resize

  // 1. Smart Resizing Logic
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.floor(entry.contentRect.width);
        // FB Plugin Min: 180, Max: 500. We constrain it here.
        const adjustedWidth = Math.min(Math.max(width, 180), 500);
        
        setContainerWidth((prev) => {
          if (prev !== adjustedWidth) {
            return adjustedWidth;
          }
          return prev;
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Debounce the re-render key to prevent flickering while dragging window
  useEffect(() => {
    const timer = setTimeout(() => {
      setResizeKey(prev => prev + 1);
      // Re-parse XFBML if SDK is ready
      if (window.FB) {
        window.FB.XFBML.parse();
      }
    }, 500); // 500ms delay after resize stops
    return () => clearTimeout(timer);
  }, [containerWidth]);

  // 2. SDK Injection & Ad-Blocker Handling
  useEffect(() => {
    setStatus('LOADING');

    // Timeout to detect Ad-Blocker or Network Failures
    const timeoutId = setTimeout(() => {
      if (!window.FB) {
        console.warn("Facebook SDK failed to load (likely AdBlocker).");
        setStatus('ERROR');
      }
    }, 3000); // 3 seconds timeout

    // Function to initialize SDK
    const initFacebook = () => {
      if (window.FB) {
        setStatus('READY');
        window.FB.XFBML.parse();
        clearTimeout(timeoutId);
        return;
      }

      // Define callback for when script loads
      window.fbAsyncInit = function() {
        window.FB.init({
          xfbml: true,
          version: 'v18.0'
        });
        setStatus('READY');
        clearTimeout(timeoutId);
      };

      // Inject Script
      const scriptId = 'facebook-jssdk';
      if (!document.getElementById(scriptId)) {
        const js = document.createElement('script');
        js.id = scriptId;
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        js.async = true;
        js.defer = true;
        js.crossOrigin = "anonymous";
        js.onerror = () => {
          setStatus('ERROR');
          clearTimeout(timeoutId);
        };
        document.body.appendChild(js);
      }
    };

    initFacebook();

    return () => clearTimeout(timeoutId);
  }, []);

  const handleRetry = () => {
    audio.playClick();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white p-4 md:p-8 animate-in fade-in duration-500 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8 relative z-10">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Facebook className="text-blue-500 fill-blue-500" size={32} />
            Community Feed
          </h2>
          <p className="text-gray-400 font-medium uppercase tracking-widest text-[10px] mt-1">
            Latest Updates from Kingdom Kids
          </p>
        </div>
        
        {/* Manual Link Button (Always visible as backup) */}
        <a 
          href={FB_PAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => audio.playHover()}
          onClick={() => audio.playClick()}
          className="bg-[#202020] hover:bg-[#303030] border border-gray-800 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 group"
        >
          <span>Open in Facebook</span>
          <ExternalLink size={14} className="group-hover:translate-x-1 transition-transform" />
        </a>
      </div>

      {/* Main Content Area */}
      <div className="flex justify-center w-full">
        
        {/* Dynamic Container for Resize Observation */}
        <div 
          ref={containerRef} 
          className="w-full max-w-[500px] min-h-[600px] flex flex-col items-center justify-center relative"
        >
          
          {/* STATE: LOADING */}
          {status === 'LOADING' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-[#1a1a1a] rounded-xl border border-gray-800 animate-pulse">
              <Loader2 className="animate-spin text-blue-500" size={48} />
              <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Connecting to Facebook...</p>
            </div>
          )}

          {/* STATE: ERROR (AdBlocker) */}
          {status === 'ERROR' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-[#1a1a1a] rounded-xl border border-red-900/30">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Connection Blocked</h3>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wide leading-relaxed max-w-xs mb-8">
                Your browser or an extension is blocking the Facebook Feed.
              </p>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button 
                  onClick={handleRetry}
                  className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} /> Retry
                </button>
                <a 
                  href={FB_PAGE_URL} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  View on Facebook <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}

          {/* STATE: READY (The Plugin) */}
          <div 
            className={`transition-opacity duration-500 ${status === 'READY' ? 'opacity-100' : 'opacity-0'}`}
            key={resizeKey} // Forces React to destroy and recreate div on significant resize
          >
            <div 
              className="fb-page" 
              data-href={FB_PAGE_URL}
              data-tabs="timeline,events" 
              data-width={containerWidth}
              data-height="800" 
              data-small-header="false" 
              data-adapt-container-width="true" 
              data-hide-cover="false" 
              data-show-facepile="true"
              data-theme="dark" // Attempt dark mode if supported by version
            >
              <blockquote cite={FB_PAGE_URL} className="fb-xfbml-parse-ignore">
                <a href={FB_PAGE_URL}>Kingdom Kids</a>
              </blockquote>
            </div>
          </div>

        </div>
      </div>

      {/* Decorative Background Element */}
      <div className="absolute top-0 right-0 p-20 opacity-[0.02] pointer-events-none">
        <Facebook size={400} />
      </div>
    </div>
  );
};

export default FacebookPage;