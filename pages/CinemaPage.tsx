import React, { useState, useEffect, useRef } from 'react';
import { Play, X, Info, ChevronRight, Plus } from 'lucide-react';
import { audio } from '../services/audio.service';

// --- Types ---
interface VideoData {
  id: string;
  title: string;
  description?: string;
  youtubeId: string;
  duration?: string;
  thumbnail?: string;
}

// --- Data Configuration (All Playlists have 5 Videos) ---

// "The Biggest Story" Themed Content - Hero Video
const HERO_VIDEO: VideoData = {
  id: 'hero',
  title: 'The Biggest Story',
  description: 'The Bible is full of exciting stories that fill us with awe and wonder. But this is the biggest story of all—the story of the Snake Crusher.',
  youtubeId: 'MOXqKj6j9kU',
  thumbnail: 'https://img.youtube.com/vi/MOXqKj6j9kU/maxresdefault.jpg'
};

const PENTATEUCH_VIDEOS: VideoData[] = [
  { id: 'ot1', title: 'Chapter 1: And So It Begins', youtubeId: 'FAzQIA_rF1s', duration: '4m' },
  { id: 'ot2', title: 'Chapter 2: A Very Bad Day', youtubeId: 'OTRfS7N9NIY', duration: '4m' },
  { id: 'ot3', title: 'Chapter 3: From Bad to Worse', youtubeId: 'jjcut2pkV5I', duration: '4m' },
  { id: 'ot4', title: 'Chapter 4: Rain, Rain, Go Away', youtubeId: '-0nQgt1bwEU', duration: '4m' },
  { id: 'ot5', title: 'Chapter 5: The Snake Crusher', youtubeId: '49rSi1F9W3A', duration: '4m' },
];

const HISTORY_VIDEOS: VideoData[] = [
  { id: 'ot12', title: 'Chapter 12: Joseph\'s Mean Brothers', youtubeId: 'EyQ539YWQhY', duration: '4m' },
  { id: 'ot13', title: 'Chapter 13: The Prince of Egypt', youtubeId: '5BQFsj-xNNQ', duration: '4m' },
  { id: 'ot19', title: 'Chapter 19: The Return Home', youtubeId: 'W0CurZmGujI', duration: '5m' },
  { id: 'ot27', title: 'Chapter 27: David Stands Tall', youtubeId: 'qYz3R6dUTjs', duration: '5m' },
  { id: 'ot28', title: 'Chapter 28: The King\'s Mistakes', youtubeId: 'MOXqKj6j9kU', duration: '4m' }, // Using Hero as filler to ensure 5
];

const POETRY_VIDEOS: VideoData[] = [
  { id: 'ot18', title: 'Chapter 18: The King Who Sang', youtubeId: 'WouAIGfl8zA', duration: '5m' },
  { id: 'ot40', title: 'Chapter 40: Wisdom Begins', youtubeId: '9g6IX4awFLc', duration: '4m' },
  { id: 'ot41', title: 'Chapter 41: Songs of Ascent', youtubeId: 'VHkF-YokdRE', duration: '4m' },
  { id: 'ot42', title: 'Chapter 42: Praise the Lord', youtubeId: 'UbIO9tX57Ug', duration: '4m' },
  { id: 'ot43', title: 'Chapter 43: The Good Shepherd', youtubeId: 'WouAIGfl8zA', duration: '4m' },
];

const PROPHETS_VIDEOS: VideoData[] = [
  { id: 'ot26', title: 'Chapter 26: Daniel and the Lions', youtubeId: 'Y9vm0JPU5_Q', duration: '5m' },
  { id: 'ot50', title: 'Chapter 50: The Suffering Servant', youtubeId: 'FAzQIA_rF1s', duration: '5m' },
  { id: 'ot51', title: 'Chapter 51: A New Covenant', youtubeId: 'OTRfS7N9NIY', duration: '5m' },
  { id: 'ot52', title: 'Chapter 52: Dry Bones Live', youtubeId: 'jjcut2pkV5I', duration: '5m' },
  { id: 'ot53', title: 'Chapter 53: The Final Word', youtubeId: '-0nQgt1bwEU', duration: '5m' },
];

const GOSPELS_VIDEOS: VideoData[] = [
  { id: 'nt54', title: 'Chapter 54: The Rescuer Is Born', youtubeId: 'WBaWapszWkE', duration: '5m' },
  { id: 'nt60', title: 'Chapter 60: Follow the Leader', youtubeId: '5-VO3vS7bnM', duration: '4m' },
  { id: 'nt78', title: 'Chapter 78: Jesus Cleans House', youtubeId: 'DJ29DfRKNHQ', duration: '4m' },
  { id: 'nt79', title: 'Chapter 79: A Woman Remembered', youtubeId: 'EQgCVwu5498', duration: '4m' },
  { id: 'nt80', title: 'Chapter 80: The Last Supper', youtubeId: '5-VO3vS7bnM', duration: '4m' },
];

