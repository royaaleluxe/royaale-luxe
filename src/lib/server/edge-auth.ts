import { createRemoteJWKSet, jwtVerify } from "jose";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(
        "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
      )
    );
  }
  return jwks;
}

export async function verifyFirebaseTokenEdge(token: string): Promise<boolean> {
  if (!projectId || !token) return false;
  try {
    await jwtVerify(token, getJwks(), {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    return true;
  } catch {
    return false;
  }
}
