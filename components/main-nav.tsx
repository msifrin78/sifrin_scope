
"use client"

import {
  BarChart,
  GraduationCap,
  LayoutDashboard,
  Users,
  Settings,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "./ui/sidebar"
import { useData } from "../context/data-context"
import { Separator } from "./ui/separator"

export function MainNav() {
  const pathname = usePathname()
  const { classes } = useData()

  const navItems = [
    { href: "/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
    { href: "/dashboard/students", icon: <Users />, label: "Students" },
    { href: "/dashboard/reports", icon: <BarChart />, label: "Reports" },
    { href: "/dashboard/settings", icon: <Settings />, label: "Settings" },
  ]

  return (
    <nav className="flex flex-1 flex-col justify-between p-2">
      <SidebarMenu>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href}
              tooltip={item.label}
            >
              <Link href={item.href}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>

      <div className="flex flex-col gap-2">
        <Separator className="mx-2 my-2 w-auto" />
        <div className="mb-1 px-2 text-xs font-semibold text-muted-foreground group-data-[collapsible=icon]:hidden">
          Classes
        </div>
        <SidebarMenu>
          {classes.map((c) => (
            <SidebarMenuItem key={c.id}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(`/dashboard/classes/${c.id}`)}
                tooltip={c.name}
                size="sm"
              >
                <Link href={`/dashboard/classes/${c.id}`}>
                  <GraduationCap />
                  <span>{c.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </div>
    </nav>
  )
}
