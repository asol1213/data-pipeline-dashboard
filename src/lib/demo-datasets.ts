// ── Seeded random number generator (LCG) for deterministic data ──
export class SeededRandom {
  private state: number;
  constructor(seed: number) {
    this.state = seed;
  }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0x7fffffff;
    return this.state / 0x7fffffff;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  nextFloat(min: number, max: number, decimals = 2): number {
    const val = min + this.next() * (max - min);
    return parseFloat(val.toFixed(decimals));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }
  // Weighted pick: weights array same length as arr
  pickWeighted<T>(arr: readonly T[], weights: readonly number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < arr.length; i++) {
      r -= weights[i];
      if (r <= 0) return arr[i];
    }
    return arr[arr.length - 1];
  }
  // Generate a date string between two dates
  dateInRange(start: string, end: string): string {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const d = new Date(s + this.next() * (e - s));
    return d.toISOString().slice(0, 10);
  }
}

export interface DemoTable {
  id: string;
  name: string;
  rows: Record<string, string>[];
  headers: string[];
  columnTypes: Record<string, "number" | "date" | "string">;
}

// Utility: format number as string
export function n(val: number): string {
  return String(val);
}

export function nf(val: number, decimals = 2): string {
  return val.toFixed(decimals);
}
