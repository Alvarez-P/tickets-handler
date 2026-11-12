import { CacheInvalidator } from "../../src/application/ports/cache";

export class FakeCacheInvalidator implements CacheInvalidator {
  readonly invalidated: string[] = [];

  async invalidate(id: string): Promise<void> {
    this.invalidated.push(id);
  }
}
