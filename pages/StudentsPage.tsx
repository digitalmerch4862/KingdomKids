
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, formatError } from '../services/db.service';
import { Student, AgeGroup, UserRole, UserSession } from '../types';
import { audio } from '../services/audio.service';

const StudentsPage: React.FC<{ user: UserSession }> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    birthday: '',
    guardianName: '',
    guardianPhone: '09',
    notes: '',
    photoUrl: ''
  });

  const isTeacherOrAdmin = user.role === 'TEACHER' || user.role === 'ADMIN';
  
  // Update: Allow any ADMIN to delete, removing the hardcoded username check
  const isSuperAdmin = user.role === 'ADMIN';

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = () => {
    db.getStudents()
      .then(setStudents)
      .catch(err => setErrorMsg(formatError(err)));
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.fullName.toLowerCase().includes(search.toLowerCase()) || 
      s.guardianName.toLowerCase().includes(search.toLowerCase()) ||
      s.accessKey.toLowerCase().includes(search.toLowerCase())
    );
  }, [students, search]);

  const ageData = useMemo(() => {
    if (!formData.birthday) return { age: 0, group: null, error: '' };
    
    const yearParts = formData.birthday.split('-');
    if (yearParts[0].length !== 4) {
      return { age: 0, group: null, error: 'Year must be exactly 4 digits (YYYY).' };
    }

    const birthDate = new Date(formData.birthday);
    if (isNaN(birthDate.getTime())) return { age: 0, group: null, error: 'Invalid Date.' };
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 3 || age > 12) {
      return { age, group: null, error: 'Student must be between 3 and 12 years old.' };
    }

    let group: AgeGroup = "3-6";
    if (age >= 7 && age <= 9) group = "7-9";
    else if (age >= 10 && age <= 12) group = "10-12";

    return { age, group, error: '' };
  }, [formData.birthday]);

  const handlePhoneChange = (val: string) => {
    let cleaned = val.replace(/\D/g, '');
    if (!cleaned.startsWith('09')) {
      cleaned = '09' + cleaned.replace(/^0+/, '');
    }
    setFormData({ ...formData, guardianPhone: cleaned });
  };

  const handleBirthdayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      const year = val.split('-')[0];
      // Prevent typing more than 4 digits for the year
      if (year.length > 4) return;
    }
    setFormData({ ...formData, birthday: val });
  };

  const resetForm = () => {
    setFormData({ fullName: '', birthday: '', guardianName: '', guardianPhone: '09', notes: '', photoUrl: '' });
    setEditingStudent(null);
    setIsSaving(false);
    isSavingRef.current = false;
    setErrorMsg('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isSavingRef.current) return;
    
    setIsSaving(true);
    isSavingRef.current = true;
    setErrorMsg('');
    audio.playClick();

    if (ageData.error) {
      setErrorMsg(ageData.error);
      setIsSaving(false);
      isSavingRef.current = false;
      return;
    }

    if (formData.guardianPhone.length < 11) {
      setErrorMsg("PLEASE ENTER A VALID 11-DIGIT MOBILE NUMBER STARTING WITH 09");
      setIsSaving(false);
      isSavingRef.current = false;
      return;
    }

    try {
      if (editingStudent) {
        await db.updateStudent(editingStudent.id, {
          fullName: formData.fullName.toUpperCase(),
          birthday: formData.birthday,
          guardianName: formData.guardianName.toUpperCase(),
          guardianPhone: formData.guardianPhone,
          notes: formData.notes,
          photoUrl: formData.photoUrl,
          ageGroup: ageData.group!
        });
      } else {
        await db.addStudent({
          fullName: formData.fullName.toUpperCase(),
          birthday: formData.birthday,
          guardianName: formData.guardianName.toUpperCase(),
          guardianPhone: formData.guardianPhone,
          notes: formData.notes,
          photoUrl: formData.photoUrl,
          ageGroup: ageData.group!
        });
      }
      loadStudents();
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(formatError(err));
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      fullName: student.fullName,
      birthday: student.birthday,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      notes: student.notes || '',
      photoUrl: student.photoUrl || ''
    });
    setErrorMsg('');
    setShowAddModal(true);
    audio.playClick();
  };

  const handleDeleteClick = async (student: Student) => {
    // Only allow if Super Admin
    if (!isSuperAdmin) {
      console.warn("Delete attempted by non-admin user");
      return;
    }
    
    audio.playClick();
    const confirmed = window.confirm(`DANGER: Are you absolutely sure you want to permanently delete ${student.fullName}? This action cannot be undone.`);
    
    if (confirmed) {
      try {
        setErrorMsg(`DELETING ${student.fullName.toUpperCase()}...`);
        await db.deleteStudent(student.id);
        
        await db.log({
          eventType: 'AUDIT_WIPE',
          actor: user.username,
          entityId: student.id,
          payload: { action: 'DELETE_STUDENT', studentName: student.fullName }
        });

        audio.playYehey();
        setErrorMsg('');
        setStudents(prev => prev.filter(s => s.id !== student.id));
      } catch (err: any) {
        console.error("Delete failed:", err);
        setErrorMsg(`DELETE FAILED: ${formatError(err)}`);
      }
    }
  };

  const downloadQrCode = async (accessKey: string, studentName: string) => {
    audio.playClick();
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${accessKey}`;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Kingdom_AccessKey_${studentName.replace(/\s+/g, '_')}_${accessKey}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Download failed", e);
      alert("Could not download QR code. Please try again.");
    }
  };

  const downloadAccessKeysCsv = () => {
    audio.playClick();
    if (students.length === 0) return alert("No students registered yet.");

    const headers = ["Full Name", "Age Group", "Access Key", "Guardian Name", "Contact No"];
    const rows = students.map(s => [
      s.fullName,
      s.ageGroup,
      s.accessKey,
      s.guardianName,
      s.guardianPhone
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Kingdom_Kids_Registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const maskPhone = (phone: string) => {
    if (phone.length < 11) return phone;
    return `${phone.substring(0, 4)}***${phone.substring(phone.length - 3)}`;
  };

  const generateSmsLink = (student: Student) => {
    const message = `Good day, this is ${user.username}, ${student.fullName}’s teacher. I need to speak with you urgently regarding your child. Please call me immediately. Thank you.`;
    return `sms:${student.guardianPhone}?body=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Student Registry</h2>
          <p className="text-gray-400 font-medium uppercase tracking-widest text-[12px]">Manage Kingdom Kids</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="NAME OR ACCESS KEY..." 
              className="pl-12 pr-6 py-3.5 bg-white border border-pink-50 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-pink-200 text-[12px] font-black tracking-tight uppercase w-64 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {isTeacherOrAdmin && (
            <div className="flex gap-2">
              <button 
                onMouseEnter={() => audio.playHover()}
                onClick={downloadAccessKeysCsv}
                className="bg-white text-pink-500 border border-pink-100 px-6 py-3.5 rounded-[1.25rem] font-black transition-all shadow-sm hover:bg-pink-50 uppercase tracking-widest text-[10px] flex items-center gap-2"
              >
                <span>📥</span> Download List
              </button>
              <button 
                onMouseEnter={() => audio.playHover()}
                onClick={() => { resetForm(); setShowAddModal(true); audio.playClick(); }}
                className="bg-pink-500 text-white px-8 py-3.5 rounded-[1.25rem] font-black transition-all shadow-xl shadow-pink-100 uppercase tracking-widest text-[12px]"
              >
                + Register
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className={`p-4 rounded-xl text-[11px] font-black uppercase tracking-widest text-center animate-in shake ${errorMsg.includes('DELETING') ? 'bg-pink-50 text-pink-500 animate-pulse' : 'bg-red-50 border border-red-100 text-red-600'}`}>
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredStudents.map(s => (
          <div key={s.id} className="bg-white p-7 rounded-[2.5rem] border border-pink-50 shadow-sm hover:shadow-xl hover:shadow-pink-100/30 transition-all group relative overflow-hidden">
            {isTeacherOrAdmin && (
              <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button 
                  onMouseEnter={() => audio.playHover()}
                  onClick={() => handleEditClick(s)}
                  className="w-12 h-12 bg-white border border-pink-100 text-pink-500 rounded-2xl flex items-center justify-center hover:bg-pink-500 hover:text-white transition-all shadow-md text-xl"
                  title="View Profile"
                >
                  👤
                </button>
                {isSuperAdmin && (
                  <button 
                    onMouseEnter={() => audio.playHover()}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteClick(s); }}
                    className="w-12 h-12 bg-white border border-red-100 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-md text-xl cursor-pointer"
                    title="DELETE RECORD"
                  >
                    🗑️
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-between items-start mb-6">
              <div className="text-left">
                <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest leading-none mb-1">Access Key</p>
                <p className="text-xs font-black text-gray-800 uppercase tracking-tight">{s.accessKey}</p>
              </div>
            </div>
            
            <h3 className="text-[18px] font-black text-gray-800 uppercase tracking-tighter mb-1 truncate">{s.fullName}</h3>
            <span className="inline-block px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[12px] font-black uppercase tracking-widest mb-6 border border-gray-100/50">{s.ageGroup} Group</span>
            
            <button 
               onClick={() => downloadQrCode(s.accessKey, s.fullName)}
               onMouseEnter={() => audio.playHover()}
               title="Click to Download Access QR"
               className="flex flex-col items-center justify-center p-3 bg-gray-50/50 rounded-2xl border border-pink-50 mb-6 w-full hover:bg-pink-50 transition-all group/qr relative overflow-hidden"
            >
               <img 
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${s.accessKey}`} 
                 alt="QR Code" 
                 className="w-20 h-20 opacity-80 group-hover/qr:scale-110 transition-transform"
               />
               <span className="text-[8px] font-black text-pink-400 uppercase tracking-widest mt-2 opacity-0 group-hover/qr:opacity-100 transition-opacity">Download Access QR</span>
            </button>

            <div className="space-y-4 pt-5 border-t border-pink-50/50">
              <div className="flex justify-between items-center text-[12px] font-black text-gray-400 uppercase tracking-widest">
                <span className="opacity-50">Contact</span>
                <span className="text-gray-700 tracking-tighter">{maskPhone(s.guardianPhone)}</span>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              {isTeacherOrAdmin && (
                <>
                  <a 
                    onMouseEnter={() => audio.playHover()}
                    onClick={() => audio.playClick()}
                    href={`tel:${s.guardianPhone}`} 
                    className="flex-1 h-14 bg-pink-50 hover:bg-pink-100 text-pink-500 rounded-[1.25rem] flex items-center justify-center transition-all font-black text-xs uppercase tracking-widest gap-2"
                    title="Call Guardian"
                  >
                    <span>📞</span> Call
                  </a>
                  <a 
                    onMouseEnter={() => audio.playHover()}
                    onClick={() => audio.playClick()}
                    href={generateSmsLink(s)} 
                    className="flex-1 h-14 bg-pink-500 hover:bg-pink-600 text-white rounded-[1.25rem] flex items-center justify-center transition-all shadow-lg shadow-pink-100 font-black text-xs uppercase tracking-widest gap-2"
                    title="Message Guardian"
                  >
                    <span>📩</span> SMS
                  </a>
                </>
              )}
            </div>
          </div>
        ))}
        {filteredStudents.length === 0 && (
          <div className="col-span-full py-24 bg-white rounded-[3rem] border border-pink-50 text-center space-y-4 shadow-sm">
            <span className="text-6xl block opacity-20">🔍</span>
            <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[12px]">No kingdom kids matched your criteria</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-pink-500 p-10 text-white relative">
              <h3 className="text-2xl font-black uppercase tracking-tighter">{editingStudent ? 'Student Profile' : 'New Registration'}</h3>
              <p className="text-pink-100 text-[12px] font-black uppercase tracking-widest opacity-80">
                {editingStudent ? `Access Key: ${editingStudent.accessKey}` : 'Register new kingdom kid'}
              </p>
              <button onClick={() => { setShowAddModal(false); audio.playClick(); }} className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors text-3xl font-black leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSave} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">Student Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="LAST NAME, FIRST NAME"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 transition-all uppercase font-bold text-gray-700 text-[12px]"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">Birthday</label>
                  <input 
                    type="date" 
                    required
                    max="9999-12-31"
                    className={`w-full px-6 py-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 transition-all font-bold text-gray-700 text-[12px] ${ageData.error ? 'border-red-300' : 'border-gray-100'}`}
                    value={formData.birthday}
                    onChange={handleBirthdayChange}
                  />
                  {ageData.error && <p className="text-red-500 text-[11px] font-bold mt-1 ml-1">{ageData.error}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">Age Group</label>
                  <div className={`w-full px-6 py-4 font-black border rounded-2xl text-[12px] flex items-center h-[50px] ${ageData.group ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>
                    {ageData.group || '---'}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">Guardian Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="PARENT OR GUARDIAN"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 transition-all uppercase font-bold text-gray-700 text-[12px]"
                  value={formData.guardianName}
                  onChange={e => setFormData({ ...formData, guardianName: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact No.</label>
                <input 
                  type="tel" 
                  required
                  maxLength={11}
                  placeholder="09XXXXXXXXX"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 transition-all font-bold text-gray-700 text-[12px]"
                  value={formData.guardianPhone}
                  onChange={e => handlePhoneChange(e.target.value)}
                />
              </div>

              <div className="pt-6 flex gap-4">
                <button 
                  type="button"
                  disabled={isSaving}
                  onMouseEnter={() => audio.playHover()}
                  onClick={() => { setShowAddModal(false); audio.playClick(); }}
                  className="flex-1 py-5 text-gray-400 font-black hover:bg-gray-50 rounded-2xl transition-all uppercase tracking-widest text-[12px]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving || !!ageData.error}
                  onMouseEnter={() => audio.playHover()}
                  className="flex-1 py-5 bg-pink-500 hover:bg-pink-600 text-white font-black rounded-2xl shadow-xl shadow-pink-100 transition-all uppercase tracking-widest text-[12px] disabled:opacity-50 disabled:bg-gray-300 disabled:shadow-none"
                >
                  {isSaving ? 'Saving...' : editingStudent ? 'Update Profile' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #fdf2f8;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #fbcfe8;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #f9a8d4;
        }
      `}</style>
    </div>
  );
};

export default StudentsPage;
