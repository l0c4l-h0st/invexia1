import { AppLayout } from "@/components/layout/app-layout"
import { InventoryDetailContent } from "@/components/inventory/inventory-detail-content"

interface Props {
  params: Promise<{ id: string }>
}

export default async function InventoryDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <AppLayout>
      <InventoryDetailContent itemId={id} />
    </AppLayout>
  )
}
