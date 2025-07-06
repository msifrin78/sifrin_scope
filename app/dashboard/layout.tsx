
import React from "react"
import { DashboardHeader } from "../../components/dashboard-header"
import { MainNav } from "../../components/main-nav"
import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
} from "../../components/ui/sidebar"
import { DataProvider } from "../../context/data-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DataProvider>
      <SidebarProvider>
        <div className="flex min-h-screen">
          <Sidebar>
            <div className="flex h-full flex-col">
              <DashboardHeader isSidebar={true} />
              <MainNav />
            </div>
          </Sidebar>
          <SidebarInset className="flex flex-col">
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </DataProvider>
  )
}
