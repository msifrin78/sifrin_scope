
'use client';

import type { Class, DailyLog, Student } from '../lib/definitions';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
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

  useEffect(() => {
    // If firebase isn't configured, we don't do anything.
    if (!auth) {
      setIsDataLoaded(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        // User is signed out, clear all data
        setClasses([]);
        setStudents([]);
        setDailyLogs([]);
        setProfilePicture(null);
        setIsDataLoaded(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // If there's no user or db, we don't fetch data.
    if (!currentUser || !db) {
        // Mark as loaded if there's no user, so the app doesn't hang on a loading screen.
        if (!currentUser) setIsDataLoaded(true);
        return;
    };

    setIsDataLoaded(false);

    const getCollectionRef = (col: string) =>
      collection(db, 'users', currentUser.uid, col);

    // Set up listeners for all data collections
    const unsubscribeProfile = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfilePicture(docSnap.data().profilePicture || null);
      } else {
        // If the user profile doesn't exist, create one.
        setDoc(doc(db, 'users', currentUser.uid), { email: currentUser.email, profilePicture: null });
      }
    });

    const unsubscribeClasses = onSnapshot(getCollectionRef('classes'), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Class[]);
    });

    const unsubscribeStudents = onSnapshot(getCollectionRef('students'), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[]);
    });

    const unsubscribeLogs = onSnapshot(getCollectionRef('dailyLogs'), (snapshot) => {
      setDailyLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DailyLog[]);
      setIsDataLoaded(true); // Mark as loaded after the main data is fetched
    });

    // Cleanup function to unsubscribe from all listeners
    return () => {
      unsubscribeProfile();
      unsubscribeClasses();
      unsubscribeStudents();
      unsubscribeLogs();
    };
  }, [currentUser]);

  const getCollectionRef = (col: string) => {
    if (!currentUser || !db) throw new Error('User not authenticated');
    return collection(db, 'users', currentUser.uid, col);
  };
  
  const getDocRef = (col: string, id: string) => {
    if (!currentUser || !db) throw new Error('User not authenticated');
    return doc(db, 'users', currentUser.uid, col, id);
  }

  const updateProfilePicture = async (url: string | null) => {
    if (!currentUser || !db) return;
    await setDoc(doc(db, 'users', currentUser.uid), { profilePicture: url }, { merge: true });
  };

  const addClass = async (newClass: Omit<Class, 'id'>) => {
    await addDoc(getCollectionRef('classes'), newClass);
  };

  const updateClass = async (id: string, updatedData: Partial<Class>) => {
    await updateDoc(getDocRef('classes', id), updatedData);
  };

  const deleteClass = async (id: string) => {
    if (!currentUser || !db) return;
    const batch = writeBatch(db);

    // 1. Delete the class doc
    batch.delete(getDocRef('classes', id));

    // 2. Find and delete students in the class
    const studentsQuery = query(getCollectionRef('students'), where('classId', '==', id));
    const studentDocs = await getDocs(studentsQuery);
    const studentIds = studentDocs.docs.map(d => d.id);
    studentDocs.forEach(doc => batch.delete(doc.ref));

    // 3. Find and delete all logs for those students (in chunks)
    if (studentIds.length > 0) {
      for (let i = 0; i < studentIds.length; i += 30) {
        const chunk = studentIds.slice(i, i + 30);
        const logsQuery = query(getCollectionRef('dailyLogs'), where('studentId', 'in', chunk));
        const logDocs = await getDocs(logsQuery);
        logDocs.forEach(doc => batch.delete(doc.ref));
      }
    }
    await batch.commit();
  };

  const addStudent = async (newStudent: Omit<Student, 'id'>) => {
    await addDoc(getCollectionRef('students'), newStudent);
  };

  const updateStudent = async (id: string, updatedData: Partial<Student>) => {
    await updateDoc(getDocRef('students', id), updatedData);
  };

  const deleteLogsForStudent = async (studentId: string, batch: ReturnType<typeof writeBatch>) => {
    const logsQuery = query(getCollectionRef('dailyLogs'), where('studentId', '==', studentId));
    const logDocs = await getDocs(logsQuery);
    logDocs.forEach(doc => batch.delete(doc.ref));
  };
  
  const deleteStudent = async (id: string) => {
    if (!currentUser || !db) return;
    const batch = writeBatch(db);
    // Delete student doc
    batch.delete(getDocRef('students', id));
    // Delete their logs
    await deleteLogsForStudent(id, batch);
    await batch.commit();
  };

  const saveDailyLogs = async (
    logsToSave: Record<string, Omit<DailyLog, 'id' | 'studentId' | 'date'>>,
    studentIdsInTable: string[],
    date: string
  ) => {
    if (!currentUser || !db || studentIdsInTable.length === 0) return;
    const batch = writeBatch(db);
    const logsColRef = getCollectionRef('dailyLogs');

    const logsQuery = query(logsColRef, where('date', '==', date), where('studentId', 'in', studentIdsInTable));
    const existingLogsSnap = await getDocs(logsQuery);
    const existingLogsMap = new Map(existingLogsSnap.docs.map(d => [d.data().studentId, d.id]));

    for (const studentId of studentIdsInTable) {
      const logData = logsToSave[studentId];
      if (logData) {
        const existingLogId = existingLogsMap.get(studentId);
        if (existingLogId) {
          batch.update(getDocRef('dailyLogs', existingLogId), logData);
        } else {
          const newDocRef = doc(logsColRef); // Auto-generates ID
          batch.set(newDocRef, { ...logData, studentId, date });
        }
      }
    }
    await batch.commit();
  };

  const deleteStudentLogs = async (studentId: string) => {
    if (!currentUser || !db) return;
    const batch = writeBatch(db);
    await deleteLogsForStudent(studentId, batch);
    await batch.commit();
  };
  
  const deleteClassLogs = async (classId: string) => {
    if (!currentUser || !db) return;
    const batch = writeBatch(db);
    const studentsQuery = query(getCollectionRef('students'), where('classId', '==', classId));
    const studentDocs = await getDocs(studentsQuery);
    const studentIds = studentDocs.docs.map(d => d.id);
    
    if (studentIds.length > 0) {
      for (let i = 0; i < studentIds.length; i += 30) {
        const chunk = studentIds.slice(i, i + 30);
        const logsQuery = query(getCollectionRef('dailyLogs'), where('studentId', 'in', chunk));
        const logDocs = await getDocs(logsQuery);
        logDocs.forEach(doc => batch.delete(doc.ref));
      }
    }
    await batch.commit();
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
