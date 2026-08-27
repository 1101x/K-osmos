/* ══════════════════════════════════════════════════════════════════
   V13 — 자소의 궤도 · 항성 표기

   자음 : 궤도로 값을 갖는다. 규칙정리 03.png 의 수식을 그대로 옮겼다.
   모음 : 원형 궤도. 값은 띠(地 가로 · 人 비스듬 세로)와 위성(天)이 갖는다.
   항성 : 음절 글자 — 삼각 지붕(人) · 받침선(地) · 점(天) letter system v1과 같다

   ★ 변경사항 (v13 정리)
   - 중성모음(ㅡ ㅣ ㅢ) 궤도 방향 → 랜덤(시계 또는 반시계)
   - 초성 방향 = 모음 방향, 종성 방향 = 모음의 반대
   - 그 위에 자음별 반전 규칙을 얹는다 (consOrbit 참고)
   - 모든 궤도의 시작점 = 수식의 영점(t=0)
══════════════════════════════════════════════════════════════════ */

/* ── 자음별 궤도 수식 (규칙정리 03) ── */
const PI2 = Math.PI / 2;
const FAM = {
  hypo: { n: 'Hypotrochoid (하이포트로코이드)' },
  rose: { n: 'Rose Curve (장미 곡선)' },
  liss: { n: 'Lissajous (리사주 곡선)' },
  epi: { n: 'Epitrochoid (에피트로코이드)' },
};
const CURVE = {
  /* 木 — 성장의 에너지, 씨앗 */
  'ㄱ': { f: 'hypo', A: 2, B: 3, p: 2, q: 1 },
  'ㅋ': { f: 'hypo', A: 4, B: 3, p: 4, q: 1 },
  /* 火 — 발화의 에너지, 꽃 */
  'ㄴ': { f: 'rose', k: 3 },
  'ㄷ': { f: 'rose', k: 2 },
  'ㅌ': { f: 'rose', k: 5 },
  'ㄹ': { f: 'rose', k: 7 },
  /* 土 — 땅, 축적의 에너지 */
  'ㅁ': { f: 'liss', a: 2, b: 1, d: 0 },
  'ㅂ': { f: 'liss', a: 3, b: 1, d: PI2 },
  'ㅍ': { f: 'liss', a: 3, b: 2, d: PI2 },
  /* 金 — 빛의 에너지, 별 */
  'ㅅ': { f: 'hypo', A: 4, B: 3, p: 2, q: 1 },
  'ㅈ': { f: 'hypo', A: 6, B: 3, p: 3, q: 1 },
  'ㅊ': { f: 'hypo', A: 5, B: 3, p: 5, q: 3 },
  /* 水 — 파동의 에너지, 물 */
  'ㅇ': { f: 'epi', A: 3, B: 3, p: 3, q: 1 },
  'ㅎ': { f: 'epi', A: 5, B: 6, p: 5, q: 3 },
};
/* 병서 — 궤도는 기본자와 같다. 표기만 쌍둥이 행성 */
const TWIN = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };

