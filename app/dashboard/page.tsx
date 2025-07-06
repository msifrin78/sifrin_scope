
'use client';

import dynamic from 'next/dynamic'
import { DashboardClient } from '../../components/dashboard-client';

const DynamicDashboardClient = dynamic(() => import('../../components/dashboard-client').then(mod => mod.DashboardClient), { 
  ssr: false,
  loading: () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">Dashboard</h1>
        <p className="text-muted-foreground">
          Loading...
        </p>
      </div>
    </div>
  )
})

export default function DashboardPage() {
  return <DynamicDashboardClient />
}
