import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createBusiness as createBusinessFixture, createCase, createCategory, createUser } from "@/server/test/factories"
import {
  addBusinessContact,
  addBusinessNote,
  bulkImportBusinesses,
  computeBusinessPerformanceSummary,
  createBusiness,
  createPartnerAgreement,
  deleteBusiness,
  removeBusinessContact,
  setBusinessPublishStatus,
  setBusinessVerificationStatus,
  updateBusinessContact,
  updateBusinessProfile,
} from "./businesses"

async function actor() {
  const user = await createUser({ role: "ADMIN" })
  return { id: user.id }
}

describe("createBusiness", () => {
  it("creates a business with category links and audits it", async () => {
    const admin = await actor()
    const category = await createCategory()

    const business = await createBusiness({ name: "Grand Hotel", categoryIds: [category.id] }, admin)

    const links = await testPrisma.businessCategory.findMany({ where: { businessId: business.id } })
    expect(links).toHaveLength(1)
    expect(links[0].categoryId).toBe(category.id)

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "BUSINESS_CREATED", relatedEntityId: business.id } })
    expect(audit).not.toBeNull()
  })
})

describe("updateBusinessProfile", () => {
  it("replaces category links when categoryIds is given", async () => {
    const admin = await actor()
    const oldCategory = await createCategory()
    const newCategory = await createCategory()
    const business = await createBusiness({ name: "Biz", categoryIds: [oldCategory.id] }, admin)

    await updateBusinessProfile(business.id, { categoryIds: [newCategory.id] }, admin)

    const links = await testPrisma.businessCategory.findMany({ where: { businessId: business.id } })
    expect(links.map((l) => l.categoryId)).toEqual([newCategory.id])
  })

  it("leaves category links untouched when categoryIds is omitted", async () => {
    const admin = await actor()
    const category = await createCategory()
    const business = await createBusiness({ name: "Biz", categoryIds: [category.id] }, admin)

    await updateBusinessProfile(business.id, { name: "Renamed Biz" }, admin)

    const links = await testPrisma.businessCategory.findMany({ where: { businessId: business.id } })
    expect(links).toHaveLength(1)
  })
})

describe("deleteBusiness", () => {
  it("deletes a business with no negotiation history", async () => {
    const admin = await actor()
    const business = await createBusinessFixture()

    await deleteBusiness(business.id, "Never onboarded", admin)

    const remaining = await testPrisma.business.findUnique({ where: { id: business.id } })
    expect(remaining).toBeNull()
  })

  it("refuses to delete a business with case history", async () => {
    const admin = await actor()
    const business = await createBusinessFixture()
    await createCase({ businessId: business.id })

    await expect(deleteBusiness(business.id, "reason", admin)).rejects.toThrow("negotiation history")

    const stillThere = await testPrisma.business.findUnique({ where: { id: business.id } })
    expect(stillThere).not.toBeNull()
  })
})

describe("setBusinessVerificationStatus", () => {
  it("updates verification status and audits before/after", async () => {
    const admin = await actor()
    const business = await createBusinessFixture()

    const updated = await setBusinessVerificationStatus(business.id, "VERIFIED", "docs_checked", undefined, admin)
    expect(updated.verificationStatus).toBe("VERIFIED")
    expect(updated.statusReasonCode).toBe("docs_checked")

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "BUSINESS_VERIFICATION_STATUS_CHANGED", relatedEntityId: business.id } })
    expect((audit?.beforeJson as { verificationStatus?: string } | null)?.verificationStatus).toBe("PROSPECT")
  })
})

describe("setBusinessPublishStatus", () => {
  it("updates the publish status independent of verification", async () => {
    const admin = await actor()
    const business = await createBusinessFixture()

    const updated = await setBusinessPublishStatus(business.id, "UNPUBLISHED", admin)
    expect(updated.publishStatus).toBe("UNPUBLISHED")
  })
})

describe("business contacts", () => {
  it("adds, updates, and removes a contact", async () => {
    const admin = await actor()
    const business = await createBusinessFixture()

    const contact = await addBusinessContact(business.id, { name: "Jane Doe", email: "jane@example.com" }, admin)
    expect(contact.name).toBe("Jane Doe")

    const updated = await updateBusinessContact(contact.id, { role: "Manager" }, admin)
    expect(updated.role).toBe("Manager")

    await removeBusinessContact(contact.id, admin)
    const remaining = await testPrisma.businessContact.findUnique({ where: { id: contact.id } })
    expect(remaining).toBeNull()
  })
})

describe("addBusinessNote", () => {
  it("creates an append-only note tied to the author", async () => {
    const admin = await actor()
    const business = await createBusinessFixture()

    const note = await addBusinessNote(business.id, "Called to confirm renewal terms.", admin)
    expect(note.authorId).toBe(admin.id)
    expect(note.body).toContain("renewal terms")
  })
})

describe("createPartnerAgreement", () => {
  it("creates an agreement history row", async () => {
    const admin = await actor()
    const business = await createBusinessFixture()

    const agreement = await createPartnerAgreement(
      business.id,
      { agreementType: "PERCENTAGE_DISCOUNT", effectiveDate: new Date() },
      admin,
    )
    expect(agreement.businessId).toBe(business.id)
    expect(agreement.agreementType).toBe("PERCENTAGE_DISCOUNT")
  })
})

describe("computeBusinessPerformanceSummary", () => {
  it("computes offer/acceptance rates from case and offer counts", async () => {
    const business = await createBusinessFixture()
    const negotiator = await testPrisma.negotiator.create({
      data: { userId: (await createUser({ role: "NEGOTIATOR" })).id, name: "Neg" },
    })

    const caseA = await createCase({ businessId: business.id })
    await createCase({ businessId: business.id })

    await testPrisma.offer.create({
      data: {
        caseId: caseA.id,
        businessId: business.id,
        negotiatorId: negotiator.id,
        finalPriceCents: 9000,
        originalValueCents: 10000,
        includedGoods: "Widget",
        customerDecision: "ACCEPTED",
      },
    })

    const summary = await computeBusinessPerformanceSummary(business.id)
    expect(summary.casesInvolvedCount).toBe(2)
    expect(summary.offersCount).toBe(1)
    expect(summary.acceptedOffersCount).toBe(1)
    expect(summary.offerRate).toBe(0.5)
    expect(summary.acceptanceRate).toBe(1)
    expect(summary.avgValueCreated).toBe(1000)
  })

  it("returns null rates when there's no case/offer history yet", async () => {
    const business = await createBusinessFixture()
    const summary = await computeBusinessPerformanceSummary(business.id)
    expect(summary.offerRate).toBeNull()
    expect(summary.acceptanceRate).toBeNull()
    expect(summary.avgValueCreated).toBeNull()
  })
})

describe("bulkImportBusinesses", () => {
  it("creates a business per valid row and reports per-row errors", async () => {
    const admin = await actor()
    await createCategory({ name: "Hotels" })

    const result = await bulkImportBusinesses(
      [
        { name: "Valid Hotel", category: "Hotels" },
        { name: "", category: "Hotels" },
        { name: "Unknown Category Biz", category: "Nonexistent" },
      ],
      admin,
    )

    expect(result.created).toHaveLength(1)
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0].row).toBe(2)
    expect(result.errors[1].row).toBe(3)

    const created = await testPrisma.business.findUniqueOrThrow({ where: { id: result.created[0] } })
    expect(created.name).toBe("Valid Hotel")
  })
})