const EL = [
  { h: '木', col: '#5B8CDE', e: '성장의 에너지, 씨앗' },
  { h: '火', col: '#e06055', e: '발화의 에너지, 꽃' },
  { h: '土', col: '#f0cf3f', e: '땅, 축적의 에너지' },
  { h: '金', col: '#efdfc0', e: '빛의 에너지, 별' },
  { h: '水', col: '#9fb0cc', e: '파동의 에너지, 물' },
];
const JAMO = {
  'ㄱ': [0, 0, 0], 'ㅋ': [0, 1, 0], 'ㄲ': [0, 0, 1],
  'ㄴ': [1, 0, 0], 'ㄷ': [1, 1, 0], 'ㅌ': [1, 2, 0], 'ㄸ': [1, 1, 1], 'ㄹ': [1, 3, 0],
  'ㅁ': [2, 0, 0], 'ㅂ': [2, 1, 0], 'ㅍ': [2, 2, 0], 'ㅃ': [2, 1, 1],
  'ㅅ': [3, 0, 0], 'ㅈ': [3, 1, 0], 'ㅊ': [3, 2, 0], 'ㅆ': [3, 0, 1], 'ㅉ': [3, 1, 1],
  'ㅇ': [4, 0, 0], 'ㅎ': [4, 1, 0],
};
const VOWEL = {
  'ㅏ': [2, 0], 'ㅑ': [2, 0, 0], 'ㅓ': [0, 2], 'ㅕ': [0, 0, 2],
  'ㅗ': [0, 1], 'ㅛ': [0, 0, 1], 'ㅜ': [1, 0], 'ㅠ': [1, 0, 0],
  'ㅐ': [2, 0, 2], 'ㅒ': [2, 0, 0, 2], 'ㅔ': [0, 2, 2], 'ㅖ': [0, 0, 2, 2],
  'ㅚ': [0, 1, 2], 'ㅟ': [1, 0, 2], 'ㅢ': [1, 2],
  'ㅘ': [0, 1, 2, 0], 'ㅝ': [1, 0, 0, 2],
  'ㅙ': [0, 1, 2, 0, 2], 'ㅞ': [1, 0, 0, 2, 2],
  'ㅡ': [1], 'ㅣ': [2],
};
const YANG = new Set(['ㅏ', 'ㅑ', 'ㅗ', 'ㅛ', 'ㅐ', 'ㅒ', 'ㅚ', 'ㅘ', 'ㅙ']);
const YIN = new Set(['ㅓ', 'ㅕ', 'ㅜ', 'ㅠ', 'ㅔ', 'ㅖ', 'ㅟ', 'ㅝ', 'ㅞ']);
const SAMH = ['天', '地', '人'];
const VCOL = '#e9dfc8';

const CODA = {
  'ㄱ': ['ㄱ'], 'ㄲ': ['ㄲ'], 'ㄴ': ['ㄴ'], 'ㄷ': ['ㄷ'], 'ㄹ': ['ㄹ'],
  'ㅁ': ['ㅁ'], 'ㅂ': ['ㅂ'], 'ㅅ': ['ㅅ'], 'ㅆ': ['ㅆ'], 'ㅇ': ['ㅇ'],
  'ㅈ': ['ㅈ'], 'ㅊ': ['ㅊ'], 'ㅋ': ['ㅋ'], 'ㅌ': ['ㅌ'], 'ㅍ': ['ㅍ'], 'ㅎ': ['ㅎ'],
  'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'],
  'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'],
  'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ'],
};
const OL = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const VL = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const CL = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

function decompose(ch) {
  const c = ch.charCodeAt(0) - 0xAC00;
  if (c < 0 || c > 11171) return null;
  return { onset: OL[Math.floor(c / 588)], vowel: VL[Math.floor((c % 588) / 28)], coda: CL[c % 28] };
}

/* 시드 기반 난수 생성기 */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; };
}

/* ── 궤도 상수 ── */
const NS = 1200;   /* 궤도 샘플 수 */
const R0 = 30;     /* 기본 궤도 반지름 */
const SUN_R = 4.6; /* 항성(중앙 글자) 반지름 */
const W = 0.10;    /* 기본 각속도 — 원형(모음) 궤도 기준 */
const SPEED = W * 2 * Math.PI * R0;  /* 모든 행성 공통 선속도 */

/* 트로코이드 turns — ㅊ·ㅎ(q=3)가 1바퀴 안에 3바퀴를 돌아야 닫히므로 */
function curveTurns(g) {
  const C = CURVE[TWIN[g] || g];
  if (!C) return 1;
  return (C.f === 'hypo' || C.f === 'epi') ? C.q : 1;
}

