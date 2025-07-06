
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { BarChart, BookOpenCheck, Home, Users, Settings } from "lucide-react"
import Link from "next/link"
import { SidebarTrigger } from "./ui/sidebar"
import { useData } from "../context/data-context"

type DashboardHeaderProps = {
  isSidebar?: boolean
}

export function DashboardHeader({ isSidebar = false }: DashboardHeaderProps) {
  const { profilePicture } = useData()

  if (isSidebar) {
    return (
      <header className="flex h-16 shrink-0 items-center border-b px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <BookOpenCheck className="h-6 w-6 text-primary" />
          <span className="group-data-[collapsible=icon]:hidden">
            Sifrin's Scope
          </span>
        </Link>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <SidebarTrigger />
      </div>
      <div className="w-full flex-1">{/* Can add breadcrumbs here */}</div>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="icon" className="rounded-full">
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            <span className="sr-only">Dashboard</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="icon" className="rounded-full">
          <Link href="/dashboard/students">
            <Users className="h-4 w-4" />
            <span className="sr-only">Students</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="icon" className="rounded-full">
          <Link href="/dashboard/reports">
            <BarChart className="h-4 w-4" />
            <span className="sr-only">Reports</span>
          </Link>
        </Button>
        <div className="ml-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage
                    src={profilePicture || undefined}
                    alt="Teacher avatar"
                  />
                  <AvatarFallback>T</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/">Logout</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
