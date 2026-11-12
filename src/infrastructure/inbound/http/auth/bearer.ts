import { AuthClaims, TokenService } from "../../../../application/ports/token-service";

const BEARER_PREFIX = "Bearer ";

export const verifyBearer = async (tokens: TokenService, header: string | undefined): Promise<AuthClaims | null> => {
  if (!header?.startsWith(BEARER_PREFIX)) {
    return null;
  }
  try {
    return await tokens.verify(header.slice(BEARER_PREFIX.length));
  } catch {
    return null;
  }
};

export const hasRole = (claims: AuthClaims, role: string): boolean => claims.roles.includes(role);
