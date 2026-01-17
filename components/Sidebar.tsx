
import React from 'react';
import { NavLink } from 'react-router-dom';
import { UserSession } from '../types';
import { audio } from '../services/audio.service';

interface SidebarProps {
  user: UserSession | null;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, isOpen, onClose }) => {
  if (!user) return null;

  const isTeacherOrAdmin = user.role === 'TEACHER' || user.role === 'ADMIN';

  const teacherItems = [
    { label: 'Dashboard', icon: '📊', path: '/admin' },
    { label: 'QR Check-In', icon: '📷', path: '/admin/qr-scan' },
    { label: 'Students', icon: '👥', path: '/admin/students' },
    // Points Ledger hidden as requested
    // { label: 'Points Ledger', icon: '⭐', path: '/admin/points' },
    { label: 'Leaderboard', icon: '🏆', path: '/leaderboard' },
  ];

  const parentItems = [
    { label: 'Student Portal', icon: '🏰', path: '/portal' },
    { label: 'Leaderboard', icon: '🏆', path: '/leaderboard' },
  ];

  const menuItems = isTeacherOrAdmin ? teacherItems : parentItems;

  const sidebarClasses = `
    w-64 bg-white border-r border-pink-100 flex flex-col fixed inset-y-0 left-0 z-[56] transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
  `;

  // Dynamic subtitle based on role
  const logoSubtitle = user.role === 'PARENTS' ? 'Student Portal' : 'Management';

  return (
    <aside className={sidebarClasses}>
      <div className="p-6 overflow-y-auto flex-1">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-pink-500 rounded-[1.25rem] flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-pink-100">K</div>
            <h1 className="text-sm font-black text-gray-800 tracking-tighter leading-tight uppercase">Kingdom Kids<br/><span className="text-[10px] text-pink-500 tracking-[0.2em]">{logoSubtitle}</span></h1>
          </div>
          <button className="md:hidden text-gray-400" onClick={onClose}>✕</button>
        </div>

        <nav className="space-y-1.5">
          {menuItems.map((item) => (
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
                `flex items-center gap-3 px-5 py-3.5 rounded-2xl font-black transition-all uppercase tracking-widest text-[10px] ${
                  isActive
                    ? 'bg-pink-500 text-white shadow-xl shadow-pink-100 translate-x-1'
                    : 'text-gray-400 hover:bg-pink-50/50 hover:text-pink-500'
                }`
              }
            >
              <span className="text-lg opacity-80">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
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
          <span className="text-base group-hover:scale-110 transition-transform">🚪</span> Sign Out Portal
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