/* ── 궤도 곡선 표본화 ── */
function jamoCurve(g, a) {
  const C = CURVE[TWIN[g] || g] || CURVE['ㅇ'];
  const turns = curveTurns(g);
  let f;
  if (C.f === 'rose') {
    f = t => { const r = Math.cos(C.k * t); return [r * Math.cos(t), r * Math.sin(t)]; };
  } else if (C.f === 'liss') {
    f = t => [Math.sin(C.a * t + C.d), Math.sin(C.b * t)];
  } else {
    const s = C.f === 'hypo' ? 1 : -1, m = C.p / C.q;
    /* 화면 좌표계(y-down)에서 t 증가가 시계방향이 되도록 부호 조정 (hypo: -1, epi: +1) */
    const ySign = C.f === 'hypo' ? -1 : 1;
    f = t => [C.A * Math.cos(t) + s * C.B * Math.cos(m * t), ySign * (C.A * Math.sin(t) - C.B * Math.sin(m * t))];
  }
  const P = [];
  let mx = 0;
  for (let i = 0; i <= NS; i++) {
    const [x, y] = f(i / NS * Math.PI * 2 * turns);
    P.push([x, y]);
    mx = Math.max(mx, Math.hypot(x, y));
  }
  /* 곡선마다 t 증가 방향이 제각각이라(ㄴ ㄷ ㅌ ㄹ ㅅ ㅈ ㅊ ㅋ 은 반대로 감)
     원점 기준 감김수로 판별해 화면 시계방향으로 통일한다.
     → 이후 dir=+1이 항상 시계, dir=-1이 항상 반시계가 된다.
     감김수 0인 곡선(ㅍ 8자형)은 방향 자체가 성립하지 않아 그대로 둔다 */
  let wind = 0;
  for (let i = 1; i <= NS; i++) {
    const [x0, y0] = P[i - 1], [x1, y1] = P[i];
    wind += Math.atan2(x0 * y1 - y0 * x1, x0 * x1 + y0 * y1);
  }
  if (wind < -0.01) P.reverse();
  return P.map(([x, y]) => [x / mx * a, y / mx * a]);
}

function eqText(g) {
  const C = CURVE[TWIN[g] || g];
  if (!C) return '';
  const m = C.q === 1 ? C.p : `${C.p}/${C.q}`;
  if (C.f === 'rose') return `r = cos(${C.k}t)`;
  if (C.f === 'liss') return `x = sin(${C.a}t${C.d ? ' + π/2' : ''}) , y = sin(${C.b}t)`;
  return `x = ${C.A}cos t ${C.f === 'hypo' ? '+' : '−'} ${C.B}cos(${m}t)`;
}

/* 궤도면 회전 */
function rotate(P, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return P.map(([x, y]) => [x * c - y * s, x * s + y * c]);
}

/* pts 배열의 순서를 startIdx부터 dir 방향으로 재정렬.
   dir=+1이면 원래 순서(시계방향), dir=-1이면 역순(반시계방향) */
function reindex(pts, startIdx, dir) {
  const out = new Array(NS + 1);
  for (let i = 0; i <= NS; i++) out[i] = pts[((startIdx + dir * i) % NS + NS) % NS];
  return out;
}

/* 궤도를 길이 기준 등간격으로 다시 표본화 → 행성이 일정한 선속도로 움직인다.
   반환값의 len(총 궤도 길이)으로 주기를 정하면 모든 자소의 속력이 같아진다 */
function arcResample(pts) {
  const cum = [0];
  for (let i = 1; i <= NS; i++)
    cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const len = cum[NS];
  const out = new Array(NS + 1);
  let k = 0;
  for (let i = 0; i <= NS; i++) {
    const d = i / NS * len;
    while (k < NS - 1 && cum[k + 1] < d) k++;
    const seg = cum[k + 1] - cum[k];
    const f = seg > 0 ? (d - cum[k]) / seg : 0;
    out[i] = [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f];
  }
  return { pts: out, len };
}

/* 火(ㄴㄷㅌㄸㄹ) · 金(ㅅㅈㅊㅆㅉ) 계열은 방향을 뒤집고,
   ㅂㅍㅊㅋ(과 쌍자음 ㅃㅉㄲ)은 그 위에서 한 번 더 뒤집는다 */
const FLIP_TWICE = new Set(['ㅂ', 'ㅍ', 'ㅊ', 'ㅋ']);
function consDir(g, el, dir) {
  if (el === 1 || el === 3) dir = -dir;
  if (FLIP_TWICE.has(TWIN[g] || g)) dir = -dir;
  return dir;
}

