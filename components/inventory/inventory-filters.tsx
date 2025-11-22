"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"

interface InventoryFiltersProps {
  onFilter: (filters: {
    search: string
    category: string
    status: string
  }) => void
}

export function InventoryFilters({ onFilter }: InventoryFiltersProps) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [status, setStatus] = useState("all")

  const handleFilter = () => {
    onFilter({ search, category, status })
  }

  const handleReset = () => {
    setSearch("")
    setCategory("all")
    setStatus("all")
    onFilter({ search: "", category: "all", status: "all" })
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Recherche</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nom ou référence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Catégorie</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              <SelectItem value="Électronique">Électronique</SelectItem>
              <SelectItem value="Accessoires">Accessoires</SelectItem>
              <SelectItem value="Câbles">Câbles</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Statut</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="in-stock">En stock</SelectItem>
              <SelectItem value="low-stock">Bientôt en rupture</SelectItem>
              <SelectItem value="out-of-stock">Rupture</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <Button onClick={handleFilter} className="flex-1">
            Filtrer
          </Button>
          <Button onClick={handleReset} variant="outline" size="icon" className="border-border bg-transparent">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
