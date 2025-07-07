
"use client"

import React, { useState, useEffect } from "react"
import { Button } from "./ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
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
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { useToast } from "../hooks/use-toast"
import { useData } from "../context/data-context"
import type { DailyLog, Class } from "../lib/definitions"
import {
  ArrowRight,
  UserCog,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import Link from "next/link"

export function DashboardClient() {
  const { classes, students, dailyLogs, isDataLoaded, updateClass, deleteClass } = useData()

  // Edit Class State
  const [classToEdit, setClassToEdit] = useState<Class | null>(null)
  const [isEditClassDialogOpen, setIsEditClassDialogOpen] = useState(false)
  const [editClassName, setEditClassName] = useState("")
  const [editClassLessons, setEditClassLessons] = useState("")

  // Delete Class State
  const [classToDelete, setClassToDelete] = useState<Class | null>(null)
  const [isDeleteClassAlertOpen, setIsDeleteClassAlertOpen] = useState(false)

  const { toast } = useToast()

  // Populate edit form when a class is selected for editing
  useEffect(() => {
    if (classToEdit) {
      setEditClassName(classToEdit.name)
      setEditClassLessons(String(classToEdit.lessonsPerWeek))
      setIsEditClassDialogOpen(true)
    } else {
      setIsEditClassDialogOpen(false)
    }
  }, [classToEdit])

  // Open delete alert when a class is selected for deletion
  useEffect(() => {
    if (classToDelete) {
      setIsDeleteClassAlertOpen(true)
    } else {
      setIsDeleteClassAlertOpen(false)
    }
  }, [classToDelete])

  const calculateEngagementScore = (log: DailyLog) => {
    let score = 0
    if (log.engagement.attendance) score += 2
    score += log.engagement.preparedness
    score += log.engagement.focus
    score += log.engagement.respect
    return score
  }

  const getWeeklyEngagementScore = (studentId: string) => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)) // Monday as start of week
    startOfWeek.setHours(0, 0, 0, 0)

    const studentLogs = dailyLogs.filter(
      (log) =>
        log.studentId === studentId && new Date(log.date) >= startOfWeek
    )

    return studentLogs.reduce(
      (acc, log) => acc + calculateEngagementScore(log),
      0
    )
  }

  const getClassStats = (classId: string) => {
    const currentClass = classes.find((c) => c.id === classId)
    if (!currentClass)
      return { totalStudents: 0, studentsWithWarnings: 0 }
      
    const classStudents = students.filter((s) => s.classId === classId)
    const atRiskThreshold = currentClass.lessonsPerWeek * 2.4

    const studentsWithWarnings = classStudents.filter(
      (s) => getWeeklyEngagementScore(s.id) < atRiskThreshold
    ).length

    return {
      totalStudents: classStudents.length,
      studentsWithWarnings,
    }
  }

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classToEdit) return
    const lessonsCount = parseInt(editClassLessons, 10)
    if (!editClassName || isNaN(lessonsCount) || lessonsCount <= 0) {
      toast({
        title: "Invalid Information",
        description:
          "Please provide a valid class name and number of weekly lessons.",
        variant: "destructive",
      })
      return
    }

    await updateClass(classToEdit.id, {
        name: editClassName,
        lessonsPerWeek: lessonsCount,
    });
    
    toast({
      title: "Class Updated",
      description: `${editClassName}'s information has been updated.`,
    })
    setClassToEdit(null)
  }

  const handleDeleteClass = async () => {
    if (!classToDelete) return

    await deleteClass(classToDelete.id);

    toast({
      title: "Class Deleted",
      description: `${classToDelete.name} and all its students and records have been removed.`,
    })
    setClassToDelete(null)
  }

  if (!isDataLoaded) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Dashboard</h1>
          <p className="text-muted-foreground">
            Loading class data...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">Dashboard</h1>
        <p className="text-muted-foreground">
          A high-level overview of your classes.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => {
          const stats = getClassStats(c.id)
          return (
            <Card key={c.id} className="flex flex-col">
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>{c.name}</CardTitle>
                  <CardDescription>
                    {stats.totalStudents} students enrolled
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setClassToEdit(c)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setClassToDelete(c)}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Total Students</span>
                  </div>
                  <span className="font-semibold">{stats.totalStudents}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <UserCog className="h-5 w-5 text-destructive" />
                    <span className="text-sm">At-Risk</span>
                  </div>
                  <span className="font-semibold text-destructive">
                    {stats.studentsWithWarnings}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="mt-auto pt-0">
                <Button asChild className="w-full">
                  <Link href={`/dashboard/classes/${c.id}`}>
                    Go to Class <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* Edit Class Dialog */}
      <Dialog
        open={isEditClassDialogOpen}
        onOpenChange={(open) => !open && setClassToEdit(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditClass}>
            <DialogHeader>
              <DialogTitle>Edit Class</DialogTitle>
              <DialogDescription>
                Update the class details here. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-className" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-className"
                  className="col-span-3"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-classLessons" className="text-right">
                  Lessons/Week
                </Label>
                <Input
                  id="edit-classLessons"
                  type="number"
                  min="1"
                  className="col-span-3"
                  value={editClassLessons}
                  onChange={(e) => setEditClassLessons(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Class Alert Dialog */}
      <AlertDialog
        open={isDeleteClassAlertOpen}
        onOpenChange={(open) => !open && setClassToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              class <strong>{classToDelete?.name}</strong>, all of its
              enrolled students, and all of their associated logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClass}
              className={"bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              Delete Class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
