import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export class CryptoUtils {
  static sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  static hmacSha256(value: string, secret: string): string {
    return createHmac("sha256", secret).update(value).digest("hex");
  }

  static randomToken(bytes = 32): string {
    return randomBytes(bytes).toString("base64url");
  }

  static safeEqual(left: string, right: string): boolean {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  static sign(payload: string, secret: string): string {
    return `${payload}.${CryptoUtils.hmacSha256(payload, secret)}`;
  }

  static verify(signed: string, secret: string): string | null {
    const separator = signed.lastIndexOf(".");
    if (separator < 0) {
      return null;
    }
    const payload = signed.slice(0, separator);
    return CryptoUtils.safeEqual(signed.slice(separator + 1), CryptoUtils.hmacSha256(payload, secret)) ? payload : null;
  }
}
