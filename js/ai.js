// "יניב מקומה 3" – יריב ממוחשב
import { FIELD, BALL, PLAYER } from './config.js';

const DIFF = {
  easy: { speed: 0.74, aimErr: 1.3, react: 0.7, powerErr: 0.25, fancy: 0.02 },
  medium: { speed: 0.88, aimErr: 0.65, react: 0.38, powerErr: 0.12, fancy: 0.08 },
  hard: { speed: 1.0, aimErr: 0.25, react: 0.15, powerErr: 0.05, fancy: 0.15 },
};

const angDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
};

export class AI {
  constructor(game, me, level) {
    this.g = game; this.me = me;
    this.d = DIFF[level] || DIFF.medium;
    me.speedMul = this.d.speed;
    this.plan = null;
    this.wasAllowed = false;
    this.waitT = 0;
  }

  choosePlan() {
    const g = this.g, me = this.me, opp = g.other(me);
    const r = Math.random();
    const atkX = me.attackDir * FIELD.goalX;
    let type = 'kick', aimZ, height = 0;
    const oppInGoal = Math.abs(opp.pos.x - atkX) < 1.5 && Math.abs(opp.pos.z) < FIELD.postZ;
    if (r < 0.14) { type = 'lob'; aimZ = (Math.random() * 2 - 1) * (FIELD.postZ - 0.3); height = FIELD.goalH; } // משקוף
    else if (r < 0.36) { aimZ = (Math.random() < 0.5 ? -1 : 1) * FIELD.postZ; height = 0.6; }                // קורה
    else if (oppInGoal && r < 0.48) { aimZ = opp.pos.z; height = 0; }                                         // בין הרגליים
    else {
      // לכוון רחוק מהשומר
      const side = opp.pos.z > 0 ? -1 : 1;
      aimZ = side * (FIELD.postZ - 0.35) * (0.4 + Math.random() * 0.6);
    }
    aimZ += (Math.random() * 2 - 1) * this.d.aimErr * 0.5;
    this.plan = { type, aimZ, height };
  }

  think(dt) {
    const g = this.g, me = this.me, b = g.ball;
    const out = { wx: 0, wz: 0, face: null, action: null };
    const atkX = me.attackDir * FIELD.goalX;
    const ownX = -atkX;
    const allowed = g.canTouch(me) && (g.state === 'play' || g.state === 'setpiece');

    if (allowed && !this.wasAllowed) { this.waitT = this.d.react * (0.6 + Math.random() * 0.8); this.choosePlan(); }
    this.wasAllowed = allowed;

    if (g.state === 'goal' || g.state === 'over') {
      this.moveTo(out, ownX * 0.5, 0, 0.4);
      return out;
    }

    if (!allowed) {
      // שומר על השער בלי לגעת בכדור (אסור – נגיעה כפולה)
      let tx = ownX + me.attackDir * 0.55;
      let tz = Math.max(-1.1, Math.min(1.1, b.pos.z * 0.35));
      const dx = me.pos.x - b.pos.x, dz = me.pos.z - b.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 2.2) {
        // לברוח מהכדור
        const bvL = Math.hypot(b.vel.x, b.vel.z);
        let ax = dx / (dist || 1), az = dz / (dist || 1);
        if (bvL > 0.5) { // הצידה מקו התנועה
          const px = -b.vel.z / bvL, pz = b.vel.x / bvL;
          const s = (dx * px + dz * pz) >= 0 ? 1 : -1;
          ax = px * s; az = pz * s;
        }
        tx = me.pos.x + ax * 2; tz = me.pos.z + az * 2;
      }
      if (g.state === 'setpiece') { tx = ownX + me.attackDir * 0.6; tz = 0; }
      this.moveTo(out, tx, tz, 1);
      out.face = Math.atan2(b.pos.z - me.pos.z, b.pos.x - me.pos.x);
      return out;
    }

    if (this.waitT > 0) { this.waitT -= dt; }

