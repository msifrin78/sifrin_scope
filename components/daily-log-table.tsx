"use client"

import { useState } from "react"
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
import { Calendar as CalendarIcon, Save } from "lucide-react"
import { Slider } from "./ui/slider"
import { Label } from "./ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

type DailyLogState = Omit<DailyLog, "id" | "studentId" | "date">

const initialLogState: DailyLogState = {
  participation: {
    amount: 4,
    quality: 4,
    listening: 4,
    attitude: 4,
    initiative: 4,
  },
  engagement: {
    attendance: true,
    preparedness: 1,
    focus: 1,
    respect: 1,
  },
  comments: "",
}

const participationCategories: {
  id: keyof ParticipationDetails
  label: string
}[] = [
  { id: "amount", label: "Amount" },
  { id: "quality", label: "Quality" },
  { id: "listening", label: "Listening" },
  { id: "attitude", label: "Attitude" },
  { id: "initiative", label: "Initiative" },
]

export function DailyLogTable({ students }: { students: Student[] }) {
  const [logs, setLogs] = useState<Record<string, DailyLogState>>(() =>
    students.reduce((acc, student) => {
      acc[student.id] = JSON.parse(JSON.stringify(initialLogState)) // Deep copy
      return acc
    }, {} as Record<string, DailyLogState>)
  )
  const { toast } = useToast()

  const handleParticipationChange = (
    studentId: string,
    field: keyof ParticipationDetails,
    value: number[]
  ) => {
    setLogs((prevLogs) => ({
      ...prevLogs,
      [studentId]: {
        ...prevLogs[studentId],
        participation: {
          ...prevLogs[studentId].participation,
          [field]: value[0],
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

  const handleSave = () => {
    // This is where you would send the data to Firebase
    console.log("Saving logs:", logs)
    toast({
      title: "Logs Saved",
      description: "Today's records have been successfully saved.",
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <CalendarIcon className="mr-2 h-4 w-4" /> Today
          </Button>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Save Logs
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Student</TableHead>
              <TableHead>Participation (20)</TableHead>
              <TableHead>Engagement (5)</TableHead>
              <TableHead className="w-[250px]">Comments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
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
                            {participationCategories.map((cat) => (
                              <div key={cat.id} className="space-y-2">
                                <Label htmlFor={`${cat.id}-${student.id}`}>
                                  {cat.label} (
                                  {studentLog.participation[cat.id]})
                                </Label>
                                <Slider
                                  id={`${cat.id}-${student.id}`}
                                  min={0}
                                  max={4}
                                  step={1}
                                  value={[studentLog.participation[cat.id]]}
                                  onValueChange={(value) =>
                                    handleParticipationChange(
                                      student.id,
                                      cat.id,
                                      value
                                    )
                                  }
                                />
                              </div>
                            ))}
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
