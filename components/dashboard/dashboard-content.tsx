"use client"

import { mockInventoryItems, mockInventoryMovements } from "@/lib/mock-data"
import { StatCard } from "@/components/common/stat-card"
import { Box, AlertTriangle, DollarSign, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export function DashboardContent() {
  const totalItems = mockInventoryItems.length
  const lowStockItems = mockInventoryItems.filter((item) => item.status !== "in-stock").length
  const totalValue = mockInventoryItems.reduce((sum, item) => sum + item.totalValue, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Bienvenue dans Invexia</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Articles totaux" value={totalItems} icon={Box} description="Produits en stock" />
        <StatCard
          title="Ruptures de stock"
          value={lowStockItems}
          icon={AlertTriangle}
          description="Articles à surveiller"
        />
        <StatCard
          title="Valeur totale"
          value={`$${(totalValue / 1000).toFixed(1)}K`}
          icon={DollarSign}
          description="Inventaire complet"
        />
        <StatCard
          title="Mouvements"
          value={mockInventoryMovements.length}
          icon={TrendingUp}
          description="Derniers 30 jours"
        />
      </div>

      {/* Recent Movements */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Derniers mouvements</CardTitle>
          <CardDescription>Activité récente de l'inventaire</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Raison</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockInventoryMovements.slice(0, 5).map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="font-medium">{movement.itemName}</TableCell>
                  <TableCell>
                    <Badge variant={movement.type === "entry" ? "default" : "secondary"}>
                      {movement.type === "entry" ? "Entrée" : "Sortie"}
                    </Badge>
                  </TableCell>
                  <TableCell>{movement.quantity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{movement.reason}</TableCell>
                  <TableCell>{movement.user}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{movement.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
