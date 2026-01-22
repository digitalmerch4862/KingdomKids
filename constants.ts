
import { PointRule, ActivitySchedule, AppSettings } from './types';

export const DEFAULT_POINT_RULES: Omit<PointRule, 'id'>[] = [
  { category: 'Attendance', points: 5, isActive: true },
  { category: 'Worksheet / Activities', points: 5, isActive: true },
  { category: 'Memory Verse', points: 10, isActive: true },
  { category: 'Recitation', points: 10, isActive: true },
  { category: 'Presentation', points: 20, isActive: true },
];

export const SUNDAY_ACTIVITY_SCHEDULE: Omit<ActivitySchedule, 'id'>[] = [
  { sundayIndex: 1, title: 'Bible Stories', isActive: true },
  { sundayIndex: 2, title: 'Memory Verse', isActive: true },
  { sundayIndex: 3, title: 'Games & Quiz', isActive: true },
  { sundayIndex: 4, title: 'Arts / Made by Tiny Hands', isActive: true },
  { sundayIndex: 5, title: 'Scripture Quest: A Fun Bible Quiz & Memory Verse Day', isActive: true },
];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'global-settings',
  matchThreshold: 0.78,
  autoCheckoutTime: '13:00',
  allowDuplicatePoints: false,
};

export const AUTH_PASSWORDS = {
  ADMIN: '6244',
  TEACHER: 'pro226',
  PARENTS: '123'
};
