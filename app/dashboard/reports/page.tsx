
'use client';

import dynamic from 'next/dynamic'

const ReportsClient = dynamic(() => import('@/components/reports-client').then((mod) => mod.ReportsClient), { 
  ssr: false,
  loading: () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">Reports</h1>
        <p className="text-muted-foreground">
          Loading...
        </p>
      </div>
    </div>
  )
})

export default function ReportsPage() {
  return <ReportsClient />
}
