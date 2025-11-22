"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search } from "lucide-react"
import { mockInventoryItems } from "@/lib/mock-data"
import { useState } from "react"

export default function EmployeeInventoryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const companyItems = mockInventoryItems.filter((item) => item.companyId === "comp-001")

  const filteredItems = companyItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reference.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventaire (Lecture Seule)</h1>
        <p className="text-muted-foreground mt-2">Consultez le stock disponible</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Articles Disponibles</CardTitle>
          <CardDescription>Vue de l'inventaire de l'entreprise</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un article..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-sm">{item.reference}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-center font-semibold">{item.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.location}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "in-stock"
                            ? "default"
                            : item.status === "low-stock"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {item.status === "in-stock" && "En stock"}
                        {item.status === "low-stock" && "Stock faible"}
                        {item.status === "out-of-stock" && "Rupture"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
