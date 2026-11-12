import { SignJWT, jwtVerify } from "jose";
import { AuthClaims, TokenService } from "../../application/ports/token-service";

export class JoseTokenService implements TokenService {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly expiresIn: string = "15m",
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  sign(claims: AuthClaims): Promise<string> {
    return new SignJWT({ roles: claims.roles })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(claims.sub)
      .setIssuedAt()
      .setExpirationTime(this.expiresIn)
      .sign(this.key);
  }

  async verify(token: string): Promise<AuthClaims> {
    const { payload } = await jwtVerify(token, this.key, { algorithms: ["HS256"] });
    const roles = Array.isArray(payload.roles) ? payload.roles.map(String) : [];
    return { sub: String(payload.sub), roles };
  }
}
