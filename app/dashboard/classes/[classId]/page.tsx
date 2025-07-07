
"use client"

import React, { useState } from "react"
import { DailyLogTable } from "../../../../components/daily-log-table"
import { useData } from "../../../../context/data-context"
import { notFound } from "next/navigation"
import { Button } from "../../../../components/ui/button"
import { Clock } from "lucide-react"
import { addDays, startOfWeek, format, isSameDay } from "date-fns"

// Helper function to get ordinal numbers (1st, 2nd, 3rd...)
const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0] || "th")
}

export default function ClassLogPage({
  params,
}: {
  params: { classId: string }
}) {
  const { classId } = params
  const { classes, students, isDataLoaded } = useData()
  const [selectedDate, setSelectedDate] = useState(new Date())

  const currentClass = classes.find((c) => c.id === classId)
  const classStudents = students.filter((s) => s.classId === classId)

  if (!isDataLoaded) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Loading...</h1>
          <p className="text-muted-foreground">
            Loading class data...
          </p>
        </div>
      </div>
    )
  }

  if (classes.length > 0 && !currentClass) {
    notFound()
  }

  if (!currentClass) {
    return null
  }

  const getWeekDates = () => {
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday
    const dates = []
    for (let i = 0; i < 5; i++) {
      // Create buttons for a 5-day school week
      dates.push(addDays(weekStart, i))
    }
    return dates
  }

  const weekDates = getWeekDates()
  const lessonDays = weekDates.slice(0, currentClass.lessonsPerWeek)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">{currentClass.name}</h1>
        <p className="text-muted-foreground">
          Select a lesson hour to enter participation and engagement logs.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {lessonDays.map((day, index) => (
          <Button
            key={day.toISOString()}
            variant={isSameDay(day, selectedDate) ? "default" : "outline"}
            onClick={() => setSelectedDate(day)}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            <span>{getOrdinal(index + 1)} hour</span>
          </Button>
        ))}
      </div>

      <DailyLogTable
        students={classStudents}
        selectedDate={format(selectedDate, "yyyy-MM-dd")}
        key={format(selectedDate, "yyyy-MM-dd")}
      />
    </div>
  )
}
