
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
  updateProfilePicture: (url: string | null) => Promise<void>;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

// Define no-op functions for the default context value
const noOpPromise = () => Promise.resolve();
const defaultContextValue: DataContextProps = {
  classes: [],
  students: [],
  dailyLogs: [],
  profilePicture: null,
  isDataLoaded: false,
  addClass: noOpPromise,
  updateClass: noOpPromise,
  deleteClass: noOpPromise,
  addStudent: noOpPromise,
  updateStudent: noOpPromise,
  deleteStudent: noOpPromise,
  saveDailyLogs: noOpPromise,
  deleteStudentLogs: noOpPromise,
  deleteClassLogs: noOpPromise,
  updateProfilePicture: noOpPromise,
};

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
      setIsDataLoaded(true); // Allow UI to render the error state
      return;
    }
     if (!auth || !db) {
       console.error("Firebase Auth or DB is not initialized.");
       setIsDataLoaded(true);
       return;
    }

    const unsubscribeFromAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setClasses([]);
        setStudents([]);
        setDailyLogs([]);
        setProfilePicture(null);
        setIsDataLoaded(true); // User is logged out, data is "loaded"
      }
    });

    return () => unsubscribeFromAuth();
  }, []);

  useEffect(() => {
    if (!currentUser || !db) {
      return; // Wait for user to be authenticated
    }

    const userDocRef = doc(db, 'users', currentUser.uid);

    const setupListener = <T,>(
      collectionName: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>
    ): Unsubscribe => {
      const q = query(collection(userDocRef, collectionName));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
        setter(data);
      }, (error) => handleDbError(error, `listening to ${collectionName}`));
    };

    const unsubscribers: Unsubscribe[] = [
      setupListener<Class>('classes', setClasses),
      setupListener<Student>('students', setStudents),
      setupListener<DailyLog>('dailyLogs', setDailyLogs),
    ];

    const profileUnsubscriber = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfilePicture(docSnap.data()?.profilePicture || null);
      }
      setIsDataLoaded(true); // Mark data as loaded after the first successful profile read
    }, (error) => {
      handleDbError(error, 'user profile');
      setIsDataLoaded(true);
    });
    unsubscribers.push(profileUnsubscriber);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [currentUser, handleDbError]);
  
  const performAction = useCallback(async (context: string, action: (user: User) => Promise<any>): Promise<void> => {
    // currentUser from state is used, ensuring it's the right user.
    if (!currentUser || !db) {
      handleDbError(new Error("User not authenticated or DB not initialized."), context);
      return Promise.reject(new Error("User not authenticated"));
    }
    try {
      await action(currentUser);
    } catch (e) {
      handleDbError(e as Error, context);
      throw e; // Re-throw to allow individual callers to handle if needed
    }
  }, [currentUser, handleDbError]);


  const addClass = useCallback((newClass: Omit<Class, 'id'>) => performAction(
    'add class',
    (user) => addDoc(collection(db, 'users', user.uid, 'classes'), newClass)
  ), [performAction]);

  const updateClass = useCallback((id: string, updatedData: Partial<Class>) => performAction(
    'update class',
    (user) => updateDoc(doc(db, 'users', user.uid, 'classes', id), updatedData)
  ), [performAction]);

  const deleteClass = useCallback((id: string) => performAction('delete class', async (user) => {
    if (!db) return;
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', user.uid);
    
    batch.delete(doc(userRef, 'classes', id));
    
    const studentsQuery = query(collection(userRef, 'students'), where('classId', '==', id));
    const studentDocs = await getDocs(studentsQuery);
    const studentIds = studentDocs.docs.map(d => d.id);
    studentDocs.forEach(d => batch.delete(d.ref));
    
    if (studentIds.length > 0) {
      const studentIdChunks: string[][] = [];
      for (let i = 0; i < studentIds.length; i += 30) {
          studentIdChunks.push(studentIds.slice(i, i + 30));
      }
      for (const chunk of studentIdChunks) {
        const logsQuery = query(collection(userRef, 'dailyLogs'), where('studentId', 'in', chunk));
        const logDocs = await getDocs(logsQuery);
        logDocs.forEach(d => batch.delete(d.ref));
      }
    }
    await batch.commit();
  }), [performAction]);

  const addStudent = useCallback((newStudent: Omit<Student, 'id'>) => performAction(
    'add student',
    (user) => addDoc(collection(db, 'users', user.uid, 'students'), newStudent)
  ), [performAction]);

  const updateStudent = useCallback((id: string, updatedData: Partial<Student>) => performAction(
    'update student',
    (user) => updateDoc(doc(db, 'users', user.uid, 'students', id), updatedData)
  ), [performAction]);

  const deleteStudent = useCallback((id: string) => performAction('delete student', async (user) => {
    if (!db) return;
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', user.uid);
    batch.delete(doc(userRef, 'students', id));
    const logsQuery = query(collection(userRef, 'dailyLogs'), where('studentId', '==', id));
    const logDocs = await getDocs(logsQuery);
    logDocs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }), [performAction]);

 const saveDailyLogs = useCallback((logs: Record<string, any>, studentIdsInTable: string[], date: string) => performAction('save daily logs', async (user) => {
    if (!db || studentIdsInTable.length === 0) return;
    const batch = writeBatch(db);
    const logsColRef = collection(db, 'users', user.uid, 'dailyLogs');

    const q = query(logsColRef, where('date', '==', date), where('studentId', 'in', studentIdsInTable));
    const existingLogsSnap = await getDocs(q);
    const existingLogsMap = new Map<string, string>();
    existingLogsSnap.forEach(d => existingLogsMap.set(d.data().studentId, d.id));

    studentIdsInTable.forEach(studentId => {
        const logData = logs[studentId];
        if (!logData) return;

        const completeLogData = { ...logData, studentId, date };
        const existingDocId = existingLogsMap.get(studentId);
        
        const docRef = existingDocId ? doc(logsColRef, existingDocId) : doc(logsColRef);
        batch.set(docRef, completeLogData, { merge: true });
    });
    
    await batch.commit();
  }), [performAction]);


  const deleteStudentLogs = useCallback((studentId: string) => performAction('delete student logs', async (user) => {
    if (!db) return;
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', user.uid);
    const logsQuery = query(collection(userRef, 'dailyLogs'), where('studentId', '==', studentId));
    const logDocs = await getDocs(logsQuery);
    logDocs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }), [performAction]);

  const deleteClassLogs = useCallback((classId: string) => performAction('delete class logs', async (user) => {
    if (!db) return;
    const userRef = doc(db, 'users', user.uid);
    const studentsQuery = query(collection(userRef, 'students'), where('classId', '==', classId));
    const studentDocs = await getDocs(studentsQuery);
    const studentIds = studentDocs.docs.map(d => d.id);

    if (studentIds.length > 0) {
       for (let i = 0; i < studentIds.length; i += 30) {
        const chunk = studentIds.slice(i, i + 30);
        const batch = writeBatch(db);
        const logsQuery = query(collection(userRef, 'dailyLogs'), where('studentId', 'in', chunk));
        const logDocs = await getDocs(logsQuery);
        logDocs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    }
  }), [performAction]);

   const updateProfilePicture = useCallback((url: string | null) => performAction(
    'update profile picture',
    (user) => setDoc(doc(db, 'users', user.uid), { profilePicture: url }, { merge: true })
  ), [performAction]);


  const value = {
    classes,
    students,
    dailyLogs,
    profilePicture,
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
    updateProfilePicture,
  };

  return (
    <DataContext.Provider value={value}>
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

    