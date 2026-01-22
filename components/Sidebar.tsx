
import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { UserSession } from '../types';
import { audio } from '../services/audio.service';
import { db } from '../services/db.service';
import { 
  LayoutDashboard, 
  Camera, 
  Users, 
  Star, 
  Scale, 
  Trophy, 
  LogOut,
  X,
  MessageSquare,
  Settings,
  Clapperboard,
  Facebook,
  PlayCircle
} from 'lucide-react';

interface SidebarProps {
  user: UserSession | null;
  onLogout: () => void;
  isOpen?: boolean;
  isDesktopOpen?: boolean;
  onClose?: () => void;
}

interface SidebarItem {
  label: string;
  icon: any;
  path: string;
  badge?: number | null;
  isExternal?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, isOpen, isDesktopOpen = true, onClose }) => {
  const [followUpCount, setFollowUpCount] = useState(0);

  useEffect(() => {
    // Fetch follow-up count on mount if teacher/admin
    if (user && (user.role === 'TEACHER' || user.role === 'ADMIN')) {
      db.getStudents().then(students => {
        const count = students.filter(s => s.consecutiveAbsences > 0 && s.studentStatus === 'active').length;
        setFollowUpCount(count);
      }).catch(console.error);
    }
  }, [user]);

  if (!user) return null;

  const isTeacherOrAdmin = user.role === 'TEACHER' || user.role === 'ADMIN';

  const teacherItems: SidebarItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Follow-Up', icon: MessageSquare, path: '/admin/follow-up', badge: followUpCount > 0 ? followUpCount : null },
    { label: 'QR Check-In', icon: Camera, path: '/admin/qr-scan' },
    { label: 'Students', icon: Users, path: '/admin/students' },
    { label: 'Points Ledger', icon: Star, path: '/admin/points' },
    { label: 'Fairness Monitor', icon: Scale, path: '/admin/fairness' },
    { label: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
  ];

  const parentItems: SidebarItem[] = [
    { label: 'The Biggest Story', icon: PlayCircle, path: '/biggest-story' },
    { label: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
    { label: 'FB Page', icon: Facebook, path: 'https://www.facebook.com', isExternal: true },
  ];

  const menuItems = isTeacherOrAdmin ? teacherItems : parentItems;

  const sidebarClasses = `
    w-64 bg-white border-r border-pink-100 flex flex-col fixed inset-y-0 left-0 z-[56] transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    ${isDesktopOpen ? 'md:translate-x-0' : 'md:-translate-x-full'}
  `;

  return (
    <aside className={sidebarClasses}>
      <div className="p-6 overflow-y-auto flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-10 shrink-0">
          <Link 
            to={user.role === 'PARENTS' ? '/portal' : '/admin'}
            onClick={() => { audio.playClick(); if(onClose) onClose(); }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <h1 className="text-sm font-black text-pink-500 tracking-tighter leading-tight uppercase">Kingdom Kids</h1>
          </Link>
          <button className="md:hidden text-gray-400" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <nav className="space-y-1.5 flex-1">
          {menuItems.map((item) => {
            if (item.isExternal) {
              return (
                <a
                  key={item.path}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => audio.playHover()}
                  onClick={() => {
                    audio.playClick();
                    if (onClose) onClose();
                  }}
                  className="flex items-center justify-between px-5 py-3.5 rounded-2xl font-black transition-all uppercase tracking-widest text-[10px] text-gray-400 hover:bg-pink-50/50 hover:text-pink-500"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" strokeWidth={2.5} />
                    <span>{item.label}</span>
                  </div>
                </a>
              );
            }
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                onMouseEnter={() => audio.playHover()}
                onClick={() => {
                  audio.playClick();
                  if (onClose) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-5 py-3.5 rounded-2xl font-black transition-all uppercase tracking-widest text-[10px] ${
                    isActive
                      ? 'bg-pink-500 text-white shadow-xl shadow-pink-100 translate-x-1'
                      : 'text-gray-400 hover:bg-pink-50/50 hover:text-pink-500'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" strokeWidth={2.5} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-md">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {isTeacherOrAdmin && (
          <div className="mt-4 pt-4 border-t border-pink-50 shrink-0">
             <NavLink
              to="/admin/control-center"
              onMouseEnter={() => audio.playHover()}
              onClick={() => {
                audio.playClick();
                if (onClose) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center justify-between px-5 py-3.5 rounded-2xl font-black transition-all uppercase tracking-widest text-[10px] ${
                  isActive
                    ? 'bg-pink-500 text-white shadow-xl shadow-pink-100 translate-x-1'
                    : 'text-gray-400 hover:bg-pink-50/50 hover:text-pink-500'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5" strokeWidth={2.5} />
                <span>Control Center</span>
              </div>
            </NavLink>
          </div>
        )}
      </div>

      <div className="mt-auto p-6 border-t border-pink-50 bg-gray-50/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-500 font-black text-lg border-2 border-white shadow-sm shrink-0">
            {user.username[0]}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-black text-gray-800 truncate uppercase tracking-tight">{user.username}</span>
            <span className="text-[9px] font-black text-pink-400 uppercase tracking-widest truncate">
              {user.role === 'PARENTS' ? 'Parent/Student' : (user.role === 'ADMIN' ? 'Admin Teacher' : 'Teacher')}
            </span>
          </div>
        </div>
        <button
          onMouseEnter={() => audio.playHover()}
          onClick={() => { audio.playClick(); onLogout(); }}
          className="w-full flex items-center gap-2 px-4 py-3 text-[10px] font-black text-gray-300 hover:text-pink-600 transition-colors uppercase tracking-widest group"
        >
          <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
