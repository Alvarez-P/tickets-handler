import { CryptoUtils } from "../../src/shared/utils/crypto";

describe("CryptoUtils", () => {
  it("hashes deterministically", () => {
    expect(CryptoUtils.sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(CryptoUtils.hmacSha256("data", "key")).toHaveLength(64);
  });

  it("generates url-safe random tokens", () => {
    const token = CryptoUtils.randomToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token).not.toBe(CryptoUtils.randomToken());
  });

  it("compares strings safely", () => {
    expect(CryptoUtils.safeEqual("abc", "abc")).toBe(true);
    expect(CryptoUtils.safeEqual("abc", "abd")).toBe(false);
    expect(CryptoUtils.safeEqual("abc", "abcd")).toBe(false);
  });

  it("signs and verifies payloads", () => {
    const signed = CryptoUtils.sign("user:42", "secret");

    expect(CryptoUtils.verify(signed, "secret")).toBe("user:42");
    expect(CryptoUtils.verify(signed, "other")).toBeNull();
    expect(CryptoUtils.verify("tampered", "secret")).toBeNull();
  });
});
