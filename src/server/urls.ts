function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}

export function buildNegotiatorCaseUrl(caseId: string) {
  return `${appBaseUrl()}/negotiator/cases/${caseId}`
}

export function buildBusinessCaseUrl(caseId: string) {
  return `${appBaseUrl()}/business/cases/${caseId}`
}
