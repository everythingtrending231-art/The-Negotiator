import { prisma } from "@/server/db"
import { recordAudit } from "@/server/audit"

type Actor = { id: string }

export type SettingKey =
  | "supportEmail"
  | "requestRateLimitMax"
  | "loginRateLimitMax"
  | "supportInquiryRateLimitMax"
  | "accountLoginRateLimitMax"

type SettingDef = {
  key: SettingKey
  label: string
  description: string
  type: "text" | "number"
  default: string
}

// The catalog of admin-editable settings. Adding a new one here is enough —
// no migration needed (see the SystemSetting schema comment). Rate limit
// *windows* stay fixed in each route (changing the window is a riskier,
// less obviously useful knob than the count); only the per-window max is
// exposed here.
export const SETTING_DEFS: SettingDef[] = [
  {
    key: "supportEmail",
    label: "Support email",
    description: "Where customer support-widget messages and case-related notifications are sent.",
    type: "text",
    default: process.env.SUPPORT_EMAIL ?? "support@example.com",
  },
  {
    key: "requestRateLimitMax",
    label: "Request submissions per hour (per IP)",
    description: "Max /api/request submissions allowed from one IP address per hour.",
    type: "number",
    default: "5",
  },
  {
    key: "loginRateLimitMax",
    label: "Login attempts per 15 minutes (per IP)",
    description: "Max /api/login attempts allowed from one IP address per 15 minutes.",
    type: "number",
    default: "10",
  },
  {
    key: "supportInquiryRateLimitMax",
    label: "Support messages per hour (per IP)",
    description: "Max /api/support-inquiry submissions allowed from one IP address per hour.",
    type: "number",
    default: "5",
  },
  {
    key: "accountLoginRateLimitMax",
    label: "Account login-link requests per hour (per IP)",
    description: "Max /api/account/request-link submissions allowed from one IP address per hour.",
    type: "number",
    default: "5",
  },
]

const DEFS_BY_KEY = new Map(SETTING_DEFS.map((d) => [d.key, d]))

// A missing row is not an error — it just means nobody has overridden the
// default yet. Every call site treats this the same way admin/env-driven
// config already works elsewhere in this app (Sentry DSN, Blob token,
// etc.): absent means "use the built-in default," never a broken read.
export async function getSetting(key: SettingKey): Promise<string> {
  const row = await prisma.systemSetting.findUnique({ where: { key } })
  return row?.value ?? DEFS_BY_KEY.get(key)!.default
}

export async function getSettingNumber(key: SettingKey): Promise<number> {
  return Number(await getSetting(key))
}

export async function getAllSettings() {
  const rows = await prisma.systemSetting.findMany()
  const valueByKey = new Map(rows.map((r) => [r.key, r.value]))
  return SETTING_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    description: def.description,
    type: def.type,
    value: valueByKey.get(def.key) ?? def.default,
  }))
}

export async function updateSetting(key: SettingKey, value: string, actor: Actor) {
  const def = DEFS_BY_KEY.get(key)
  if (!def) {
    throw new Error("Unknown setting.")
  }
  if (def.type === "number" && (!Number.isInteger(Number(value)) || Number(value) <= 0)) {
    throw new Error("This setting must be a whole number greater than zero.")
  }

  const existing = await prisma.systemSetting.findUnique({ where: { key } })

  return prisma.$transaction(async (tx) => {
    const row = await tx.systemSetting.upsert({
      where: { key },
      create: { key, value, updatedBy: actor.id },
      update: { value, updatedBy: actor.id },
    })

    await recordAudit(tx, {
      actorType: "ADMIN",
      actorId: actor.id,
      action: "SETTING_UPDATED",
      relatedEntityType: "SystemSetting",
      relatedEntityId: key,
      before: { value: existing?.value ?? def.default },
      after: { value },
      sourceChannel: "internal",
    })

    return row
  })
}
