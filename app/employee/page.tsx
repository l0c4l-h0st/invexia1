"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Box, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { mockInventoryItems } from "@/lib/mock-data"

export default function EmployeeDashboard() {
  const companyItems = mockInventoryItems.filter((item) => item.companyId === "comp-001")
  const lowStockItems = companyItems.filter((item) => item.status === "low-stock" || item.status === "out-of-stock")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tableau de Bord Employé</h1>
        <p className="text-muted-foreground mt-2">Consultez l'inventaire et effectuez des mouvements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Articles en stock</p>
                <p className="text-3xl font-bold mt-2">{companyItems.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/20 text-blue-500">
                <Box className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertes</p>
                <p className="text-3xl font-bold mt-2">{lowStockItems.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/20 text-yellow-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Articles en Alerte</CardTitle>
          <CardDescription>Stock faible ou rupture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex items-start justify-between p-3 border border-border rounded">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.quantity} unités restantes</p>
                </div>
                <Button variant="outline" size="sm">
                  Signaler
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
