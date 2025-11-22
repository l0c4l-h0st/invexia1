"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, AlertTriangle, Box, TrendingUp } from "lucide-react"
import { mockInventoryItems } from "@/lib/mock-data"

export default function CompanyDashboard() {
  const companyItems = mockInventoryItems.filter((item) => item.companyId === "comp-001")
  const lowStockItems = companyItems.filter((item) => item.status === "low-stock").length
  const outOfStockItems = companyItems.filter((item) => item.status === "out-of-stock").length
  const totalValue = companyItems.reduce((sum, item) => sum + item.totalValue, 0)

  const stats = [
    { label: "Articles en stock", value: companyItems.length, icon: Box, color: "bg-blue-500/20 text-blue-500" },
    { label: "Stock faible", value: lowStockItems, icon: AlertTriangle, color: "bg-yellow-500/20 text-yellow-500" },
    { label: "Rupture de stock", value: outOfStockItems, icon: BarChart3, color: "bg-red-500/20 text-red-500" },
    {
      label: "Valeur totale",
      value: `€${(totalValue / 1000).toFixed(1)}k`,
      icon: TrendingUp,
      color: "bg-green-500/20 text-green-500",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tableau de Bord Entreprise</h1>
        <p className="text-muted-foreground mt-2">Vue d'ensemble de votre inventaire et operations</p>
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
            <CardTitle>Alertes d'Inventaire</CardTitle>
            <CardDescription>Articles nécessitant attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {companyItems
                .filter((item) => item.status !== "in-stock")
                .map((item) => (
                  <div key={item.id} className="flex items-start justify-between p-3 border border-border rounded">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.quantity} unités</p>
                    </div>
                    <span className="text-sm font-semibold text-yellow-500">Action requise</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catégories</CardTitle>
            <CardDescription>Distribution par catégorie</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from(new Set(companyItems.map((item) => item.category))).map((category) => {
                const count = companyItems.filter((item) => item.category === category).length
                return (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{category}</span>
                    <span className="font-semibold">{count} articles</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
