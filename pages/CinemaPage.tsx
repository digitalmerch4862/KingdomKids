import React, { useState, useEffect, useRef } from 'react';
import { Play, X, Info, ChevronRight, Plus, Loader2, AlertCircle } from 'lucide-react';
import { audio } from '../services/audio.service';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// --- Configuration ---
// FIX: Mas safe na pagkuha ng API Key. Kung Vite gamit mo, dapat import.meta.env
// Kung hindi, fallback sa process.env pero may safety check.
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || ''; 

const PLAYLIST_IDS = {
  PENTATEUCH: { id: 'PLdf0jG50BebosIGDaUO29LBs5-Q5mjyaQ', title: 'The Pentateuch' },
  HISTORY: { id: 'PLdf0jG50BebraN-4zlNVnZZMQaZxpm7hu', title: 'History' },
  POETRY: { id: 'PLdf0jG50BebpK_9_OR-q3g838dj-VLVQQ', title: 'Poetry' },
  PROPHETS: { id: 'PLdf0jG50BebrdR8ZXyK16CCallABnuq5B', title: 'The Prophets' },
  GOSPELS: { id: 'PLdf0jG50BebrYBuhziGMIp9afHPKVhYtd', title: 'Gospels' },
  REVELATION: { id: 'PLdf0jG50BebpIHZjcmZNcMWSAcrtnoXH9', title: 'Revelation' },
};

const HERO_VIDEO = {
  title: 'The Biggest Story',
  description: 'The Bible is full of exciting stories that fill us with awe and wonder. But this is the biggest story of all—the story of the Snake Crusher.',
  thumbnail: 'https://img.youtube.com/vi/MOXqKj6j9kU/maxresdefault.jpg',
  youtubeId: 'MOXqKj6j9kU'
};

// --- Types ---
interface YouTubePlaylistItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails?: {
      medium?: { url: string };
      high?: { url: string };
    };
    resourceId: {
      videoId: string;
    };
  };
}

interface PlaylistData {
  id: string;
  title: string;
  items: YouTubePlaylistItem[];
  nextPageToken?: string;
}

