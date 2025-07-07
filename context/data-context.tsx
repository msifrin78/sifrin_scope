
'use client';

import type { Class, DailyLog, Student } from '../lib/definitions';
import {
  classes as initialClasses,
  dailyLogs as initialLogs,
  students as initialStudents,
} from '../lib/data';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

// Helper to get data from localStorage
const getFromStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const item = window.localStorage.getItem(key);
  if (item === null || item === 'undefined') {
    return fallback;
  }
  try {
    return JSON.parse(item);
  } catch (e) {
    console.error(`Failed to parse ${key} from localStorage`, e);
    return fallback;
  }
};

// Helper to set data to localStorage
const setToStorage = <T>(key: string, value: T) => {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to set ${key} in localStorage`, e);
    }
  }
};

interface DataContextProps {
  classes: Class[];
  students: Student[];
  dailyLogs: DailyLog[];
  profilePicture: string | null;
  updateProfilePicture: (url: string | null) => Promise<void>;
  isDataLoaded: boolean;
  addClass: (newClass: Omit<Class, 'id'>) => Promise<void>;
  updateClass: (id: string, updatedData: Partial<Class>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  addStudent: (newStudent: Omit<Student, 'id'>) => Promise<void>;
  updateStudent: (id: string, updatedData: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  saveDailyLogs: (logsToSave: Record<string, Omit<DailyLog, 'id' | 'studentId' | 'date'>>, studentIds: string[], date: string) => Promise<void>;
  deleteStudentLogs: (studentId: string) => Promise<void>;
  deleteClassLogs: (classId: string) => Promise<void>;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    // Load initial data from localStorage or fallback to mock data
    setClasses(getFromStorage('classes', initialClasses));
    setStudents(getFromStorage('students', initialStudents));
    setDailyLogs(getFromStorage('dailyLogs', initialLogs));
    setProfilePicture(getFromStorage('profilePicture', null));
    setIsDataLoaded(true);
  }, []);

  const updateClasses = (newClasses: Class[]) => {
    setClasses(newClasses);
    setToStorage('classes', newClasses);
  }
  
  const updateStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    setToStorage('students', newStudents);
  }

  const updateDailyLogs = (newLogs: DailyLog[]) => {
    setDailyLogs(newLogs);
    setToStorage('dailyLogs', newLogs);
  }

  const updateProfilePicture = async (url: string | null) => {
    setProfilePicture(url);
    setToStorage('profilePicture', url);
  };
  
  const addClass = async (newClass: Omit<Class, 'id'>) => {
    const classWithId: Class = { ...newClass, id: `C${Date.now()}` };
    updateClasses([...classes, classWithId]);
  };

  const updateClass = async (id: string, updatedData: Partial<Class>) => {
    const updatedClasses = classes.map(c => c.id === id ? { ...c, ...updatedData } : c);
    updateClasses(updatedClasses);
  };

  const deleteClass = async (id: string) => {
    const studentsInClass = students.filter(s => s.classId === id).map(s => s.id);
    const remainingStudents = students.filter(s => s.classId !== id);
    const remainingLogs = dailyLogs.filter(l => !studentsInClass.includes(l.studentId));
    const remainingClasses = classes.filter(c => c.id !== id);

    updateClasses(remainingClasses);
    updateStudents(remainingStudents);
    updateDailyLogs(remainingLogs);
  };

  const addStudent = async (newStudent: Omit<Student, 'id'>) => {
    const studentWithId: Student = { ...newStudent, id: `S${Date.now()}` };
    updateStudents([...students, studentWithId]);
  };

  const updateStudent = async (id: string, updatedData: Partial<Student>) => {
    const updatedStudents = students.map(s => s.id === id ? { ...s, ...updatedData } : s);
    updateStudents(updatedStudents);
  };

  const deleteStudent = async (id: string) => {
    const updatedStudents = students.filter(s => s.id !== id);
    const updatedLogs = dailyLogs.filter(l => l.studentId !== id);
    
    updateStudents(updatedStudents);
    updateDailyLogs(updatedLogs);
  };

  const saveDailyLogs = async (logsToSave: Record<string, Omit<DailyLog, 'id' | 'studentId' | 'date'>>, studentIds: string[], date: string) => {
    const logsForOtherDays = dailyLogs.filter(l => l.date !== date);
    const logsForToday = dailyLogs.filter(l => l.date === date);

    const updatedLogsForToday = studentIds.map(studentId => {
      const logUpdates = logsToSave[studentId];
      const existingLog = logsForToday.find(l => l.studentId === studentId);
      
      if (logUpdates) {
        if (existingLog) {
          return { ...existingLog, ...logUpdates };
        }
        return {
          id: `L${Date.now()}-${studentId}`,
          studentId,
          date,
          ...logUpdates,
        };
      }
      return existingLog;
    }).filter((l): l is DailyLog => l !== undefined);
    
    updateDailyLogs([...logsForOtherDays, ...updatedLogsForToday]);
  };

  const deleteStudentLogs = async (studentId: string) => {
    const updatedLogs = dailyLogs.filter(l => l.studentId !== studentId);
    updateDailyLogs(updatedLogs);
  };
  
  const deleteClassLogs = async (classId: string) => {
    const studentsInClass = students.filter(s => s.classId === classId).map(s => s.id);
    const updatedLogs = dailyLogs.filter(l => !studentsInClass.includes(l.studentId));
    updateDailyLogs(updatedLogs);
  };

  return (
    <DataContext.Provider
      value={{
        classes,
        students,
        dailyLogs,
        profilePicture,
        updateProfilePicture,
        isDataLoaded,
        addClass,
        updateClass,
        deleteClass,
        addStudent,
        updateStudent,
        deleteStudent,
        saveDailyLogs,
        deleteStudentLogs,
        deleteClassLogs,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
