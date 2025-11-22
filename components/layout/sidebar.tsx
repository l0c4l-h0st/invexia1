"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Box, Users, BarChart3, Menu, X, Building2, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  role: "super-admin" | "company" | "employee"
}

export function Sidebar({ isOpen, onToggle, role }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (path: string) => pathname === path

  const navItems = {
    "super-admin": [
      { label: "Tableau de bord", href: "/admin", icon: BarChart3 },
      { label: "Entreprises", href: "/admin/companies", icon: Building2 },
      { label: "Utilisateurs", href: "/admin/users", icon: Users },
    ],
    company: [
      { label: "Tableau de bord", href: "/entreprise", icon: BarChart3 },
      { label: "Inventaire", href: "/entreprise/inventory", icon: Box },
      { label: "Employés", href: "/entreprise/employees", icon: Users },
    ],
    employee: [
      { label: "Tableau de bord", href: "/employee", icon: BarChart3 },
      { label: "Inventaire", href: "/employee/inventory", icon: Box },
    ],
  }

  const items = navItems[role]

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 z-50">
        <Button variant="ghost" size="icon" onClick={onToggle} className="m-2">
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      <aside
        className={`${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative w-64 h-screen bg-card border-r border-border transition-transform duration-300 z-40 flex flex-col`}
      >
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-primary">Invexia</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {role === "super-admin" && "Super Admin"}
            {role === "company" && "Entreprise"}
            {role === "employee" && "Employé"}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {items.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:bg-destructive/10"
            onClick={() => router.push("/login")}
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="text-sm">Se déconnecter</span>
          </Button>
          <p className="text-xs text-muted-foreground text-center">© 2025 Invexia</p>
        </div>
      </aside>

      {isOpen && <div className="fixed inset-0 bg-black/50 lg:hidden z-30" onClick={onToggle} />}
    </>
  )
}
