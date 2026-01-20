
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AUTH_PASSWORDS } from '../constants';
import { UserRole, AgeGroup } from '../types';
import { audio } from '../services/audio.service';
import { db, formatError } from '../services/db.service';

const getFirstName = (fullName: string) => {
  if (!fullName) return "Student";
  if (fullName.includes(',')) {
    const parts = fullName.split(',');
    return parts[1].trim().split(' ')[0];
  }
  return fullName.split(' ')[0];
};

interface LoginPageProps {
  onLogin: (role: UserRole, username: string, studentId?: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [role, setRole] = useState<'TEACHER' | 'PARENTS'>('PARENTS');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [regError, setRegError] = useState('');
  const [newAccessKey, setNewAccessKey] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    birthday: '',
    guardianName: '',
    guardianPhone: '09',
    notes: ''
  });

  useEffect(() => {
    // Keep splash visible for 3 seconds, then fade out
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 3000);

    // Remove from DOM after fade transition (approx 500ms)
    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 3500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    audio.playClick();

    if (!username) return setError('Username is required');

    if (role === 'TEACHER') {
      if (password === AUTH_PASSWORDS.ADMIN) {
        onLogin('ADMIN', username.toUpperCase());
      } else if (password === AUTH_PASSWORDS.TEACHER) {
        onLogin('TEACHER', username.toUpperCase());
      } else {
        setError('Invalid password for Teacher');
      }
    }
  };

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    audio.playClick();

    if (!accessKey) return setError('Access Key is required');

    setIsVerifying(true);
    try {
      const student = await db.getStudentByNo(accessKey);
      if (student) {
        // Use first name for the username in the session so sidebar/portal addresses them by first name
        onLogin('PARENTS', getFirstName(student.fullName).toUpperCase(), student.id);
      } else {
        setError('Invalid Access Key. Please check your registry.');
      }
    } catch (err) {
      setError('Verification failed. Try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Registration Logic
  const ageData = useMemo(() => {
    if (!formData.birthday) return { age: 0, group: null, error: '' };
    const yearParts = formData.birthday.split('-');
    if (yearParts[0].length !== 4) return { age: 0, group: null, error: 'Year must be exactly 4 digits.' };
    const birthDate = new Date(formData.birthday);
    if (isNaN(birthDate.getTime())) return { age: 0, group: null, error: 'Invalid Date.' };
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    if (age < 3 || age > 12) return { age, group: null, error: 'Age must be 3-12 years.' };
    let group: AgeGroup = "3-6";
    if (age >= 7 && age <= 9) group = "7-9";
    else if (age >= 10 && age <= 12) group = "10-12";
    return { age, group, error: '' };
  }, [formData.birthday]);

  const handlePhoneChange = (val: string) => {
    let cleaned = val.replace(/\D/g, '');
    if (!cleaned.startsWith('09')) cleaned = '09' + cleaned.replace(/^0+/, '');
    setFormData({ ...formData, guardianPhone: cleaned });
  };

  const handleBirthdayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      const year = val.split('-')[0];
      if (year.length > 4) return;
    }
    setFormData({ ...formData, birthday: val });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setRegError('');
    audio.playClick();

    if (ageData.error) {
      setRegError(ageData.error);
      setIsSaving(false);
      return;
    }
    if (formData.guardianPhone.length < 11) {
      setRegError("Phone must be 11 digits starting with 09.");
      setIsSaving(false);
      return;
    }

    try {
      const result = await db.addStudent({
        fullName: formData.fullName.toUpperCase(),
        birthday: formData.birthday,
        guardianName: formData.guardianName.toUpperCase(),
        guardianPhone: formData.guardianPhone,
        notes: formData.notes,
        ageGroup: ageData.group!
      });
      
      const firstName = getFirstName(formData.fullName).toUpperCase();
      const studentNo = result.access_key;
      const smsMsg = `Welcome to Kingdom Kids! ${firstName}'s registration is complete. Access Key: ${studentNo}. Please save this for check-in and portal access.`;
      
      window.location.href = `sms:${formData.guardianPhone}?body=${encodeURIComponent(smsMsg)}`;
      
      audio.playYehey();
      setNewAccessKey(studentNo);
    } catch (err: any) {
      setRegError(formatError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const resetRegForm = () => {
    setFormData({ fullName: '', birthday: '', guardianName: '', guardianPhone: '09', notes: '' });
    setShowRegisterModal(false);
    setNewAccessKey(null);
    setRegError('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#fdf2f8] relative">
      {/* Splash Screen */}
      {showSplash && (
        <div 
          className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}
        >
          {!imgError ? (
            <img 
              src="https://drive.google.com/uc?export=view&id=1KTIuQbowa4-0i-1pCGXSmD86mRj7nUNM" 
              alt="Kingdom Kids Logo"
              className="w-48 h-48 md:w-64 md:h-64 object-contain rounded-full mb-8 animate-in zoom-in duration-700"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-pink-50 border-8 border-pink-100 flex items-center justify-center mb-8 shadow-2xl animate-in zoom-in duration-700">
              <span className="text-pink-400 font-black text-xl uppercase tracking-widest">Logo Here</span>
            </div>
          )}
          
          <div className="flex gap-2 items-center animate-in slide-in-from-bottom-4 fade-in duration-700 delay-300">
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-150"></div>
          </div>
        </div>
      )}

      <div className="max-w-md w-full">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-pink-200/50 border border-pink-50 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-16 h-16 bg-pink-500 rounded-[1.5rem] flex items-center justify-center text-white font-black text-3xl mx-auto mb-6 shadow-lg shadow-pink-100">K</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2 uppercase tracking-tighter">Kingdom Kids</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-8">Access Portal</p>
          
          <div className="flex bg-gray-50 p-1 rounded-2xl mb-8">
            <button 
              type="button"
              onMouseEnter={() => audio.playHover()}
              className={`flex-1 py-3 rounded-xl text-xs font-black transition-all tracking-widest uppercase ${role === 'PARENTS' ? 'bg-pink-500 text-white shadow-lg' : 'text-gray-400'}`}
              onClick={() => { audio.playClick(); setRole('PARENTS'); }}
            >
              Parents/Student
            </button>
            <button 
              type="button"
              onMouseEnter={() => audio.playHover()}
              className={`flex-1 py-3 rounded-xl text-xs font-black transition-all tracking-widest uppercase ${role === 'TEACHER' ? 'bg-pink-500 text-white shadow-lg' : 'text-gray-400'}`}
              onClick={() => { audio.playClick(); setRole('TEACHER'); }}
            >
              Teacher
            </button>
          </div>

          {role === 'TEACHER' ? (
            <form onSubmit={handleSubmit} className="space-y-5 text-left animate-in fade-in duration-300">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 transition-all uppercase font-bold text-gray-700 placeholder:text-gray-200"
                  value={username}
                  onChange={e => setUsername(e.target.value.toUpperCase())}
                  placeholder="ENTER YOUR NAME"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                <input 
                  type="password" 
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 transition-all font-bold text-gray-700"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              
              {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center mt-2">{error}</p>}

              <button 
                type="submit"
                onMouseEnter={() => audio.playHover()}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-pink-100 uppercase tracking-widest text-xs mt-6 active:scale-[0.98]"
              >
                Login to Portal
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleParentLogin} className="space-y-5 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-center">Access Key</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-pink-300 transition-all uppercase font-black text-gray-700 placeholder:text-gray-300 text-center tracking-widest"
                    value={accessKey}
                    onChange={e => setAccessKey(e.target.value.toUpperCase())}
                    placeholder="KK-####-###"
                  />
                </div>

                {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center mt-2">{error}</p>}

                <button 
                  type="submit"
                  disabled={isVerifying}
                  onMouseEnter={() => audio.playHover()}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-pink-100 uppercase tracking-widest text-xs mt-4 active:scale-[0.98] disabled:opacity-50"
                >
                  {isVerifying ? 'VERIFYING...' : 'ENTER KINGDOM DASHBOARD'}
                </button>
              </form>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink mx-4 text-[8px] font-black text-gray-300 uppercase tracking-widest">OR</span>
                <div className="flex-grow border-t border-gray-100"></div>
              </div>

              <button 
                onClick={() => { audio.playClick(); setShowRegisterModal(true); }}
                onMouseEnter={() => audio.playHover()}
                className="w-full py-4 text-pink-500 font-black text-[11px] uppercase tracking-widest hover:bg-pink-50 rounded-2xl transition-all border border-pink-100 border-dashed"
              >
                ✨ Sign Up My Kids
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-pink-500 p-10 text-white relative">
              <h3 className="text-2xl font-black uppercase tracking-tighter">New Registration</h3>
              <p className="text-pink-100 text-[12px] font-black uppercase tracking-widest opacity-80">
                Join the Kingdom Kids family
              </p>
              {!newAccessKey && (
                <button onClick={resetRegForm} className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors text-3xl font-black leading-none">&times;</button>
              )}
            </div>

            <div className="p-10">
              {newAccessKey ? (
                <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-lg border-4 border-white">✓</div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Registration Success!</h4>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">A confirmation SMS has been sent to your contact.</p>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-4">Access Key:</p>
                    <div className="bg-pink-50 p-4 rounded-2xl border-2 border-dashed border-pink-200 inline-block">
                      <p className="text-2xl font-black text-pink-600 tracking-widest">{newAccessKey}</p>
                    </div>
                  </div>
                  <button 
                    onClick={resetRegForm}
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-pink-100 transition-all uppercase tracking-widest text-[12px]"
                  >
                    Return to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-6">
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

                  {regError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">{regError}</p>}

                  <div className="pt-4 flex gap-4">
                    <button 
                      type="button"
                      onClick={resetRegForm}
                      className="flex-1 py-5 text-gray-400 font-black hover:bg-gray-50 rounded-2xl transition-all uppercase tracking-widest text-[12px]"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSaving || !!ageData.error}
                      className="flex-1 py-5 bg-pink-500 hover:bg-pink-600 text-white font-black rounded-2xl shadow-xl shadow-pink-100 transition-all uppercase tracking-widest text-[12px] disabled:opacity-50"
                    >
                      {isSaving ? 'Processing...' : 'Confirm Sign Up'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
