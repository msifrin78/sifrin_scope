
'use client';

import type { Class, DailyLog, Student } from '../lib/definitions';
import { db } from '../lib/firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  useCallback,
} from 'react';
import { useToast } from '../hooks/use-toast';

// For simplicity, we'll use a hardcoded user ID. 
// In a real multi-user app, you would get this from Firebase Auth.
const USER_ID = 'main-user';

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
  const { toast } = useToast();

  // Unified error handler
  const handleError = useCallback((error: any, context: string) => {
    console.error(`Firestore error in ${context}:`, error);
    toast({
      title: 'Error',
      description: `An error occurred. Please check the console for details.`,
      variant: 'destructive',
    });
  }, [toast]);
  
  // Setup Firestore listeners
  useEffect(() => {
    if (!db) {
      console.error("Firestore is not initialized.");
      setIsDataLoaded(true); // Prevent infinite loading state
      return;
    }

    const listeners = [
      onSnapshot(collection(db, 'classes'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
        setClasses(data);
      }, (err) => handleError(err, 'classes listener')),

      onSnapshot(collection(db, 'students'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        setStudents(data);
      }, (err) => handleError(err, 'students listener')),

      onSnapshot(collection(db, 'dailyLogs'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyLog));
        setDailyLogs(data);
      }, (err) => handleError(err, 'dailyLogs listener')),

      onSnapshot(doc(db, 'profiles', USER_ID), (snapshot) => {
        const data = snapshot.data();
        setProfilePicture(data?.profilePicture ?? null);
      }, (err) => handleError(err, 'profile listener')),
    ];

    // Set data loaded once all listeners are attempted to be set up
    Promise.allSettled(listeners).then(() => {
        setIsDataLoaded(true);
    });
    
    // Cleanup listeners on unmount
    return () => listeners.forEach(unsubscribe => unsubscribe());
  }, [handleError]);


  // --- DATA MODIFICATION FUNCTIONS ---
  
  const updateProfilePicture = async (url: string | null) => {
    if (!db) return;
    try {
      await setDoc(doc(db, 'profiles', USER_ID), { profilePicture: url }, { merge: true });
    } catch (e) {
      handleError(e, 'updating profile picture');
    }
  };

  const addClass = async (newClass: Omit<Class, 'id'>) => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'classes'), newClass);
    } catch (e) {
      handleError(e, 'adding class');
    }
  };

  const updateClass = async (id: string, updatedData: Partial<Class>) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'classes', id), updatedData);
    } catch (e) {
      handleError(e, 'updating class');
    }
  };

  const deleteClass = async (id: string) => {
     if (!db) return;
    const batch = writeBatch(db);
    try {
      // 1. Delete the class doc
      batch.delete(doc(db, 'classes', id));

      // 2. Find and delete all students in that class
      const studentsQuery = query(collection(db, 'students'), where('classId', '==', id));
      const studentDocs = await getDocs(studentsQuery);
      
      const studentIds = studentDocs.docs.map(d => d.id);
      studentDocs.forEach(d => batch.delete(d.ref));

      // 3. Find and delete all logs for those students
      if (studentIds.length > 0) {
        const logsQuery = query(collection(db, 'dailyLogs'), where('studentId', 'in', studentIds));
        const logDocs = await getDocs(logsQuery);
        logDocs.forEach(d => batch.delete(d.ref));
      }
      
      await batch.commit();
    } catch (e) {
      handleError(e, 'deleting class');
    }
  };

  const addStudent = async (newStudent: Omit<Student, 'id'>) => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'students'), newStudent);
    } catch (e) {
      handleError(e, 'adding student');
    }
  };

  const updateStudent = async (id: string, updatedData: Partial<Student>) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'students', id), updatedData);
    } catch (e) {
      handleError(e, 'updating student');
    }
  };
  
  const deleteStudent = async (id: string) => {
    if (!db) return;
    const batch = writeBatch(db);
    try {
      // 1. Delete student doc
      batch.delete(doc(db, 'students', id));
      
      // 2. Delete all logs for that student
      const logsQuery = query(collection(db, 'dailyLogs'), where('studentId', '==', id));
      const logDocs = await getDocs(logsQuery);
      logDocs.forEach(d => batch.delete(d.ref));
      
      await batch.commit();
    } catch (e) {
      handleError(e, 'deleting student');
    }
  };
  
  const saveDailyLogs = async (logsToSave: Record<string, Omit<DailyLog, 'id' | 'studentId' | 'date'>>, studentIds: string[], date: string) => {
    if (!db) return;
    const batch = writeBatch(db);
    
    // Find existing logs for the day and students to decide whether to update or create
    const q = query(collection(db, 'dailyLogs'), where('date', '==', date), where('studentId', 'in', studentIds));
    const existingLogsSnapshot = await getDocs(q);
    const existingLogsMap = new Map(existingLogsSnapshot.docs.map(d => [d.data().studentId, d.id]));

    for (const studentId of studentIds) {
      const logData = logsToSave[studentId];
      if (logData) {
        const fullLog = { studentId, date, ...logData };
        const existingLogId = existingLogsMap.get(studentId);
        if (existingLogId) {
          // Update existing log
          batch.update(doc(db, 'dailyLogs', existingLogId), fullLog);
        } else {
          // Create new log
          batch.set(doc(collection(db, 'dailyLogs')), fullLog);
        }
      }
    }
    
    try {
      await batch.commit();
    } catch(e) {
       handleError(e, 'saving daily logs');
    }
  };
  
  const deleteStudentLogs = async (studentId: string) => {
    if (!db) return;
    const q = query(collection(db, 'dailyLogs'), where('studentId', '==', studentId));
    try {
      const logDocs = await getDocs(q);
      const batch = writeBatch(db);
      logDocs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch(e) {
      handleError(e, 'deleting student logs');
    }
  };
  
  const deleteClassLogs = async (classId: string) => {
    if (!db) return;
    const studentsInClassQuery = query(collection(db, 'students'), where('classId', '==', classId));
     try {
      const studentDocs = await getDocs(studentsInClassQuery);
      const studentIds = studentDocs.docs.map(d => d.id);

      if (studentIds.length > 0) {
        const logsQuery = query(collection(db, 'dailyLogs'), where('studentId', 'in', studentIds));
        const logDocs = await getDocs(logsQuery);
        const batch = writeBatch(db);
        logDocs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch(e) {
      handleError(e, 'deleting class logs');
    }
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
        deleteClassLogs
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
