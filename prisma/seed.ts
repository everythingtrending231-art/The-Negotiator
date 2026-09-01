import { PrismaClient } from "@prisma/client"
import { hashPassword } from "../src/server/auth/password"

const prisma = new PrismaClient()

// Dev-only credentials — printed to console below, documented in
// .env.example. No self-registration in this platform (admin-mediated
// everywhere), so the first Admin account has to come from somewhere.
const ADMIN_DEV_PASSWORD = "Admin#2026"
const NEGOTIATOR_DEV_PASSWORD = "Negotiator#2026"
const BUSINESS_DEV_PASSWORD = "Business#2026"

type FieldSeed = { fieldName: string; fieldType: string; required: boolean }

const categories: Array<{
  name: string
  description: string
  fields: FieldSeed[]
}> = [
  {
    name: "Hotels",
    description: "Hotel bookings and stays",
    fields: [
      { fieldName: "Check-in date", fieldType: "date", required: true },
      { fieldName: "Check-out date", fieldType: "date", required: true },
      { fieldName: "Guests", fieldType: "number", required: true },
      { fieldName: "Room type", fieldType: "text", required: false },
    ],
  },
  {
    name: "Car Rentals",
    description: "Rental vehicle bookings",
    fields: [
      { fieldName: "Pickup date", fieldType: "date", required: true },
      { fieldName: "Return date", fieldType: "date", required: true },
      { fieldName: "Vehicle type", fieldType: "text", required: false },
      { fieldName: "Pickup location", fieldType: "text", required: true },
    ],
  },
  {
    name: "Electronics",
    description: "Consumer electronics purchases",
    fields: [
      { fieldName: "Model / spec", fieldType: "text", required: true },
      { fieldName: "Condition", fieldType: "select", required: false },
    ],
  },
  {
    name: "Professional Services",
    description: "Contracted professional services",
    fields: [
      { fieldName: "Scope", fieldType: "text", required: true },
      { fieldName: "Timeline", fieldType: "text", required: false },
      { fieldName: "Deliverables", fieldType: "text", required: false },
    ],
  },
]

const negotiatorNames = ["Amara Chen", "Diego Alvarez", "Priya Nair"]

async function main() {
  for (const [index, category] of categories.entries()) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: {
        name: category.name,
        description: category.description,
        status: "ACTIVE",
        customerVisible: true,
        displayOrder: index,
        fields: {
          create: category.fields.map((field, fieldIndex) => ({
            fieldName: field.fieldName,
            fieldType: field.fieldType,
            required: field.required,
            displayOrder: fieldIndex,
          })),
        },
      },
    })
  }

  const adminEmail = "admin@example.com"
  const adminExisting = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!adminExisting) {
    const passwordHash = await hashPassword(ADMIN_DEV_PASSWORD)
    await prisma.user.create({
      data: { name: "Sam Okafor", email: adminEmail, role: "SUPER_ADMIN", passwordHash },
    })
  }

  for (const name of negotiatorNames) {
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) continue

    const passwordHash = await hashPassword(NEGOTIATOR_DEV_PASSWORD)
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, role: "NEGOTIATOR", passwordHash },
      })
      await tx.negotiator.create({
        data: { userId: user.id, name, email, active: true },
      })
    })
  }

  const hotels = await prisma.category.findUniqueOrThrow({ where: { name: "Hotels" } })
  const carRentals = await prisma.category.findUniqueOrThrow({ where: { name: "Car Rentals" } })

  const harborView = await prisma.business.findFirst({ where: { name: "Harbor View Hotel" } })
  if (!harborView) {
    await prisma.business.create({
      data: {
        name: "Harbor View Hotel",
        description: "Independent hotel, demo business record.",
        customerVisible: true,
        publishStatus: "PUBLISHED",
        verificationStatus: "ACTIVE",
        locations: [{ city: "Chicago", country: "USA" }],
        categories: { create: [{ categoryId: hotels.id }] },
        contacts: {
          create: [{ name: "Reservations Desk", email: "reservations@example.com", isPrimary: true }],
        },
      },
    })
  }

  const cityWheels = await prisma.business.findFirst({ where: { name: "CityWheels Rentals" } })
  if (!cityWheels) {
    await prisma.business.create({
      data: {
        name: "CityWheels Rentals",
        description: "Local car rental partner, demo business record.",
        customerVisible: true,
        publishStatus: "PUBLISHED",
        verificationStatus: "ACTIVE",
        locations: [{ city: "Chicago", country: "USA" }],
        categories: { create: [{ categoryId: carRentals.id }] },
        contacts: {
          create: [{ name: "Fleet Desk", email: "fleet@example.com", isPrimary: true }],
        },
      },
    })
  }

  // Phase 2 Stage 2: grant Business Portal access to the primary contact
  // of each seeded business, same dev-credential pattern as Admin/Negotiator.
  const businessNames = ["Harbor View Hotel", "CityWheels Rentals"]
  for (const name of businessNames) {
    const contact = await prisma.businessContact.findFirst({
      where: { business: { name }, isPrimary: true },
    })
    if (contact && !contact.userId && contact.email) {
      const passwordHash = await hashPassword(BUSINESS_DEV_PASSWORD)
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { name: contact.name, email: contact.email!, role: "BUSINESS", passwordHash },
        })
        await tx.businessContact.update({ where: { id: contact.id }, data: { userId: user.id } })
      })
    }
  }

  console.log("Seed complete.")
  console.log("")
  console.log("Dev credentials (local only — never used in production):")
  console.log(`  Admin:      ${adminEmail} / ${ADMIN_DEV_PASSWORD}`)
  for (const name of negotiatorNames) {
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`
    console.log(`  Negotiator: ${email} / ${NEGOTIATOR_DEV_PASSWORD}`)
  }
  for (const name of businessNames) {
    const contact = await prisma.businessContact.findFirst({ where: { business: { name }, isPrimary: true } })
    if (contact?.email) {
      console.log(`  Business (${name}): ${contact.email} / ${BUSINESS_DEV_PASSWORD}`)
    }
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
