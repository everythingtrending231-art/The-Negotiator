import { describe, expect, it } from "vitest"
import { testPrisma } from "@/server/test/db"
import {
  createBusiness,
  createBusinessContact,
  createCase,
  createNegotiator,
  createOffer,
  createUser,
} from "@/server/test/factories"
import { adminUpdateOffer, confirmOffer, createOffer as createOfferService, requestOfferChanges, updateOffer } from "./offers"

describe("createOffer", () => {
  it("creates a PROPOSED offer, locks the case to the business, and moves the case to AWAITING_BUSINESS", async () => {
    const negotiationCase = await createCase({ status: "ASSIGNED" })
    const negotiator = await createNegotiator()
    const business = await createBusiness()

    const offer = await createOfferService({
      caseId: negotiationCase.id,
      negotiatorId: negotiator.id,
      businessId: business.id,
      finalPriceCents: 25000,
      includedGoods: "Two nights, breakfast included",
    })

    expect(offer.status).toBe("PROPOSED")

    const updatedCase = await testPrisma.negotiationCase.findUniqueOrThrow({ where: { id: negotiationCase.id } })
    expect(updatedCase.businessId).toBe(business.id)
    expect(updatedCase.status).toBe("AWAITING_BUSINESS")

    const audit = await testPrisma.auditLog.findFirst({ where: { caseId: negotiationCase.id, action: "OFFER_CREATED" } })
    expect(audit).not.toBeNull()
  })

  it("withdraws other pending invites for the case once a business is chosen", async () => {
    const negotiationCase = await createCase({ status: "ASSIGNED" })
    const negotiator = await createNegotiator()
    const chosenBusiness = await createBusiness()
    const otherBusiness = await createBusiness()

    const otherInvite = await testPrisma.caseBusinessInvite.create({
      data: { caseId: negotiationCase.id, businessId: otherBusiness.id, status: "PENDING" },
    })
    const acceptedInvite = await testPrisma.caseBusinessInvite.create({
      data: { caseId: negotiationCase.id, businessId: chosenBusiness.id, status: "ACCEPTED" },
    })

    await createOfferService({
      caseId: negotiationCase.id,
      negotiatorId: negotiator.id,
      businessId: chosenBusiness.id,
      finalPriceCents: 10000,
      includedGoods: "Widget",
    })

    const updatedOther = await testPrisma.caseBusinessInvite.findUniqueOrThrow({ where: { id: otherInvite.id } })
    expect(updatedOther.status).toBe("WITHDRAWN")

    // The chosen business's own invite, already ACCEPTED, is untouched —
    // only other businesses' still-PENDING invites are withdrawn.
    const updatedAccepted = await testPrisma.caseBusinessInvite.findUniqueOrThrow({ where: { id: acceptedInvite.id } })
    expect(updatedAccepted.status).toBe("ACCEPTED")
  })
})

describe("confirmOffer", () => {
  it("presents the offer, confirms it, and moves the case to OFFER_READY with an offer-ready email", async () => {
    const business = await createBusiness()
    const negotiationCase = await createCase({ status: "AWAITING_BUSINESS", businessId: business.id })
    await testPrisma.negotiationTicket.create({
      data: { negotiationCaseId: negotiationCase.id, customerEmail: "offer-ready-confirm@example.com" },
    })
    const offer = await createOffer({ caseId: negotiationCase.id, businessId: business.id, status: "PROPOSED" })
    const contact = await createBusinessContact({ businessId: business.id })

    const updated = await confirmOffer(negotiationCase.id, offer.id, contact.id)
    expect(updated.status).toBe("PRESENTED")
    expect(updated.businessConfirmedAt).not.toBeNull()

    const updatedCase = await testPrisma.negotiationCase.findUniqueOrThrow({ where: { id: negotiationCase.id } })
    expect(updatedCase.status).toBe("OFFER_READY")

    const email = await testPrisma.emailLog.findFirst({ where: { template: "offer-ready", to: "offer-ready-confirm@example.com" } })
    expect(email).not.toBeNull()
  })

  it("refuses to confirm an offer the customer has already decided on", async () => {
    const business = await createBusiness()
    const negotiationCase = await createCase({ status: "OFFER_READY", businessId: business.id })
    const offer = await createOffer({
      caseId: negotiationCase.id,
      businessId: business.id,
      status: "ACCEPTED",
    })
    await testPrisma.offer.update({ where: { id: offer.id }, data: { customerDecision: "ACCEPTED" } })
    const contact = await createBusinessContact({ businessId: business.id })

    await expect(confirmOffer(negotiationCase.id, offer.id, contact.id)).rejects.toThrow("already decided")
  })

  it("refuses to confirm an offer twice", async () => {
    const business = await createBusiness()
    const negotiationCase = await createCase({ status: "AWAITING_BUSINESS", businessId: business.id })
    const offer = await createOffer({
      caseId: negotiationCase.id,
      businessId: business.id,
      status: "PRESENTED",
      businessConfirmedAt: new Date(),
    })
    const contact = await createBusinessContact({ businessId: business.id })

    await expect(confirmOffer(negotiationCase.id, offer.id, contact.id)).rejects.toThrow("already been confirmed")
  })

  it("refuses to confirm an offer that belongs to a different case", async () => {
    const business = await createBusiness()
    const caseA = await createCase({ status: "AWAITING_BUSINESS", businessId: business.id })
    const caseB = await createCase({ status: "AWAITING_BUSINESS", businessId: business.id })
    const offerForCaseB = await createOffer({ caseId: caseB.id, businessId: business.id, status: "PROPOSED" })
    const contact = await createBusinessContact({ businessId: business.id })

    await expect(confirmOffer(caseA.id, offerForCaseB.id, contact.id)).rejects.toThrow("does not belong to this case")
  })
})

