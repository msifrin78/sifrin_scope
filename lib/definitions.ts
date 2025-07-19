export type Student = {
  id: string
  name: string
  studentId?: string
  classId: string
}

export type Class = {
  id: string
  name: string
  lessonsPerWeek: number
}

export type ParticipationDetails = {
  score: number // 0-5
}

export type EngagementDetails = {
  score: number // 0-5
}

export type DailyLog = {
  id: string
  studentId: string
  date: string // YYYY-MM-DD
  participation: ParticipationDetails
  engagement: EngagementDetails
  comments: string
}

export type WeeklySummary = {
  studentId: string
  weekStartDate: string // YYYY-MM-DD
  avgParticipation: number
  avgEngagement: number
  warnings: string[]
  logs: DailyLog[]
  feedback?: string
  lessonsPerWeek: number
}

export type AtRiskStudent = {
  id:string
  name: string
  avgEngagement: number
  avgParticipation: number
}

export type ClassWeeklySummary = {
  classId: string
  className: string
  weekStartDate: string
  totalStudents: number
  atRiskStudentsCount: number
  passingStudentsCount: number
  atRiskStudents: AtRiskStudent[]
  lessonsPerWeek: number
}
