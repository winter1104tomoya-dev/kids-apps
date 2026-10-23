import type { Pt } from './chars';

/** 1画ぶんの折れ線。始点からの道のり（弧長）で位置を扱う */
export class StrokePath {
  readonly pts: Pt[];
  readonly cum: number[];
  readonly length: number;

  constructor(pts: Pt[]) {
    this.pts = pts;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      this.cum.push(this.cum[i - 1] + Math.hypot(bx - ax, by - ay));
    }
    this.length = this.cum[this.cum.length - 1];
  }

  get start(): Pt {
    return this.pts[0];
  }

  pointAt(s: number): Pt {
    s = Math.max(0, Math.min(this.length, s));
    let i = 1;
    while (i < this.pts.length - 1 && this.cum[i] < s) i++;
    const seg = this.cum[i] - this.cum[i - 1] || 1;
    const t = (s - this.cum[i - 1]) / seg;
    const [ax, ay] = this.pts[i - 1];
    const [bx, by] = this.pts[i];
    return [ax + (bx - ax) * t, ay + (by - ay) * t];
  }

  /** 進む向き（単位ベクトル） */
  directionAt(s: number): Pt {
    const a = this.pointAt(s - 1);
    const b = this.pointAt(s + 1);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  }

  /**
   * 点 p を、道のり sMin〜sMax の範囲で線上の一番近い位置に当てはめる。
   * 範囲を絞ることで、線が自分と交差・折り返す文字でも先へ飛ばない。
   */
  project(p: Pt, sMin: number, sMax: number): { s: number; dist: number } {
    sMin = Math.max(0, sMin);
    sMax = Math.min(this.length, sMax);
    let best = { s: sMin, dist: Infinity };
    for (let i = 1; i < this.pts.length; i++) {
      const c0 = this.cum[i - 1];
      const c1 = this.cum[i];
      if (c1 < sMin || c0 > sMax) continue;
      const [ax, ay] = this.pts[i - 1];
      const [bx, by] = this.pts[i];
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy || 1;
      let t = ((p[0] - ax) * dx + (p[1] - ay) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const s = Math.max(sMin, Math.min(sMax, c0 + (c1 - c0) * t));
      const q = this.pointAt(s);
      const dist = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (dist < best.dist) best = { s, dist };
    }
    return best;
  }
}
