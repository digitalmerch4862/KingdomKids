
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, formatError } from '../services/db.service';
import { MinistryService } from '../services/ministry.service';
import { ActivitySchedule, AttendanceSession, Student, UserSession } from '../types';
import { audio } from '../services/audio.service';
import { Search, X, UserPlus, UserPlus2, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

const getFirstName = (fullName: string) => {
  if (!fullName) return "Student";
  if (fullName.includes(',')) {
    const parts = fullName.split(',');
    return parts[1].trim().split(' ')[0];
  }
  return fullName.split(' ')[0];
};

interface WeekStats {
  weekNumber: number;
  attendanceRate: number;
  presentCount: number;
  pointsIssued: number;
  label: string;
}

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

  const [weeklyComparison, setWeeklyComparison] = useState<{
    weeks: WeekStats[];
    monthName: string;
  } | null>(null);

  const [activeSessions, setActiveSessions] = useState<(AttendanceSession & { student?: Student })[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<Student[]>([]);
  const [error, setError] = useState('');
  
  // Manual Check-in States
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [isCheckingIn, setIsCheckingIn] = useState<string | null>(null);

  // Identify User
  const sessionStr = localStorage.getItem('km_session');
  const user: UserSession | null = sessionStr ? JSON.parse(sessionStr) : null;

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
      const todayDate = new Date();
      const todayStr = todayDate.toISOString().split('T')[0];
      
      const currentSessions = sessions.filter(s => s.sessionDate === todayStr && s.status === 'OPEN');
      const todayPoints = ledger.filter(l => l.entryDate === todayStr && !l.voided).reduce((sum, curr) => sum + curr.points, 0);
      
      const actualRate = students.length > 0 ? Math.round((currentSessions.length / students.length) * 100) : 0;
      const rate = Math.min(actualRate, 100);

      const sessionsWithDetails = currentSessions.map(sess => ({
        ...sess,
        student: students.find(s => s.id === sess.studentId)
      }));

      // --- WEEKLY COMPARISON LOGIC ---
      const year = todayDate.getFullYear();
      const month = todayDate.getMonth();
      const monthName = todayDate.toLocaleString('default', { month: 'long' });
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

      const weekDefinitions = [
        { start: 1, end: 7, label: 'Week 1' },
        { start: 8, end: 14, label: 'Week 2' },
        { start: 15, end: 21, label: 'Week 3' },
        { start: 22, end: 28, label: 'Week 4' },
        { start: 29, end: lastDayOfMonth, label: 'Week 5' },
      ];

      const calculateWeekStats = (startDay: number, endDay: number, weekNum: number, label: string): WeekStats | null => {
        if (startDay > lastDayOfMonth) return null;
        
        const start = new Date(year, month, startDay);
        const end = new Date(year, month, endDay);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const weekSessions = sessions.filter(s => s.sessionDate >= startStr && s.sessionDate <= endStr);
        const uniquePresent = new Set(weekSessions.map(s => s.studentId)).size;
        const weekPoints = ledger.filter(l => l.entryDate >= startStr && l.entryDate <= endStr && !l.voided)
                                .reduce((sum, curr) => sum + curr.points, 0);
        
        const weekRate = students.length > 0 ? Math.round((uniquePresent / students.length) * 100) : 0;

        return {
          weekNumber: weekNum,
          attendanceRate: weekRate,
          presentCount: uniquePresent,
          pointsIssued: weekPoints,
          label
        };
      };

      const weeksData = weekDefinitions
        .map((wd, i) => calculateWeekStats(wd.start, wd.end, i + 1, wd.label))
        .filter((w): w is WeekStats => w !== null);

      setWeeklyComparison({
        weeks: weeksData,
        monthName
      });

      setStats({
        totalStudents: students.length,
        checkedInCount: currentSessions.length,
        absentCount: students.length - currentSessions.length,
        attendanceRate: rate,
        totalPointsToday: todayPoints
      });
      setActiveSessions(sessionsWithDetails);
      setBirthdays(bdays);
      setAllStudents(students);

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

  const handleManualCheckIn = async (student: Student) => {
    if (!user) return;
    setIsCheckingIn(student.id);
    audio.playClick();
    
    try {
      await MinistryService.checkIn(student.id, user.username);
      audio.playYehey();
      loadDashboard();
      setManualSearch('');
    } catch (err: any) {
      alert(err.message || "Check-in failed");
    } finally {
      setIsCheckingIn(null);
    }
  };

  const filteredManualList = useMemo(() => {
    if (!manualSearch.trim()) return [];
    const checkedInIds = new Set(activeSessions.map(s => s.studentId));
    
    return allStudents.filter(s => 
      !checkedInIds.has(s.id) && 
      (s.fullName.toLowerCase().includes(manualSearch.toLowerCase()) || 
       s.accessKey.toLowerCase().includes(manualSearch.toLowerCase()))
    ).slice(0, 5);
  }, [allStudents, manualSearch, activeSessions]);

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

  const TrendIndicator = ({ current, previous }: { current: number, previous?: number }) => {
    if (previous === undefined || current === previous) return <Minus size={12} className="text-gray-300" />;
    return current > previous 
      ? <TrendingUp size={12} className="text-green-500" /> 
      : <TrendingDown size={12} className="text-red-500" />;
  };

  if (error) {
    const isMissingTable = error.includes('not found') || error.includes('does not exist') || error.includes('404');
    return (
      <div className="p-10 bg-white rounded-[3rem] border border-red-100 shadow-sm text-center space-y-6">
        <div className="text-6xl">{isMissingTable ? '🏗️' : '⚠️'}</div>
        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">
          {isMissingTable ? 'Database Setup Required' : 'System Error'}
        </h2>
        <p className="text-red-500 font-bold text-xs uppercase tracking-widest max-w-lg mx-auto leading-relaxed">{error}</p>
        <div className="pt-6">
          <button onClick={() => navigate('/admin/sql')} className="bg-pink-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-pink-100 transition-all hover:bg-pink-600 active:scale-95">
            Go to SQL Terminal to Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex justify-between items-start w-full md:w-auto">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-800 uppercase tracking-tighter">Dashboard</h2>
            <p className="text-gray-400 font-medium uppercase tracking-widest text-[10px]">Kingdom Kids Live Monitoring</p>
          </div>
          <button onClick={() => { audio.playClick(); setShowManualModal(true); }} className="md:hidden bg-pink-500 text-white p-3 rounded-2xl shadow-lg shadow-pink-100 active:scale-95">
            <Search size={20} />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center">
           <button onClick={() => { audio.playClick(); setShowManualModal(true); }} className="hidden md:flex items-center gap-3 bg-white border border-pink-100 text-pink-500 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-pink-50 transition-all shadow-sm">
             <Search size={16} strokeWidth={3} /> Manual Check-In
           </button>
           <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 bg-white md:bg-transparent p-4 md:p-0 rounded-2xl border border-pink-50 md:border-none shadow-sm md:shadow-none w-full md:w-auto">
            <div className="flex justify-between md:block items-center text-right">
              <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest block mb-0.5">Date Today</span>
              <p className="text-base md:text-lg font-black text-gray-700 uppercase tracking-tighter">{formattedDate}</p>
            </div>
            <div className="hidden md:block w-px h-8 bg-pink-50"></div>
            <div className="flex justify-between md:block items-center text-right">
              <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest block mb-0.5">Current Time</span>
              <p className="text-base md:text-lg font-black text-gray-700 uppercase tracking-tighter">{formattedTime}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Weekly Comparison Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-pink-500" />
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              {weeklyComparison?.monthName} Weekly Progression
            </h3>
          </div>
          <span className="text-[9px] font-bold text-pink-300 uppercase tracking-tighter bg-pink-50 px-3 py-1 rounded-full border border-pink-100">Performance Tracking</span>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-pink-50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-bold text-pink-400 uppercase tracking-widest border-b border-pink-50">
                  <th className="px-8 py-6">Week Period</th>
                  <th className="px-8 py-6">Attendance Rate</th>
                  <th className="px-8 py-6">Unique Kids</th>
                  <th className="px-8 py-6">Stars Awarded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50/30">
                {weeklyComparison?.weeks.map((week, idx) => (
                  <tr key={week.weekNumber} className="hover:bg-pink-50/10 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center font-black text-xs">
                          {week.weekNumber}
                        </span>
                        <span className="font-black text-gray-800 uppercase tracking-tight text-xs">{week.label}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-gray-700 text-sm">{week.attendanceRate}%</span>
                        <TrendIndicator 
                          current={week.attendanceRate} 
                          previous={idx > 0 ? weeklyComparison.weeks[idx-1].attendanceRate : undefined} 
                        />
                      </div>
                      <div className="w-24 bg-gray-100 h-1 rounded-full mt-2 overflow-hidden">
                        <div className="bg-pink-500 h-full" style={{ width: `${week.attendanceRate}%` }}></div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-700 text-sm">{week.presentCount}</span>
                        <TrendIndicator 
                          current={week.presentCount} 
                          previous={idx > 0 ? weeklyComparison.weeks[idx-1].presentCount : undefined} 
                        />
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-pink-500 text-sm">{week.pointsIssued.toLocaleString()}</span>
                        <TrendIndicator 
                          current={week.pointsIssued} 
                          previous={idx > 0 ? weeklyComparison.weeks[idx-1].pointsIssued : undefined} 
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Check-in Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-pink-500 p-8 md:p-10 text-white relative">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Manual Check-In</h3>
              <p className="text-pink-100 text-[10px] font-black uppercase tracking-widest opacity-80 mt-1">Search student for immediate arrival</p>
              <button onClick={() => { audio.playClick(); setShowManualModal(false); }} className="absolute top-8 right-8 md:top-10 md:right-10 text-white/50 hover:text-white transition-colors">
                <X size={32} />
              </button>
            </div>
            <div className="p-8 md:p-10 space-y-6">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" autoFocus placeholder="SEARCH BY NAME OR ACCESS KEY..." className="w-full pl-14 pr-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 transition-all uppercase font-black text-gray-700 text-sm tracking-tight" value={manualSearch} onChange={(e) => setManualSearch(e.target.value)} />
              </div>
              <div className="space-y-3 min-h-[320px]">
                {filteredManualList.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 bg-white border border-pink-50 rounded-2xl hover:bg-pink-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-pink-100 text-pink-500 rounded-xl flex items-center justify-center font-black">{student.fullName[0]}</div>
                      <div>
                        <p className="font-black text-gray-800 uppercase tracking-tight text-sm leading-none">{student.fullName}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{student.ageGroup} Group • {student.accessKey}</p>
                      </div>
                    </div>
                    <button onClick={() => handleManualCheckIn(student)} disabled={isCheckingIn === student.id} className="bg-green-500 text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-green-100 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
                      {isCheckingIn === student.id ? '...' : <><UserPlus size={12} strokeWidth={3} />Check In</>}
                    </button>
                  </div>
                ))}
                {manualSearch && filteredManualList.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in-95">
                    <div className="bg-pink-50 w-20 h-20 rounded-full flex items-center justify-center mb-4"><X size={40} className="text-pink-300" /></div>
                    <p className="font-black text-[11px] uppercase tracking-[0.15em] text-gray-400 mb-6 text-center">No matching students found</p>
                    <button onClick={() => { audio.playClick(); setShowManualModal(false); navigate('/admin/students'); }} className="flex items-center gap-2 bg-pink-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-pink-100 active:scale-95 transition-all hover:bg-pink-600">
                      <UserPlus2 size={16} /> + New Registration
                    </button>
                  </div>
                )}
                {!manualSearch && <div className="flex flex-col items-center justify-center py-10 opacity-20"><Search size={48} className="mb-2" /><p className="font-black text-[10px] uppercase tracking-widest">Start typing to search...</p></div>}
              </div>
              <button onClick={() => { audio.playClick(); setShowManualModal(false); }} className="w-full py-4 text-gray-400 font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 rounded-2xl transition-all">Close Search</button>
            </div>
          </div>
        </div>
      )}

      {/* Birthdays & Live Classrooms (Secondary stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Birthdays This Month */}
        {birthdays.length > 0 && (
          <div className="bg-[#FFF9E6] p-6 md:p-8 rounded-[2.5rem] border-2 border-dashed border-amber-200 shadow-sm relative overflow-hidden h-fit">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl animate-bounce">🎂</span>
                <h3 className="text-sm font-black text-amber-600 uppercase tracking-widest">Birthdays - {weeklyComparison?.monthName.toUpperCase()}</h3>
              </div>
              <div className="flex flex-wrap gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {birthdays.map((b, i) => (
                  <div key={b.id} className={`bg-white p-4 rounded-xl shadow-md border-b-4 border-amber-300 transform transition-transform w-32 shrink-0 hover:rotate-0 hover:scale-105 ${i % 2 === 0 ? 'rotate-1' : '-rotate-1'}`}>
                    <p className="text-[10px] font-black text-gray-800 uppercase leading-tight mb-2 truncate" title={b.fullName}>{getFirstName(b.fullName)}</p>
                    <div className="flex justify-between items-end">
                        <span className="text-[14px] font-black text-amber-500">{new Date(b.birthday).getDate()}</span>
                        <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">{b.ageGroup}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Classroom Summary Grid */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Live Classroom Pulse</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {classrooms.map((cls) => (
              <div key={cls.group} onClick={() => navigate(`/classrooms/${cls.group}`)} className="bg-white p-6 rounded-3xl border border-pink-50 shadow-sm hover:shadow-xl hover:shadow-pink-100/30 transition-all cursor-pointer group">
                <h4 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-4">{cls.group}</h4>
                <div className="flex flex-col gap-1">
                  <p className="text-[18px] font-black text-pink-500">{cls.present} <span className="text-[9px] text-gray-300">IN</span></p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total: {cls.total}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Sessions List */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Live Feed (Arrivals)</h3>
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-pink-50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-[9px] font-bold text-pink-400 uppercase tracking-widest border-b border-pink-50">
                  <th className="px-8 py-5">Student</th>
                  <th className="px-8 py-5">Group</th>
                  <th className="px-8 py-5">Arrival</th>
                  <th className="px-8 py-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50/50">
                {activeSessions.slice(0, 10).map((sess) => (
                  <tr key={sess.id} className="hover:bg-pink-50/20 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center text-pink-500 font-black text-[10px]">{sess.student?.fullName ? sess.student.fullName[0] : '?'}</div>
                        <span className="font-bold text-gray-800 uppercase tracking-tight text-xs truncate max-w-[150px]">{sess.student?.fullName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4"><span className="px-2 py-1 bg-gray-50 text-gray-400 text-[9px] font-black rounded uppercase">{sess.student?.ageGroup || 'N/A'}</span></td>
                    <td className="px-8 py-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{new Date(sess.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-8 py-4 text-right"><span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-600 text-[9px] font-black rounded-full uppercase"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>On-Site</span></td>
                  </tr>
                ))}
                {activeSessions.length === 0 && (
                  <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-400 italic text-[10px] font-black uppercase tracking-[0.2em]">Registry is currently clear.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #fcd34d; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
