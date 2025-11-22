"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Building2, Users, TrendingUp } from "lucide-react"
import { mockCompanies, mockEmployees, mockInventoryItems } from "@/lib/mock-data"

export default function AdminDashboard() {
  const totalCompanies = mockCompanies.length
  const activeCompanies = mockCompanies.filter((c) => c.status === "active").length
  const totalEmployees = mockEmployees.length
  const totalItems = mockInventoryItems.length

  const stats = [
    { label: "Entreprises totales", value: totalCompanies, icon: Building2, color: "bg-blue-500/20 text-blue-500" },
    { label: "Entreprises actives", value: activeCompanies, icon: TrendingUp, color: "bg-green-500/20 text-green-500" },
    { label: "Employés plateforme", value: totalEmployees, icon: Users, color: "bg-purple-500/20 text-purple-500" },
    { label: "Articles gérés", value: totalItems, icon: BarChart3, color: "bg-orange-500/20 text-orange-500" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tableau de Bord Super Admin</h1>
        <p className="text-muted-foreground mt-2">Vue globale de la plateforme Invexia</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Entreprises Récentes</CardTitle>
            <CardDescription>Dernières entreprises enregistrées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockCompanies.slice(0, 3).map((company) => (
                <div key={company.id} className="flex items-start justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">{company.name}</p>
                    <p className="text-sm text-muted-foreground">{company.email}</p>
                  </div>
                  <Badge variant={company.status === "active" ? "default" : "secondary"}>
                    {company.status === "active" ? "Actif" : "Suspendu"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activité Plateforme</CardTitle>
            <CardDescription>Statistiques d'utilisation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Taux d'utilisation</span>
                <span className="font-semibold">75%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary rounded-full h-2 w-3/4" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Uptime</span>
                <span className="font-semibold">99.8%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 rounded-full h-2" style={{ width: "99.8%" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
