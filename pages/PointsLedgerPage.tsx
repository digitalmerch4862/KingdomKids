
import React, { useState, useEffect, useMemo } from 'react';
import { db, formatError } from '../services/db.service';
import { PointLedger, Student, UserSession } from '../types';
import { audio } from '../services/audio.service';
import { TriangleAlert, CheckCircle, Ban } from 'lucide-react';

const PointsLedgerPage: React.FC<{ user: UserSession }> = ({ user }) => {
  const [ledger, setLedger] = useState<(PointLedger & { student?: Student })[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const isAdmin = user.role === 'ADMIN';

  const loadLedger = async () => {
    setLoading(true);
    try {
      const allEntries = await db.getPointsLedger();
      const students = await db.getStudents();
      const enriched = allEntries.map(entry => ({
        ...entry,
        student: students.find(s => s.id === entry.studentId)
      }));
      setLedger(enriched);
    } catch (err) {
      console.error(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  const handleVoid = async (id: string) => {
    audio.playClick();
    const reason = window.prompt("Enter reason for voiding these points:");
    if (reason === null) return;
    
    try {
      await db.voidPointEntry(id, reason || "Administrative reversal");
      loadLedger();
    } catch (err) {
      alert(formatError(err));
    }
  };

  const handleResetSeason = async () => {
    audio.playClick();
    
    // Step 1: Confirmation
    if (!window.confirm("⚠️ ARE YOU SURE?\n\nThis will reset ALL student points to 0 for the new season.\nThis action archives existing points and cannot be undone.")) {
      return;
    }

    setIsResetting(true);
    try {
      // Step 2: Perform Batch Update (Soft Reset)
      await db.resetSeason(user.username);
      
      // Step 3: Toast / Alert
      audio.playYehey();
      alert("✅ All student points have been reset to 0.");
      loadLedger();
    } catch (err) {
      alert("Reset failed: " + formatError(err));
    } finally {
      setIsResetting(false);
    }
  };

  const filtered = useMemo(() => {
    return ledger.filter(l => 
      l.student?.fullName.toLowerCase().includes(search.toLowerCase()) ||
      l.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [ledger, search]);

  if (loading && !isResetting) return <div className="p-10 text-center animate-pulse font-black text-pink-300 uppercase">Loading Ledger...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">POINTS LEDGER</h2>
          <p className="text-gray-400 font-medium uppercase tracking-widest text-[10px] mt-1">AUDIT TRAIL OF ALL STARS AWARDED</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
             <input 
              type="text" 
              placeholder="SEARCH BY STUDENT OR CATEGORY..." 
              className="pl-10 px-6 py-3.5 bg-white border border-pink-50 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-pink-200 text-[10px] font-black tracking-tight uppercase w-full md:w-80 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* Specific Reset Button as requested */}
          {isAdmin && (
            <button
              onMouseEnter={() => audio.playHover()}
              onClick={handleResetSeason}
              disabled={isResetting}
              className="px-6 py-3.5 bg-white text-red-500 border border-red-200 hover:bg-red-50 rounded-[1.25rem] font-black transition-all shadow-sm uppercase tracking-widest text-[10px] flex items-center gap-2 group"
            >
              <TriangleAlert className="w-4 h-4 group-hover:scale-110 transition-transform" />
              {isResetting ? 'RESETTING...' : 'RESET ALL STARS'}
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-pink-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/20 text-[10px] font-bold text-pink-400 uppercase tracking-widest border-b border-pink-50">
                <th className="px-8 py-6">Date</th>
                <th className="px-8 py-6">Student</th>
                <th className="px-8 py-6">Category</th>
                <th className="px-8 py-6">Points</th>
                <th className="px-8 py-6">Recorded By</th>
                <th className="px-8 py-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50/30">
              {filtered.map((entry) => {
                const isNegative = entry.points < 0;
                
                return (
                  <tr key={entry.id} className={`hover:bg-pink-50/20 transition-colors ${entry.voided ? 'opacity-40 bg-gray-50/50' : ''}`}>
                    {/* Date */}
                    <td className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {entry.entryDate}
                    </td>
                    
                    {/* Student */}
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className={`font-black uppercase tracking-tight text-xs ${isNegative ? 'text-gray-300 italic' : 'text-gray-800'}`}>
                          {entry.student?.fullName || '---'}
                        </span>
                        {!isNegative && entry.student && (
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            {entry.student.ageGroup} GROUP
                          </span>
                        )}
                        {isNegative && (
                          <span className="text-[8px] font-bold text-pink-300 uppercase tracking-tighter">
                            DEDUCTION (ANONYMIZED)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                      {entry.category}
                    </td>

                    {/* Points */}
                    <td className="px-8 py-6">
                      <span className={`font-black text-sm ${entry.voided ? 'line-through text-gray-300' : (isNegative ? 'text-gray-400' : 'text-pink-500')}`}>
                        {Math.abs(entry.points)}
                      </span>
                    </td>

                    {/* Recorded By */}
                    <td className="px-8 py-6 text-[10px] text-gray-400 font-black uppercase tracking-wider">
                      {entry.recordedBy}
                    </td>

                    {/* Status */}
                    <td className="px-8 py-6 text-right">
                      {entry.voided ? (
                        <div className="flex items-center justify-end gap-1 text-gray-300">
                          <Ban className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-widest">
                            [ VOID ]
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                           {isAdmin && (
                            <button 
                                onClick={() => handleVoid(entry.id)}
                                className="text-[9px] font-black text-gray-300 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1"
                            >
                                <span className="text-xs">🗑️</span> VOID
                            </button>
                           )}
                           <div className="flex items-center gap-1 text-green-500">
                              <CheckCircle className="w-3 h-3" />
                              <span className="text-[9px] font-black uppercase tracking-widest">[ VALID ]</span>
                           </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-gray-300 italic font-black text-[10px] uppercase tracking-[0.2em]">
                    No ledger entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PointsLedgerPage;
