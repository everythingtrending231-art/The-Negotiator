import bcrypt from "bcryptjs"

// bcryptjs (pure JS) over native bcrypt/argon2: zero native-build risk in
// this sandbox, consistent with how the repo already avoids compiled
// dependencies elsewhere. Revisit to argon2id before real production
// hardening — see plan assumptions.
const COST_FACTOR = 12

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, COST_FACTOR)
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}
