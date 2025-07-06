
"use client"

import type { WeeklySummary } from "../lib/definitions"
import {
  Bot,
  Download,
  FileText,
  Loader2,
  Printer,
  Sparkles,
} from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Separator } from "./ui/separator"

type WeeklyReportCardProps = {
  report: WeeklySummary | null
  studentName: string
  onGenerateFeedback: () => Promise<void>
  isGeneratingFeedback: boolean
  onExportPDF: () => void
  onExportExcel: () => void
}

export function WeeklyReportCard({
  report,
  studentName,
  onGenerateFeedback,
  isGeneratingFeedback,
  onExportPDF,
  onExportExcel,
}: WeeklyReportCardProps) {
  const handlePrint = () => {
    window.print()
  }

  if (!report) {
    return (
      <Card className="flex items-center justify-center p-10 text-center">
        <div>
          <h3 className="text-lg font-semibold">No Report Generated</h3>
          <p className="text-muted-foreground">
            Select a student and week, then click "Generate Report" to view
            details.
          </p>
        </div>
      </Card>
    )
  }

  const maxEngagement = report.lessonsPerWeek * 5
  const engagementThreshold = maxEngagement * 0.48 // e.g., 12 for 25 (5 lessons)
  const isParticipationWarning = report.avgParticipation < 12
  const isEngagementWarning = report.totalEngagement < engagementThreshold

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText />
          Weekly Report: {studentName}
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
            <p className="text-sm text-muted-foreground">Avg. Participation</p>
            <p
              className={`text-2xl font-bold ${
                isParticipationWarning ? "text-destructive" : ""
              }`}
            >
              {report.avgParticipation.toFixed(1)} / 20
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Engagement</p>
            <p
              className={`text-2xl font-bold ${
                isEngagementWarning ? "text-destructive" : ""
              }`}
            >
              {report.totalEngagement.toFixed(1)} / {maxEngagement}
            </p>
            {isEngagementWarning && (
              <p className="text-xs text-destructive">
                Warning: Below threshold
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-lg border bg-secondary/30 p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Feedback
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={onGenerateFeedback}
              disabled={isGeneratingFeedback}
            >
              {isGeneratingFeedback ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bot className="mr-2 h-4 w-4" />
              )}
              {report.feedback ? "Regenerate" : "Generate"}
            </Button>
          </div>
          {isGeneratingFeedback ? (
            <p className="text-sm italic text-muted-foreground">
              Generating feedback...
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {report.feedback ||
                "Click 'Generate' to get an AI-powered summary of the student's week."}
            </p>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold">Daily Breakdown</h3>
          {report.logs.length > 0 ? (
            <div className="space-y-2 text-sm">
              {report.logs.map((log) => (
                <p key={log.id}>
                  <strong>
                    {new Date(log.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                    :
                  </strong>{" "}
                  {log.comments || "No comments."}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No logs found for this week.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
