
'use client';

import type { Class, DailyLog, Student } from '../lib/definitions';
import {
  classes as initialClasses,
  dailyLogs as initialDailyLogs,
  students as initialStudents,
} from '../lib/data';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

interface DataContextProps {
  classes: Class[];
  setClasses: React.Dispatch<React.SetStateAction<Class[]>>;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  dailyLogs: DailyLog[];
  setDailyLogs: React.Dispatch<React.SetStateAction<DailyLog[]>>;
  isDataLoaded: boolean;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

// Helper function to safely get data from localStorage
const getFromStorage = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const item = window.localStorage.getItem(key);
    // An item can be 'null' as a string, so we need a robust check
    if (item && item !== 'undefined' && item !== 'null') {
      return JSON.parse(item);
    }
    return null;
  } catch (error) {
    console.warn(`Error reading from localStorage for key "${key}":`, error);
    return null;
  }
};


export const DataProvider = ({ children }: { children: ReactNode }) => {
  // Initialize with default data for server-side rendering and initial client render
  const [classes, setClasses] = useState<Class[]>(initialClasses);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(initialDailyLogs);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Effect to load data from localStorage after initial render on the client
  useEffect(() => {
    const storedClasses = getFromStorage<Class[]>('classes');
    if (storedClasses) {
      setClasses(storedClasses);
    }

    const storedStudents = getFromStorage<Student[]>('students');
    if (storedStudents) {
      setStudents(storedStudents);
    }

    const storedDailyLogs = getFromStorage<DailyLog[]>('dailyLogs');
    if (storedDailyLogs) {
      setDailyLogs(storedDailyLogs);
    }

    setIsDataLoaded(true); // Signal that data has been loaded
  }, []);

  // Effects to save data back to localStorage when it changes
  useEffect(() => {
    if (isDataLoaded) {
      try {
        localStorage.setItem('classes', JSON.stringify(classes));
      } catch (error) {
        console.warn('Could not save classes to localStorage', error);
      }
    }
  }, [classes, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      try {
        localStorage.setItem('students', JSON.stringify(students));
      } catch (error) {
        console.warn('Could not save students to localStorage', error);
      }
    }
  }, [students, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      try {
        localStorage.setItem('dailyLogs', JSON.stringify(dailyLogs));
      } catch (error) {
        console.warn('Could not save dailyLogs to localStorage', error);
      }
    }
  }, [dailyLogs, isDataLoaded]);

  return (
    <DataContext.Provider
      value={{
        classes,
        setClasses,
        students,
        setStudents,
        dailyLogs,
        setDailyLogs,
        isDataLoaded,
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
