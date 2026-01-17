
import React, { useState, useEffect, useMemo } from 'react';
import { db, formatError } from '../services/db.service';
import { PointLedger, Student, UserSession } from '../types';
import { audio } from '../services/audio.service';

const PointsLedgerPage: React.FC<{ user: UserSession }> = ({ user }) => {
  const [ledger, setLedger] = useState<(PointLedger & { student?: Student })[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  const handleVoid = async (id: string) => {
    const reason = window.prompt("Enter reason for voiding these points:");
    if (reason === null) return;
    
    try {
      await db.voidPointEntry(id, reason || "Administrative reversal");
      await db.log({
        eventType: 'POINT_VOID',
        actor: user.username,
        entityId: id,
        payload: { reason }
      });
      loadLedger();
    } catch (err) {
      alert(formatError(err));
    }
  };

  const handleResetAll = async () => {
    if (!isAdmin) return;
    
    audio.playClick();
    const confirmed = window.confirm("DANGER: Are you sure you want to permanently delete ALL point records? This will set every student's total stars to 0.");
    
    if (confirmed) {
      const secondCheck = window.confirm("Final confirmation: This action is irreversible. Proceed with Wiping All Points?");
      if (!secondCheck) return;

      setIsResetting(true);
      try {
        await db.runRawSql("DELETE FROM point_ledger;");
        await db.log({
          eventType: 'AUDIT_WIPE',
          actor: user.username,
          payload: { action: 'WIPE_ALL_POINTS' }
        });
        audio.playYehey();
        alert("ALL POINTS HAVE BEEN RESET TO ZERO.");
        loadLedger();
      } catch (err) {
        alert("Reset failed: " + formatError(err));
      } finally {
        setIsResetting(false);
      }
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Points Ledger</h2>
          <p className="text-gray-400 font-medium uppercase tracking-widest text-[10px]">Audit trail of all stars awarded</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <input 
            type="text" 
            placeholder="SEARCH BY STUDENT OR CATEGORY..." 
            className="px-6 py-3.5 bg-white border border-pink-50 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-pink-200 text-[10px] font-black tracking-tight uppercase w-full md:w-80 shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isAdmin && (
            <button
              onMouseEnter={() => audio.playHover()}
              onClick={handleResetAll}
              disabled={isResetting}
              className="px-6 py-3.5 bg-white text-red-500 border border-red-100 rounded-[1.25rem] font-black transition-all shadow-sm hover:bg-red-50 uppercase tracking-widest text-[10px] flex items-center gap-2"
            >
              {isResetting ? 'WIPING...' : '⚠️ Reset All Stars'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-pink-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-bold text-pink-400 uppercase tracking-widest border-b border-pink-50">
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Student</th>
                <th className="px-8 py-5">Category</th>
                <th className="px-8 py-5">Points</th>
                <th className="px-8 py-5">Recorded By</th>
                <th className="px-8 py-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50/50">
              {filtered.map((entry) => {
                const isNegative = entry.points < 0;
                return (
                  <tr key={entry.id} className={`hover:bg-pink-50/20 transition-colors ${entry.voided ? 'opacity-40 grayscale' : ''}`}>
                    <td className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase">{entry.entryDate}</td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className={`font-black uppercase tracking-tight text-xs ${isNegative ? 'text-gray-300 italic' : 'text-gray-800'}`}>
                          {isNegative ? '---' : (entry.student?.fullName || 'Deleted Student')}
                        </span>
                        {!isNegative && (
                          <span className="text-[9px] font-bold text-gray-400 uppercase">{entry.student?.ageGroup} Group</span>
                        )}
                        {isNegative && (
                          <span className="text-[8px] font-bold text-pink-300 uppercase tracking-tighter">Deduction (Anonymized)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-gray-500 uppercase tracking-wide">{entry.category}</td>
                    <td className="px-8 py-6">
                      <span className={`font-black text-sm ${entry.voided ? 'line-through' : (isNegative ? 'text-gray-400' : 'text-pink-500')}`}>
                        {Math.abs(entry.points)}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-[10px] text-gray-400 font-black uppercase">{entry.recordedBy}</td>
                    <td className="px-8 py-6 text-right">
                      {entry.voided ? (
                        <span className="px-3 py-1 bg-red-50 text-red-500 text-[9px] font-black rounded-full uppercase" title={entry.voidReason || ''}>
                          VOIDED
                        </span>
                      ) : (
                        isAdmin && (
                          <button 
                            onClick={() => handleVoid(entry.id)}
                            className="text-[9px] font-black text-gray-300 hover:text-red-500 uppercase tracking-widest transition-colors"
                          >
                            [ VOID ]
                          </button>
                        )
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
