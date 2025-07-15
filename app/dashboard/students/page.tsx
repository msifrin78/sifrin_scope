
"use client"

import React, { useState, useEffect } from "react"
import { Button } from "../../../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select"
import { MoreHorizontal, Pencil, PlusCircle, Trash2 } from "lucide-react"
import { useToast } from "../../../hooks/use-toast"
import { useData } from "../../../context/data-context"
import type { Student, Class } from "../../../lib/definitions"

export default function StudentsPage() {
  const { 
    students, 
    classes, 
    isDataLoaded,
    addClass,
    addStudent,
    updateStudent,
    deleteStudent
  } = useData()

  // Add Student State
  const [newStudentName, setNewStudentName] = useState("")
  const [newStudentClassId, setNewStudentClassId] = useState("")
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false)

  // Add Class State
  const [newClassName, setNewClassName] = useState("")
  const [newClassLessonsPerWeek, setNewClassLessonsPerWeek] = useState("5")
  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false)

  // Edit Student State
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null)
  const [isEditStudentDialogOpen, setIsEditStudentDialogOpen] = useState(false)
  const [editStudentName, setEditStudentName] = useState("")
  const [editStudentClassId, setEditStudentClassId] = useState("")

  // Delete Student State
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)

  const { toast } = useToast()

  // Populate edit form when a student is selected for editing
  useEffect(() => {
    if (studentToEdit) {
      setEditStudentName(studentToEdit.name)
      setEditStudentClassId(studentToEdit.classId)
      setIsEditStudentDialogOpen(true)
    } else {
      setIsEditStudentDialogOpen(false)
    }
  }, [studentToEdit])

  // Open delete alert when a student is selected for deletion
  useEffect(() => {
    if (studentToDelete) {
      setIsDeleteAlertOpen(true)
    } else {
      setIsDeleteAlertOpen(false)
    }
  }, [studentToDelete])

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudentName || !newStudentClassId) {
      toast({
        title: "Missing Information",
        description: "Please provide the student's name and select a class.",
        variant: "destructive",
      })
      return
    }
    const newStudent: Omit<Student, 'id' | 'studentId'> = {
      name: newStudentName,
      classId: newStudentClassId,
    }
    await addStudent(newStudent as Omit<Student, 'id'>);
    toast({
      title: "Student Added",
      description: `${newStudentName} has been added.`,
    })
    setNewStudentName("")
    setNewStudentClassId("")
    setIsStudentDialogOpen(false)
  }

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault()
    const lessonsCount = parseInt(newClassLessonsPerWeek, 10)
    if (!newClassName || isNaN(lessonsCount) || lessonsCount <= 0) {
      toast({
        title: "Missing Information",
        description:
          "Please provide a valid class name and number of weekly lessons.",
        variant: "destructive",
      })
      return
    }
    const newClass: Omit<Class, 'id'> = {
      name: newClassName,
      lessonsPerWeek: lessonsCount,
    }
    await addClass(newClass);
    toast({
      title: "Class Added",
      description: `${newClassName} has been added.`,
    })
    setNewClassName("")
    setNewClassLessonsPerWeek("5")
    setIsClassDialogOpen(false)
  }

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentToEdit) return
    
    await updateStudent(studentToEdit.id, {
      name: editStudentName,
      classId: editStudentClassId,
    });
    
    toast({
      title: "Student Updated",
      description: `${editStudentName}'s information has been updated.`,
    })
    setStudentToEdit(null)
  }

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return
    
    await deleteStudent(studentToDelete.id);

    toast({
      title: "Student Deleted",
      description: `${studentToDelete.name} has been removed from the roster.`,
    })
    setStudentToDelete(null)
  }
  
  const studentsByClass = classes.map(c => ({
    ...c,
    students: students.filter(s => s.classId === c.id).sort((a, b) => a.name.localeCompare(b.name))
  }));

  if (!isDataLoaded) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Students</h1>
          <p className="text-muted-foreground">
            Loading student and class data...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Students</h1>
          <p className="text-muted-foreground">
            Manage your student roster and classes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isClassDialogOpen} onOpenChange={setIsClassDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleAddClass}>
                <DialogHeader>
                  <DialogTitle>Add New Class</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new class. Click save when you're
                    done.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="className" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="className"
                      placeholder="e.g., Period 5 - English"
                      className="col-span-3"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="lessonsPerWeek" className="text-right">
                      Lessons/Week
                    </Label>
                    <Input
                      id="lessonsPerWeek"
                      type="number"
                      min="1"
                      placeholder="e.g., 5"
                      className="col-span-3"
                      value={newClassLessonsPerWeek}
                      onChange={(e) => setNewClassLessonsPerWeek(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save Class</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isStudentDialogOpen}
            onOpenChange={setIsStudentDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleAddStudent}>
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                  <DialogDescription>
                    Enter the student's details here. Click save when you're
                    done.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      className="col-span-3"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="classId" className="text-right">
                      Class
                    </Label>
                    <Select
                      onValueChange={setNewStudentClassId}
                      value={newStudentClassId}
                    >
                      <SelectTrigger id="classId" className="col-span-3">
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save Student</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Student Roster</CardTitle>
          <CardDescription>
            A list of all students currently enrolled, grouped by class.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {studentsByClass.map(c => (
            <div key={c.id} className="mb-8">
              <h3 className="text-xl font-semibold mb-2">{c.name}</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.students.length > 0 ? (
                      c.students.map((student, index) => (
                        <TableRow key={student.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">More options</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => setStudentToEdit(student)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => setStudentToDelete(student)}
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No students in this class yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      
      {/* Edit Student Dialog */}
      <Dialog open={isEditStudentDialogOpen} onOpenChange={(open) => !open && setStudentToEdit(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditStudent}>
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
              <DialogDescription>
                Update the student's details here. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  className="col-span-3"
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-classId" className="text-right">
                  Class
                </Label>
                <Select
                  onValueChange={setEditStudentClassId}
                  value={editStudentClassId}
                >
                  <SelectTrigger id="edit-classId" className="col-span-3">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Student Alert Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong>{studentToDelete?.name}</strong> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStudent} className={("bg-destructive text-destructive-foreground hover:bg-destructive/90")}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
