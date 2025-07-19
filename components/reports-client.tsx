
"use client"

import { useState, useEffect } from "react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { format, startOfWeek as dateFnsStartOfWeek } from "date-fns"
import { WeeklyReportCard } from "./weekly-report-card"
import { ClassReportCard } from "./class-report-card"
import { DailyReportCard } from "./daily-report-card"
import { Button } from "./ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { useData } from "../context/data-context"
import {
  Calendar as CalendarIcon,
  CalendarDays,
  DatabaseZap,
  Loader2,
  Trash2,
} from "lucide-react"
import { useToast } from "../hooks/use-toast"
import type {
  WeeklySummary,
  ClassWeeklySummary,
  AtRiskStudent,
  DailyLog,
  Student,
  Class,
} from "../lib/definitions"
import {
  calculateEngagementScore,
  calculateParticipationScore,
} from "../lib/scoring"
import {
  generateFeedback,
  type GenerateFeedbackInput,
} from "../ai/flows/generate-feedback-flow"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover"
import { Calendar } from "./ui/calendar"
import { Label } from "./ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog"

export function ReportsClient() {
  const { classes, students, dailyLogs, isDataLoaded, deleteStudentLogs, deleteClassLogs } = useData()

  // Weekly Student Report State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  )
  const [reportData, setReportData] = useState<WeeklySummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false)

  // Weekly Class Report State
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [classReportData, setClassReportData] =
    useState<ClassWeeklySummary | null>(null)
  const [isClassReportLoading, setIsClassReportLoading] = useState(false)

  // Daily Student Report State
  const [selectedDailyStudentId, setSelectedDailyStudentId] = useState<
    string | null
  >(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  )
  const [dailyReportData, setDailyReportData] = useState<DailyLog | null>(null)
  const [isDailyReportLoading, setIsDailyReportLoading] = useState(false)

  // Data Management State
  const [studentToDeleteLogs, setStudentToDeleteLogs] = useState<Student | null>(
    null
  )
  const [classToDeleteLogs, setClassToDeleteLogs] = useState<Class | null>(null)
  const [isDeleteStudentLogsAlertOpen, setIsDeleteStudentLogsAlertOpen] =
    useState(false)
  const [isDeleteClassLogsAlertOpen, setIsDeleteClassLogsAlertOpen] =
    useState(false)

  // Common State
  const [selectedWeek, setSelectedWeek] = useState<string>("")
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    // Helper to get the start of a week (Monday) in YYYY-MM-DD format
    const getStartOfWeek = (date: Date) => {
      const monday = dateFnsStartOfWeek(date, { weekStartsOn: 1 })
      return format(monday, "yyyy-MM-dd")
    }

    // Always include the current week
    const currentWeekStart = getStartOfWeek(new Date())
    
    // Get unique week starts from existing logs
    const weekStartsFromLogs = [
      ...new Set(dailyLogs.map((log) => getStartOfWeek(new Date(log.date)))),
    ]

    // Combine and get unique weeks, with current week first if not present
    const allWeekStarts = [...new Set([currentWeekStart, ...weekStartsFromLogs])]
    
    // Sort weeks in descending order (most recent first)
    allWeekStarts.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    
    setAvailableWeeks(allWeekStarts)

    // Set default selected week to the most recent one if not already set
    if (allWeekStarts.length > 0 && !selectedWeek) {
      setSelectedWeek(allWeekStarts[0])
    }

    // Set default class if not already set
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id)
    }
  }, [dailyLogs, classes, selectedWeek, selectedClassId])

  const handleGenerateReport = () => {
    if (!selectedStudentId || !selectedWeek) {
      toast({
        title: "Error",
        description: "Please select a student and week first.",
        variant: "destructive",
      })
      return
    }
    setIsLoading(true)

    const student = students.find((s) => s.id === selectedStudentId)!
    const studentClass = classes.find((c) => c.id === student.classId)!

    const start = new Date(selectedWeek)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    const studentLogs = dailyLogs.filter((log) => {
      const logDate = new Date(log.date)
      return (
        log.studentId === selectedStudentId && logDate >= start && logDate <= end
      )
    })

    let avgParticipation = 0

    if (studentLogs.length > 0) {
      const totalParticipation = studentLogs.reduce(
        (acc, log) => acc + calculateParticipationScore(log.participation),
        0
      )
      avgParticipation = totalParticipation / studentLogs.length
    }

    const fullWeekEngagementTotal = studentLogs.reduce(
      (acc, log) => acc + calculateEngagementScore(log.engagement),
      0
    )

    const newReport: WeeklySummary = {
      studentId: selectedStudentId,
      weekStartDate: start.toISOString().split("T")[0],
      avgParticipation,
      totalEngagement: fullWeekEngagementTotal,
      warnings: [],
      logs: studentLogs,
      lessonsPerWeek: studentClass.lessonsPerWeek,
    }

    setReportData(newReport)
    setIsLoading(false)
  }

  const handleGenerateClassReport = () => {
    if (!selectedClassId || !selectedWeek) {
      toast({
        title: "Error",
        description: "Please select a class and week first.",
        variant: "destructive",
      })
      return
    }
    setIsClassReportLoading(true)

    const start = new Date(selectedWeek)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    const currentClass = classes.find((c) => c.id === selectedClassId)!
    const classStudents = students.filter(
      (s) => s.classId === selectedClassId
    )
    const atRiskStudents: AtRiskStudent[] = []
    const atRiskThreshold = currentClass.lessonsPerWeek * 2.4

    for (const student of classStudents) {
      const studentLogs = dailyLogs.filter((log) => {
        const logDate = new Date(log.date)
        return (
          log.studentId === student.id && logDate >= start && logDate <= end
        )
      })

      const totalEngagement = studentLogs.reduce(
        (acc, log) => acc + calculateEngagementScore(log.engagement),
        0
      )

      if (totalEngagement < atRiskThreshold && studentLogs.length > 0) {
        const totalParticipation = studentLogs.reduce(
          (acc, log) => acc + calculateParticipationScore(log.participation),
          0
        )
        const avgParticipation =
          studentLogs.length > 0 ? totalParticipation / studentLogs.length : 0

        atRiskStudents.push({
          id: student.id,
          name: student.name,
          totalEngagement: totalEngagement,
          avgParticipation: avgParticipation,
        })
      }
    }

    const totalStudents = classStudents.length
    const atRiskStudentsCount = atRiskStudents.length
    const passingStudentsCount = totalStudents - atRiskStudentsCount

    const newClassReport: ClassWeeklySummary = {
      classId: selectedClassId,
      className: currentClass.name,
      weekStartDate: start.toISOString().split("T")[0],
      totalStudents,
      atRiskStudentsCount,
      passingStudentsCount,
      atRiskStudents,
      lessonsPerWeek: currentClass.lessonsPerWeek,
    }

    setClassReportData(newClassReport)
    setIsClassReportLoading(false)
  }

  const handleGenerateDailyReport = () => {
    if (!selectedDailyStudentId || !selectedDate) {
      toast({
        title: "Error",
        description: "Please select a student and date first.",
        variant: "destructive",
      })
      return
    }
    setIsDailyReportLoading(true)
    const dateString = selectedDate.toISOString().split("T")[0]
    const log = dailyLogs.find(
      (l) => l.studentId === selectedDailyStudentId && l.date === dateString
    )
    setDailyReportData(log || null) // Set to null if no log found
    setIsDailyReportLoading(false)
  }

  const handleGenerateFeedback = async () => {
    if (!reportData) return
    setIsGeneratingFeedback(true)

    try {
      const student = students.find((s) => s.id === reportData.studentId)
      if (!student) throw new Error("Student not found")

      const flowInput: GenerateFeedbackInput = {
        studentName: student.name,
        avgParticipation: reportData.avgParticipation,
        totalEngagement: reportData.totalEngagement,
        dailyLogs: reportData.logs.map((log) => ({
          date: log.date,
          comments: log.comments,
          participationScore: calculateParticipationScore(log.participation),
          engagementScore: calculateEngagementScore(log.engagement),
        })),
      }

      const result = await generateFeedback(flowInput)
      setReportData({ ...reportData, feedback: result.feedback })
    } catch (error) {
      console.error("AI Feedback Generation Error:", error)
      toast({
        title: "AI Feedback Error",
        description:
          "There was an issue generating feedback. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingFeedback(false)
    }
  }

  const confirmDeleteStudentLogs = async () => {
    if (!studentToDeleteLogs) return;
    try {
      await deleteStudentLogs(studentToDeleteLogs.id);
      toast({
        title: "Records Deleted",
        description: `All logs for ${studentToDeleteLogs.name} have been deleted.`,
      })
      setStudentToDeleteLogs(null)
    } catch (error) {
      console.error("Failed to delete student logs:", error);
    }
  }

  const confirmDeleteClassLogs = async () => {
    if (!classToDeleteLogs) return;
    try {
      await deleteClassLogs(classToDeleteLogs.id);
      toast({
        title: "Records Deleted",
        description: `All logs for ${classToDeleteLogs.name} have been deleted.`,
      })
      setClassToDeleteLogs(null)
    } catch (error) {
       console.error("Failed to delete class logs:", error);
    }
  }

  const handleExportPDF = () => {
    if (!reportData || !selectedStudent) return

    const doc = new jsPDF()
    const {
      avgParticipation,
      totalEngagement,
      logs,
      feedback,
      lessonsPerWeek,
    } = reportData
    const maxEngagement = lessonsPerWeek * 5

    doc.setFontSize(18)
    doc.text(`Weekly Report for ${selectedStudent.name}`, 14, 22)
    doc.setFontSize(11)
    doc.text(
      `Week of: ${new Date(reportData.weekStartDate).toLocaleDateString()}`,
      14,
      30
    )

    doc.setFontSize(12)
    doc.text("Summary", 14, 45)
    doc.setFontSize(10)
    doc.text(
      `Average Participation: ${avgParticipation.toFixed(1)} / 20`,
      14,
      52
    )
    doc.text(
      `Total Engagement: ${totalEngagement.toFixed(1)} / ${maxEngagement}`,
      14,
      59
    )

    let startY = 70
    if (feedback) {
      doc.setFontSize(12)
      doc.text("AI Feedback", 14, startY)
      startY += 7
      const splitFeedback = doc.splitTextToSize(feedback, 180)
      doc.setFontSize(10)
      doc.text(splitFeedback, 14, startY)
      startY += splitFeedback.length * 5 + 5
    }

    const tableColumn = ["Date", "Comment", "Participation", "Engagement"]
    const tableRows = logs.map((log) => [
      new Date(log.date).toLocaleDateString(),
      log.comments,
      `${calculateParticipationScore(log.participation)}/20`,
      `${calculateEngagementScore(log.engagement).toFixed(1)}/5`,
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: startY,
    })

    doc.save(`report_${selectedStudent.id}_${reportData.weekStartDate}.pdf`)
  }

  const handleExportExcel = () => {
    if (!reportData || !selectedStudent) return

    const {
      avgParticipation,
      totalEngagement,
      logs,
      feedback,
      weekStartDate,
      lessonsPerWeek,
    } = reportData
    const maxEngagement = lessonsPerWeek * 5

    const summaryData = [
      ["Student Name", selectedStudent.name],
      ["Week Start Date", new Date(weekStartDate).toLocaleDateString()],
      [],
      ["Metric", "Score", "Max"],
      ["Average Participation", avgParticipation.toFixed(1), 20],
      ["Total Engagement", totalEngagement.toFixed(1), maxEngagement],
      [],
      ["AI Feedback"],
      [feedback || "N/A"],
    ]
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)

    const logsData = logs.map((log) => ({
      Date: new Date(log.date).toLocaleDateString(),
      Comments: log.comments,
      "Participation Score": calculateParticipationScore(log.participation),
      "Engagement Score": calculateEngagementScore(log.engagement),
    }))
    const logsWs = XLSX.utils.json_to_sheet(logsData)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, summaryWs, "Report Summary")
    XLSX.utils.book_append_sheet(wb, logsWs, "Daily Logs")

    XLSX.writeFile(wb, `report_${selectedStudent.id}_${weekStartDate}.xlsx`)
  }

  const handleExportClassPDF = () => {
    if (!classReportData) return
    const {
      className,
      weekStartDate,
      totalStudents,
      atRiskStudentsCount,
      passingStudentsCount,
      atRiskStudents,
      lessonsPerWeek,
    } = classReportData
    const maxEngagement = lessonsPerWeek * 5

    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(`Weekly Report for ${className}`, 14, 22)
    doc.setFontSize(11)
    doc.text(`Week of: ${new Date(weekStartDate).toLocaleDateString()}`, 14, 30)

    doc.setFontSize(12)
    doc.text("Class Summary", 14, 45)
    doc.setFontSize(10)
    doc.text(`Total Students: ${totalStudents}`, 14, 52)
    doc.text(`Passing Students: ${passingStudentsCount}`, 14, 59)
    doc.text(`At-Risk Students: ${atRiskStudentsCount}`, 14, 66)

    if (atRiskStudents.length > 0) {
      const tableColumn = [
        "Student Name",
        "Avg. Participation",
        "Total Engagement",
      ]
      const tableRows = atRiskStudents.map((s) => [
        s.name,
        s.avgParticipation.toFixed(1),
        `${s.totalEngagement.toFixed(1)} / ${maxEngagement}`,
      ])

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 76,
      })
    }
    doc.save(`class_report_${className}_${weekStartDate}.pdf`)
  }

  const handleExportClassExcel = () => {
    if (!classReportData) return
    const {
      className,
      weekStartDate,
      totalStudents,
      atRiskStudentsCount,
      passingStudentsCount,
      atRiskStudents,
      lessonsPerWeek,
    } = classReportData
    const maxEngagement = lessonsPerWeek * 5

    const summaryData = [
      ["Class Name", className],
      ["Week Start Date", new Date(weekStartDate).toLocaleDateString()],
      [],
      ["Metric", "Count"],
      ["Total Students", totalStudents],
      ["Passing Students", passingStudentsCount],
      ["At-Risk Students", atRiskStudentsCount],
    ]
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)

    const atRiskData = atRiskStudents.map((s) => ({
      "Student Name": s.name,
      "Student ID": s.id,
      "Avg Participation Score": s.avgParticipation.toFixed(1),
      "Total Engagement Score": s.totalEngagement.toFixed(1),
      "Max Engagement Score": maxEngagement,
    }))
    const atRiskWs = XLSX.utils.json_to_sheet(atRiskData)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, summaryWs, "Class Summary")
    XLSX.utils.book_append_sheet(wb, atRiskWs, "At-Risk Students")

    XLSX.writeFile(wb, `class_report_${className}_${weekStartDate}.xlsx`)
  }

  const handleExportDailyPDF = () => {
    if (!dailyReportData || !selectedDailyStudent) return
    const doc = new jsPDF()

    const { date, comments, participation, engagement } = dailyReportData
    const participationScore = calculateParticipationScore(participation)
    const engagementScore = calculateEngagementScore(engagement)

    doc.setFontSize(18)
    doc.text(`Daily Report for ${selectedDailyStudent.name}`, 14, 22)
    doc.setFontSize(11)
    doc.text(`Date: ${new Date(date).toLocaleDateString()}`, 14, 30)

    doc.setFontSize(12)
    autoTable(doc, {
      startY: 40,
      head: [["Metric", "Score", "Details"]],
      body: [
        [
          "Participation",
          `${participationScore} / 20`,
          `Frequency: ${participation.frequency}/10, Collaboration: ${participation.collaboration}/10`,
        ],
        [
          "Engagement",
          `${engagementScore.toFixed(1)} / 5`,
          `Attended: ${engagement.attendance}, Prepared: ${engagement.preparedness}, Focus: ${engagement.focus}, Respect: ${engagement.respect}`,
        ],
        ["Comments", comments || "N/A", ""],
      ],
      columnStyles: { 2: { cellWidth: "auto" } },
    })

    doc.save(
      `daily_report_${selectedDailyStudent.id}_${dailyReportData.date}.pdf`
    )
  }

  const handleExportDailyExcel = () => {
    if (!dailyReportData || !selectedDailyStudent) return

    const { date, comments, participation, engagement } = dailyReportData
    const participationScore = calculateParticipationScore(participation)
    const engagementScore = calculateEngagementScore(engagement)

    const report = [
      ["Student Name", selectedDailyStudent.name],
      ["Date", new Date(date).toLocaleDateString()],
      [],
      ["Metric", "Score", "Max Score"],
      ["Participation", participationScore, 20],
      ["Engagement", engagementScore.toFixed(1), 5],
      [],
      ["Comments", comments || "N/A"],
      [],
      ["Participation Details"],
      ["Frequency", participation.frequency],
      ["Collaboration", participation.collaboration],
      [],
      ["Engagement Details"],
      ["Attendance", engagement.attendance],
      ["Preparedness", engagement.preparedness],
      ["Focus", engagement.focus],
      ["Respect", engagement.respect],
    ]

    const ws = XLSX.utils.aoa_to_sheet(report)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Daily Report")
    XLSX.writeFile(
      wb,
      `daily_report_${selectedDailyStudent.id}_${date}.xlsx`
    )
  }

  const selectedStudent = students.find(
    (s) => s.id === selectedStudentId
  )
  const selectedDailyStudent = students.find(
    (s) => s.id === selectedDailyStudentId
  )

  if (!isDataLoaded) {
    return (
     <div className="space-y-6">
       <div>
         <h1 className="text-3xl font-bold md:text-4xl">Reports</h1>
         <p className="text-muted-foreground">
           Loading data...
         </p>
       </div>
     </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">Reports</h1>
        <p className="text-muted-foreground">
          Generate, export, and manage performance data.
        </p>
      </div>

      <Tabs defaultValue="student" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="student">Student Weekly</TabsTrigger>
          <TabsTrigger value="class">Class Weekly</TabsTrigger>
          <TabsTrigger value="daily">Student Daily</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
        </TabsList>
        <TabsContent value="student" className="space-y-4">
          <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
            <div className="grid flex-1 gap-2">
              <Label className="text-sm font-medium">Student</Label>
              <Select
                onValueChange={setSelectedStudentId}
                value={selectedStudentId ?? ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid flex-1 gap-2">
              <Label className="text-sm font-medium">Week</Label>
              <Select onValueChange={setSelectedWeek} value={selectedWeek}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a week" />
                </SelectTrigger>
                <SelectContent>
                  {availableWeeks.map((weekStart) => (
                    <SelectItem key={weekStart} value={weekStart}>
                      Week of{" "}
                      {new Date(weekStart).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="self-end">
              <Button
                className="w-full sm:w-auto"
                onClick={handleGenerateReport}
                disabled={isLoading || !selectedStudentId || !selectedWeek}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CalendarDays className="mr-2 h-4 w-4" />
                )}
                {isLoading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>
          <WeeklyReportCard
            report={reportData}
            studentName={selectedStudent?.name ?? ""}
            onGenerateFeedback={handleGenerateFeedback}
            isGeneratingFeedback={isGeneratingFeedback}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
          />
        </TabsContent>
        <TabsContent value="class" className="space-y-4">
          <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
            <div className="grid flex-1 gap-2">
              <Label className="text-sm font-medium">Class</Label>
              <Select
                onValueChange={setSelectedClassId}
                value={selectedClassId ?? ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid flex-1 gap-2">
              <Label className="text-sm font-medium">Week</Label>
              <Select onValueChange={setSelectedWeek} value={selectedWeek}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a week" />
                </SelectTrigger>
                <SelectContent>
                  {availableWeeks.map((weekStart) => (
                    <SelectItem key={weekStart} value={weekStart}>
                      Week of{" "}
                      {new Date(weekStart).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="self-end">
              <Button
                className="w-full sm:w-auto"
                onClick={handleGenerateClassReport}
                disabled={
                  isClassReportLoading || !selectedClassId || !selectedWeek
                }
              >
                {isClassReportLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CalendarDays className="mr-2 h-4 w-4" />
                )}
                {isClassReportLoading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>
          <ClassReportCard
            report={classReportData}
            onExportPDF={handleExportClassPDF}
            onExportExcel={handleExportClassExcel}
          />
        </TabsContent>
        <TabsContent value="daily" className="space-y-4">
          <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
            <div className="grid flex-1 gap-2">
              <Label className="text-sm font-medium">Student</Label>
              <Select
                onValueChange={setSelectedDailyStudentId}
                value={selectedDailyStudentId ?? ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid flex-1 gap-2">
              <Label className="text-sm font-medium">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="self-end">
              <Button
                className="w-full sm:w-auto"
                onClick={handleGenerateDailyReport}
                disabled={
                  isDailyReportLoading ||
                  !selectedDailyStudentId ||
                  !selectedDate
                }
              >
                {isDailyReportLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CalendarDays className="mr-2 h-4 w-4" />
                )}
                {isDailyReportLoading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>
          <DailyReportCard
            report={dailyReportData}
            studentName={selectedDailyStudent?.name ?? ""}
            onExportPDF={handleExportDailyPDF}
            onExportExcel={handleExportDailyExcel}
          />
        </TabsContent>
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DatabaseZap />
                Data Management
              </CardTitle>
              <CardDescription>
                Permanently delete records from the application. This action
                cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Delete Student Records</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Delete all daily logs for a single student.
                </p>
                <div className="flex items-end gap-4">
                  <div className="grid flex-1 gap-2">
                    <Label>Student</Label>
                    <Select
                      onValueChange={(id) => {
                        const student = students.find(
                          (s) => s.id === id
                        )
                        setStudentToDeleteLogs(student ?? null)
                      }}
                      value={studentToDeleteLogs?.id ?? ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteStudentLogsAlertOpen(true)}
                    disabled={!studentToDeleteLogs}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Logs
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Delete Class Records</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Delete all daily logs for every student in a class.
                </p>
                <div className="flex items-end gap-4">
                  <div className="grid flex-1 gap-2">
                    <Label>Class</Label>
                    <Select
                      onValueChange={(id) => {
                        const cls = classes.find((c) => c.id === id)
                        setClassToDeleteLogs(cls ?? null)
                      }}
                       value={classToDeleteLogs?.id ?? ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteClassLogsAlertOpen(true)}
                    disabled={!classToDeleteLogs}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Logs
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <AlertDialog
        open={isDeleteStudentLogsAlertOpen}
        onOpenChange={(open) => {
            setIsDeleteStudentLogsAlertOpen(open);
            if (!open) setStudentToDeleteLogs(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              daily logs for <strong>{studentToDeleteLogs?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteStudentLogs}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteClassLogsAlertOpen}
        onOpenChange={(open) => {
            setIsDeleteClassLogsAlertOpen(open)
            if (!open) setClassToDeleteLogs(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              daily logs for every student in the class{" "}
              <strong>{classToDeleteLogs?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteClassLogs}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
