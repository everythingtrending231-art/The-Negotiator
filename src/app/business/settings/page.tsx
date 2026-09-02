import { requireRole } from "@/server/auth/require-session"
import { Card } from "@/components/ui/card"
import ChangePasswordForm from "@/components/change-password-form"

export default async function BusinessSettingsPage() {
  await requireRole(["BUSINESS"])

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-black text-cobalt-600">Settings</h1>

      <Card className="p-6">
        <h2 className="font-bold text-cobalt-600 mb-4">Change password</h2>
        <ChangePasswordForm />
      </Card>
    </div>
  )
}