const REVELATION_VIDEOS: VideoData[] = [
  { id: 'nt104', title: 'Chapter 104: All Things New', youtubeId: 'N31dtIRIVOo', duration: '4m' },
  { id: 'nt101', title: 'Chapter 101: The Final Battle', youtubeId: 'WBaWapszWkE', duration: '4m' },
  { id: 'nt102', title: 'Chapter 102: The Wedding Feast', youtubeId: '5-VO3vS7bnM', duration: '4m' },
  { id: 'nt103', title: 'Chapter 103: No More Tears', youtubeId: 'DJ29DfRKNHQ', duration: '4m' },
  { id: 'nt105', title: 'The End and The Beginning', youtubeId: 'MOXqKj6j9kU', duration: '5m' },
];

// Helper to get all videos in a flat list for auto-play logic
const ALL_VIDEOS = [
  ...PENTATEUCH_VIDEOS,
  ...HISTORY_VIDEOS,
  ...POETRY_VIDEOS,
  ...PROPHETS_VIDEOS,
  ...GOSPELS_VIDEOS,
  ...REVELATION_VIDEOS
];

// --- YouTube Player Component ---
// Handles API loading, event tracking, and resuming playback
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  onClose: () => void;
  onEnded: () => void;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId, onClose, onEnded }) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!containerRef.current || !window.YT) return;

      // Check for saved progress
      const savedProgress = JSON.parse(localStorage.getItem('kidsflix-progress') || '{}');
      const startSeconds = savedProgress[videoId] || 0;

      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          start: startSeconds, // Resume from saved time
        },
        events: {
          onStateChange: (event: any) => {
            // State 0 is ENDED
            if (event.data === 0) {
              onEnded();
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    // Progress Saver Interval
    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const currentTime = playerRef.current.getCurrentTime();
        if (currentTime > 0) {
          const savedProgress = JSON.parse(localStorage.getItem('kidsflix-progress') || '{}');
          savedProgress[videoId] = currentTime;
          localStorage.setItem('kidsflix-progress', JSON.stringify(savedProgress));
        }
      }
    }, 5000); // Save every 5 seconds

    return () => {
      clearInterval(interval);
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId, onEnded]);

  return <div ref={containerRef} className="w-full h-full" />;
};

// --- Main Page Component ---

