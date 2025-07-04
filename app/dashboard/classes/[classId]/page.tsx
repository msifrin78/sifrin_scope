import { DailyLogTable } from "../../../../components/daily-log-table"
import { classes, students } from "../../../../lib/data"
import { notFound } from "next/navigation"

export default function ClassLogPage({
  params,
}: {
  params: { classId: string }
}) {
  const { classId } = params
  const currentClass = classes.find((c) => c.id === classId)
  const classStudents = students.filter((s) => s.classId === classId)

  if (!currentClass) {
    notFound()
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
