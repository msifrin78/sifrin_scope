
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
import { Checkbox } from "./ui/checkbox"
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
    frequency: 10,
    collaboration: 10,
  },
  engagement: {
    attendance: true,
    preparedness: 1,
    focus: 1,
    respect: 1,
  },
  comments: "",
}

const frequencyOptions = [
  { value: 10, label: "Participated several times (-0)" },
  { value: 7, label: "Participated only once (-3)" },
  { value: 5, label: "Needed prompting (-5)" },
  { value: 0, label: "Did not participate (-10)" },
]

const collaborationOptions = [
  { value: 10, label: "Excellent collaboration (-0)" },
  { value: 7, label: "Good collaboration (-3)" },
  { value: 5, label: "Fair collaboration (-5)" },
  { value: 0, label: "Poor/No collaboration (-10)" },
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
        // Ensure existing logs have the new participation structure
        initialLogs[student.id] = {
          participation: {
            frequency: existingLog.participation.frequency ?? 10,
            collaboration: existingLog.participation.collaboration ?? 10,
          },
          engagement: existingLog.engagement,
          comments: existingLog.comments,
        }
      } else {
        initialLogs[student.id] = JSON.parse(JSON.stringify(initialLogState))
      }
    })
    setLogs(initialLogs)
  }, [date, dailyLogs, students])

  const handleParticipationChange = (
    studentId: string,
    field: keyof ParticipationDetails,
    value: string
  ) => {
    setLogs((prevLogs) => ({
      ...prevLogs,
      [studentId]: {
        ...prevLogs[studentId],
        participation: {
          ...prevLogs[studentId].participation,
          [field]: Number(value),
        },
      },
    }))
  }

  const handleEngagementChange = (
    studentId: string,
    field: keyof EngagementDetails,
    value: any
  ) => {
    setLogs((prevLogs) => ({
      ...prevLogs,
      [studentId]: {
        ...prevLogs[studentId],
        engagement: {
          ...prevLogs[studentId].engagement,
          [field]: value,
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
      description: "Today's records have been successfully saved.",
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
              <TableHead>Participation (20)</TableHead>
              <TableHead>Engagement (5)</TableHead>
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
                              participationScore < 12 ? "text-destructive" : ""
                            }`}
                          >
                            {participationScore} / 20
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="grid gap-4">
                          <h4 className="font-medium leading-none">
                            Participation Details
                          </h4>
                           <div className="space-y-4">
                            <div>
                              <Label>Participation Frequency</Label>
                              <Select
                                value={String(studentLog.participation.frequency)}
                                onValueChange={(v) =>
                                  handleParticipationChange(
                                    student.id,
                                    "frequency",
                                    v
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {frequencyOptions.map(opt => (
                                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                             <div>
                              <Label>Quality &amp; Collaboration</Label>
                              <Select
                                value={String(studentLog.participation.collaboration)}
                                onValueChange={(v) =>
                                  handleParticipationChange(
                                    student.id,
                                    "collaboration",
                                    v
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                   {collaborationOptions.map(opt => (
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
                            {engagementScore.toFixed(1)} / 5
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="grid gap-4">
                          <h4 className="font-medium leading-none">
                            Engagement Details
                          </h4>
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`attendance-${student.id}`}
                                checked={studentLog.engagement.attendance}
                                onCheckedChange={(checked) =>
                                  handleEngagementChange(
                                    student.id,
                                    "attendance",
                                    !!checked
                                  )
                                }
                              />
                              <Label htmlFor={`attendance-${student.id}`}>
                                Attended (+2 pts)
                              </Label>
                            </div>
                            <div>
                              <Label>Preparedness</Label>
                              <Select
                                value={String(
                                  studentLog.engagement.preparedness
                                )}
                                onValueChange={(v) =>
                                  handleEngagementChange(
                                    student.id,
                                    "preparedness",
                                    Number(v)
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">
                                    Excellent (1)
                                  </SelectItem>
                                  <SelectItem value="0.5">Okay (0.5)</SelectItem>
                                  <SelectItem value="0">Poor (0)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Focus</Label>
                              <Select
                                value={String(studentLog.engagement.focus)}
                                onValueChange={(v) =>
                                  handleEngagementChange(
                                    student.id,
                                    "focus",
                                    Number(v)
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">
                                    Excellent (1)
                                  </SelectItem>
                                  <SelectItem value="0.5">Okay (0.5)</SelectItem>
                                  <SelectItem value="0">Poor (0)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Respect</Label>
                              <Select
                                value={String(studentLog.engagement.respect)}
                                onValueChange={(v) =>
                                  handleEngagementChange(
                                    student.id,
                                    "respect",
                                    Number(v)
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">
                                    Respectful (1)
                                  </SelectItem>
                                  <SelectItem value="0">
                                    Disrespectful (0)
                                  </SelectItem>
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
