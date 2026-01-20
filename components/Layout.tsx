
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { UserSession } from '../types';
import Sidebar from './Sidebar';

interface LayoutProps {
  user: UserSession | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FDF8FA] flex flex-col md:flex-row">
      {/* Mobile Header */}
      {user && (
        <div className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-pink-100 sticky top-0 z-[60]">
          <div className="flex items-center gap-2">
            <img 
              src="https://drive.google.com/uc?export=view&id=1KTIuQbowa4-0i-1pCGXSmD86mRj7nUNM"
              alt="KK"
              className="w-8 h-8 rounded-lg object-cover shadow-sm border border-pink-100 bg-pink-100"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "https://ui-avatars.com/api/?name=Kingdom+Kids&background=ec4899&color=fff&size=128&bold=true";
              }}
            />
            <h1 className="text-xs font-black text-gray-800 uppercase tracking-tighter">Kingdom Kids</h1>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-pink-500 text-2xl"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      )}

      {/* Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <Sidebar 
        user={user} 
        onLogout={onLogout} 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <div className={`flex-1 flex flex-col ${user ? 'md:pl-64' : ''}`}>
        {/* Adjusted padding for mobile vs desktop */}
        <main className="flex-1 p-4 md:p-10 w-full max-w-7xl mx-auto">
          <Outlet />
        </main>
        
        <footer className="p-6 text-center text-[10px] text-gray-300 uppercase tracking-widest pb-24 md:pb-6">
          &copy; {new Date().getFullYear()} KINGDOM KIDS Attendance System • Built for Impact
        </footer>
      </div>
    </div>
  );
};

export default Layout;
