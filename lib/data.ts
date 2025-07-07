import type { Class, Student, DailyLog } from "./definitions"

// This file now serves as a fallback or for initial seeding if needed,
// but the primary data source is now Firestore.
// The data is left here for reference or potential future use.

export const classes: Class[] = [
  { id: "C1", name: "Period 1 - English 101", lessonsPerWeek: 5 },
  { id: "C2", name: "Period 3 - Creative Writing", lessonsPerWeek: 3 },
  { id: "C3", name: "Period 4 - Journalism", lessonsPerWeek: 5 },
]

export const students: Student[] = [
  { id: "S1", name: "Alice Johnson", studentId: "ID001", classId: "C1" },
  { id: "S2", name: "Bob Williams", studentId: "ID002", classId: "C1" },
  { id: "S3", name: "Charlie Brown", studentId: "ID003", classId: "C1" },
  { id: "S4", name: "Diana Miller", studentId: "ID004", classId: "C1" },
  { id: "S5", name: "Ethan Davis", studentId: "ID005", classId: "C2" },
  { id: "S6", name: "Fiona Garcia", studentId: "ID006", classId: "C2" },
  { id: "S7", name: "George Rodriguez", studentId: "ID007", classId: "C2" },
  { id: "S8", name: "Hannah Martinez", studentId: "ID008", classId: "C3" },
  { id: "S9", name: "Ian Hernandez", studentId: "ID009", classId: "C3" },
]

export const dailyLogs: DailyLog[] = [
  // Sample logs for Alice Johnson (S1) in Class C1
  {
    id: "L1",
    studentId: "S1",
    date: "2023-10-23",
    participation: {
      amount: 4,
      quality: 4,
      listening: 3,
      attitude: 4,
      initiative: 3,
    }, // Total: 18
    engagement: {
      attendance: true,
      preparedness: 1,
      focus: 1,
      respect: 1,
    }, // Total: 5 (2 for attendance + 1 + 1 + 1)
    comments: "Great participation today.",
  },
  {
    id: "L2",
    studentId: "S1",
    date: "2023-10-24",
    participation: {
      amount: 3,
      quality: 3,
      listening: 3,
      attitude: 3,
      initiative: 3,
    }, // Total: 15
    engagement: {
      attendance: true,
      preparedness: 0.5,
      focus: 0.5,
      respect: 1,
    }, // Total: 4 (2 + 0.5 + 0.5 + 1)
    comments: "A bit distracted, forgot textbook.",
  },
  // Sample logs for Bob Williams (S2) in Class C1 - AT RISK
  {
    id: "L3",
    studentId: "S2",
    date: "2023-10-23",
    participation: {
      amount: 2,
      quality: 2,
      listening: 2,
      attitude: 1,
      initiative: 1,
    }, // Total: 8
    engagement: {
      attendance: true,
      preparedness: 0,
      focus: 0,
      respect: 0,
    }, // Total: 2 (2 + 0 + 0 + 0)
    comments: "Disruptive and unprepared.",
  },
  {
    id: "L4",
    studentId: "S2",
    date: "2023-10-24",
    participation: {
      amount: 0,
      quality: 0,
      listening: 0,
      attitude: 0,
      initiative: 0,
    }, // Total: 0
    engagement: {
      attendance: false,
      preparedness: 0,
      focus: 0,
      respect: 0,
    }, // Total: 0
    comments: "Absent.",
  },
]
