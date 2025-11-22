"use client"

import Link from "next/link"
import { mockInventoryItems, mockInventoryMovements } from "@/lib/mock-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit2 } from "lucide-react"

interface InventoryDetailContentProps {
  itemId: string
}

export function InventoryDetailContent({ itemId }: InventoryDetailContentProps) {
  const item = mockInventoryItems.find((i) => i.id === itemId)
  const movements = mockInventoryMovements.filter((m) => m.itemId === itemId)

  if (!item) {
    return (
      <div className="space-y-4">
        <Link href="/inventory">
          <Button variant="outline" className="border-border bg-transparent">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'inventaire
          </Button>
        </Link>
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Article non trouvé</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-stock":
        return <Badge className="bg-green-500/20 text-green-400">En stock</Badge>
      case "low-stock":
        return <Badge className="bg-orange-500/20 text-orange-400">Bientôt en rupture</Badge>
      case "out-of-stock":
        return <Badge className="bg-red-500/20 text-red-400">Rupture</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/inventory">
            <Button variant="outline" size="sm" className="border-border mb-4 bg-transparent">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{item.name}</h1>
          <p className="text-muted-foreground mt-1">Référence: {item.reference}</p>
        </div>
        <Button className="gap-2">
          <Edit2 className="h-4 w-4" />
          Modifier
        </Button>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm">Quantité actuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{item.quantity}</p>
            <p className="text-xs text-muted-foreground mt-2">unités</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm">Seuil d'alerte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{item.alertThreshold}</p>
            <p className="text-xs text-muted-foreground mt-2">unités minimum</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm">Statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="pt-2">{getStatusBadge(item.status)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Information */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Catégorie</p>
              <p className="font-medium">{item.category}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Localisation</p>
              <p className="font-medium">{item.location}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valeur totale</p>
              <p className="font-medium">${item.totalValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dernière mise à jour</p>
              <p className="font-medium">{item.lastUpdated}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movements */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Historique des mouvements</CardTitle>
          <CardDescription>{movements.length} mouvements</CardDescription>
        </CardHeader>
        <CardContent>
          {movements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead>Raison</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <Badge variant={movement.type === "entry" ? "default" : "secondary"}>
                        {movement.type === "entry" ? "Entrée" : "Sortie"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{movement.quantity}</TableCell>
                    <TableCell className="text-sm">{movement.reason}</TableCell>
                    <TableCell>{movement.user}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{movement.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Aucun mouvement pour cet article</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
