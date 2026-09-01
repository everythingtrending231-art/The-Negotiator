import { prisma } from "@/server/db"
import NewBusinessForm from "@/app/admin/businesses/new/new-business-form"

export default async function NewBusinessPage() {
  const categories = await prisma.category.findMany({ orderBy: { displayOrder: "asc" } })
  return <NewBusinessForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
}
