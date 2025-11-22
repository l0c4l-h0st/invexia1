"use client"

import { useState } from "react"
import { InventoryFilters } from "./inventory-filters"
import { InventoryTable } from "./inventory-table"
import { mockInventoryItems } from "@/lib/mock-data"
import type { InventoryItem } from "@/lib/types"

export function InventoryContent() {
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>(mockInventoryItems)

  const handleFilter = (filters: {
    search: string
    category: string
    status: string
  }) => {
    let result = mockInventoryItems

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(
        (item) => item.name.toLowerCase().includes(searchLower) || item.reference.toLowerCase().includes(searchLower),
      )
    }

    if (filters.category) {
      result = result.filter((item) => item.category === filters.category)
    }

    if (filters.status) {
      result = result.filter((item) => item.status === filters.status)
    }

    setFilteredItems(result)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventaire</h1>
        <p className="text-muted-foreground mt-1">Gestion des articles et équipements</p>
      </div>

      <InventoryFilters onFilter={handleFilter} />
      <InventoryTable items={filteredItems} />
    </div>
  )
}
