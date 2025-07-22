
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
      console.error("Firebase initialization failed, cannot proceed.");
      setIsDataLoaded(true); // Allow UI to render error state
      return;
    }
    if (!auth) {
       console.error("Firebase Auth is not initialized.");
       setIsDataLoaded(true);
       return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
       if (!user) {
        // User is logged out, clear all data and mark as loaded
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
        setIsDataLoaded(true); // If no user, data is "loaded" as there's nothing to fetch.
        return;
    };
    
    setIsDataLoaded(false);
    const userDocRef = doc(db, 'users', currentUser.uid);

    const listeners: Unsubscribe[] = [];

    const setupListener = <T,>(
      collectionName: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
      const q = query(collection(userDocRef, collectionName));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
        setter(data);
      }, (error) => handleDbError(error, `listening to ${collectionName}`));
      listeners.push(unsubscribe);
    };
    
    // Setup listeners for all collections
    setupListener<Class>('classes', setClasses);
    setupListener<Student>('students', setStudents);
    setupListener<DailyLog>('dailyLogs', setDailyLogs);
    
    // Listener for the profile picture
    const profileUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setProfilePicture(docSnap.data()?.profilePicture || null);
        } else {
          // If the user document doesn't exist, create it.
          setDoc(userDocRef, { createdAt: new Date() }, { merge: true });
          setProfilePicture(null);
        }
    }, (error) => handleDbError(error, 'user profile'));
    listeners.push(profileUnsubscribe);

    // After attempting to set up all listeners, mark data as loaded.
    // A more robust solution might use Promise.all if setup was async.
    setIsDataLoaded(true);

    // Cleanup function to detach all listeners
    return () => {
      listeners.forEach(unsub => unsub());
    };
  }, [currentUser, handleDbError]);


  const performAction = useCallback(async <T,>(context: string, action: (user: User) => Promise<T>): Promise<void> => {
    if (!currentUser || !db) {
      handleDbError(new Error("User not authenticated or DB not initialized."), context);
      return;
    }
    try {
      await action(currentUser);
    } catch (e) {
      handleDbError(e as Error, context);
      throw e;
    }
  }, [currentUser, handleDbError]);

  const updateProfilePicture = useCallback((url: string | null) => performAction(
    'update profile picture',
    (user) => setDoc(doc(db!, 'users', user.uid), { profilePicture: url }, { merge: true })
  ), [performAction]);
  
  const addClass = useCallback((newClass: Omit<Class, 'id'>) => performAction(
    'add class',
    (user) => addDoc(collection(db!, 'users', user.uid, 'classes'), newClass).then(() => {})
  ), [performAction]);

  const updateClass = useCallback((id: string, updatedData: Partial<Class>) => performAction(
    'update class',
    (user) => updateDoc(doc(db!, 'users', user.uid, 'classes', id), updatedData)
  ), [performAction]);

  const deleteClass = useCallback((id: string) => performAction('delete class', async (user) => {
    const batch = writeBatch(db!);
    const userRef = doc(db!, 'users', user.uid);
    
    batch.delete(doc(userRef, 'classes', id));
    
    const studentsQuery = query(collection(userRef, 'students'), where('classId', '==', id));
    const studentDocs = await getDocs(studentsQuery);
    const studentIds = studentDocs.docs.map(d => d.id);
    studentDocs.forEach(d => batch.delete(d.ref));
    
    if (studentIds.length > 0) {
       for (let i = 0; i < studentIds.length; i += 30) {
        const chunk = studentIds.slice(i, i + 30);
        const logsQuery = query(collection(userRef, 'dailyLogs'), where('studentId', 'in', chunk));
        const logDocs = await getDocs(logsQuery);
        logDocs.forEach(d => batch.delete(d.ref));
      }
    }
    await batch.commit();
  }), [performAction]);

  const addStudent = useCallback((newStudent: Omit<Student, 'id'>) => performAction(
    'add student',
    (user) => addDoc(collection(db!, 'users', user.uid, 'students'), newStudent).then(() => {})
  ), [performAction]);

  const updateStudent = useCallback((id: string, updatedData: Partial<Student>) => performAction(
    'update student',
    (user) => updateDoc(doc(db!, 'users', user.uid, 'students', id), updatedData)
  ), [performAction]);

  const deleteStudent = useCallback((id: string) => performAction('delete student', async (user) => {
    const batch = writeBatch(db!);
    const userRef = doc(db!, 'users', user.uid);
    batch.delete(doc(userRef, 'students', id));
    const logsQuery = query(collection(userRef, 'dailyLogs'), where('studentId', '==', id));
    const logDocs = await getDocs(logsQuery);
    logDocs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }), [performAction]);

  const saveDailyLogs = useCallback((logs: Record<string, any>, studentIds: string[], date: string) => performAction('save daily logs', async (user) => {
    if (studentIds.length === 0) return;
    const batch = writeBatch(db!);
    const logsColRef = collection(db!, 'users', user.uid, 'dailyLogs');
    
    const existingLogsMap = new Map<string, string>();
    if (studentIds.length > 0) {
        // Firestore 'in' query has a limit of 30 values. Chunk the requests if necessary.
        for (let i = 0; i < studentIds.length; i += 30) {
            const chunk = studentIds.slice(i, i + 30);
            const q = query(logsColRef, where('date', '==', date), where('studentId', 'in', chunk));
            const existingLogsSnap = await getDocs(q);
            existingLogsSnap.forEach(d => existingLogsMap.set(d.data().studentId, d.id));
        }
    }

    for (const studentId of studentIds) {
      const logData = logs[studentId];
      if (!logData) continue;
      
      const completeLogData = { ...logData, studentId, date };
      const existingDocId = existingLogsMap.get(studentId);
      
      const docRef = existingDocId ? doc(logsColRef, existingDocId) : doc(logsColRef);
      batch.set(docRef, completeLogData, { merge: true });
    }
    await batch.commit();
  }), [performAction]);

  const deleteStudentLogs = useCallback((studentId: string) => performAction('delete student logs', async (user) => {
    const batch = writeBatch(db!);
    const userRef = doc(db!, 'users', user.uid);
    const logsQuery = query(collection(userRef, 'dailyLogs'), where('studentId', '==', studentId));
    const logDocs = await getDocs(logsQuery);
    logDocs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }), [performAction]);

  const deleteClassLogs = useCallback((classId: string) => performAction('delete class logs', async (user) => {
    const userRef = doc(db!, 'users', user.uid);
    const studentsQuery = query(collection(userRef, 'students'), where('classId', '==', classId));
    const studentDocs = await getDocs(studentsQuery);
    const studentIds = studentDocs.docs.map(d => d.id);

    if (studentIds.length > 0) {
      for (let i = 0; i < studentIds.length; i += 30) {
        const chunk = studentIds.slice(i, i + 30);
        const batch = writeBatch(db!);
        const logsQuery = query(collection(userRef, 'dailyLogs'), where('studentId', 'in', chunk));
        const logDocs = await getDocs(logsQuery);
        logDocs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    }
  }), [performAction]);

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
