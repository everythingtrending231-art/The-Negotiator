import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import { createBusiness, createBusinessContact, createCase, createNegotiator, createUser } from "@/server/test/factories"
import { respondToInvite, sendInvites } from "./invites"

describe("sendInvites", () => {
  it("creates one invite per business, moves an ASSIGNED case to NEGOTIATING, and emails portal-linked contacts", async () => {
    const negotiator = await createNegotiator()
    const negotiationCase = await createCase({ status: "ASSIGNED", assignedNegotiatorId: negotiator.id })
    const businessA = await createBusiness()
    const businessB = await createBusiness()
    const contactUser = await createUser({ role: "BUSINESS", email: "biz-contact@example.com" })
    await createBusinessContact({ businessId: businessA.id, userId: contactUser.id, email: contactUser.email })

    const result = await sendInvites(negotiationCase.id, [businessA.id, businessB.id], negotiator.id)

    expect(result.created).toHaveLength(2)
    expect(result.skipped).toBe(0)

    const updatedCase = await testPrisma.negotiationCase.findUniqueOrThrow({ where: { id: negotiationCase.id } })
    expect(updatedCase.status).toBe("NEGOTIATING")

    const email = await testPrisma.emailLog.findFirst({ where: { template: "invite-received", to: "biz-contact@example.com" } })
    expect(email).not.toBeNull()
  })

  it("skips businesses that are already invited", async () => {
    const negotiator = await createNegotiator()
    const negotiationCase = await createCase()
    const business = await createBusiness()
    await testPrisma.caseBusinessInvite.create({ data: { caseId: negotiationCase.id, businessId: business.id } })

    const result = await sendInvites(negotiationCase.id, [business.id], negotiator.id)

    expect(result.created).toHaveLength(0)
    expect(result.skipped).toBe(1)
  })

  it("does not touch case status when the case isn't ASSIGNED", async () => {
    const negotiator = await createNegotiator()
    const negotiationCase = await createCase({ status: "NEGOTIATING" })
    const business = await createBusiness()

    await sendInvites(negotiationCase.id, [business.id], negotiator.id)

    const updatedCase = await testPrisma.negotiationCase.findUniqueOrThrow({ where: { id: negotiationCase.id } })
    expect(updatedCase.status).toBe("NEGOTIATING")
  })
})

describe("respondToInvite", () => {
  it("accepts an invite and emails the assigned negotiator", async () => {
    const negotiatorUser = await createUser({ role: "NEGOTIATOR", email: "negotiator-invite@example.com" })
    const negotiator = await testPrisma.negotiator.create({
      data: { userId: negotiatorUser.id, name: negotiatorUser.name, email: negotiatorUser.email },
    })
    const business = await createBusiness()
    const negotiationCase = await createCase({ assignedNegotiatorId: negotiator.id })
    const invite = await testPrisma.caseBusinessInvite.create({ data: { caseId: negotiationCase.id, businessId: business.id } })
    const contact = await createBusinessContact({ businessId: business.id })

    const updated = await respondToInvite(invite.id, contact.id, "ACCEPTED")
    expect(updated.status).toBe("ACCEPTED")
    expect(updated.respondedByContactId).toBe(contact.id)

    const email = await testPrisma.emailLog.findFirst({ where: { template: "invite-accepted", to: "negotiator-invite@example.com" } })
    expect(email).not.toBeNull()
  })

  it("declines an invite with a note and emails the assigned negotiator", async () => {
    const negotiatorUser = await createUser({ role: "NEGOTIATOR", email: "negotiator-decline@example.com" })
    const negotiator = await testPrisma.negotiator.create({
      data: { userId: negotiatorUser.id, name: negotiatorUser.name, email: negotiatorUser.email },
    })
    const business = await createBusiness()
    const negotiationCase = await createCase({ assignedNegotiatorId: negotiator.id })
    const invite = await testPrisma.caseBusinessInvite.create({ data: { caseId: negotiationCase.id, businessId: business.id } })
    const contact = await createBusinessContact({ businessId: business.id })

    const updated = await respondToInvite(invite.id, contact.id, "DECLINED", "Fully booked that week.")
    expect(updated.status).toBe("DECLINED")
    expect(updated.responseNote).toBe("Fully booked that week.")

    const email = await testPrisma.emailLog.findFirst({ where: { template: "invite-declined", to: "negotiator-decline@example.com" } })
    expect(email).not.toBeNull()
  })

  it("refuses to respond to an invite that's already been responded to", async () => {
    const business = await createBusiness()
    const negotiationCase = await createCase()
    const invite = await testPrisma.caseBusinessInvite.create({
      data: { caseId: negotiationCase.id, businessId: business.id, status: "ACCEPTED" },
    })
    const contact = await createBusinessContact({ businessId: business.id })

    await expect(respondToInvite(invite.id, contact.id, "DECLINED")).rejects.toThrow("already been responded to")
  })
})