/* ── 자음 궤도 생성 ── */
function consOrbit(g, dir, kind, R) {
  const [el, , tense] = JAMO[g] || [4, 0, 0];
  dir = consDir(g, el, dir);
  /* 랜덤 회전 (오방위 로직 삭제됨) */
  const rotAngle = R() * Math.PI * 2;
  /* 수식의 영점(t=0)에서 시작 */
  const rs = arcResample(reindex(rotate(jamoCurve(g, R0), rotAngle), 0, dir));
  const pts = rs.pts;
  let rmax = 0;
  pts.forEach(p => rmax = Math.max(rmax, Math.hypot(p[0], p[1])));
  const C = CURVE[TWIN[g] || g];
  return {
    glyph: g, kind, col: EL[el].col, type: 'cons',
    pts, rmax, dir, tense, sz: kind === '초성' ? 1 : 0.8,
    w: SPEED / rs.len,
    desc: `${EL[el].h} ${FAM[C.f].n.split(' ')[0]} · ${eqText(g)}${tense ? ' · 병서(쌍둥이)' : ''} · ${dir > 0 ? '시계' : '반시계'}`,
  };
}

/* ── 모음 궤도 생성 (방향은 systemFor에서 결정되어 전달됨) ── */
function vowelOrbit(v, dir) {
  const seq = VOWEL[v] || [1];
  const cnt = [0, 0, 0];
  seq.forEach(x => cnt[x]++);

  const raw = Array.from({ length: NS + 1 }, (_, i) => {
    const t = i / NS * Math.PI * 2;
    return [R0 * Math.cos(t), R0 * Math.sin(t)];
  });
  /* 수식의 영점(t=0)에서 시작 */
  const pts = reindex(raw, 0, dir);

  let dirLabel;
  if (YANG.has(v)) dirLabel = '陽 시계';
  else if (YIN.has(v)) dirLabel = '陰 반시계';
  else dirLabel = dir > 0 ? '中 시계(랜덤)' : '中 반시계(랜덤)';

  return {
    glyph: v, kind: '중성', col: VCOL, type: 'vowel',
    pts, rmax: R0, dir, tense: 0, sz: 1, w: SPEED / (2 * Math.PI * R0),
    moons: cnt[0], beltH: cnt[1], beltV: cnt[2], seq, yang: dir > 0,
    desc: `${seq.map(x => SAMH[x]).join('')} · 위성${cnt[0]} 가로띠${cnt[1]} 세로띠${cnt[2]} · ${dirLabel}`,
  };
}

/* ── 음절 → 궤도 목록 ── */
function systemFor(ch) {
  const d = decompose(ch);
  if (!d) return null;
  const R = rng(ch.charCodeAt(0) * 2654435761);
  const orbits = [];
  const v = d.vowel;
  /* 초성 방향 = 모음 방향(양성 시계, 음성 반시계, 중성 랜덤), 종성 = 초성의 반대 */
  const vDir = YANG.has(v) ? 1 : YIN.has(v) ? -1 : (R() < 0.5 ? 1 : -1);
  orbits.push(consOrbit(d.onset, vDir, '초성', R));
  orbits.push(vowelOrbit(v, vDir));
  if (d.coda) {
    (CODA[d.coda] || []).forEach(g => orbits.push(consOrbit(g, -vDir, '종성', R)));
  }
  return { char: ch, d, el: (JAMO[d.onset] || [4, 0, 0])[0], orbits };
}

/* ═══════ RENDER ═══════ */
let cells = [], clock = 0, paused = false, showStar = true;
const REVEAL = 5, DPR = Math.min(devicePixelRatio || 1, 2), PR = 7;

function buildCells(name) {
  const row = document.getElementById('trajRow');
  row.innerHTML = '';
  cells = [];
  const sys = [...name].map(systemFor).filter(Boolean);
  if (!sys.length) return;
  let gmax = SUN_R * 2;
  sys.forEach(s => s.orbits.forEach(P => gmax = Math.max(gmax, P.rmax)));
  sys.forEach((sy, i) => {
    const cell = document.createElement('div');
    cell.className = 'traj-cell';

    const cv = document.createElement('canvas');
    cell.appendChild(cv);

    const ch = document.createElement('div');
    ch.className = 'traj-char';
    ch.textContent = sy.char;
    ch.style.color = EL[sy.el].col;
    cell.appendChild(ch);

    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = sy.orbits.map(P =>
      `<div class="r"><span class="dot" style="background:${P.col}"></span>` +
      `<span class="g">${P.glyph}</span><span>${P.kind} · ${P.desc}</span></div>`
    ).join('');
    cell.appendChild(info);
    row.appendChild(cell);

    /* 캔버스는 CSS 크기를 잰 뒤 DPR 배율로 확대한다 */
    const w = cv.clientWidth || 380;
    cv.width = w * DPR;
    cv.height = w * DPR;
    const ctx = cv.getContext('2d');
    ctx.scale(DPR, DPR);
    cells.push({ ctx, size: w, scale: (w / 2 - 26) / gmax, sy, spawn: clock + i * 0.4 });
  });
}

