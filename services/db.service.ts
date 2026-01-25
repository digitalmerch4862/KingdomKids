
import { Student, FaceEmbedding, AttendanceSession, PointLedger, AuditLog, AppSettings, PointRule, ActivitySchedule, AgeGroup, Assignment } from '../types';
import { supabase } from './supabase';

export const formatError = (err: any): string => {
  if (!err) return "Unknown error occurred";
  if (typeof err === 'string') return err;
  if (err.message && typeof err.message === 'string') {
    let msg = err.message;
    if (err.details) msg += ` (${err.details})`;
    if (err.hint) msg += ` - Hint: ${err.hint}`;
    return msg;
  }
  if (err instanceof Error) return err.message;
  try {
    const stringified = JSON.stringify(err);
    return stringified === '{}' ? String(err) : stringified;
  } catch {
    return String(err);
  }
};

class DatabaseService {
  public calculateAge(birthday: string | null): number {
    if (!birthday) return 0;
    const birthDate = new Date(birthday);
    if (isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  async runRawSql(query: string): Promise<any[]> {
    const { data, error } = await supabase.rpc('exec_sql', { query_text: query });
    if (error) throw new Error(formatError(error));
    return data || [];
  }

  async getStudents(): Promise<Student[]> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('full_name', { ascending: true });
    
    if (error) throw new Error(formatError(error));

    return (data || []).map(s => ({
      id: s.id,
      accessKey: s.access_key,
      fullName: s.full_name,
      birthday: s.birthday || '',
      ageGroup: s.age_group,
      guardianName: s.guardian_name || '',
      guardianPhone: s.guardian_phone || '',
      photoUrl: s.photo_url,
      isEnrolled: s.is_enrolled,
      notes: s.notes,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      consecutiveAbsences: s.consecutive_absences || 0,
      studentStatus: s.student_status || 'active',
      lastFollowupSent: s.last_followup_sent,
      guardianNickname: s.guardian_nickname
    }));
  }

  async getStudentById(id: string): Promise<Student | null> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return {
      id: data.id,
      accessKey: data.access_key,
      fullName: data.full_name,
      birthday: data.birthday || '',
      ageGroup: data.age_group,
      guardianName: data.guardian_name || '',
      guardianPhone: data.guardian_phone || '',
      photoUrl: data.photo_url,
      isEnrolled: data.is_enrolled,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      consecutiveAbsences: data.consecutive_absences || 0,
      studentStatus: data.student_status || 'active',
      lastFollowupSent: data.last_followup_sent,
      guardianNickname: data.guardian_nickname
    };
  }

  /**
   * Resilient student lookup by Access Key.
   * Handles format variations (dashes, casing, spaces).
   */
  async getStudentByNo(accessKey: string): Promise<Student | null> {
    const cleanKey = accessKey.trim().toUpperCase();
    if (!cleanKey) return null;

    // Strategy 1: Case-insensitive direct match (Handles KK-YYYYMMDD-SS)
    let { data, error } = await supabase
      .from('students')
      .select('*')
      .ilike('access_key', cleanKey)
      .limit(1)
      .maybeSingle();
    
    // Strategy 2: Fallback to dash-less comparison if Strategy 1 fails
    if (!data && !error) {
      const normalizedKey = cleanKey.replace(/[^A-Z0-9]/g, ''); // Keep only letters and numbers
      
      // We use raw SQL to compare stripped versions of the keys
      try {
        const rawResults = await this.runRawSql(
          `SELECT * FROM students WHERE UPPER(REPLACE(REPLACE(access_key, '-', ''), ' ', '')) = '${normalizedKey}' LIMIT 1`
        );
        if (rawResults && rawResults.length > 0) {
          data = rawResults[0];
        }
      } catch (e) {
        console.warn("Normalized fallback search failed:", e);
      }
    }

    if (!data) return null;

    return {
      id: data.id,
      accessKey: data.access_key,
      fullName: data.full_name,
      birthday: data.birthday || '',
      ageGroup: data.age_group,
      guardianName: data.guardian_name || '',
      guardianPhone: data.guardian_phone || '',
      photoUrl: data.photo_url,
      isEnrolled: data.is_enrolled,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      consecutiveAbsences: data.consecutive_absences || 0,
      studentStatus: data.student_status || 'active',
      lastFollowupSent: data.last_followup_sent,
      guardianNickname: data.guardian_nickname
    };
  }

