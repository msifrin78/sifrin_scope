
"use client"

import { useState, useEffect } from "react"
import type {
  Student,
  DailyLog,
  ParticipationDetails,
  EngagementDetails,
} from "../lib/definitions"
import {
  calculateEngagementScore,
  calculateParticipationScore,
} from "../lib/scoring"
import { Button } from "./ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import { Textarea } from "./ui/textarea"
import { useToast } from "../hooks/use-toast"
import { Save, ArrowUp, ArrowDown } from "lucide-react"
import { Label } from "./ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { useData } from "../context/data-context"

type DailyLogState = Omit<DailyLog, "id" | "studentId" | "date">

const initialLogState: DailyLogState = {
  participation: {
    score: 5,
  },
  engagement: {
    score: 5,
  },
  comments: "",
}

const participationOptions = [
    { value: 5, label: "5: Active, constructive, relevant" },
    { value: 4, label: "4: Mostly positive, occasional silence" },
    { value: 3, label: "3: Sporadic, low-quality, or vague" },
    { value: 2, label: "2: Passive, unclear, or off-topic" },
    { value: 1, label: "1: Disruptive or dominant" },
    { value: 0, label: "0: No participation" },
]

const engagementOptions = [
    { value: 5, label: "5: On time, focused, prepared, respectful" },
    { value: 4, label: "4: Slight delay or minor inattention" },
    { value: 3, label: "3: Often distracted, unprepared" },
    { value: 2, label: "2: Lacks engagement, disrespects norms" },
    { value: 1, label: "1: Frequent disruptions, very unfocused" },
    { value: 0, label: "0: Absent or fully disengaged" },
]

export function DailyLogTable({
  students,
  selectedDate,
}: {
  students: Student[]
  selectedDate: string
}) {
  const { toast } = useToast()
  const { dailyLogs, saveDailyLogs } = useData()
  const date = selectedDate

  const [logs, setLogs] = useState<Record<string, DailyLogState>>({})
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  useEffect(() => {
    const initialLogs: Record<string, DailyLogState> = {}
    students.forEach((student) => {
      const existingLog = dailyLogs.find(
        (l) => l.studentId === student.id && l.date === date
      )
      if (existingLog) {
        initialLogs[student.id] = {
          participation: {
            score: existingLog.participation.score ?? 5,
          },
          engagement: {
             score: existingLog.engagement.score ?? 5,
          },
          comments: existingLog.comments,
        }
      } else {
        initialLogs[student.id] = JSON.parse(JSON.stringify(initialLogState))
      }
    })
    setLogs(initialLogs)
  }, [date, dailyLogs, students])

  const handleScoreChange = (
    studentId: string,
    category: "participation" | "engagement",
    value: string
  ) => {
    setLogs((prevLogs) => ({
      ...prevLogs,
      [studentId]: {
        ...prevLogs[studentId],
        [category]: {
          score: Number(value),
        },
      },
    }))
  }

  const handleCommentChange = (studentId: string, value: string) => {
    setLogs((prevLogs) => ({
      ...prevLogs,
      [studentId]: { ...prevLogs[studentId], comments: value },
    }))
  }

  const handleSave = async () => {
    const studentIdsInTable = students.map((s) => s.id)
    await saveDailyLogs(logs, studentIdsInTable, date);

    toast({
      title: "Logs Saved",
      description: "Today's records have been successfully saved to the cloud.",
    })
  }
  
  const handleSort = () => {
    setSortOrder(current => (current === "asc" ? "desc" : "asc"));
  };

  const sortedStudents = [...students].sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    if (nameA < nameB) return sortOrder === "asc" ? -1 : 1;
    if (nameA > nameB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Save Logs
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead className="w-[200px]">
                <Button variant="ghost" onClick={handleSort} className="-ml-4">
                  Student
                  {sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />}
                </Button>
              </TableHead>
              <TableHead>Participation (5)</TableHead>
              <TableHead>Presence & Eng. (5)</TableHead>
              <TableHead className="w-[250px]">Comments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStudents.map((student, index) => {
              const studentLog = logs[student.id]
              if (!studentLog) return null

              const participationScore = calculateParticipationScore(
                studentLog.participation
              )
              const engagementScore = calculateEngagementScore(
                studentLog.engagement
              )

              return (
                <TableRow key={student.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-28 justify-start"
                        >
                          <span
                            className={`font-bold ${
                              participationScore < 3 ? "text-destructive" : ""
                            }`}
                          >
                            {participationScore} / 5
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="grid gap-4">
                          <h4 className="font-medium leading-none">
                            Participation Rubric
                          </h4>
                           <div className="space-y-4">
                            <div>
                              <Label>Score</Label>
                              <Select
                                value={String(studentLog.participation.score)}
                                onValueChange={(v) =>
                                  handleScoreChange(
                                    student.id,
                                    "participation",
                                    v
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {participationOptions.map(opt => (
                                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-28 justify-start"
                        >
                          <span
                            className={`font-bold ${
                              engagementScore < 3 ? "text-destructive" : ""
                            }`}
                          >
                            {engagementScore.toFixed(0)} / 5
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96">
                        <div className="grid gap-4">
                          <h4 className="font-medium leading-none">
                            Presence & Engagement Rubric
                          </h4>
                          <div className="space-y-4">
                             <div>
                              <Label>Score</Label>
                              <Select
                                value={String(studentLog.engagement.score)}
                                onValueChange={(v) =>
                                  handleScoreChange(
                                    student.id,
                                    "engagement",
                                    v
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                   {engagementOptions.map(opt => (
                                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    <Textarea
                      className="h-8 min-h-[32px] resize-none"
                      value={studentLog.comments}
                      onChange={(e) =>
                        handleCommentChange(student.id, e.target.value)
                      }
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
