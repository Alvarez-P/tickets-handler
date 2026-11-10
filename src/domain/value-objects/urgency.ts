export type Urgency = 0 | 1 | 2 | 3;

const MIN_URGENCY = 0;
const MAX_URGENCY = 3;

export function urgencyFromScore(score: number): Urgency {
  const clamped = Math.min(MAX_URGENCY, Math.max(MIN_URGENCY, Math.round(score)));
  switch (clamped) {
    case 0:
      return 0;
    case 1:
      return 1;
    case 2:
      return 2;
    default:
      return 3;
  }
}
