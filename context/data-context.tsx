
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
    let description = `Could not perform action on ${context}. Please check your connection and refresh.`;
    if (error.message.includes('permission-denied') || error.message.includes('PERMISSION_DENIED')) {
      description = `PERMISSION DENIED: Could not perform the action on '${context}'. Please check your Firestore security rules to allow read/write access for authenticated users. This is the most common cause for data not saving.`;
    }
    toast({
      title: 'Database Error',
      description: description,
      variant: 'destructive',
    });
  }, [toast]);
  
  useEffect(() => {
    if (firebaseInitializationError || !auth) {
      console.log("Firebase not initialized, stopping data provider setup.");
      setIsDataLoaded(true); // Allow UI to show config error
      return;
    }

    const unsubscribeFromAuth = onAuthStateChanged(auth, (user) => {
      // User logs out or is not logged in initially
      if (!user) {
        setCurrentUser(null);
        setClasses([]);
        setStudents([]);
        setDailyLogs([]);
        setProfilePicture(null);
        setIsDataLoaded(true); // CRITICAL FIX: Mark as loaded ONLY when we know there's no user.
        return;
      }
      
      // User logs in or session is restored
      setCurrentUser(user);
      
      const userDocRef = doc(db, 'users', user.uid);
      const subscriptions: Unsubscribe[] = [];
      let pendingListeners = 4; // classes, students, dailyLogs, profile

      const onDataLoaded = () => {
          pendingListeners--;
          if (pendingListeners === 0) {
              setIsDataLoaded(true);
          }
      };

      const setupListener = <T,>(
        collectionName: string,
        setter: React.Dispatch<React.SetStateAction<T[]>>
      ): Unsubscribe => {
        const q = query(collection(userDocRef, collectionName));
        return onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
          setter(data);
          onDataLoaded();
        }, (error) => {
            handleDbError(error, `listen to ${collectionName}`);
            onDataLoaded();
        });
      };
      
      const profileUnsubscriber = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setProfilePicture(docSnap.data()?.profilePicture || null);
        } else {
          // If the user document doesn't exist, create it.
          setDoc(userDocRef, { createdAt: new Date() }, { merge: true })
            .catch(e => handleDbError(e, 'create user profile'));
        }
        onDataLoaded();
      }, (error) => {
        handleDbError(error, 'user profile');
        onDataLoaded();
      });
      
      subscriptions.push(profileUnsubscriber);
      subscriptions.push(setupListener<Class>('classes', setClasses));
      subscriptions.push(setupListener<Student>('students', setStudents));
      subscriptions.push(setupListener<DailyLog>('dailyLogs', setDailyLogs));
      
      // Return a cleanup function that runs when the user logs out or component unmounts
      return () => {
        subscriptions.forEach(unsub => unsub());
        setIsDataLoaded(false); // Reset loading state on logout
      };
    });

    // This is the top-level cleanup for the auth listener itself
    return () => unsubscribeFromAuth();
  }, [handleDbError]);

  const getCollectionRef = useCallback((collectionName: string) => {
      if (!currentUser || !db) {
          throw new Error('User not authenticated or DB not available.');
      }
      return collection(db, 'users', currentUser.uid, collectionName);
  }, [currentUser]);
  
  const getDocRef = useCallback((collectionName: string, docId: string) => {
    if (!currentUser || !db) {
        throw new Error('User not authenticated or DB not available.');
    }
    return doc(db, 'users', currentUser.uid, collectionName, docId);
  }, [currentUser]);

  const addClass = useCallback(async (newClass: Omit<Class, 'id'>) => {
    try {
      await addDoc(getCollectionRef('classes'), newClass);
    } catch (e) { handleDbError(e as Error, 'add class'); }
  }, [getCollectionRef, handleDbError]);

  const updateClass = useCallback(async (id: string, updatedData: Partial<Class>) => {
    try {
      await updateDoc(getDocRef('classes', id), updatedData);
    } catch (e) { handleDbError(e as Error, 'update class'); }
  }, [getDocRef, handleDbError]);

  const deleteClass = useCallback(async (id: string) => {
    if (!currentUser || !db) return;
    try {
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', currentUser.uid);
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
    } catch (e) { handleDbError(e as Error, 'delete class and associated data'); }
  }, [currentUser, handleDbError]);

  const addStudent = useCallback(async (newStudent: Omit<Student, 'id'>) => {
    try {
      await addDoc(getCollectionRef('students'), newStudent);
    } catch (e) { handleDbError(e as Error, 'add student'); }
  }, [getCollectionRef, handleDbError]);

  const updateStudent = useCallback(async (id: string, updatedData: Partial<Student>) => {
    try {
      await updateDoc(getDocRef('students', id), updatedData);
    } catch (e) { handleDbError(e as Error, 'update student'); }
  }, [getDocRef, handleDbError]);

  const deleteStudent = useCallback(async (id: string) => {
    if (!currentUser || !db) return;
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', currentUser.uid);
      batch.delete(doc(userRef, 'students', id));
      const logsQuery = query(collection(userRef, 'dailyLogs'), where('studentId', '==', id));
      const logDocs = await getDocs(logsQuery);
      logDocs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) { handleDbError(e as Error, 'delete student and associated logs'); }
  }, [currentUser, handleDbError]);

  const saveDailyLogs = useCallback(async (logs: Record<string, any>, studentIdsInTable: string[], date: string) => {
    if (!currentUser || !db) return;
    try {
      if (studentIdsInTable.length === 0) return;
      const batch = writeBatch(db);
      const logsColRef = getCollectionRef('dailyLogs');
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
    } catch (e) { handleDbError(e as Error, 'save daily logs'); }
  }, [getCollectionRef, handleDbError, currentUser]);

  const deleteStudentLogs = useCallback(async (studentId: string) => {
     if (!currentUser || !db) return;
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', currentUser.uid);
      const logsQuery = query(collection(userRef, 'dailyLogs'), where('studentId', '==', studentId));
      const logDocs = await getDocs(logsQuery);
      logDocs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) { handleDbError(e as Error, 'delete student logs'); }
  }, [currentUser, handleDbError]);

  const deleteClassLogs = useCallback(async (classId: string) => {
    if (!currentUser || !db) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
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
    } catch(e) { handleDbError(e as Error, 'delete class logs'); }
  }, [currentUser, handleDbError]);

  const updateProfilePicture = useCallback(async (url: string | null) => {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, 'users', currentUser.uid), { profilePicture: url }, { merge: true });
    } catch (e) { handleDbError(e as Error, 'update profile picture'); }
  },[currentUser, handleDbError]);
  
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

    