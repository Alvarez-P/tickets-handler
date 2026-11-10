export interface HealthProbe {
  name: string;
  check(): Promise<void>;
}