/* ── 항성 표기 (규칙정리 04) ── */
function drawStar(ctx, cx, cy, sy, S) {
  const d = sy.d, seq = VOWEL[d.vowel] || [], cnt = [0, 0, 0];
  seq.forEach(x => cnt[x]++);
  const yang = !YIN.has(d.vowel), col = EL[sy.el].col;
  const H = S * 2.2, W = S * 1.8;
  const roofY = cy + H * 0.5, apexY = cy - H * 0.85, baseY = cy + H * 0.62;

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = col + 'cc'; ctx.lineWidth = 1.4; ctx.lineJoin = 'round';

  /* 人 — 삼각 지붕 */
  for (let k = 0; k < cnt[2]; k++) {
    const o = k * 5;
    ctx.beginPath();
    ctx.moveTo(cx - W - o, roofY); ctx.lineTo(cx, apexY - o * 0.4); ctx.lineTo(cx + W + o, roofY);
    ctx.stroke();
  }
  /* 地 — 받침선 */
  for (let k = 0; k < cnt[1]; k++) {
    const yy = baseY + k * 5;
    ctx.beginPath();
    ctx.moveTo(cx - W, yy - 5); ctx.lineTo(cx - W, yy); ctx.lineTo(cx + W, yy); ctx.lineTo(cx + W, yy - 5);
    ctx.stroke();
  }
  /* 天 — 점: 규칙 정리 04 기반 배치 (이중 모음시 ㅕ가 좌우 대칭 배치되도록 사선 위상 배치) */
  ctx.fillStyle = col;
  const dotR = Math.max(2.5, S * 0.12);
  if (cnt[2] > 0) {
    /* 세로모음/복합모음 (지붕 人 있음) -> 가(ㅏ) 처럼 지붕에 대한 좌우 대칭 배치 */
    for (let lv = 0; lv < cnt[0]; lv++) {
      let lx, ly;
      if (yang) {
        /* 양성: 지붕 밖/위 (예: 삶, ㅑ) */
        if (cnt[0] > 1) {
          lx = W * (0.60 + lv * 0.34);
          ly = (roofY - H * 0.75) + lv * (H * 0.35);
        } else {
          lx = W * 0.75;
          ly = roofY - H * 0.65;
        }
      } else {
        /* 음성: 지붕 안/아래 (예: 셔, ㅕ) - 대칭 2단 사선 배치 */
        if (cnt[0] > 1) {
          /* 이중 모음 (예: ㅕ): ㅕ 모양이 좌우 대칭되어 각 쪽에 점 2개씩 사선으로 배치 */
          const baseLx = cnt[1] ? W * 0.28 : W * 0.26;
          lx = baseLx + lv * (W * 0.34);
          ly = (roofY - H * 0.52) + lv * (H * 0.27);
        } else {
          /* 단모음 (예: ㅓ): 각 쪽에 점 1개씩 (총 2개) */
          lx = cnt[1] ? W * 0.28 : W * 0.26;
          ly = roofY - H * 0.38;
        }
      }
      /* 대칭 쌍 (좌, 우) */
      ctx.beginPath(); ctx.arc(cx - lx, ly, dotR, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + lx, ly, dotR, 0, 7); ctx.fill();
    }
  } else {
    /* 가로모음 (지붕 人 없음: ㅗ, ㅛ, ㅜ, ㅠ, ㅡ 등) */
    if (cnt[0] === 1) {
      /* 예: 뿡(ㅜ) -> 중앙에 점 1개 */
      const py = yang ? baseY - H * 0.35 : baseY + H * 0.35;
      ctx.beginPath(); ctx.arc(cx, py, 3, 0, 7); ctx.fill();
    } else if (cnt[0] >= 2) {
      /* 예: 뀨(ㅠ) -> 좌우 대칭 점 2개 */
      for (let k = 0; k < cnt[0]; k++) {
        const side = k % 2 ? 1 : -1;
        const px = cx + side * (W * 0.35 + Math.floor(k / 2) * 7);
        const py = yang ? baseY - H * 0.35 : baseY + H * 0.35;
        ctx.beginPath(); ctx.arc(px, py, 3, 0, 7); ctx.fill();
      }
    }
  }
  /* 초성 중앙 · 종성 받침선 아래 */
  ctx.fillStyle = col;
  ctx.font = `600 ${S * 1.55}px "Noto Serif KR",serif`;
  ctx.fillText(d.onset, cx, cy + H * 0.02);
  if (d.coda) {
    ctx.font = `600 ${S * 0.9}px "Noto Serif KR",serif`;
    ctx.fillStyle = col + 'cc';
    ctx.fillText(d.coda, cx, baseY + (cnt[1] ? cnt[1] * 5 : 0) + S * 0.85);
  }
  ctx.restore();
}

