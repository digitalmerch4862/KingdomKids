
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MinistryService, LeaderboardEntry } from '../services/ministry.service';
import { db } from '../services/db.service';
import { AgeGroup, UserSession } from '../types';
import { DEFAULT_POINT_RULES } from '../constants';
import { audio } from '../services/audio.service';

const ClassroomPage: React.FC = () => {
  const { group } = useParams<{ group: string }>();
  const navigate = useNavigate();
  const [roster, setRoster] = useState<LeaderboardEntry[]>([]);
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  
  // Award Points Modal State
  const [selectedStudent, setSelectedStudent] = useState<LeaderboardEntry | null>(null);
  const [manualPoints, setManualPoints] = useState(5);
  const [selectedCategory, setSelectedCategory] = useState('Manual Adjustment');
  const [isAwarding, setIsAwarding] = useState(false);
  const [awardError, setAwardError] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const sessionStr = localStorage.getItem('km_session');
  const user: UserSession | null = sessionStr ? JSON.parse(sessionStr) : null;

  const loadClassroom = async () => {
    setLoading(true);
    const lb = await MinistryService.getLeaderboard(group as AgeGroup);
    setRoster(lb);

    const sessions = await db.getAttendance();
    const today = new Date().toISOString().split('T')[0];
    const open = new Set(sessions.filter(s => s.sessionDate === today && s.status === 'OPEN').map(s => s.studentId));
    setActiveSessions(open);
    setLoading(false);
  };

  useEffect(() => {
    loadClassroom();
  }, [group]);

  const handleAwardPoints = async (category: string, points: number) => {
    if (!selectedStudent || !user) return;
    
    setIsAwarding(true);
    setAwardError('');
    audio.playClick();
    
    try {
      // Ensure points are not negative
      const safePoints = Math.max(0, points);
      
      await MinistryService.addPoints(
        selectedStudent.id,
        category,
        safePoints,
        user.username,
        `Point transaction in ${group} classroom`
      );
      
      audio.playYehey();

      setRoster(prev => prev.map(s => 
        s.id === selectedStudent.id 
          ? { ...s, totalPoints: s.totalPoints + safePoints } 
          : s
      ));
      
      setSelectedStudent(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err: any) {
      setAwardError(err.message || "Failed to update points.");
    } finally {
      setIsAwarding(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse uppercase font-black text-pink-300">Loading Classroom...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <div className="flex items-center gap-4">
        <button 
          onMouseEnter={() => audio.playHover()}
          onClick={() => { audio.playClick(); navigate(-1); }} 
          className="p-3 bg-white border border-pink-50 rounded-2xl hover:bg-pink-50 transition-all shadow-sm"
        >
          ←
        </button>
        <div>
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Classroom: {group} Years</h2>
          <p className="text-gray-400 font-medium uppercase tracking-widest text-[10px]">Roster and live activity</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-pink-50 overflow-hidden">
        <div className="p-8 border-b border-pink-50 flex justify-between items-center bg-gray-50/30">
          <h3 className="font-black text-gray-800 text-sm uppercase tracking-widest">Student Roster</h3>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{roster.length} Total Students</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-bold text-pink-400 uppercase tracking-widest border-b border-pink-50">
                <th className="px-8 py-5">Student Name</th>
                <th className="px-8 py-5">Face Status</th>
                <th className="px-8 py-5">Presence Today</th>
                <th className="px-8 py-5">Points</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50/50">
              {roster.map((student) => (
                <tr key={student.id} className="hover:bg-pink-50/20 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center text-pink-500 font-black text-xs border border-pink-100">
                        {student.fullName[0]}
                      </div>
                      <span className="font-bold text-gray-800 uppercase tracking-tight">{student.fullName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${student.isEnrolled ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                      {student.isEnrolled ? 'ENROLLED' : 'NO DATA'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    {activeSessions.has(student.id) ? (
                      <span className="flex items-center gap-2 text-green-600 text-[10px] font-black uppercase tracking-widest">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Present
                      </span>
                    ) : (
                      <span className="text-gray-300 text-[10px] font-bold uppercase tracking-widest">Absent</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-800">{student.totalPoints}</span>
                      <span className="text-[9px] text-pink-400 font-black">PTS</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right space-x-2">
                    <button 
                      onMouseEnter={() => audio.playHover()}
                      onClick={() => { 
                        audio.playClick();
                        setSelectedStudent(student); 
                        setManualPoints(5);
                        setSelectedCategory('Manual Adjustment');
                        setAwardError(''); 
                      }}
                      className="px-5 py-2.5 bg-pink-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-pink-100 hover:bg-pink-600 transition-all active:scale-95"
                    >
                      Update Points
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-pink-500 p-10 text-white relative">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Adjust Stars</h3>
              <p className="text-pink-100 text-[10px] font-black uppercase tracking-widest opacity-80">
                {selectedStudent.fullName}
              </p>
              <button 
                onClick={() => { audio.playClick(); setSelectedStudent(null); }} 
                className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors text-3xl font-black leading-none"
                disabled={isAwarding}
              >
                &times;
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              {/* Manual Adjustment Section */}
              <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 text-center space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Point Calculator</label>
                <div className="flex items-center justify-center gap-6">
                  <button 
                    onMouseEnter={() => audio.playHover()}
                    onClick={() => { audio.playClick(); setManualPoints(prev => Math.max(0, prev - 1)); }}
                    className="w-14 h-14 bg-white border-2 border-gray-100 rounded-2xl text-2xl font-black text-gray-400 hover:bg-gray-100 transition-all active:scale-90"
                  >
                    -
                  </button>
                  <div className="text-4xl font-black w-24 tabular-nums text-gray-800">
                    {manualPoints}
                  </div>
                  <button 
                    onMouseEnter={() => audio.playHover()}
                    onClick={() => { audio.playClick(); setManualPoints(prev => prev + 1); }}
                    className="w-14 h-14 bg-white border-2 border-green-100 rounded-2xl text-2xl font-black text-green-400 hover:bg-green-50 transition-all active:scale-90"
                  >
                    +
                  </button>
                </div>
                
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Reason for adjustment</p>
                  <select 
                    value={selectedCategory}
                    onChange={(e) => { audio.playClick(); setSelectedCategory(e.target.value); }}
                    className="w-full bg-white border border-gray-100 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-pink-100"
                  >
                    <option value="Manual Adjustment">Manual Addition</option>
                    {DEFAULT_POINT_RULES.map(r => <option key={r.category} value={r.category}>{r.category}</option>)}
                  </select>
                </div>

                <button 
                  onMouseEnter={() => audio.playHover()}
                  onClick={() => handleAwardPoints(selectedCategory, manualPoints)}
                  disabled={isAwarding || manualPoints === 0}
                  className="w-full py-4 font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl transition-all bg-pink-500 text-white shadow-pink-100 hover:bg-pink-600 disabled:opacity-50"
                >
                  {isAwarding ? 'PROCESSING...' : `ADD ${manualPoints} POINTS`}
                </button>
              </div>

              {/* Standard Quick Presets */}
              <div className="space-y-3">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] ml-2">Quick Standard Rules</p>
                <div className="grid grid-cols-1 gap-2">
                  {DEFAULT_POINT_RULES.map((rule, idx) => (
                    <button
                      key={idx}
                      onMouseEnter={() => audio.playHover()}
                      onClick={() => handleAwardPoints(rule.category, rule.points)}
                      disabled={isAwarding}
                      className="flex items-center justify-between px-6 py-3 bg-white border border-gray-100 rounded-2xl hover:border-pink-100 hover:bg-pink-50/30 group transition-all disabled:opacity-50"
                    >
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest group-hover:text-pink-500">{rule.category}</span>
                      <span className="font-black text-pink-400 text-xs">+{rule.points}</span>
                    </button>
                  ))}
                </div>
              </div>

              {awardError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center animate-in shake">
                  {awardError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSuccessToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] bg-gray-800 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <span className="text-xl">✨</span>
          <span className="text-xs font-black uppercase tracking-widest">Transaction Recorded Successfully</span>
        </div>
      )}
    </div>
  );
};

export default ClassroomPage;
