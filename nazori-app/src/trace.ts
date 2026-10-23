import type { CharData, Pt } from './chars';
import { StrokePath } from './geometry';
import { playBoing, playFanfare, playPon } from './sound';
import { LEVELS, settings } from './store';

type State = 'demo' | 'ready' | 'drawing' | 'done';

const LINE_W = 11; // お手本の線の太さ（マス単位）
const DEMO_SPEED = 60; // 書き順アニメの速さ（マス/秒）
const LOOKAHEAD = 20; // 1回の指の動きで先へ進める最大の道のり

interface Trail {
  pts: Pt[];
  fadeFrom: number | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  rot: number;
}

/** なぞり書き画面のキャンバス。お手本表示、書き順アニメ、判定、花丸を受け持つ */
export class Tracer {
  private canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private onComplete: () => void;

  private char!: CharData;
  private paths: StrokePath[] = [];
  private state: State = 'demo';
  private current = 0; // 今なぞる画
  private progress = 0; // 今の画の進み具合（道のり）
  private dists: number[] = [];
  private fails = 0;
  private trail: Trail | null = null;
  private fading: Trail[] = [];
  private pointerId: number | null = null;
  private lastPt: Pt | null = null;

  private demoStrokes: number[] = [];
  private demoStart = 0;
  private bounceAt = -1e9;
  private doneAt = 0;
  private particles: Particle[] = [];

  private raf = 0;
  private scale = 1;
  private ox = 0;
  private oy = 0;

  constructor(canvas: HTMLCanvasElement, onComplete: () => void) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d')!;
    this.onComplete = onComplete;
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', (e) => this.up(e));
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  start(char: CharData): void {
    this.char = char;
    this.paths = char.strokes.map((s) => new StrokePath(s));
    this.current = 0;
    this.fails = 0;
    this.trail = null;
    this.fading = [];
    this.particles = [];
    this.pointerId = null;
    this.resize();
    this.playDemo(this.paths.map((_, i) => i));
    cancelAnimationFrame(this.raf);
    const loop = () => {
      this.draw(performance.now());
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  // ---- 入力 ----

  private toGrid(e: PointerEvent): Pt {
    const r = this.canvas.getBoundingClientRect();
    return [(e.clientX - r.left - this.ox) / this.scale, (e.clientY - r.top - this.oy) / this.scale];
  }

  private down(e: PointerEvent): void {
    e.preventDefault();
    if (this.pointerId !== null || this.state !== 'ready') return;
    const p = this.toGrid(e);
    const path = this.paths[this.current];
    const tol = LEVELS[settings.level].tol;
    const [sx, sy] = path.start;
    if (Math.hypot(p[0] - sx, p[1] - sy) > tol) {
      // 始点から遠い：始点の丸を跳ねさせて知らせる
      this.bounceAt = performance.now();
      playBoing();
      return;
    }
    this.canvas.setPointerCapture(e.pointerId);
    this.pointerId = e.pointerId;
    this.state = 'drawing';
    this.progress = 0;
    this.dists = [];
    this.trail = { pts: [p], fadeFrom: null };
    this.lastPt = p;
  }

  private move(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId || this.state !== 'drawing') return;
    const events = e.getCoalescedEvents?.() ?? [e];
    for (const ev of events.length ? events : [e]) {
      const p = this.toGrid(ev);
      // 速く動かしても飛ばないよう、前の点との間を細かく補う
      const prev = this.lastPt ?? p;
      const n = Math.max(1, Math.ceil(Math.hypot(p[0] - prev[0], p[1] - prev[1]) / 2));
      for (let k = 1; k <= n; k++) {
        this.feed([prev[0] + ((p[0] - prev[0]) * k) / n, prev[1] + ((p[1] - prev[1]) * k) / n]);
      }
      this.lastPt = p;
      this.trail?.pts.push(p);
    }
  }

  private feed(p: Pt): void {
    const path = this.paths[this.current];
    const tol = LEVELS[settings.level].tol;
    const { s, dist } = path.project(p, this.progress - 3, this.progress + LOOKAHEAD);
    this.dists.push(dist);
    // 線から大きく外れているあいだは進めない（進み具合は前にしか進まない）
    if (dist <= tol * 1.5 && s > this.progress) this.progress = s;
  }

  private up(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    if (this.state !== 'drawing') return;
    const path = this.paths[this.current];
    const lv = LEVELS[settings.level];
    const ratio = this.progress / path.length;
    const mean = this.dists.reduce((a, b) => a + b, 0) / Math.max(1, this.dists.length);
    const moved = this.trail ? trailLength(this.trail.pts) : 0;

    // 点のような短い画は、始点に触れれば合格
    if ((ratio >= lv.pass && mean <= lv.tol) || path.length < 12) {
      this.passStroke();
      return;
    }
    // 少し触っただけなら失敗に数えない
    if (ratio < 0.1 && moved < 8) {
      this.state = 'ready';
      this.fadeTrail();
      return;
    }
    this.fails++;
    this.fadeTrail();
    if (this.fails >= 3) {
      // 嫌にならないよう、3回目は合格扱い
      this.passStroke();
    } else if (this.fails === 2) {
      this.playDemo([this.current]);
    } else {
      this.state = 'ready';
    }
  }

  private fadeTrail(): void {
    if (this.trail) {
      this.trail.fadeFrom = performance.now();
      this.fading.push(this.trail);
    }
    this.trail = null;
    this.progress = 0;
  }

  private passStroke(): void {
    playPon();
    this.trail = null;
    this.progress = 0;
    this.fails = 0;
    this.current++;
    if (this.current >= this.paths.length) {
      this.state = 'done';
      this.doneAt = performance.now();
      this.spawnConfetti();
      playFanfare();
      setTimeout(() => this.onComplete(), 1600);
    } else {
      this.state = 'ready';
    }
  }

  private playDemo(strokes: number[]): void {
    this.state = 'demo';
    this.demoStrokes = strokes;
    this.demoStart = performance.now() + 400;
  }

  // ---- 描画 ----

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const side = Math.min(w, h);
    this.scale = side / 100;
    this.ox = (w - side) / 2;
    this.oy = (h - side) / 2;
  }

