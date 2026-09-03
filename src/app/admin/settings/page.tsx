import { getAllSettings } from "@/server/services/settings"
import SettingsEditor from "@/app/admin/settings/settings-editor"

export default async function AdminSettingsPage() {
  const settings = await getAllSettings()

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-black text-cobalt-600">Settings</h1>
      <SettingsEditor settings={settings} />
    </div>
  )
}
