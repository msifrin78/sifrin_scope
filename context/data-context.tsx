
'use client';

import type { Class, DailyLog, Student } from '../lib/definitions';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  useCallback,
} from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  writeBatch,
  setDoc,
} from 'firebase/firestore';
import { useToast } from '../hooks/use-toast';

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
  saveDailyLogs: (
    logsToSave: Record<string, Omit<DailyLog, 'id' | 'studentId' | 'date'>>,
    studentIds: string[],
    date: string
  ) => Promise<void>;
  deleteStudentLogs: (studentId: string) => Promise<void>;
  deleteClassLogs: (classId: string) => Promise<void>;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const { toast } = useToast();

  const handleDbError = useCallback((error: Error, context: string) => {
    console.error(`Firestore error (${context}):`, error);
    toast({
      title: 'Database Error',
      description: `Could not perform action on ${context}. Please check your connection and refresh.`,
      variant: 'destructive',
    });
  }, [toast]);
  
  useEffect(() => {
    if (!auth || !db) {
      console.warn("Firebase not configured. App will not sync.");
      setIsDataLoaded(true);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setCurrentUser(null);
        setClasses([]);
        setStudents([]);
        setDailyLogs([]);
        setProfilePicture(null);
        setIsDataLoaded(true);
        return;
      }
      
      setCurrentUser(user);
      setIsDataLoaded(false);

      const getCollectionRef = (col: string) => collection(db, 'users', user.uid, col);
      const getUserDocRef = () => doc(db, 'users', user.uid);

      const unsubscribers = [
        onSnapshot(getUserDocRef(), (docSnap) => {
          if (docSnap.exists()) {
            setProfilePicture(docSnap.data().profilePicture || null);
          } else {
            setDoc(getUserDocRef(), { email: user.email, profilePicture: null })
              .catch(e => handleDbError(e as Error, 'user profile creation'));
          }
        }, (error) => handleDbError(error, 'user profile')),
        
        onSnapshot(getCollectionRef('classes'), (snapshot) => {
          setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Class[]);
        }, (error) => handleDbError(error, 'classes')),

        onSnapshot(getCollectionRef('students'), (snapshot) => {
          setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[]);
        }, (error) => handleDbError(error, 'students')),
        
        onSnapshot(getCollectionRef('dailyLogs'), (snapshot) => {
          setDailyLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DailyLog[]);
        }, (error) => handleDbError(error, 'daily logs')),
      ];
      
      setIsDataLoaded(true);

      return () => {
        unsubscribers.forEach(unsub => unsub());
      };
    });

    return () => unsubscribeAuth();
  }, [handleDbError]);
  
  const guardAction = async <T,>(action: () => Promise<T>, context: string): Promise<T> => {
    if (!currentUser || !db) {
      const err = "Action failed: User not authenticated or database unavailable.";
      toast({ title: "Authentication Error", description: err, variant: "destructive" });
      throw new Error(err);
    }
    try {
      return await action();
    } catch (error) {
      handleDbError(error as Error, `Failed to ${context}`);
      throw error;
    }
  };

  const getCollectionRef = (col: string) => collection(db!, 'users', currentUser!.uid, col);
  const getDocRef = (col: string, id: string) => doc(db!, 'users', currentUser!.uid, col, id);

  const updateProfilePicture = (url: string | null) => guardAction(
    () => setDoc(doc(db!, 'users', currentUser!.uid), { profilePicture: url }, { merge: true }),
    'update profile picture'
  );

  const addClass = (newClass: Omit<Class, 'id'>) => guardAction(
    () => addDoc(getCollectionRef('classes'), newClass).then(() => {}),
    'add class'
  );

  const updateClass = (id: string, updatedData: Partial<Class>) => guardAction(
    () => updateDoc(getDocRef('classes', id), updatedData),
    'update class'
  );

  const deleteClass = (id: string) => guardAction(async () => {
    const batch = writeBatch(db!);
    batch.delete(getDocRef('classes', id));
    const studentsQuery = query(getCollectionRef('students'), where('classId', '==', id));
    const studentDocs = await getDocs(studentsQuery);
    const studentIds = studentDocs.docs.map(d => d.id);
    studentDocs.forEach(doc => batch.delete(doc.ref));
    
    if (studentIds.length > 0) {
      for (let i = 0; i < studentIds.length; i += 30) {
        const chunk = studentIds.slice(i, i + 30);
        const logsQuery = query(getCollectionRef('dailyLogs'), where('studentId', 'in', chunk));
        const logDocs = await getDocs(logsQuery);
        logDocs.forEach(doc => batch.delete(doc.ref));
      }
    }
    await batch.commit();
  }, 'delete class and its students');

  const addStudent = (newStudent: Omit<Student, 'id'>) => guardAction(
    () => addDoc(getCollectionRef('students'), newStudent).then(() => {}),
    'add student'
  );

  const updateStudent = (id: string, updatedData: Partial<Student>) => guardAction(
    () => updateDoc(getDocRef('students', id), updatedData),
    'update student'
  );

  const deleteStudent = (id: string) => guardAction(async () => {
    const batch = writeBatch(db!);
    batch.delete(getDocRef('students', id));
    const logsQuery = query(getCollectionRef('dailyLogs'), where('studentId', '==', id));
    const logDocs = await getDocs(logsQuery);
    logDocs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }, 'delete student');

  const saveDailyLogs = (logs: Record<string, any>, studentIds: string[], date: string) => guardAction(async () => {
    if (studentIds.length === 0) return;
    const batch = writeBatch(db!);
    const logsColRef = getCollectionRef('dailyLogs');
    const studentIdChunks = [];
    for (let i = 0; i < studentIds.length; i += 30) {
      studentIdChunks.push(studentIds.slice(i, i + 30));
    }
    
    const existingLogsMap = new Map<string, string>();

    for (const chunk of studentIdChunks) {
        const q = query(logsColRef, where('date', '==', date), where('studentId', 'in', chunk));
        const existingLogsSnap = await getDocs(q);
        existingLogsSnap.docs.forEach(d => existingLogsMap.set(d.data().studentId, d.id));
    }

    for (const studentId of studentIds) {
      const logData = logs[studentId];
      if (!logData) continue;
      const existingId = existingLogsMap.get(studentId);
      const docRef = existingId ? getDocRef('dailyLogs', existingId) : doc(logsColRef);
      batch.set(docRef, { ...logData, studentId, date });
    }
    await batch.commit();
  }, 'save daily logs');
  
  const deleteLogsByQuery = async (q: any, batch: ReturnType<typeof writeBatch>) => {
    const logDocs = await getDocs(q);
    logDocs.forEach(doc => batch.delete(doc.ref));
  };
  
  const deleteStudentLogs = (studentId: string) => guardAction(async () => {
    const batch = writeBatch(db!);
    const q = query(getCollectionRef('dailyLogs'), where('studentId', '==', studentId));
    await deleteLogsByQuery(q, batch);
    await batch.commit();
  }, 'delete student logs');

  const deleteClassLogs = (classId: string) => guardAction(async () => {
    const batch = writeBatch(db!);
    const studentsQuery = query(getCollectionRef('students'), where('classId', '==', classId));
    const studentDocs = await getDocs(studentsQuery);
    const studentIds = studentDocs.docs.map(d => d.id);

    if (studentIds.length > 0) {
      for (let i = 0; i < studentIds.length; i += 30) {
        const chunk = studentIds.slice(i, i + 30);
        const logsQuery = query(getCollectionRef('dailyLogs'), where('studentId', 'in', chunk));
        await deleteLogsByQuery(logsQuery, batch);
      }
    }
    await batch.commit();
  }, 'delete class logs');

  return (
    <DataContext.Provider
      value={{
        classes,
        students,
        dailyLogs,
        profilePicture,
        isDataLoaded,
        updateProfilePicture,
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
