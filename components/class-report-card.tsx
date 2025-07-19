"use client"

import * as React from "react"
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from "recharts"
import type { ClassWeeklySummary } from "../lib/definitions"
import {
  Download,
  FilePieChart,
  Printer,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react"
import { Button } from "./ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Separator } from "./ui/separator"
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "./ui/chart"

type ClassReportCardProps = {
  report: ClassWeeklySummary | null
  onExportPDF: () => void
  onExportExcel: () => void
}

export function ClassReportCard({
  report,
  onExportPDF,
  onExportExcel,
}: ClassReportCardProps) {
  const handlePrint = () => {
    window.print()
  }

  if (!report) {
    return (
      <Card className="flex items-center justify-center p-10 text-center">
        <div>
          <h3 className="text-lg font-semibold">No Class Report Generated</h3>
          <p className="text-muted-foreground">
            Select a class and week, then click "Generate Report" to view
            details.
          </p>
        </div>
      </Card>
    )
  }

  const {
    className,
    weekStartDate,
    totalStudents,
    atRiskStudentsCount,
    passingStudentsCount,
    atRiskStudents,
  } = report

  const atRiskThreshold = 3;

  const chartData = [
    {
      name: "Passing",
      value: passingStudentsCount,
      fill: "var(--color-passing)",
    },
    {
      name: "At-Risk",
      value: atRiskStudentsCount,
      fill: "var(--color-atRisk)",
    },
  ]

  const chartConfig = {
    passing: {
      label: "Passing",
      color: "hsl(var(--chart-2))",
    },
    atRisk: {
      label: "At-Risk",
      color: "hsl(var(--destructive))",
    },
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FilePieChart />
            {className} - Class Report
          </CardTitle>
          <CardDescription>
            Week of {new Date(weekStartDate).toLocaleDateString()}
          </CardDescription>
        </div>
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Students
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalStudents}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Passing</CardTitle>
                  <UserCheck className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {passingStudentsCount}
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="col-span-1 sm:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">At-Risk</CardTitle>
                <UserCog className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {atRiskStudentsCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg. weekly engagement score {"<"} {atRiskThreshold}
                </p>
              </CardContent>
            </Card>
          </div>
          <Card className="flex h-[250px] flex-col items-center justify-center p-4">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square h-full w-full max-w-[250px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="name" />}
                    className="-translate-y-2"
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold">At-Risk Students List</h3>
          {atRiskStudents.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Avg. Participation</TableHead>
                    <TableHead>Avg. Engagement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atRiskStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell>
                        {student.avgParticipation.toFixed(1)} / 5
                      </TableCell>
                      <TableCell className="text-destructive">
                        {student.avgEngagement.toFixed(1)} / 5
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No students are currently at-risk in this class for the selected
              week.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