/* ── 모음 행성 = 띠와 위성 ── */
function drawVowelPlanet(ctx, x, y, P, r, t) {
  ctx.save();
  ctx.strokeStyle = P.col + '99'; ctx.lineWidth = 1.1;
  for (let k = 0; k < P.beltH; k++) {
    ctx.beginPath(); ctx.ellipse(x, y, r * (1.7 + k * 0.42), r * (0.3 + k * 0.06), 0, 0, 7); ctx.stroke();
  }
  for (let k = 0; k < P.beltV; k++) {
    const ang = (P.yang ? 1 : -1) * (0.38 + k * 0.3);
    ctx.beginPath(); ctx.ellipse(x, y, r * (0.32 + k * 0.07), r * (1.7 + k * 0.42), ang, 0, 7); ctx.stroke();
  }
  ctx.fillStyle = P.col; ctx.shadowColor = P.col; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  for (let k = 0; k < P.moons; k++) {
    const ang = P.dir * t * 2.4 + k * Math.PI * 2 / P.moons, mr = r * 2.5 + k * 3;
    ctx.beginPath(); ctx.arc(x + Math.cos(ang) * mr, y + Math.sin(ang) * mr * 0.55, r * 0.34 + 1, 0, 7); ctx.fill();
  }
  ctx.restore();
}