describe("requestOfferChanges", () => {
  it("records the business's feedback and emails the assigned negotiator", async () => {
    const negotiatorUser = await createUser({ role: "NEGOTIATOR", email: "negotiator-changes@example.com" })
    const negotiator = await testPrisma.negotiator.create({
      data: { userId: negotiatorUser.id, name: negotiatorUser.name, email: negotiatorUser.email },
    })
    const business = await createBusiness()
    const negotiationCase = await createCase({ status: "AWAITING_BUSINESS", businessId: business.id, assignedNegotiatorId: negotiator.id })
    const offer = await createOffer({ caseId: negotiationCase.id, businessId: business.id, negotiatorId: negotiator.id })
    const contact = await createBusinessContact({ businessId: business.id })

    const updated = await requestOfferChanges(negotiationCase.id, offer.id, contact.id, "Price is too low for this date range.")
    expect(updated.businessFeedback).toBe("Price is too low for this date range.")

    const audit = await testPrisma.auditLog.findFirst({ where: { action: "OFFER_CHANGES_REQUESTED", relatedEntityId: offer.id } })
    expect(audit).not.toBeNull()

    const email = await testPrisma.emailLog.findFirst({ where: { template: "offer-changes-requested", to: "negotiator-changes@example.com" } })
    expect(email).not.toBeNull()
  })

  it("refuses to request changes on an already-confirmed offer", async () => {
    const business = await createBusiness()
    const negotiationCase = await createCase({ businessId: business.id })
    const offer = await createOffer({ caseId: negotiationCase.id, businessId: business.id, businessConfirmedAt: new Date() })
    const contact = await createBusinessContact({ businessId: business.id })

    await expect(requestOfferChanges(negotiationCase.id, offer.id, contact.id, "note")).rejects.toThrow("already been confirmed")
  })

  it("refuses to request changes on an offer that belongs to a different case", async () => {
    const business = await createBusiness()
    const caseA = await createCase({ businessId: business.id })
    const caseB = await createCase({ businessId: business.id })
    const offerForCaseB = await createOffer({ caseId: caseB.id, businessId: business.id })
    const contact = await createBusinessContact({ businessId: business.id })

    await expect(requestOfferChanges(caseA.id, offerForCaseB.id, contact.id, "note")).rejects.toThrow(
      "does not belong to this case",
    )
  })
})

describe("updateOffer", () => {
  it("lets the negotiator edit a still-draft offer and clears prior business feedback", async () => {
    const negotiator = await createNegotiator()
    const offer = await createOffer({ negotiatorId: negotiator.id, finalPriceCents: 10000, includedGoods: "Original" })
    await testPrisma.offer.update({ where: { id: offer.id }, data: { businessFeedback: "Too high" } })

    const updated = await updateOffer(offer.caseId, offer.id, {
      negotiatorId: negotiator.id,
      finalPriceCents: 9000,
      includedGoods: "Revised terms",
    })

    expect(updated.finalPriceCents).toBe(9000)
    expect(updated.includedGoods).toBe("Revised terms")
    expect(updated.businessFeedback).toBeNull()
  })

  it("refuses to edit an offer the customer has already decided on", async () => {
    const negotiator = await createNegotiator()
    const offer = await createOffer({ negotiatorId: negotiator.id })
    await testPrisma.offer.update({ where: { id: offer.id }, data: { customerDecision: "ACCEPTED" } })

    await expect(
      updateOffer(offer.caseId, offer.id, { negotiatorId: negotiator.id, finalPriceCents: 5000 }),
    ).rejects.toThrow("already decided")
  })

  it("refuses to edit an offer the business has already confirmed", async () => {
    const negotiator = await createNegotiator()
    const offer = await createOffer({ negotiatorId: negotiator.id, businessConfirmedAt: new Date() })

    await expect(
      updateOffer(offer.caseId, offer.id, { negotiatorId: negotiator.id, finalPriceCents: 5000 }),
    ).rejects.toThrow("new offer round")
  })
})

describe("adminUpdateOffer", () => {
  it("lets an admin edit an offer even after the business has confirmed it", async () => {
    const offer = await createOffer({ businessConfirmedAt: new Date(), status: "PRESENTED" })
    const admin = await createUser({ role: "ADMIN" })

    const updated = await adminUpdateOffer(offer.id, { finalPriceCents: 12000 }, admin.id)
    expect(updated.finalPriceCents).toBe(12000)
  })

  it("still refuses to edit an offer the customer has already decided on", async () => {
    const offer = await createOffer()
    await testPrisma.offer.update({ where: { id: offer.id }, data: { customerDecision: "ACCEPTED" } })
    const admin = await createUser({ role: "ADMIN" })

    await expect(adminUpdateOffer(offer.id, { finalPriceCents: 12000 }, admin.id)).rejects.toThrow("already decided")
  })
})