const CinemaPage: React.FC = () => {
  // --- State ---
  const [categories, setCategories] = useState<PlaylistData[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activePlaylist, setActivePlaylist] = useState<{
    id: string;
    title: string;
    queue: YouTubePlaylistItem[];
    nextPageToken?: string;
  } | null>(null);
  
  // FIX: Ref para laging fresh ang access sa playlist data sa loob ng event listeners
  const activePlaylistRef = useRef(activePlaylist);
  
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // --- Sync Ref with State ---
  // Kada magbabago ang state, i-uupdate natin ang laman ng vault (Ref)
  useEffect(() => {
    activePlaylistRef.current = activePlaylist;
  }, [activePlaylist]);

  // --- Helpers ---
  const fetchPlaylistItems = async (playlistId: string, maxResults: number, pageToken?: string) => {
    if (!API_KEY) {
      console.warn("API_KEY is missing.");
      return { items: [], nextPageToken: undefined };
    }
    
    try {
      let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${playlistId}&key=${API_KEY}`;
      if (pageToken) url += `&pageToken=${pageToken}`;

      const res = await fetch(url);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error.message);

      return {
        items: (data.items || []) as YouTubePlaylistItem[],
        nextPageToken: data.nextPageToken as string | undefined
      };
    } catch (error: any) {
      console.error('Fetch error:', error);
      return { items: [], nextPageToken: undefined, error: error.message };
    }
  };

  // --- Effects ---
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingRows(true);
      try {
        const promises = Object.values(PLAYLIST_IDS).map(async (pl) => {
          const { items } = await fetchPlaylistItems(pl.id, 6);
          const validItems = items.filter(i => i.snippet.thumbnails);
          return { id: pl.id, title: pl.title, items: validItems };
        });
        
        const results = await Promise.all(promises);
        setCategories(results);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingRows(false);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = () => setIsPlayerReady(true);
    } else {
      setIsPlayerReady(true);
    }
  }, []);

  // --- Playlist Logic ---
  const startPlaylist = async (playlistId: string, title: string, startVideoId?: string) => {
    audio.playClick();
    setLoadingPlayer(true);
    
    try {
      const { items, nextPageToken } = await fetchPlaylistItems(playlistId, 50);
      const validItems = items.filter(i => i.snippet.thumbnails && i.snippet.resourceId.videoId);
      
      if (validItems.length > 0) {
        let queue = validItems;
        if (startVideoId) {
          const index = validItems.findIndex(i => i.snippet.resourceId.videoId === startVideoId);
          if (index !== -1) queue = validItems.slice(index);
        }

        const newPlaylistData = { id: playlistId, title, queue, nextPageToken };
        setActivePlaylist(newPlaylistData);
        // Important: Update ref immediately for safety
        activePlaylistRef.current = newPlaylistData;
      }
    } catch (e) {
      alert("Error starting player.");
    } finally {
      setLoadingPlayer(false);
    }
  };

  const closePlayer = () => {
    audio.playClick();
    setActivePlaylist(null);
    activePlaylistRef.current = null;
  };

  // --- FIX: The Corrected Handler ---
  // Gumagamit na ito ngayon ng `activePlaylistRef.current` kaya laging updated
  const handleVideoEnded = async () => {
    const currentData = activePlaylistRef.current; // Get fresh data from vault
    if (!currentData) return;

    // 1. Remove finished video
    const newQueue = currentData.queue.slice(1);
    
    // 2. Prepare next token logic
    let nextToken = currentData.nextPageToken;
    let finalQueue = newQueue;

    // 3. Update State Optimistically first to play next video immediately
    setActivePlaylist(prev => prev ? { ...prev, queue: newQueue } : null);

    // 4. Background Fetch if running low
    if (nextToken && newQueue.length < 5) {
      const { items: nextItems, nextPageToken: newNextToken } = await fetchPlaylistItems(
        currentData.id, 
        20, 
        nextToken
      );

      const validNextItems = nextItems.filter(i => i.snippet.thumbnails);
      
      // Update state again with new items appended
      if (validNextItems.length > 0) {
        setActivePlaylist(prev => {
           if (!prev) return null;
           return {
             ...prev,
             queue: [...prev.queue, ...validNextItems],
             nextPageToken: newNextToken
           };
        });
      }
    }
  };

  // --- Player Component Wrapper ---
  useEffect(() => {
    if (!activePlaylist || !isPlayerReady) return;

    const currentVideo = activePlaylist.queue[0];
    if (!currentVideo) return;

    const videoId = currentVideo.snippet.resourceId.videoId;

    if (!playerRef.current) {
      // Init Player
      const playerDiv = document.getElementById('kidsflix-player');
      if (playerDiv && window.YT && window.YT.Player) {
        playerRef.current = new window.YT.Player('kidsflix-player', {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0,
            fs: 1,
            playsinline: 1
          },
          events: {
            'onStateChange': (event: any) => {
              // YT.PlayerState.ENDED === 0
              if (event.data === 0) {
                handleVideoEnded(); // This now calls the function that uses the Ref
              }
            }
          }
        });
      }
    } else {
      // Load next video
      if (playerRef.current.loadVideoById) {
        playerRef.current.loadVideoById(videoId);
      }
    }
  }, [activePlaylist?.queue, isPlayerReady]);

  // Clean up
  useEffect(() => {
    if (!activePlaylist && playerRef.current) {
      if (playerRef.current.destroy) playerRef.current.destroy();
      playerRef.current = null;
    }
  }, [activePlaylist]);

  // ... (Rest of your rendering code is fine) ...
  // Siguraduhin lang na yung ThumbnailCard at return JSX mo ay pareho pa rin
  
  const ThumbnailCard: React.FC<{ item: YouTubePlaylistItem, playlistId: string, playlistTitle: string }> = ({ item, playlistId, playlistTitle }) => (
    <div 
      onClick={() => startPlaylist(playlistId, playlistTitle, item.snippet.resourceId.videoId)}
      onMouseEnter={() => audio.playHover()}
      className="flex-none w-48 md:w-64 relative group cursor-pointer transition-all duration-300 hover:z-20 hover:scale-105 origin-center"
    >
      <div className="aspect-video rounded-md overflow-hidden shadow-lg bg-[#202020] border border-transparent group-hover:border-white/20 relative">
        <img 
          src={item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.high?.url} 
          alt={item.snippet.title}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
           <div className="w-10 h-10 rounded-full border-2 border-white/80 flex items-center justify-center text-white backdrop-blur-sm">
             <Play size={16} fill="white" className="ml-1" />
           </div>
        </div>
      </div>
      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-full inset-x-0 bg-[#141414] p-3 rounded-b-md shadow-xl z-30 -translate-y-1 pointer-events-none">
        <h4 className="text-white font-bold text-[10px] uppercase tracking-wide leading-tight mb-2 line-clamp-2">{item.snippet.title}</h4>
      </div>
    </div>
  );

  return (
    <div className="bg-[#141414] min-h-[calc(100vh-6rem)] rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden animate-in fade-in duration-500">
      
      {/* Navbar */}
      <div className="flex items-center justify-between mb-8 relative z-20">
        <div className="flex items-center gap-6">
          <div className="text-red-600 font-black text-2xl tracking-tighter uppercase">KIDSFLIX</div>
          <div className="hidden md:flex gap-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
            <span className="text-white cursor-pointer">Home</span>
            <span className="hover:text-white cursor-pointer transition-colors">Series</span>
            <span className="hover:text-white cursor-pointer transition-colors">Movies</span>
            <span className="hover:text-white cursor-pointer transition-colors">My List</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-gray-400 hover:text-white cursor-pointer"><Info size={20} /></div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative w-full aspect-[4/3] md:aspect-[2.35/1] rounded-2xl overflow-hidden shadow-2xl bg-gray-900 mb-10 group">
        <img 
          src={HERO_VIDEO.thumbnail}
          alt="Featured"
          className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity duration-1000 scale-105 group-hover:scale-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent flex flex-col justify-end p-6 md:p-12">
          <div className="max-w-2xl animate-in slide-in-from-bottom-10 duration-700 space-y-4">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 bg-red-600 flex items-center justify-center font-black text-[10px] rounded-sm">N</div>
                <span className="text-gray-300 text-[10px] font-bold uppercase tracking-[0.2em]">Series</span>
             </div>
             <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter drop-shadow-xl leading-none">
               {HERO_VIDEO.title}
             </h1>
             <p className="text-gray-200 text-xs md:text-sm font-medium line-clamp-3 md:line-clamp-none leading-relaxed max-w-lg drop-shadow-md">
               {HERO_VIDEO.description}
             </p>
             
             <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => startPlaylist(PLAYLIST_IDS.PENTATEUCH.id, PLAYLIST_IDS.PENTATEUCH.title)}
                  className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded font-bold uppercase tracking-wide text-xs hover:bg-white/90 transition-all active:scale-95"
                >
                  <Play fill="currentColor" size={18} /> Play Pentateuch
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loadingPlayer && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
          <Loader2 className="animate-spin text-red-600 w-12 h-12" />
          <p className="text-white font-black uppercase tracking-widest text-xs">Loading Theater...</p>
        </div>
      )}

      {/* Categories Rows */}
      {loadingRows ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-red-600" size={40} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <AlertCircle className="text-red-500 w-12 h-12" />
          <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-white bg-red-600 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-8 relative z-10 px-2 pb-20">
          {categories.map((category) => (
            category.items.length > 0 && (
              <div key={category.id} className="space-y-3">
                <h3 
                  onClick={() => startPlaylist(category.id, category.title)}
                  className="text-sm font-bold text-gray-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 group w-fit"
                >
                  {category.title} <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                </h3>
                <div className="flex overflow-x-auto gap-3 pb-4 pt-2 custom-scrollbar snap-x">
                  {category.items.map(item => (
                    <ThumbnailCard 
                      key={item.id} 
                      item={item} 
                      playlistId={category.id} 
                      playlistTitle={category.title} 
                    />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Active Playlist Player Overlay */}
      {activePlaylist && (
        <div className="fixed inset-0 z-[100] bg-black animate-in fade-in duration-300 flex flex-col">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-50">
             <div className="flex items-center gap-4">
                <button 
                  onClick={closePlayer}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                >
                  <X size={24} />
                </button>
                <div>
                   <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Playing Series</h2>
                   <p className="text-lg font-black uppercase tracking-tight">{activePlaylist.title}</p>
                </div>
             </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
             {/* Player Area */}
             <div className="flex-1 bg-black relative flex items-center justify-center">
                <div id="kidsflix-player" className="w-full h-full bg-black"></div>
             </div>

             {/* Queue / Sidebar */}
             <div className="w-full md:w-96 bg-[#181818] border-l border-white/10 flex flex-col h-1/3 md:h-full">
                <div className="p-4 border-b border-white/5 bg-[#202020]">
                   <h3 className="font-bold text-gray-400 uppercase tracking-widest text-xs">Up Next</h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                   {activePlaylist.queue.slice(1).map((item, idx) => (
                      <div key={item.id} className="flex gap-3 group opacity-60 hover:opacity-100 transition-opacity">
                         <div className="w-32 aspect-video bg-gray-800 rounded overflow-hidden shrink-0 relative">
                            <img 
                              src={item.snippet.thumbnails?.medium?.url} 
                              className="w-full h-full object-cover" 
                              alt="thumb" 
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play size={12} fill="white" />
                            </div>
                         </div>
                         <div className="flex-1 min-w-0 pt-1">
                            <p className="text-white text-xs font-bold leading-snug line-clamp-2 mb-1">{item.snippet.title}</p>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Up Next • {idx + 1}</p>
                         </div>
                      </div>
                   ))}
                   {activePlaylist.queue.length <= 1 && (
                     <div className="text-center py-10 text-gray-500 text-xs">
                        <Loader2 className="animate-spin mx-auto mb-2" size={16} />
                        Loading more videos...
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}
      
       <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default CinemaPage;