/* ── 셀 그리기 ── */
function drawCell(c) {
  const { ctx, size, scale, sy } = c, cx = size / 2, cy = size / 2;
  ctx.clearRect(0, 0, size, size);
  const reveal = Math.min(1, Math.max(0, (clock - c.spawn) / REVEAL));

  sy.orbits.forEach(P => {
    const n = reveal < 1 ? Math.floor(reveal * NS) : NS;
    if (n > 1) {
      ctx.strokeStyle = P.col + (reveal >= 1 ? 'aa' : '77');
      ctx.lineWidth = reveal >= 1 ? 1.3 : 1;
      ctx.shadowColor = P.col; ctx.shadowBlur = reveal >= 1 ? 5 : 0;
      ctx.beginPath();
      ctx.moveTo(cx + P.pts[0][0] * scale, cy + P.pts[0][1] * scale);
      for (let j = 1; j <= n; j++) ctx.lineTo(cx + P.pts[j][0] * scale, cy + P.pts[j][1] * scale);
      if (reveal >= 1) ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    const u = reveal < 1 ? reveal : (clock * P.w) % 1;
    const [px, py] = P.pts[Math.floor(u * NS)];
    const x = cx + px * scale, y = cy + py * scale, r = PR * P.sz;
    if (P.type === 'vowel') { drawVowelPlanet(ctx, x, y, P, r, clock); return; }
    ctx.fillStyle = P.col; ctx.shadowColor = P.col; ctx.shadowBlur = 10;
    if (P.tense) {
      ctx.beginPath(); ctx.arc(x - r * 0.62, y, r * 0.82, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.62, y, r * 0.82, 0, 7); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    ctx.shadowBlur = 0;
  });
  if (showStar) drawStar(ctx, cx, cy, sy, Math.max(13, SUN_R * scale * 0.95));
}

/* ── UI 토글 ── */
function toggleStar() {
  showStar = !showStar;
  document.getElementById('btnStar').classList.toggle('active', showStar);
}
function togglePanel(name) {
  const map = { detail: ['panelDetail', 'btnDetail'], jamo: ['panelJamo', 'btnJamo'] };
  const [pid, bid] = map[name];
  const open = !document.getElementById(pid).classList.contains('open');
  document.getElementById(pid).classList.toggle('open', open);
  document.getElementById(bid).classList.toggle('active', open);
}

/* ── 애니메이션 ── */
function animate() {
  requestAnimationFrame(animate);
  if (!paused) clock += 0.016;
  cells.forEach(drawCell);
  document.getElementById('btnPause').classList.toggle('active', paused);
  document.getElementById('btnPlay').classList.toggle('active', !paused);
}
function doRewind() { cells.forEach((c, i) => c.spawn = clock + i * 0.4); paused = false; }
function doComplete() { if (cells.length) { clock = Math.max(...cells.map(c => c.spawn)) + REVEAL; paused = false; } }

let curName = '';
function analyze() {
  const v = document.getElementById('nameInput').value.trim();
  if (!v) return;
  curName = v; paused = false; buildCells(v);
}
function onInput() {
  const v = document.getElementById('nameInput').value.trim();
  if (v.length >= 2) analyze();
}
let lastW = innerWidth;
addEventListener('resize', () => { if (curName && innerWidth !== lastW) { lastW = innerWidth; buildCells(curName); } });

/* ── 법칙표 렌더 ── */
document.getElementById('lawC').innerHTML = [
  [0, 'hypo', 'ㄱ ㅋ ㄲ', ['ㄱ', 'ㅋ'], '잎 3 → 5'],
  [1, 'rose', 'ㄴ ㄷ ㅌ ㄹ', ['ㄴ', 'ㄷ', 'ㅌ', 'ㄹ'], '꽃잎 3 → 4 → 5 → 7'],
  [2, 'liss', 'ㅁ ㅂ ㅍ ㅃ', ['ㅁ', 'ㅂ', 'ㅍ'], '1:2 → 1:3 → 2:3'],
  [3, 'hypo', 'ㅅ ㅈ ㅊ ㅆ ㅉ', ['ㅅ', 'ㅈ', 'ㅊ'], '각 3 → 4 → 8'],
  [4, 'epi', 'ㅇ ㅎ', ['ㅇ', 'ㅎ'], '고리 2 → 3'],
].map(([el, f, js, gs, sh]) =>
  `<tr><td class="hj" style="color:${EL[el].col}">${EL[el].h}</td>` +
  `<td>${EL[el].e}</td><td class="hj">${js}</td>` +
  `<td class="eq">${gs.map(g => g + ' : ' + eqText(g)).join('<br>')}</td><td>${sh}</td></tr>`
).join('');

/* ── 자음보기 그리드 ── */
document.getElementById('jamoGrid').innerHTML =
  [['ㄱ', 'ㅋ'], ['ㄴ', 'ㄷ', 'ㅌ', 'ㄹ'], ['ㅁ', 'ㅂ', 'ㅍ'], ['ㅅ', 'ㅈ', 'ㅊ'], ['ㅇ', 'ㅎ']]
    .map(row => `<div class="jamo-row">${row.map(g =>
      `<div class="jamo-cell"><canvas data-g="${g}" width="220" height="220"></canvas><span style="color:${EL[JAMO[g][0]].col}">${g}</span></div>`
    ).join('')}</div>`).join('');
document.querySelectorAll('#jamoGrid canvas').forEach(cv => {
  const g = cv.dataset.g, el = JAMO[g][0], P = jamoCurve(g, 88);
  const x = cv.getContext('2d');
  x.strokeStyle = EL[el].col; x.lineWidth = 1.3;
  x.beginPath();
  P.forEach((p, i) => i ? x.lineTo(110 + p[0], 110 + p[1]) : x.moveTo(110 + p[0], 110 + p[1]));
  x.stroke();
});

/* ── 시작 ── */
animate();
document.getElementById('nameInput').value = '삶';
analyze();
