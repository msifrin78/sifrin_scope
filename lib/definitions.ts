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
  amount: number // 0-4
  quality: number // 0-4
  listening: number // 0-4
  attitude: number // 0-4
  initiative: number // 0-4
}

export type EngagementDetails = {
  attendance: boolean
  preparedness: number // 0, 0.5, 1
  focus: number // 0, 0.5, 1
  respect: number // 0, 1
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
  totalEngagement: number
  warnings: string[]
  logs: DailyLog[]
  feedback?: string
  lessonsPerWeek: number
}

export type AtRiskStudent = {
  id: string
  name: string
  totalEngagement: number
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
