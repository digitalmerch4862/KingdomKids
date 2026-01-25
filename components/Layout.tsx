
import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { UserSession } from '../types';
import Sidebar from './Sidebar';

interface LayoutProps {
  user: UserSession | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isFullscreenPage = location.pathname === '/admin/faith-pathway';

  return (
    <div className={`min-h-screen h-full bg-[#FDF8FA] flex flex-col md:flex-row ${isFullscreenPage ? 'overflow-hidden' : ''}`}>
      {/* Mobile Header */}
      {user && (
        <div className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-pink-100 sticky top-0 z-[60] shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-black text-pink-500 uppercase tracking-tighter">Kingdom Kids</h1>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-pink-500 text-2xl"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      )}

      {/* Sidebar Overlay (Mobile) */}
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
        isDesktopOpen={true}
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out h-full min-h-0 ${user ? 'md:pl-64' : 'md:pl-0'}`}>
        
        {/* Main Content Area */}
        <main className={`flex-1 flex flex-col min-h-0 ${isFullscreenPage ? 'w-full h-full' : 'p-4 md:p-10 w-full max-w-7xl mx-auto'}`}>
          <Outlet />
        </main>
        
        {!isFullscreenPage && (
          <footer className="p-6 text-center text-[10px] text-gray-300 uppercase tracking-widest pb-24 md:pb-6 shrink-0">
            &copy; {new Date().getFullYear()} KINGDOM KIDS Attendance System
          </footer>
        )}
      </div>
    </div>
  );
};

export default Layout;