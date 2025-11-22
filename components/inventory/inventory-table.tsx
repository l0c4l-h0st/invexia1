import Link from "next/link"
import type { InventoryItem } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

interface InventoryTableProps {
  items: InventoryItem[]
}

export function InventoryTable({ items }: InventoryTableProps) {
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
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Référence</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead className="text-right">Quantité</TableHead>
            <TableHead className="text-right">Seuil</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-sm text-muted-foreground">{item.reference}</TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-sm">{item.category}</TableCell>
              <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
              <TableCell className="text-right text-muted-foreground">{item.alertThreshold}</TableCell>
              <TableCell>{getStatusBadge(item.status)}</TableCell>
              <TableCell>
                <Link href={`/inventory/${item.id}`}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