    // תחזית מיקום הכדור
    const dist = Math.hypot(b.pos.x - me.pos.x, b.pos.z - me.pos.z);
    // כדור שמתגלגל אליי – לא לברוח ממנו, לעצור אותו
    const approaching = b.vel.x * (me.pos.x - b.pos.x) + b.vel.z * (me.pos.z - b.pos.z) > 0;
    const look = approaching ? 0 : Math.min(0.7, dist / (PLAYER.speed * me.speedMul));
    let bx = b.pos.x + b.vel.x * look, bz = b.pos.z + b.vel.z * look;
    bx = Math.max(-FIELD.boundX + 0.3, Math.min(FIELD.boundX - 0.3, bx));
    bz = Math.max(-FIELD.boundZ + 0.3, Math.min(FIELD.boundZ - 0.3, bz));

    const plan = this.plan || (this.choosePlan(), this.plan);
    let dxg = atkX - bx, dzg = plan.aimZ - bz;
    // אם הכדור מאחורי השער – קודם להחזיר אותו פנימה
    if (Math.sign(bx - atkX) === me.attackDir) { dxg = -me.attackDir * 6; dzg = -bz; }
    const L = Math.hypot(dxg, dzg) || 1;
    const dirx = dxg / L, dirz = dzg / L;
    const perpx = -dirz, perpz = dirx;
    const rx = me.pos.x - bx, rz = me.pos.z - bz;
    const along = rx * dirx + rz * dirz;
    let tx = bx - dirx * 0.5, tz = bz - dirz * 0.5;
    if (along > -0.2) {
      const s = (rx * perpx + rz * perpz) >= 0 ? 1 : -1;
      tx = bx - dirx * 1.0 + perpx * s * 1.1;
      tz = bz - dirz * 1.0 + perpz * s * 1.1;
    }
    this.moveTo(out, tx, tz, 1);
    const shotAng = Math.atan2(dirz, dirx);
    if (dist < 2.2) out.face = shotAng;

    const hd = Math.hypot(b.pos.x - me.pos.x, b.pos.z - me.pos.z);
    if (this.waitT <= 0 && hd < PLAYER.reach - 0.05) {
      // מספרת לכדור באוויר כשהגב לשער
      const backAng = me.facing + Math.PI;
      if (b.pos.y > 0.6 && b.pos.y < 1.8 && angDiff(backAng, shotAng) < 0.6 && Math.random() < this.d.fancy * 6) {
        out.action = { type: 'scissors', power: 1 };
      } else if (b.pos.y < 0.8 && along < 0 && angDiff(me.facing, shotAng) < 0.3) {
        out.action = { type: plan.type, power: this.powerFor(plan, L) };
      } else if (b.pos.y < 0.5 && angDiff(backAng, shotAng) < 0.3 && Math.random() < this.d.fancy) {
        out.action = { type: 'heel', power: 0.7 };
      }
    }
    return out;
  }

  powerFor(plan, D) {
    let best = 0.6, bestErr = 1e9;
    for (let p = 0.15; p <= 1.0001; p += 0.05) {
      const { h, vy } = this.g.kickSpeeds(plan.type, p);
      const t = D / h;
      const y = BALL.r + vy * t - 0.5 * BALL.gravity * t * t;
      let err;
      if (plan.type === 'lob') err = Math.abs(y - plan.height);
      else err = (y < BALL.r + 0.05 ? 0 : Math.abs(y - plan.height) * 0.3) + Math.abs(p - Math.min(1, 0.35 + D / 22));
      if (err < bestErr) { bestErr = err; best = p; }
    }
    best += (Math.random() * 2 - 1) * this.d.powerErr;
    return Math.max(0.15, Math.min(1, best));
  }

  moveTo(out, tx, tz, speed) {
    const dx = tx - this.me.pos.x, dz = tz - this.me.pos.z;
    const l = Math.hypot(dx, dz);
    if (l < 0.08) return;
    const s = Math.min(1, l / 0.6) * speed;
    out.wx = dx / l * s; out.wz = dz / l * s;
  }
}
