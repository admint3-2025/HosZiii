export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Crítica',
  2: 'Alta',
  3: 'Media',
  4: 'Baja',
}

export function computePriority({ impact, urgency }: { impact: number; urgency: number }): 1 | 2 | 3 | 4 {
  // impact: 1..4 (1 is highest), urgency: 1..4 (1 is highest)
  // Matrix summary (aligned to the earlier ITIL recommendation):
  // P1: I1xU1, I1xU2, I2xU1
  // P2: I1xU3, I2xU2, I2xU3, I3xU1
  // P3: I1xU4, I2xU4, I3xU2, I3xU3, I4xU1, I4xU2
  // P4: I3xU4, I4xU3, I4xU4

  const i = impact
  const u = urgency

  if ((i === 1 && (u === 1 || u === 2)) || (i === 2 && u === 1)) return 1
  if ((i === 1 && u === 3) || (i === 2 && (u === 2 || u === 3)) || (i === 3 && u === 1)) return 2
  if ((i === 1 && u === 4) || (i === 2 && u === 4) || (i === 3 && (u === 2 || u === 3)) || (i === 4 && (u === 1 || u === 2))) return 3
  return 4
}
