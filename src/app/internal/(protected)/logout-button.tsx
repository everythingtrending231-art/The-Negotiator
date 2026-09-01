"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function LogoutButton() {
  const router = useRouter()

  async function onClick() {
    await fetch("/api/internal/logout", { method: "POST" })
    router.push("/internal/login")
    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      Log out
    </Button>
  )
}