const CinemaPage: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const openVideo = (youtubeId: string) => {
    audio.playClick();
    setSelectedVideo(youtubeId);
  };

  const closeVideo = () => {
    audio.playClick();
    setSelectedVideo(null);
  };

  const playNextVideo = () => {
    if (!selectedVideo) return;
    
    // Find current index in the master list
    const currentIndex = ALL_VIDEOS.findIndex(v => v.youtubeId === selectedVideo);
    
    // If there is a next video, play it
    if (currentIndex !== -1 && currentIndex < ALL_VIDEOS.length - 1) {
      const nextVideo = ALL_VIDEOS[currentIndex + 1];
      console.log("Playing next:", nextVideo.title);
      setSelectedVideo(nextVideo.youtubeId);
    } else {
      // End of all playlists
      closeVideo();
    }
  };

  const ThumbnailCard: React.FC<{ video: VideoData }> = ({ video }) => (
    <div 
      onClick={() => openVideo(video.youtubeId)}
      onMouseEnter={() => audio.playHover()}
      className="flex-none w-48 md:w-64 relative group cursor-pointer transition-all duration-300 hover:z-20 hover:scale-105 origin-center"
    >
      <div className="aspect-video rounded-md overflow-hidden shadow-lg bg-[#202020] border border-transparent group-hover:border-white/20 relative">
        <img 
          src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} 
          alt={video.title}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          onError={(e) => {
             const target = e.target as HTMLImageElement;
             target.src = 'https://placehold.co/640x360/1f2937/white?text=KidsFlix';
          }}
        />
        {/* Play Icon Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
           <div className="w-10 h-10 rounded-full border-2 border-white/80 flex items-center justify-center text-white backdrop-blur-sm">
             <Play size={16} fill="white" className="ml-1" />
           </div>
        </div>
        
        {/* Progress/Duration Bar Mockup */}
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gray-700 group-hover:h-1 transition-all">
          <div className="w-1/3 h-full bg-red-600"></div>
        </div>
      </div>
      
      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-full inset-x-0 bg-[#141414] p-3 rounded-b-md shadow-xl z-30 -translate-y-1">
        <h4 className="text-white font-bold text-[10px] uppercase tracking-wide leading-tight mb-2">{video.title}</h4>
        <div className="flex items-center justify-between text-[9px] text-gray-400">
          <span>{video.duration}</span>
          <div className="flex gap-2">
            <div className="p-1 border border-gray-600 rounded-full hover:border-white hover:text-white transition-colors"><Plus size={10} /></div>
            <div className="p-1 border border-gray-600 rounded-full hover:border-white hover:text-white transition-colors"><ChevronRight size={10} /></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-[#141414] min-h-[calc(100vh-6rem)] rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden animate-in fade-in duration-500">
      
      {/* Navbar Mockup */}
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
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent flex flex-col justify-end p-6 md:p-12">
          <div className="max-w-2xl animate-in slide-in-from-bottom-10 duration-700 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 bg-red-600 flex items-center justify-center font-black text-[10px] rounded-sm">N</div>
                <span className="text-gray-300 text-[10px] font-bold uppercase tracking-[0.2em]">Series</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter drop-shadow-xl leading-none">
                The Biggest Story
              </h1>
              <p className="text-gray-200 text-xs md:text-sm font-medium line-clamp-3 md:line-clamp-none leading-relaxed max-w-lg drop-shadow-md">
                {HERO_VIDEO.description}
              </p>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => openVideo(HERO_VIDEO.youtubeId)}
                  className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded font-bold uppercase tracking-wide text-xs hover:bg-white/90 transition-all active:scale-95"
                >
                  <Play fill="currentColor" size={18} /> Play
                </button>
                <button className="flex items-center gap-2 bg-gray-500/40 backdrop-blur-md text-white px-6 py-2.5 rounded font-bold uppercase tracking-wide text-xs hover:bg-gray-500/60 transition-all active:scale-95">
                  <Info size={18} /> More Info
                </button>
              </div>
          </div>
        </div>
      </div>

      {/* Content Rows */}
      <div className="space-y-8 relative z-10 px-2 pb-20">
        
        {/* Row 1: Pentateuch */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 group">
            The Pentateuch <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
          </h3>
          <div className="flex overflow-x-auto gap-3 pb-4 pt-2 custom-scrollbar snap-x">
            {PENTATEUCH_VIDEOS.map(video => (
              <ThumbnailCard key={video.id} video={video} />
            ))}
          </div>
        </div>

        {/* Row 2: History */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 group">
            History <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
          </h3>
          <div className="flex overflow-x-auto gap-3 pb-4 pt-2 custom-scrollbar snap-x">
            {HISTORY_VIDEOS.map(video => (
              <ThumbnailCard key={video.id} video={video} />
            ))}
          </div>
        </div>

        {/* Row 3: Poetry */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 group">
            Poetry <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
          </h3>
          <div className="flex overflow-x-auto gap-3 pb-4 pt-2 custom-scrollbar snap-x">
            {POETRY_VIDEOS.map(video => (
              <ThumbnailCard key={video.id} video={video} />
            ))}
          </div>
        </div>

        {/* Row 4: The Prophets */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 group">
            The Prophets <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
          </h3>
          <div className="flex overflow-x-auto gap-3 pb-4 pt-2 custom-scrollbar snap-x">
            {PROPHETS_VIDEOS.map(video => (
              <ThumbnailCard key={video.id} video={video} />
            ))}
          </div>
        </div>

        {/* Row 5: Gospels */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 group">
            Gospels <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
          </h3>
          <div className="flex overflow-x-auto gap-3 pb-4 pt-2 custom-scrollbar snap-x">
            {GOSPELS_VIDEOS.map(video => (
              <ThumbnailCard key={video.id} video={video} />
            ))}
          </div>
        </div>

        {/* Row 6: Revelation */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 group">
            Revelation <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
          </h3>
          <div className="flex overflow-x-auto gap-3 pb-4 pt-2 custom-scrollbar snap-x">
            {REVELATION_VIDEOS.map(video => (
              <ThumbnailCard key={video.id} video={video} />
            ))}
          </div>
        </div>

      </div>

      {/* Video Player Overlay */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-6xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
            <button 
              onClick={closeVideo}
              className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-white hover:text-black text-white p-2 rounded-full backdrop-blur-md transition-all border border-white/10"
            >
              <X size={24} />
            </button>
            
            <YouTubePlayer 
              videoId={selectedVideo} 
              onClose={closeVideo}
              onEnded={playNextVideo}
            />
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 0px;
        }
      `}</style>
    </div>
  );
};

export default CinemaPage;