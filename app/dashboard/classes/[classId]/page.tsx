
"use client"

import React from "react"
import { DailyLogTable } from "../../../../components/daily-log-table"
import { useData } from "../../../../context/data-context"
import { notFound } from "next/navigation"

export default function ClassLogPage({
  params,
}: {
  params: { classId: string }
}) {
  const { classId } = params
  const { classes, students, isDataLoaded } = useData()

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">{currentClass.name}</h1>
        <p className="text-muted-foreground">
          Enter today's participation and engagement logs.
        </p>
      </div>
      <DailyLogTable students={classStudents} />
    </div>
  )
}
