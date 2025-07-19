
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
import { auth, db, firebaseInitializationError } from '../lib/firebase';
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
  type Unsubscribe,
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
    if (firebaseInitializationError) {
      setIsDataLoaded(true); // Stop loading screens
      return;
    }
    if (!auth) {
        // This case should not happen if firebaseInitializationError is handled, but as a safeguard:
        console.error("Auth is not initialized.");
        setIsDataLoaded(true);
        return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setClasses([]);
        setStudents([]);
        setDailyLogs([]);
        setProfilePicture(null);
        setIsDataLoaded(true);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser || !db) {
      setIsDataLoaded(true);
      return;
    }

    setIsDataLoaded(false);
    
    const userDocRef = doc(db, 'users', currentUser.uid);
    const getCollectionRef = (colName: string) => collection(userDocRef, colName);

    const listeners: Unsubscribe[] = [];
    
    // Ensure the user document exists.
    setDoc(userDocRef, { uid: currentUser.uid, email: currentUser.email }, { merge: true })
      .catch(e => handleDbError(e, 'user profile setup'));
      
    // Listener for Profile Picture
    listeners.push(onSnapshot(userDocRef, (docSnap) => {
      setProfilePicture(docSnap.data()?.profilePicture || null);
    }, (error) => handleDbError(error, 'user profile')));

    // Listener for Classes
    listeners.push(onSnapshot(getCollectionRef('classes'), (snapshot) => {
      setClasses(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Class[]);
    }, (error) => handleDbError(error, 'classes')));

    // Listener for Students
    listeners.push(onSnapshot(getCollectionRef('students'), (snapshot) => {
      setStudents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Student[]);
    }, (error) => handleDbError(error, 'students')));

    // Listener for Daily Logs
    listeners.push(onSnapshot(getCollectionRef('dailyLogs'), (snapshot) => {
      setDailyLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as DailyLog[]);
    }, (error) => handleDbError(error, 'daily logs')));

    Promise.all(listeners).finally(() => setIsDataLoaded(true));

    return () => {
      listeners.forEach(unsub => unsub());
    };
  }, [currentUser, handleDbError]);
  
  const guardAction = async <T,>(action: (user: User, db: Firestore) => Promise<T>, context: string): Promise<T> => {
    if (!auth?.currentUser || !db) {
      const error = new Error("User not authenticated or DB not initialized");
      handleDbError(error, context);
      throw error;
    }
    try {
      return await action(auth.currentUser, db);
    } catch (e) {
      handleDbError(e as Error, context);
      throw e;
    }
  };
  
  const getCollectionForUser = (user: User, colName: string) => collection(db!, 'users', user.uid, colName);

  const updateProfilePicture = (url: string | null) => guardAction(
    (user, db) => setDoc(doc(db, 'users', user.uid), { profilePicture: url }, { merge: true }),
    'update profile picture'
  );

  const addClass = (newClass: Omit<Class, 'id'>) => guardAction(
    (user) => addDoc(getCollectionForUser(user, 'classes'), newClass),
    'add class'
  );

  const updateClass = (id: string, updatedData: Partial<Class>) => guardAction(
    (user) => updateDoc(doc(getCollectionForUser(user, 'classes'), id), updatedData),
    'update class'
  );

  const deleteClass = (id: string) => guardAction(async (user, db) => {
    const batch = writeBatch(db);
    batch.delete(doc(getCollectionForUser(user, 'classes'), id));
    
    const studentsQuery = query(getCollectionForUser(user, 'students'), where('classId', '==', id));
    const studentDocs = await getDocs(studentsQuery);
    const studentIds = studentDocs.docs.map(d => d.id);
    studentDocs.forEach(d => batch.delete(d.ref));
    
    if (studentIds.length > 0) {
      for (let i = 0; i < studentIds.length; i += 30) {
        const chunk = studentIds.slice(i, i + 30);
        const logsQuery = query(getCollectionForUser(user, 'dailyLogs'), where('studentId', 'in', chunk));
        const logDocs = await getDocs(logsQuery);
        logDocs.forEach(d => batch.delete(d.ref));
      }
    }
    await batch.commit();
  }, 'delete class');

  const addStudent = (newStudent: Omit<Student, 'id'>) => guardAction(
    (user) => addDoc(getCollectionForUser(user, 'students'), newStudent),
    'add student'
  );

  const updateStudent = (id: string, updatedData: Partial<Student>) => guardAction(
    (user) => updateDoc(doc(getCollectionForUser(user, 'students'), id), updatedData),
    'update student'
  );

  const deleteStudent = (id: string) => guardAction(async (user, db) => {
    const batch = writeBatch(db);
    batch.delete(doc(getCollectionForUser(user, 'students'), id));
    const logsQuery = query(getCollectionForUser(user, 'dailyLogs'), where('studentId', '==', id));
    const logDocs = await getDocs(logsQuery);
    logDocs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }, 'delete student');

  const saveDailyLogs = (logs: Record<string, any>, studentIds: string[], date: string) => guardAction(async (user, db) => {
    if (studentIds.length === 0) return;
    const batch = writeBatch(db);
    const logsColRef = getCollectionForUser(user, 'dailyLogs');
    
    const q = query(logsColRef, where('date', '==', date), where('studentId', 'in', studentIds.slice(0, 30)));
    const existingLogsSnap = await getDocs(q);
    const existingLogsMap = new Map<string, string>();
    existingLogsSnap.forEach(d => existingLogsMap.set(d.data().studentId, d.id));

    for (const studentId of studentIds) {
      const logData = logs[studentId];
      if (!logData) continue;
      
      const existingId = existingLogsMap.get(studentId);
      const docRef = existingId ? doc(logsColRef, existingId) : doc(logsColRef);
      batch.set(docRef, { ...logData, studentId, date });
    }
    await batch.commit();
  }, 'save daily logs');
  
  const deleteStudentLogs = (studentId: string) => guardAction(async (user, db) => {
    const batch = writeBatch(db);
    const logsQuery = query(getCollectionForUser(user, 'dailyLogs'), where('studentId', '==', studentId));
    const logDocs = await getDocs(logsQuery);
    logDocs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }, 'delete student logs');

  const deleteClassLogs = (classId: string) => guardAction(async (user, db) => {
    const studentsQuery = query(getCollectionForUser(user, 'students'), where('classId', '==', classId));
    const studentDocs = await getDocs(studentsQuery);
    const studentIds = studentDocs.docs.map(d => d.id);

    if (studentIds.length > 0) {
      const batch = writeBatch(db);
      for (let i = 0; i < studentIds.length; i += 30) {
        const chunk = studentIds.slice(i, i + 30);
        const logsQuery = query(getCollectionForUser(user, 'dailyLogs'), where('studentId', 'in', chunk));
        const logDocs = await getDocs(logsQuery);
        logDocs.forEach(d => batch.delete(d.ref));
      }
      await batch.commit();
    }
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
