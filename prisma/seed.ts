import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

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

const negotiators = ["Amara Chen", "Diego Alvarez", "Priya Nair"]

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

  for (const name of negotiators) {
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`
    await prisma.negotiator.upsert({
      where: { email },
      update: {},
      create: { name, email, active: true },
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
        contactName: "Reservations Desk",
        contactEmail: "reservations@example.com",
        customerVisible: true,
        publishStatus: "PUBLISHED",
        categories: { create: [{ categoryId: hotels.id }] },
      },
    })
  }

  const cityWheels = await prisma.business.findFirst({ where: { name: "CityWheels Rentals" } })
  if (!cityWheels) {
    await prisma.business.create({
      data: {
        name: "CityWheels Rentals",
        description: "Local car rental partner, demo business record.",
        contactName: "Fleet Desk",
        contactEmail: "fleet@example.com",
        customerVisible: true,
        publishStatus: "PUBLISHED",
        categories: { create: [{ categoryId: carRentals.id }] },
      },
    })
  }

  console.log("Seed complete.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
