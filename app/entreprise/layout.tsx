"use client"

import type React from "react"
import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"

interface CompanyLayoutProps {
  children: React.ReactNode
}

export default function CompanyLayout({ children }: CompanyLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} role="company" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          userName="Alice Martin"
          userRole="Gestionnaire Entreprise"
        />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