  async getAssignments(): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(formatError(error));
    return (data || []).map(a => ({
      id: a.id,
      teacherName: a.teacher_name,
      title: a.title,
      deadline: a.deadline,
      taskDetails: a.task_details,
      ageGroup: a.age_group,
      createdAt: a.created_at
    }));
  }

  async addAssignment(data: Omit<Assignment, 'id' | 'createdAt'>) {
    const { data: result, error } = await supabase
      .from('assignments')
      .insert([{
        teacher_name: data.teacherName,
        title: data.title,
        deadline: data.deadline,
        task_details: data.taskDetails,
        age_group: data.ageGroup
      }])
      .select()
      .single();

    if (error) throw new Error(formatError(error));
    return result;
  }

  async deleteAssignment(id: string) {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) throw new Error(formatError(error));
  }

  async getBirthdaysThisWeek(): Promise<Student[]> {
    try {
      const students = await this.getStudents();
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - today.getDay()));

      return students.filter(s => {
        if (!s.birthday) return false;
        const bday = new Date(s.birthday);
        const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        return thisYearBday >= startOfWeek && thisYearBday <= endOfWeek;
      });
    } catch (e) {
      return [];
    }
  }

  async getBirthdaysThisMonth(): Promise<Student[]> {
    try {
      const students = await this.getStudents();
      const today = new Date();
      const currentMonth = today.getMonth();

      return students.filter(s => {
        if (!s.birthday) return false;
        const bday = new Date(s.birthday);
        return bday.getMonth() === currentMonth;
      }).sort((a, b) => {
        const dateA = new Date(a.birthday).getDate();
        const dateB = new Date(b.birthday).getDate();
        return dateA - dateB;
      });
    } catch (e) {
      return [];
    }
  }

  async addStudent(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'isEnrolled' | 'accessKey' | 'consecutiveAbsences' | 'studentStatus'>) {
    let accessKey = '';
    
    if (data.birthday) {
      const yyyymmdd = data.birthday.replace(/-/g, '');
      const { count, error: countError } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('birthday', data.birthday);
        
      if (countError) throw new Error("Failed to check birthday sequence: " + countError.message);
      
      const sequence = (count || 0) + 1;
      const paddedSequence = sequence.toString().padStart(2, '0');
      accessKey = `KK-${yyyymmdd}-${paddedSequence}`;
    } else {
      const now = new Date();
      const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.floor(Math.random() * 99).toString().padStart(2, '0');
      accessKey = `KK-${yyyymmdd}-${random}`;
    }

    const { data: result, error } = await supabase
      .from('students')
      .insert([{
        access_key: accessKey,
        full_name: data.fullName,
        birthday: data.birthday || null,
        age_group: data.ageGroup,
        // Fix: Use correct camelCase property names from the Student data object
        guardian_name: data.guardianName || null,
        guardian_phone: data.guardianPhone || null,
        photo_url: data.photoUrl,
        notes: data.notes,
        is_enrolled: false,
        consecutive_absences: 0,
        student_status: 'active'
      }])
      .select()
      .single();

    if (error) throw new Error(formatError(error));
    return result;
  }

  async updateStudent(id: string, updates: Partial<Student>) {
    const payload: any = {};
    if (updates.fullName) payload.full_name = updates.fullName;
    if (updates.birthday !== undefined) payload.birthday = updates.birthday || null;
    if (updates.ageGroup) payload.age_group = updates.ageGroup;
    if (updates.guardianName !== undefined) payload.guardian_name = updates.guardianName || null;
    if (updates.guardianPhone !== undefined) payload.guardian_phone = updates.guardianPhone || null;
    if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl;
    if (updates.isEnrolled !== undefined) payload.is_enrolled = updates.isEnrolled;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.consecutiveAbsences !== undefined) payload.consecutive_absences = updates.consecutiveAbsences;
    if (updates.studentStatus !== undefined) payload.student_status = updates.studentStatus;
    if (updates.lastFollowupSent !== undefined) payload.last_followup_sent = updates.lastFollowupSent;
    if (updates.guardianNickname !== undefined) payload.guardian_nickname = updates.guardianNickname;
    if (updates.accessKey !== undefined) payload.access_key = updates.accessKey;
    
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase.from('students').update(payload).eq('id', id);
    if (error) throw new Error(formatError(error));
  }

  async deleteStudent(id: string) {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw new Error(formatError(error));
  }

  async resetStudentAbsences(studentId: string) {
    const { error } = await supabase
      .from('students')
      .update({ 
        consecutive_absences: 0, 
        student_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId);
    
    if (error) console.error("Failed to reset absences:", formatError(error));
  }

  async recordFollowUp(studentId: string, actor: string) {
    await this.updateStudent(studentId, { lastFollowupSent: new Date().toISOString() });
    await this.log({
      eventType: 'FOLLOWUP_SENT',
      actor,
      entityId: studentId,
      payload: { timestamp: new Date().toISOString() }
    });
  }

  async getAttendanceLogs(): Promise<AttendanceSession[]> {
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select('*')
      .order('check_in_time', { ascending: false });
    
    if (error) throw new Error(formatError(error));

    return (data || []).map(s => ({
      id: s.id,
      studentId: s.student_id,
      sessionDate: s.session_date,
      checkInTime: s.check_in_time,
      checkOutTime: s.check_out_time,
      // Fix: map checkout_mode database column to checkoutMode property
      checkoutMode: s.checkout_mode,
      checkedInBy: s.checked_in_by,
      checkedOutBy: s.checked_out_by,
      status: s.status,
      createdAt: s.created_at
    }));
  }

  getAttendance() {
    return this.getAttendanceLogs();
  }

  async addSession(data: Omit<AttendanceSession, 'id' | 'createdAt'>) {
    const { data: result, error } = await supabase
      .from('attendance_sessions')
      .insert([{
        student_id: data.studentId,
        session_date: data.sessionDate,
        check_in_time: data.checkInTime,
        // Fix: Use checkedInBy property name from data object instead of checked_in_by
        checked_in_by: data.checkedInBy,
        status: data.status
      }])
      .select()
      .single();

    if (error) throw new Error(formatError(error));
    return result;
  }

  async updateSession(id: string, updates: Partial<AttendanceSession>) {
    const payload: any = {};
    if (updates.checkOutTime) payload.check_out_time = updates.checkOutTime;
    if (updates.checkoutMode) payload.checkout_mode = updates.checkoutMode;
    if (updates.status) payload.status = updates.status;
    if (updates.checkedOutBy) payload.checked_out_by = updates.checkedOutBy;

    const { error } = await supabase.from('attendance_sessions').update(payload).eq('id', id);
    if (error) throw new Error(formatError(error));
  }

  async getPointsLedger(): Promise<PointLedger[]> {
    const { data, error } = await supabase
      .from('point_ledger')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(formatError(error));

    return (data || []).map(l => ({
      id: l.id,
      studentId: l.student_id,
      entryDate: l.entry_date,
      category: l.category,
      points: l.points,
      notes: l.notes,
      recordedBy: l.recorded_by,
      voided: l.voided,
      voidReason: l.void_reason,
      createdAt: l.created_at
    }));
  }

  async getStudentLedger(studentId: string, limit = 5): Promise<PointLedger[]> {
    const { data, error } = await supabase
      .from('point_ledger')
      .select('*')
      .eq('student_id', studentId)
      .eq('voided', false)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw new Error(formatError(error));

    return (data || []).map(l => ({
      id: l.id,
      studentId: l.student_id,
      entryDate: l.entry_date,
      category: l.category,
      points: l.points,
      notes: l.notes,
      recordedBy: l.recorded_by,
      voided: l.voided,
      voidReason: l.void_reason,
      createdAt: l.created_at
    }));
  }

  async getFairnessData(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('point_ledger')
      .select(`
        *,
        students (
          id, full_name, age_group
        )
      `)
      .eq('voided', false)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate);
    
    if (error) throw new Error(formatError(error));
    
    return (data || []).map((row: any) => ({
      ...row,
      recordedBy: row.recorded_by,
      entryDate: row.entry_date,
      student: row.students ? {
        id: row.students.id,
        fullName: row.students.full_name,
        ageGroup: row.students.age_group
      } : null
    }));
  }

  async addPointEntry(data: Omit<PointLedger, 'id' | 'createdAt' | 'voided'>) {
    const { data: result, error } = await supabase
      .from('point_ledger')
      .insert([{
        student_id: data.studentId,
        entry_date: data.entryDate,
        category: data.category,
        points: data.points,
        notes: data.notes,
        // Fix: Use recordedBy property name from data object
        recorded_by: data.recordedBy,
        voided: false
      }])
      .select()
      .single();

    if (error) throw new Error(formatError(error));
    return result;
  }

  async voidPointEntry(id: string, reason: string) {
    const { error } = await supabase.from('point_ledger').update({ voided: true, void_reason: reason }).eq('id', id);
    if (error) throw new Error(formatError(error));
  }

  async resetSeason(actor: string) {
    const { error: voidError } = await supabase
      .from('point_ledger')
      .update({ 
        voided: true, 
        void_reason: 'SEASON RESET: POINTS ARCHIVED' 
      })
      .eq('voided', false);

    if (voidError) throw new Error(formatError(voidError));

    await this.log({
      eventType: 'AUDIT_WIPE',
      actor,
      payload: { action: 'SEASON_RESET', timestamp: new Date().toISOString() }
    });
    
    return true;
  }

  async log(entry: Omit<AuditLog, 'id' | 'createdAt'>) {
    const { error } = await supabase.from('audit_log').insert([{
      event_type: entry.eventType,
      actor: entry.actor,
      entity_id: entry.entityId,
      payload: entry.payload
    }]);
    if (error) console.error("Audit log failed:", formatError(error));
  }

  async getLogs(): Promise<AuditLog[]> {
    const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(formatError(error));
    return (data || []).map(l => ({
      id: l.id,
      eventType: l.event_type,
      actor: l.actor,
      entityId: l.entity_id,
      payload: l.payload,
      createdAt: l.created_at
    }));
  }

  async getSettings(): Promise<AppSettings> {
    const { data, error } = await supabase.from('app_settings').select('*').single();
    if (error) {
      return { id: 'default', matchThreshold: 0.78, autoCheckoutTime: '13:00', allowDuplicatePoints: false };
    }
    return {
      id: data.id,
      matchThreshold: data.match_threshold,
      autoCheckoutTime: data.auto_checkout_time,
      allowDuplicatePoints: data.allow_duplicate_points
    };
  }

  async updateSettings(updates: Partial<AppSettings>) {
    const current = await this.getSettings();
    const id = current.id === 'default' ? 'global-settings' : current.id;
    
    const payload: any = {};
    if (updates.matchThreshold !== undefined) payload.match_threshold = updates.matchThreshold;
    if (updates.autoCheckoutTime !== undefined) payload.auto_checkout_time = updates.autoCheckoutTime;
    if (updates.allowDuplicatePoints !== undefined) payload.allow_duplicate_points = updates.allowDuplicatePoints;

    const { error } = await supabase.from('app_settings').upsert({
      id: id,
      ...payload
    }, { onConflict: 'id' });

    if (error) throw new Error(formatError(error));
  }

  async getRules(): Promise<PointRule[]> {
    const { data, error } = await supabase.from('point_rules').select('*').eq('is_active', true);
    if (error) return [];
    return data || [];
  }

  async getSchedule(): Promise<ActivitySchedule[]> {
    const { data, error } = await supabase.from('activity_schedule').select('*').eq('is_active', true);
    if (error) return [];
    return (data || []).map(s => ({
      id: s.id,
      sundayIndex: s.sunday_index,
      title: s.title,
      isActive: s.is_active
    }));
  }

  async getEmbeddings(): Promise<FaceEmbedding[]> {
    const { data, error } = await supabase.from('face_embeddings').select('*');
    if (error) throw new Error(formatError(error));
    return (data || []).map(e => ({
      id: e.id,
      studentId: e.student_id,
      embedding: e.embedding,
      angle: e.angle,
      createdAt: e.created_at
    }));
  }

  async addEmbedding(data: Omit<FaceEmbedding, 'id' | 'createdAt'>) {
    const { data: result, error } = await supabase
      .from('face_embeddings')
      .insert([{
        student_id: data.studentId,
        embedding: data.embedding,
        angle: data.angle
      }])
      .select()
      .single();

    if (error) throw new Error(formatError(error));
    return result;
  }

  async getStoryHistory(studentId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('story_history')
      .select('topic')
      .eq('student_id', studentId);
    
    if (error) return [];
    return (data || []).map((row: any) => row.topic);
  }

  async addStoryHistory(studentId: string, topic: string) {
    const { error } = await supabase
      .from('story_history')
      .insert([{
        student_id: studentId,
        topic: topic
      }]);
    
    if (error) throw new Error(formatError(error));
  }
}

export const db = new DatabaseService();
