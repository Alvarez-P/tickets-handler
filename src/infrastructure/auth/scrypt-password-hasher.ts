import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { PasswordHasher } from "../../shared/contracts/password-hasher";

const derive = promisify(scrypt) as (password: string, salt: Buffer, keyLength: number) => Promise<Buffer>;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export class ScryptPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await derive(plain, salt, KEY_LENGTH);
    return `${salt.toString("hex")}:${key.toString("hex")}`;
  }

  async verify(plain: string, hashed: string): Promise<boolean> {
    const [saltHex, keyHex] = hashed.split(":");
    if (!saltHex || !keyHex) {
      return false;
    }
    const expected = Buffer.from(keyHex, "hex");
    const actual = await derive(plain, Buffer.from(saltHex, "hex"), expected.length);
    return timingSafeEqual(expected, actual);
  }
}
