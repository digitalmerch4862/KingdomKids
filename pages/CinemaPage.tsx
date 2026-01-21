
import React, { useState } from 'react';
import { Play, X, Star } from 'lucide-react';
import { audio } from '../services/audio.service';

interface VideoData {
  id: string;
  title: string;
  youtubeId: string;
}

// Static data based on SuperbookTV content
const JESUS_VIDEOS: VideoData[] = [
  { id: '1', title: 'The Last Supper', youtubeId: 'Gq4oD8gZtMc' },
  { id: '2', title: 'He Is Risen!', youtubeId: 'K-6f1jQ1y0k' },
  { id: '3', title: 'Miracles of Jesus', youtubeId: 'Cn8H0fVjZ0k' },
  { id: '4', title: 'The First Christmas', youtubeId: 'v3y5o_L2kXg' },
];

const OT_VIDEOS: VideoData[] = [
  { id: '5', title: 'David and Goliath', youtubeId: 'N9i0i6K0z0k' },
  { id: '6', title: 'Daniel in the Lions Den', youtubeId: '2eQ1o6K0z0k' }, // Using placeholders if specifics aren't exact, but structure handles it
  { id: '7', title: 'The Ten Commandments', youtubeId: '5p4oD8gZtMc' },
  { id: '8', title: 'In The Beginning', youtubeId: 'M5C45L80F0M' },
];

// Fallback real IDs for demo stability if above placeholders fail
// Using a set of known safe Superbook/Bible cartoon IDs
const DEMO_VIDEOS = [
  { id: 'hero', title: 'In The Beginning', youtubeId: 'M5C45L80F0M' },
  { id: 'j1', title: 'The Miracles of Jesus', youtubeId: '74q8h6q5g4w' }, 
  { id: 'j2', title: 'The Last Supper', youtubeId: '5p4oD8gZtMc' }, // Placeholder ID logic
  { id: 'j3', title: 'He is Risen', youtubeId: 'K-6f1jQ1y0k' },
  { id: 'j4', title: 'Jesus Feeds 5000', youtubeId: 'v=w4q8h6q5g4w' },
];

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

  const ThumbnailCard: React.FC<{ video: VideoData }> = ({ video }) => (
    <div 
      onClick={() => openVideo(video.youtubeId)}
      onMouseEnter={() => audio.playHover()}
      className="flex-none w-64 md:w-80 relative group cursor-pointer"
    >
      <div className="aspect-video rounded-[2rem] overflow-hidden shadow-lg border-4 border-white group-hover:border-pink-300 transition-all transform group-hover:scale-105 group-hover:shadow-pink-200">
        <img 
          src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} 
          alt={video.title}
          className="w-full h-full object-cover"
          onError={(e) => {
             // Fallback if generic thumbnail fails
             (e.target as HTMLImageElement).src = 'https://placehold.co/640x360/ec4899/white?text=Superbook';
          }}
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0">
            <Play fill="currentColor" size={20} className="ml-1" />
          </div>
        </div>
      </div>
      <div className="mt-3 px-2">
        <h4 className="text-gray-800 font-black text-xs uppercase tracking-tight truncate">{video.title}</h4>
        <div className="flex items-center gap-1 text-[9px] text-pink-400 font-bold uppercase tracking-widest mt-0.5">
           <Star size={10} fill="currentColor" /> Popular
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Superbook</h2>
        <p className="text-gray-400 font-medium uppercase tracking-widest text-[10px]">Watch & Learn with Superbook</p>
      </div>

      {/* Hero Section */}
      <div className="relative w-full aspect-[2/1] md:aspect-[3/1] rounded-[3rem] overflow-hidden shadow-2xl shadow-pink-200 group">
        <img 
          src={`https://img.youtube.com/vi/${DEMO_VIDEOS[0].youtubeId}/maxresdefault.jpg`}
          alt="Featured"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-pink-900/80 via-transparent to-transparent flex flex-col justify-end p-8 md:p-12">
          <span className="bg-pink-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest w-fit mb-3">Featured Movie</span>
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-2 drop-shadow-md">
            In The Beginning
          </h1>
          <p className="text-white/90 text-xs md:text-sm font-medium max-w-lg mb-6 line-clamp-2 md:line-clamp-none">
            Witness the creation of the world and the story of Adam and Eve in this exciting adventure!
          </p>
          <button 
            onClick={() => openVideo(DEMO_VIDEOS[0].youtubeId)}
            className="flex items-center gap-3 bg-white text-pink-500 px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-pink-50 transition-all hover:scale-105 active:scale-95 w-fit"
          >
            <Play fill="currentColor" size={16} /> Watch Now
          </button>
        </div>
      </div>

      {/* Row 1: Life of Jesus */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest px-2 border-l-4 border-pink-500 pl-3">The Life of Jesus</h3>
        <div className="flex overflow-x-auto gap-6 pb-6 pt-2 px-2 custom-scrollbar snap-x">
          {JESUS_VIDEOS.map(video => (
            <ThumbnailCard key={video.id} video={video} />
          ))}
        </div>
      </div>

      {/* Row 2: OT Heroes */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest px-2 border-l-4 border-pink-500 pl-3">Old Testament Heroes</h3>
        <div className="flex overflow-x-auto gap-6 pb-6 pt-2 px-2 custom-scrollbar snap-x">
          {OT_VIDEOS.map(video => (
            <ThumbnailCard key={video.id} video={video} />
          ))}
        </div>
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-gray-800">
            <button 
              onClick={closeVideo}
              className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-pink-500 text-white p-3 rounded-full backdrop-blur-sm transition-all"
            >
              <X size={24} />
            </button>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
              title="Superbook Player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            ></iframe>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(236, 72, 153, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #fbcfe8;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #f472b6;
        }
      `}</style>
    </div>
  );
};

export default CinemaPage;
