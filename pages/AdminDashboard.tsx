import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, formatError } from '../services/db.service';
import { MinistryService } from '../services/ministry.service';
import { ActivitySchedule, AttendanceSession, Student } from '../types';

const getFirstName = (fullName: string) => {
  if (!fullName) return "Student";
  if (fullName.includes(',')) {
    const parts = fullName.split(',');
    return parts[1].trim().split(' ')[0];
  }
  return fullName.split(' ')[0];
};

const AdminDashboard: React.FC<{ activity: ActivitySchedule | null }> = ({ activity }) => {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [stats, setStats] = useState({
    totalStudents: 0,
    checkedInCount: 0,
    absentCount: 0,
    attendanceRate: 0,
    totalPointsToday: 0
  });
  const [activeSessions, setActiveSessions] = useState<(AttendanceSession & { student?: Student })[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<Student[]>([]);
  const [error, setError] = useState('');

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  async function loadDashboard() {
    try {
      setError('');
      const students = await db.getStudents();
      const bdays = await db.getBirthdaysThisMonth();
      const sessions = await db.getAttendance();
      const ledger = await db.getPointsLedger();
      const today = new Date().toISOString().split('T')[0];
      
      const currentSessions = sessions.filter(s => s.sessionDate === today && s.status === 'OPEN');
      const todayPoints = ledger.filter(l => l.entryDate === today && !l.voided).reduce((sum, curr) => sum + curr.points, 0);
      
      const actualRate = students.length > 0 ? Math.round((currentSessions.length / students.length) * 100) : 0;
      const rate = Math.min(actualRate, 100);

      const sessionsWithDetails = currentSessions.map(sess => ({
        ...sess,
        student: students.find(s => s.id === sess.studentId)
      }));

      setStats({
        totalStudents: students.length,
        checkedInCount: currentSessions.length,
        absentCount: students.length - currentSessions.length,
        attendanceRate: rate,
        totalPointsToday: todayPoints
      });
      setActiveSessions(sessionsWithDetails);
      setBirthdays(bdays);

      const classStats = await MinistryService.getClassroomStats();
      setClassrooms(classStats);
    } catch (err: any) {
      const formatted = formatError(err);
      setError(formatted);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const formattedDate = now.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).toUpperCase().replace(/,/g, '').replace(/\s+/g, '-');

  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  if (error) {
    const isMissingTable = error.includes('not found') || error.includes('does not exist') || error.includes('404');
    
    return (
      <div className="p-10 bg-white rounded-[3rem] border border-red-100 shadow-sm text-center space-y-6">
        <div className="text-6xl">{isMissingTable ? '🏗️' : '⚠️'}</div>
        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">
          {isMissingTable ? 'Database Setup Required' : 'System Error'}
        </h2>
        <p className="text-red-500 font-bold text-xs uppercase tracking-widest max-w-lg mx-auto leading-relaxed">
          {error}
        </p>
        <div className="pt-6">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">
            {isMissingTable 
              ? "The database tables haven't been initialized in Supabase yet." 
              : "An unexpected error occurred."}
          </p>
          <button 
            onClick={() => navigate('/admin/sql')}
            className="bg-pink-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-pink-100 transition-all hover:bg-pink-600 active:scale-95"
          >
            Go to SQL Terminal to Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Dashboard</h2>
          <p className="text-gray-400 font-medium uppercase tracking-widest text-[10px]">Kingdom Kids Live Monitoring</p>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="text-right">
            <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest block mb-0.5">Date Today</span>
            <p className="text-lg font-black text-gray-700 uppercase tracking-tighter">{formattedDate}</p>
          </div>
          <div className="w-px h-8 bg-pink-50"></div>
          <div className="text-right">
            <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest block mb-0.5">Current Time</span>
            <p className="text-lg font-black text-gray-700 uppercase tracking-tighter">{formattedTime}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50">
          <p className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-1">Attendance Rate</p>
          <p className="text-4xl font-black text-gray-800">{stats.attendanceRate}%</p>
          <div className="mt-4 w-full bg-pink-50 h-2 rounded-full overflow-hidden">
            <div className="bg-pink-500 h-full transition-all duration-1000" style={{ width: `${stats.attendanceRate}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50">
          <p className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-1 text-green-500">Present Today</p>
          <p className="text-4xl font-black text-gray-800">{stats.checkedInCount}</p>
          <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Live Scan Count</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50">
          <p className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-1">Points Issued</p>
          <p className="text-4xl font-black text-gray-800">{stats.totalPointsToday}</p>
          <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Total Ledger Sum</p>
        </div>
      </div>

      {/* Birthdays This Month - Post-it style */}
      {birthdays.length > 0 && (
        <div className="bg-[#FFF9E6] p-8 rounded-[2.5rem] border-2 border-dashed border-amber-200 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl animate-bounce">🎂</span>
              <h3 className="text-sm font-black text-amber-600 uppercase tracking-widest">Birthday Celebrants - {new Date().toLocaleString('default', { month: 'long' }).toUpperCase()}</h3>
            </div>
            <div className="flex flex-wrap gap-4 overflow-x-auto pb-4 custom-scrollbar">
              {birthdays.map((b, i) => (
                <div 
                  key={b.id} 
                  className={`bg-white p-4 rounded-xl shadow-md border-b-4 border-amber-300 transform transition-transform w-32 shrink-0 hover:rotate-0 hover:scale-105 ${i % 2 === 0 ? 'rotate-1' : '-rotate-1'}`}
                >
                   <p className="text-[10px] font-black text-gray-800 uppercase leading-tight mb-2 truncate" title={b.fullName}>
                     {getFirstName(b.fullName)}
                   </p>
                   <div className="flex justify-between items-end">
                      <span className="text-[14px] font-black text-amber-500">{new Date(b.birthday).getDate()}</span>
                      <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">{b.ageGroup}</span>
                   </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -top-10 -right-10 text-9xl opacity-5 pointer-events-none rotate-12">🧁</div>
          <style>{`
            .custom-scrollbar::-webkit-scrollbar { height: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #fcd34d; border-radius: 10px; }
          `}</style>
        </div>
      )}

      {/* Classrooms Section */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Live Classrooms</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {classrooms.map((cls) => (
            <div 
              key={cls.group}
              onClick={() => navigate(`/classrooms/${cls.group}`)}
              className="bg-white p-6 rounded-[2rem] border border-pink-50 shadow-sm hover:shadow-xl hover:shadow-pink-100/30 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-500 text-xl font-bold">
                  🏫
                </div>
                <span className="px-3 py-1 bg-green-50 text-green-600 text-[9px] font-black rounded-full uppercase">Active</span>
              </div>
              <h4 className="text-xl font-black text-gray-800 uppercase tracking-tight">{cls.group} Years</h4>
              <div className="flex gap-4 mt-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Present</p>
                  <p className="text-lg font-black text-pink-500">{cls.present}</p>
                </div>
                <div className="w-px h-8 bg-pink-50 mt-2"></div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
                  <p className="text-lg font-black text-gray-800">{cls.total}</p>
                </div>
              </div>
              <p className="mt-4 text-[10px] font-bold text-pink-400 uppercase tracking-widest group-hover:translate-x-1 transition-transform">Enter Classroom →</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Sessions List */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Live Feed (Latest In)</h3>
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-pink-50 overflow-hidden h-fit">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-[9px] font-bold text-pink-400 uppercase tracking-widest border-b border-pink-50">
                  <th className="px-8 py-5">Student</th>
                  <th className="px-8 py-5">Age Group</th>
                  <th className="px-8 py-5">Arrival</th>
                  <th className="px-8 py-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50/50">
                {activeSessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-pink-50/20 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center text-pink-500 font-black text-[10px]">
                          {sess.student?.fullName ? sess.student.fullName[0] : '?'}
                        </div>
                        <span className="font-bold text-gray-800 uppercase tracking-tight text-xs truncate max-w-[120px] md:max-w-none">{sess.student?.fullName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className="px-2 py-1 bg-gray-50 text-gray-400 text-[9px] font-black rounded uppercase">
                        {sess.student?.ageGroup || 'N/A'}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                      {new Date(sess.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-600 text-[9px] font-black rounded-full uppercase">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        On-Site
                      </span>
                    </td>
                  </tr>
                ))}
                {activeSessions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-gray-400 italic text-[10px] font-black uppercase tracking-[0.2em]">
                      Registry is currently clear.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;