  private draw(now: number): void {
    const g = this.g;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    g.save();
    g.clearRect(0, 0, w, h);
    g.translate(this.ox, this.oy);
    g.scale(this.scale, this.scale);
    g.lineCap = 'round';
    g.lineJoin = 'round';

    // マスの十字の補助線
    g.strokeStyle = '#e3dcd2';
    g.lineWidth = 0.6;
    g.setLineDash([2, 2]);
    g.beginPath();
    g.moveTo(50, 2);
    g.lineTo(50, 98);
    g.moveTo(2, 50);
    g.lineTo(98, 50);
    g.stroke();
    g.setLineDash([]);

    const color = this.char.color;
    const demo = this.state === 'demo' ? this.demoProgress(now) : null;

    this.paths.forEach((path, i) => {
      let doneLen = 0;
      if (i < this.current) doneLen = path.length;
      else if (i === this.current && this.state === 'drawing') doneLen = this.progress;
      if (demo && demo.index === i) doneLen = Math.max(doneLen, demo.len);
      else if (demo && demo.finished.includes(i) && i >= this.current) doneLen = path.length;

      // お手本（薄い色）
      strokePath(g, path.pts, '#ddd6cc', LINE_W);
      // 進んだところまで色で塗る
      if (doneLen > 0) strokePart(g, path, doneLen, color, LINE_W);
    });

    // 今の画：書く向きの矢印と始点の丸
    if (this.state === 'ready' || this.state === 'drawing') {
      const path = this.paths[this.current];
      if (this.state === 'ready') this.drawChevrons(path, now);
      this.drawStartDot(path, now);
    }

    // 指の跡
    for (const t of this.fading) {
      const a = 1 - (now - (t.fadeFrom ?? now)) / 500;
      if (a > 0) strokePath(g, t.pts, `rgba(90,70,60,${0.35 * a})`, 4);
    }
    this.fading = this.fading.filter((t) => now - (t.fadeFrom ?? now) < 500);
    if (this.trail) strokePath(g, this.trail.pts, 'rgba(90,70,60,0.35)', 4);

    // 書き順アニメの指先
    if (demo && demo.index >= 0) {
      const [x, y] = this.paths[demo.index].pointAt(demo.len);
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.strokeStyle = '#5a463c';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(x, y, 4.5, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }

    if (this.state === 'done') this.drawHanamaru(now);
    g.restore();
  }

  /** 書き順アニメの今の位置。全部描き終えたら ready へ戻す */
  private demoProgress(now: number): { index: number; len: number; finished: number[] } {
    let t = (now - this.demoStart) / 1000;
    const finished: number[] = [];
    for (const i of this.demoStrokes) {
      const dur = this.paths[i].length / DEMO_SPEED;
      if (t < dur) return { index: i, len: Math.max(0, t) * DEMO_SPEED, finished };
      t -= dur;
      finished.push(i);
      if (t < 0.35) return { index: -1, len: 0, finished };
      t -= 0.35;
    }
    // アニメが終わったら、お手本を薄い色に戻してなぞり始める
    this.state = 'ready';
    return { index: -1, len: 0, finished: [] };
  }

  private drawChevrons(path: StrokePath, now: number): void {
    const g = this.g;
    const gap = 14;
    const offset = ((now / 1000) * 10) % gap;
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.lineWidth = 1.6;
    for (let s = 10 + offset; s < path.length - 4; s += gap) {
      const [x, y] = path.pointAt(s);
      const [dx, dy] = path.directionAt(s);
      const nx = -dy;
      const ny = dx;
      g.beginPath();
      g.moveTo(x - dx * 2.2 + nx * 2.6, y - dy * 2.2 + ny * 2.6);
      g.lineTo(x + dx * 1.2, y + dy * 1.2);
      g.lineTo(x - dx * 2.2 - nx * 2.6, y - dy * 2.2 - ny * 2.6);
      g.stroke();
    }
  }

  private drawStartDot(path: StrokePath, now: number): void {
    const g = this.g;
    let [x, y] = path.start;
    if (this.state === 'drawing') return;
    const since = now - this.bounceAt;
    if (since < 700) y -= Math.abs(Math.sin((since / 700) * Math.PI * 3)) * 6;
    const pulse = 1 + 0.12 * Math.sin(now / 220);
    g.fillStyle = '#4caf50';
    g.beginPath();
    g.arc(x, y, 6.5 * pulse, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(x, y, 2.4, 0, Math.PI * 2);
    g.fill();
  }

  private spawnConfetti(): void {
    const colors = ['#ff8a80', '#ffd54f', '#81c784', '#64b5f6', '#ba68c8'];
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 20 + Math.random() * 45;
      this.particles.push({
        x: 50,
        y: 50,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 30,
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI,
      });
    }
  }

  /** 花丸：中心のうずまき＋花びらの輪を描いていく */
  private drawHanamaru(now: number): void {
    const g = this.g;
    const t = (now - this.doneAt) / 1000;
    const k = Math.min(1, t / 1.1);
    const pts: Pt[] = [];
    const N = 400;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      if (u < 0.35) {
        // うずまき：上から始めて2周、外へ広がる
        const v = u / 0.35;
        const a = -Math.PI / 2 + v * Math.PI * 4;
        const r = 3 + v * 25;
        pts.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]);
      } else {
        // 花びらの輪：うずまきの終わりからつなげて1周
        const v = (u - 0.35) / 0.65;
        const a = -Math.PI / 2 + v * Math.PI * 2;
        const r = 28 + 9 * Math.abs(Math.sin(v * Math.PI * 6));
        pts.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]);
      }
    }
    strokePath(g, pts.slice(0, Math.max(2, Math.round(pts.length * k))), 'rgba(229,57,53,0.9)', 3);

    const dt = 1 / 60;
    for (const p of this.particles) {
      p.vy += 60 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += 0.1;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.color;
      g.fillRect(-1.5, -1, 3, 2);
      g.restore();
    }
    this.particles = this.particles.filter((p) => p.y < 130);
  }
}

function strokePath(g: CanvasRenderingContext2D, pts: Pt[], color: string, width: number): void {
  if (pts.length === 0) return;
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 1) g.lineTo(pts[0][0] + 0.01, pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke();
}

function strokePart(g: CanvasRenderingContext2D, path: StrokePath, len: number, color: string, width: number): void {
  const pts: Pt[] = [];
  for (let i = 0; i < path.pts.length && path.cum[i] < len; i++) pts.push(path.pts[i]);
  pts.push(path.pointAt(len));
  strokePath(g, pts, color, width);
}

function trailLength(pts: Pt[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}
