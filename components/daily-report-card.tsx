"use client"

import type { DailyLog } from "@/lib/definitions"
import {
  calculateEngagementScore,
  calculateParticipationScore,
} from "@/lib/scoring"
import { Download, FileText, Printer } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "./ui/separator"

type DailyReportCardProps = {
  report: DailyLog | null
  studentName: string
  onExportPDF: () => void
  onExportExcel: () => void
}

export function DailyReportCard({
  report,
  studentName,
  onExportPDF,
  onExportExcel,
}: DailyReportCardProps) {
  const handlePrint = () => {
    window.print()
  }

  if (!report) {
    return (
      <Card className="flex min-h-[400px] items-center justify-center p-10 text-center">
        <div>
          <h3 className="text-lg font-semibold">No Daily Report Generated</h3>
          <p className="text-muted-foreground">
            Select a student and date, then click "Generate Report".
            <br />
            If a report is not found, no log exists for that day.
          </p>
        </div>
      </Card>
    )
  }

  const participationScore = calculateParticipationScore(report.participation)
  const engagementScore = calculateEngagementScore(report.engagement)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText />
          Daily Report: {studentName} (
          {new Date(report.date).toLocaleDateString("en-US", {
            timeZone: "UTC",
          })}
          )
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            <span className="sr-only">Print Report</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
                <span className="sr-only">Export Report</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onExportPDF}>
                Download as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportExcel}>
                Download as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Participation</p>
            <p
              className={`text-2xl font-bold ${
                participationScore < 12 ? "text-destructive" : ""
              }`}
            >
              {participationScore} / 20
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Engagement</p>
            <p
              className={`text-2xl font-bold ${
                engagementScore < 3 ? "text-destructive" : ""
              }`}
            >
              {engagementScore.toFixed(1)} / 5
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="font-semibold">Comments</h3>
          <p className="text-sm text-muted-foreground">
            {report.comments || "No comments for this day."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
