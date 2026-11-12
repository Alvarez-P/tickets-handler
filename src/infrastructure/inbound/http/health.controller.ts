import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { HEALTH_PROBES } from "../../di/tokens";
import { HealthProbe } from "../../observability/health-probe";

type ProbeStatus = "up" | "down";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(@Inject(HEALTH_PROBES) private readonly probes: HealthProbe[]) {}

  @Get()
  check(): { status: string } {
    return { status: "ok" };
  }

  @Get("ready")
  async ready(): Promise<{ status: string; checks: Record<string, ProbeStatus> }> {
    const outcomes = await Promise.allSettled(this.probes.map((probe) => probe.check()));
    const checks: Record<string, ProbeStatus> = {};
    this.probes.forEach((probe, index) => {
      checks[probe.name] = outcomes[index].status === "fulfilled" ? "up" : "down";
    });
    const report = { status: Object.values(checks).includes("down") ? "unavailable" : "ok", checks };
    if (report.status === "unavailable") {
      throw new ServiceUnavailableException(report);
    }
    return report;
  }
}
