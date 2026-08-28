import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ═════════════════════════════════════════════════════════════
   코드북 — 훈민정음 제자원리 · 오행 · 음양 (별도 파일)
═════════════════════════════════════════════════════════════ */
import {
  JAMO, EL, CODA_PARTS, decompose,
  CURVE, FAMKO, TWIN, VSEQ, YANG, YIN, SAMH, VOWEL_EL,
  jejaText, FLIP_TWICE,
  eqText, curveTurns, nameReading, OHBANG_KO,
} from './codebook.js';

/* 색 표기 정규화 — THREE.Color는 8자리 hex(#rrggbbaa)도, 알파가 붙은 32비트 숫자도
   읽지 못하고 흰색으로 떨어진다. 색상 피커가 뱉는 값을 그대로 붙여 넣어도 되도록
   THREE로 넘어가는 길목에서 알파를 잘라낸다. CSS 쪽은 8자리를 이해하므로 손대지 않는다 */
const C3 = (h) => new THREE.Color(typeof h === 'string' ? h.slice(0, 7) : (h & 0xffffff));

/* ═════════════════════════════════════════════════════════════
   02 geometry_v13 — 자소 궤도 기하 계산
═════════════════════════════════════════════════════════════ */
const NS = 1200;   /* 궤도 샘플 수 */
const R0 = 30;     /* 기본 궤도 반지름 */
const WANG = 0.10; /* 원(모음) 궤도 각속도 */
const SPEED = WANG * 2 * Math.PI * R0;  /* 모든 행성 공통 선속도 */

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; };
}
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
  /* 곡선마다 t 증가 방향이 제각각 → 감김수로 판별해 시계방향으로 통일 */
  let wind = 0;
  for (let i = 1; i <= NS; i++) {
    const [x0, y0] = P[i - 1], [x1, y1] = P[i];
    wind += Math.atan2(x0 * y1 - y0 * x1, x0 * x1 + y0 * y1);
  }
  if (wind < -0.01) P.reverse();
  return P.map(([x, y]) => [x / mx * a, y / mx * a]);
}
function rotate2(P, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return P.map(([x, y]) => [x * c - y * s, x * s + y * c]);
}
function reindex(pts, startIdx, dir) {
  const out = new Array(NS + 1);
  for (let i = 0; i <= NS; i++) out[i] = pts[((startIdx + dir * i) % NS + NS) % NS];
  return out;
}
/* 길이 기준 등간격 재표본화 → 모든 자소의 선속도가 같아진다 */
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
function consDir(g, el, dir) {
  if (el === 1 || el === 3) dir = -dir;
  if (FLIP_TWICE.has(TWIN[g] || g)) dir = -dir;
  return dir;
}
/* 자음 궤도 — kind: '초성' | '종성' 자음 크기 행성 크기*/
function consOrbit(g, dir, kind, R) {
  const [el, , tense] = JAMO[g] || [4, 0, 0];
  dir = consDir(g, el, dir);
  const rs = arcResample(reindex(rotate2(jamoCurve(g, R0), R() * Math.PI * 2), 0, dir));
  const C = CURVE[TWIN[g] || g];
  const baseSize = 4;
  return {
    glyph: g, kind, type: 'cons', el, col: EL[el].col, trail: EL[el].trail,
    pts: rs.pts, dir, tense, sz: kind === '초성' ? baseSize : baseSize * 0.8,
    w: SPEED / rs.len, moons: 0,
    desc: `${EL[el].h} ${FAMKO[C ? C.f : 'epi']} · ${eqText(g)}${tense ? ' · 병서(쌍둥이)' : ''} · ${dir > 0 ? '시계' : '반시계'}`,
  };
}
/* 모음 궤도 — 원. 음양이 방향을, 천지인이 위성·띠를 정한다 sz 종성 크기 */
function vowelOrbit(v, dir) {
  const seq = VSEQ[v] || [1];
  const cnt = [0, 0, 0];
  seq.forEach(x => cnt[x]++);
  const raw = Array.from({ length: NS + 1 }, (_, i) => {
    const t = i / NS * Math.PI * 2;
    return [R0 * Math.cos(t), R0 * Math.sin(t)];
  });
  const yang = YANG.has(v) ? true : YIN.has(v) ? false : dir > 0;
  const dirLabel = YANG.has(v) ? '陽 시계' : YIN.has(v) ? '陰 반시계' : (dir > 0 ? '中 시계' : '中 반시계');
  return {
    glyph: v, kind: '중성', type: 'vowel', el: -1, col: VOWEL_EL.col, trail: VOWEL_EL.trail,
    pts: reindex(raw, 0, dir), dir, tense: 0, sz: 2,
    w: SPEED / (2 * Math.PI * R0),
    moons: cnt[0], beltH: cnt[1], beltV: cnt[2], seq, yang,
    desc: `${seq.map(x => SAMH[x]).join('')} · 위성${cnt[0]} 가로띠${cnt[1]} 세로띠${cnt[2]} · ${dirLabel}`,
  };
}
/* 음절 → 자소 궤도 목록 (초성 · 중성 · 종성[겹받침 2]) */
function systemFor(ch) {
  const d = decompose(ch);
  if (!d) return null;
  const R = rng(ch.charCodeAt(0) * 2654435761);
  const v = d.vowel;
  /* 초성 방향 = 모음 방향(양성 시계 · 음성 반시계 · 중성 랜덤), 종성 = 반대 */
  const vDir = YANG.has(v) ? 1 : YIN.has(v) ? -1 : (R() < 0.5 ? 1 : -1);
  const orbits = [consOrbit(d.onset, vDir, '초성', R), vowelOrbit(v, vDir)];
  if (d.coda) (CODA_PARTS[d.coda] || [d.coda]).forEach(g => orbits.push(consOrbit(g, -vDir, '종성', R)));
  return { char: ch, el: (JAMO[d.onset] || [4, 0, 0])[0], onset: d.onset, vowel: v, coda: d.coda, orbits };
}

/* ═════════════════════════════════════════════════════════════
   메인 씬 — 01 solar system 베이스
═════════════════════════════════════════════════════════════ */
const container = document.getElementById('scene-container');

const scene = new THREE.Scene();
/* 푸른 우주 대신 먹(墨)빛 — 밤하늘보다 벼루에 가까운 검정 */
scene.background = new THREE.Color(0x050302);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 300000);
/* 첫 화면 자리는 은하가 만들어진 뒤 맨 아래 '시작'에서 잡는다 */
camera.position.set(0, 46, 78);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'fixed';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.zIndex = '10';
labelRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 4;
controls.maxDistance = 90000;

scene.add(new THREE.AmbientLight(0xfff4e0, 0.32));
/* 계마다 점광원을 두면 광원 수가 음절 수만큼 늘어난다 → 전역 평행광 하나로 대신한다 */
const sunLight = new THREE.DirectionalLight(0xfff2d5, 2.4);
sunLight.position.set(1, 0.9, 0.6);
scene.add(sunLight);

const texLoader = new THREE.TextureLoader();
const TEXROOT = "./src/textures/";
const texCache = {};
const loadTex = (name) => {
  if (!texCache[name]) {
    const t = texLoader.load(TEXROOT + name);
    t.colorSpace = THREE.SRGBColorSpace;
    texCache[name] = t;
  }
  return texCache[name];
};

function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const smooth = (d, a, b) => {
  const t = Math.min(Math.max((d - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/* ---------------- 별 스프라이트 + 포인트 필드 (01 그대로) ---------------- */
function makeStarSprite() {
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.globalCompositeOperation = 'lighter';
  const flare = (w, l) => {
    const fg = ctx.createLinearGradient(s / 2 - l, s / 2, s / 2 + l, s / 2);
    fg.addColorStop(0, 'rgba(255,255,255,0)');
    fg.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    fg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(s / 2 - l, s / 2 - w / 2, l * 2, w);
  };
  flare(2.2, 30);
  ctx.save();
  ctx.translate(s / 2, s / 2); ctx.rotate(Math.PI / 2); ctx.translate(-s / 2, -s / 2);
  flare(2.2, 30);
  ctx.restore();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const STAR_SPRITE = makeStarSprite();

function makeStarField({ count, radiusMin, radiusMax, sizeMin, sizeMax, palette, twinkleAmp, maxPx = 512, atten = 1, generate, sprite }) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const speed = new Float32Array(count);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    let p;
    if (generate) { p = generate(i); }
    else {
      const r = radiusMin + Math.random() * (radiusMax - radiusMin);
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const sq = Math.sqrt(1 - u * u);
      p = { x: r * sq * Math.cos(th), y: r * u, z: r * sq * Math.sin(th) };
    }
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;

    c.set(p.color ?? palette[Math.floor(Math.random() * palette.length)]);
    const v = 0.6 + Math.random() * 0.4;
    col[i * 3] = c.r * v; col[i * 3 + 1] = c.g * v; col[i * 3 + 2] = c.b * v;

    size[i] = p.size ?? (sizeMin + Math.pow(Math.random(), 2.2) * (sizeMax - sizeMin));
    phase[i] = Math.random() * Math.PI * 2;
    speed[i] = 0.5 + Math.random() * 2.2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: sprite || STAR_SPRITE },
      uTwinkle: { value: twinkleAmp },
      uAlpha: { value: 1 },
      uMaxPx: { value: maxPx },
      uAtten: { value: atten },
    },
    vertexShader: /* glsl */`
  attribute vec3 aColor;
  attribute float aSize, aPhase, aSpeed;
  uniform float uTime, uTwinkle, uMaxPx, uAtten;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float tw = 1.0 - uTwinkle + uTwinkle * (0.5 + 0.5 * sin(uTime * aSpeed + aPhase));
    vColor = aColor;
    vAlpha = tw;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = min(aSize * tw * pow(300.0 / -mv.z, uAtten), uMaxPx);
    gl_Position = projectionMatrix * mv;
  }`,
    fragmentShader: /* glsl */`
  uniform sampler2D uMap;
  uniform float uAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    /* gl_PointCoord(y 아래로)와 flipY 텍스처가 어긋나 글자가 뒤집히므로 v를 뒤집어 고정 */
    vec4 tex = texture2D(uMap, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y));
    gl_FragColor = vec4(vColor, 1.0) * tex * vAlpha * uAlpha;
  }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geo, mat);
}

/* ---------------- [뎁스 1] 우리은하 — 태극 두 팔 ---------------- */
const GALAXY_TILT = new THREE.Euler(0.55, 0.35, 0.12);
const SUN_LOCAL = new THREE.Vector3(1600, 0, -6400);   /* 아래쪽 테를 타는 팔 중간 위 */

function galaxyGenerate() {
  /* 태극 두 팔 — 중앙 벌지 없이 점대칭 팔 둘.
     팔은 바깥 꼬리에서 가늘게 시작해 안으로 감길수록 두꺼워지고,
     두꺼워진 머리는 빈 눈(R_EYE)을 한 바퀴 반 감아 돌아 속이 뚫려 보인다.
     색은 기존 벌지/팔/성운 팔레트를 그대로 섞어 쓴다 */
  const N_ARM = 22000, N_HII = 650;                    /* 팔마다 → 총 45300 */
  const R_EYE = 1600;                                  /* 눈(공동) 반지름 */
  const R_FAR = 8800;                                  /* 꼬리 시작이 눈에서 떨어진 거리 */
  const CURL = 1.9 * Math.PI;                          /* 감기는 총 각도 */
  const EYES = [{ cx: 2600, cz: -2600 }, { cx: -2600, cz: 2600 }];
  const cols = [
    0xfff4d8, 0xffe9b8, 0xffffff, 0xffddaa,            /* 구 벌지(온색) */
    0xdfe8ff, 0xffffff, 0xcdd8ff, 0xfff2d8,            /* 구 팔(한색) */
    0xffd75e, 0x9fc0ff, 0xffb3c8, 0xbfffe0, 0xffa86e,  /* 금·청·분홍·옥·주황 */
  ];
  const pts = [];
  /* t 0(꼬리)→1(머리). 꼬리는 상대 눈 너머 바깥 테를 감싸고 출발해(태극 맞물림)
     제 눈의 R_EYE 궤도로 빠르게 수렴한다 — (1-t)^3 이라 초반에 안으로 꺾여
     바깥 테를 타고 돌다가 마지막 40%는 제 눈을 감아 돈다 */
  const armPoint = (g, t, sigma) => {
    const phi = Math.atan2(-g.cz, -g.cx) + t * CURL;
    const d = R_EYE + R_FAR * Math.pow(1 - t, 3);
    let px, pz, tries = 0;
    do {
      px = g.cx + Math.cos(phi) * d + gauss() * sigma;
      pz = g.cz + Math.sin(phi) * d + gauss() * sigma;
    } while (Math.hypot(px - g.cx, pz - g.cz) < R_EYE * 0.72 && ++tries < 4);
    return { px, pz };
  };
  for (const g of EYES) {
    for (let i = 0; i < N_ARM; i++) {
      const t = Math.pow(Math.random(), 0.6);          /* 머리 쪽으로 밀도 편중 */
      const sigma = 260 + 1050 * Math.pow(t, 1.4);     /* 꼬리 가늘고 머리 두껍게 */
      const { px, pz } = armPoint(g, t, sigma);
      pts.push({
        x: px, y: gauss() * (180 + 320 * t), z: pz,
        color: cols[Math.floor(Math.random() * cols.length)],
        size: 280 + Math.pow(Math.random(), 1.9) * 1050,
      });
    }
    /* 분홍 성운 — 팔을 따라 드문드문 */
    for (let i = 0; i < N_HII; i++) {
      const t = Math.random();
      const { px, pz } = armPoint(g, t, 200 + 800 * t);
      pts.push({
        x: px, y: gauss() * 300, z: pz,
        color: 0xff9db8,
        size: 500 + Math.random() * 900,
      });
    }
  }
  let i = 0;
  return () => pts[i++];
}

const galaxy = makeStarField({
  count: 45300,
  sizeMin: 0, sizeMax: 0, palette: [0xffffff],
  twinkleAmp: 0.38,
  maxPx: 10,
  generate: galaxyGenerate(),
});
galaxy.rotation.copy(GALAXY_TILT);
const sunWorldOfLocal = SUN_LOCAL.clone().applyEuler(GALAXY_TILT);
galaxy.position.copy(sunWorldOfLocal.clone().negate());
galaxy.material.uniforms.uAlpha.value = 0;
scene.add(galaxy);

const GALAXY_CENTER_DIR = galaxy.position.clone().normalize();

/* ---------------- 사신수 별자리 — 은하 사방(東西南北) ----------------
   src/sinsoo 라인아트(투명 배경 위 흰 선)를 런타임에 캔버스로 샘플링해
   ① 선을 따라 잔별을 촘촘히 심어 실루엣을 만들고
   ② 최원점 샘플링으로 뽑은 관절별 몇 개를 크게 빛내고
   ③ 관절별들을 최소신장트리 선으로 이어 별자리 선을 그린다.
   배치는 은하 기울기와 무관한 월드 X/Z 사방 — 나침반 HUD와 같은 축.
   카메라가 그 방위를 향하면(수평 내적) 별과 선이 밝아진다 */
const SINSOO_DIST = 13500, SINSOO_SIZE = 19000;
const SINSOO_SPEC = [
  { file: 'north.png', axis: new THREE.Vector3(0, 0, -1) },   /* 北 현무 */
  { file: 'south.png', axis: new THREE.Vector3(0, 0, 1) },    /* 南 주작 */
  { file: 'east.png', axis: new THREE.Vector3(1, 0, 0) },     /* 東 청룡 */
  { file: 'west.png', axis: new THREE.Vector3(-1, 0, 0) },    /* 西 백호 */
];
const sinsoos = [];

/* 알파 채널이 살아 있는 픽셀 = 라인 위의 점 */
function sinsooSample(img, n) {
  const cv = document.createElement('canvas');
  const w = cv.width = img.width, h = cv.height = img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const a = ctx.getImageData(0, 0, w, h).data;
  const px = [];
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2)
    if (a[(y * w + x) * 4 + 3] > 140) px.push([x, y]);
  const out = [];
  for (let i = 0; i < n; i++) out.push(px[Math.floor(Math.random() * px.length)]);
  return { pts: out, w, h };
}
/* 최원점 샘플링 — 서로 가장 멀리 떨어진 k점이라 꼬리·발톱·머리 끝이 관절이 된다 */
function sinsooJoints(pts, k) {
  const J = [pts[0]];
  while (J.length < k) {
    let best = pts[0], bd = -1;
    for (const p of pts) {
      let d = Infinity;
      for (const j of J) d = Math.min(d, (p[0] - j[0]) ** 2 + (p[1] - j[1]) ** 2);
      if (d > bd) { bd = d; best = p; }
    }
    J.push(best);
  }
  return J;
}
/* 관절을 잇는 최소신장트리 — 끊긴 데 없는 한 붓 별자리 선 */
function sinsooEdges(J) {
  const inT = [0], left = J.map((_, i) => i).slice(1), edges = [];
  while (left.length) {
    let be = null, bd = Infinity;
    for (const a of inT) for (const b of left) {
      const d = (J[a][0] - J[b][0]) ** 2 + (J[a][1] - J[b][1]) ** 2;
      if (d < bd) { bd = d; be = [a, b]; }
    }
    edges.push(be);
    inT.push(be[1]);
    left.splice(left.indexOf(be[1]), 1);
  }
  /* 깊이우선 순서로 재배열 — 빛이 이웃 간선으로 이어 달리도록 */
  const adj = J.map(() => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  const seen = new Set([0]), stack = [0], out = [];
  while (stack.length) {
    const a = stack[stack.length - 1];
    const b = adj[a].find(n => !seen.has(n));
    if (b === undefined) { stack.pop(); continue; }
    seen.add(b);
    out.push([a, b]);
    stack.push(b);
  }
  return out;
}
function buildSinsoo(img, spec) {
  const { pts, w, h } = sinsooSample(img, 7000);
  const joints = sinsooJoints(pts.slice(0, 500), 14);
  const S = SINSOO_SIZE / Math.max(w, h);
  const toXY = ([x, y]) => [(x - w / 2) * S, (h / 2 - y) * S];

  const group = new THREE.Group();

  /* 원화 라인을 통째로 별로 치환 — 선을 따라 촘촘히 심은 별밭이
     제각각의 위상으로 반짝여 형상 전체가 번쩍인다 */
  const all = pts.concat(joints);
  let i = 0;
  const field = makeStarField({
    count: all.length,
    sizeMin: 0, sizeMax: 0, palette: [0xffffff],
    twinkleAmp: 0.75, maxPx: 10,
    generate: () => {
      const k = i++;
      const [x, y] = toXY(all[k]);
      const joint = k >= pts.length;
      return {
        x: x + gauss() * S, y: y + gauss() * S, z: gauss() * 26,
        color: joint ? 0xfff4d8 : (Math.random() < 0.12 ? 0xffffff : 0xcfd9ff),
        size: joint ? 1700 + Math.random() * 800 : 380 + Math.pow(Math.random(), 2.0) * 950,
      };
    },
  });
  group.add(field);

  /* 별자리 선 — 빛(혜성 머리)이 선을 타고 흐르는 셰이더.
     정점마다 경로 누적거리 aD를 실어 두고, uHead가 그 거리축을 달린다 */
  const verts = [], dists = [], path = [];
  let cum = 0;
  for (const [a, b] of sinsooEdges(joints)) {
    const [ax, ay] = toXY(joints[a]), [bx, by] = toXY(joints[b]);
    const len = Math.hypot(bx - ax, by - ay);
    verts.push(ax, ay, 0, bx, by, 0);
    dists.push(cum, cum + len);
    path.push({ ax, ay, bx, by, len, cum });
    cum += len;
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  lineGeo.setAttribute('aD', new THREE.BufferAttribute(new Float32Array(dists), 1));
  const lineMat = new THREE.ShaderMaterial({
    uniforms: {
      uHead: { value: 0 },
      uOpacity: { value: 0 },
      uTail: { value: SINSOO_SIZE * 0.16 },   /* 꼬리 길이 */
      uColor: { value: new THREE.Color(0xcfe0ff) },
    },
    vertexShader: /* glsl */`
  attribute float aD;
  varying float vD;
  void main() {
    vD = aD;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`,
    fragmentShader: /* glsl */`
  uniform float uHead, uOpacity, uTail;
  uniform vec3 uColor;
  varying float vD;
  void main() {
    float d = uHead - vD;                     /* 양수 = 머리 지나간 자리 */
    float pulse = d >= 0.0 ? exp(-d / uTail) : exp(d * 0.004);
    float a = uOpacity * (0.35 + 1.4 * pulse);
    gl_FragColor = vec4(uColor + vec3(0.85) * pulse, a);
  }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  group.add(new THREE.LineSegments(lineGeo, lineMat));

  /* 빛 머리 — 선 위를 달리는 스파크 (4갈래 별 스프라이트) */
  const spark = new THREE.Sprite(new THREE.SpriteMaterial({
    map: STAR_SPRITE, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, color: 0xffffff,
  }));
  spark.scale.setScalar(SINSOO_SIZE * 0.06);
  group.add(spark);

  group.position.copy(spec.axis).multiplyScalar(SINSOO_DIST);
  group.visible = showStars;
  scene.add(group);
  sinsoos.push({
    group, axis: spec.axis, field, lineMat, spark, path, pathLen: cum,
    phase: Math.random() * Math.PI * 2,
  });
}
SINSOO_SPEC.forEach(spec => {
  const img = new Image();
  img.onload = () => buildSinsoo(img, spec);
  img.src = './src/sinsoo/' + spec.file;
});
const CAM_FWD = new THREE.Vector3();

/* ---------------- [뎁스 2] 성단 + 별 배경 (01 그대로) ---------------- */
const starsWarm = makeStarField({
  count: 9000,
  radiusMin: 420, radiusMax: 1700,
  sizeMin: 8, sizeMax: 30,
  palette: [0xffd75e, 0xffc44d, 0xffe9a8, 0xff9e5e, 0xfff4d6],
  twinkleAmp: 0.55,
  atten: 0.25,
});
const starsCool = makeStarField({
  count: 15000,
  radiusMin: 500, radiusMax: 1900,
  sizeMin: 3, sizeMax: 13,
  palette: [0xfffdf4, 0xf0e8d6, 0xd9cfb8, 0xfff2da],
  twinkleAmp: 0.35,
  atten: 0.25,
});
scene.add(starsWarm, starsCool);

const clusterCore = makeStarField({
  count: 9000,
  sizeMin: 8, sizeMax: 32,
  palette: [0xffd75e, 0xffc44d, 0xffe9a8, 0xfff4d6, 0xff9e5e],
  twinkleAmp: 0.5,
  atten: 0.25,
  generate: () => {
    const r = 420 + Math.abs(gauss()) * 1150;
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const sq = Math.sqrt(1 - u * u);
    return { x: r * sq * Math.cos(th), y: r * u, z: r * sq * Math.sin(th) };
  },
});
scene.add(clusterCore);

const streamAxis = GALAXY_CENTER_DIR.clone();
const streamU = new THREE.Vector3(0, 1, 0).cross(streamAxis).normalize();
const streamV = streamAxis.clone().cross(streamU).normalize();
const clusterStream = makeStarField({
  count: 7000,
  sizeMin: 8, sizeMax: 28,
  palette: [0xffd75e, 0xffc44d, 0xff9e5e, 0xffe9a8],
  twinkleAmp: 0.5,
  atten: 0.25,
  generate: () => {
    const t = -2200 + Math.pow(Math.random(), 1.25) * 11500;
    const spread = 240 + Math.max(t, 0) * 0.085;
    const a = gauss() * spread, b = gauss() * spread;
    return {
      x: streamAxis.x * t + streamU.x * a + streamV.x * b,
      y: streamAxis.y * t + streamU.y * a + streamV.y * b,
      z: streamAxis.z * t + streamU.z * a + streamV.z * b,
    };
  },
});
scene.add(clusterStream);

/* ═════════════════════════════════════════════════════════════
   한글 자소 각인 — 행성 표면과 별밭에 글자를 심는다
   구면 텍스처(equirect)는 경도 0~360°가 가로축이므로, 자소를 120°마다
   세 번 찍어 둔다. 두 번만 찍으면 자전 중 두 자가 동시에 가장자리로
   밀리는 순간이 생겨 아무것도 제대로 안 보인다
═════════════════════════════════════════════════════════════ */
const FONTS_READY = document.fonts ? document.fonts.ready : Promise.resolve();
/* 아래아(ㆍ)는 폰트 지원이 들쭉날쭉해 원으로 직접 찍는다 */
function drawGlyph(ctx, g, x, y, px) {
  if (g === 'ㆍ' || g === '·') {
    ctx.beginPath();
    ctx.arc(x, y, px * 0.19, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.font = `300 ${px}px "Soonbatang", "SunBatang", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(g, x, y);
}
/* 웹폰트는 첫 그리기 시점에 아직 안 붙어 있을 수 있다 → 준비되면 한 번 더 그린다 */
function glyphCanvasTexture(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  draw(ctx);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  FONTS_READY.then(() => { draw(ctx); t.needsUpdate = true; });
  return t;
}

/* 행성 본체 자리에 자소를 직접 띄운다 — 먹 번짐처럼 은은히 빛나는 붓글씨 빌보드.
   자음은 오방색, 모음은 한지빛 */
const glyphBillTex = {};
function glyphBillboardTexture(glyph, color) {
  const key = glyph + color;
  if (!glyphBillTex[key]) {
    const S = 256;
    glyphBillTex[key] = glyphCanvasTexture(S, S, (ctx) => {
      ctx.clearRect(0, 0, S, S);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = S * 0.11;
      drawGlyph(ctx, glyph, S / 2, S / 2, S * 0.56);
      ctx.shadowBlur = 0;
      drawGlyph(ctx, glyph, S / 2, S / 2, S * 0.56);
    });
  }
  return glyphBillTex[key];
}
function makeGlyphBillboard(o, radius) {
  const color = o.type === 'vowel' ? '#f2e8d2' : o.col;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glyphBillboardTexture(o.glyph, color),
    transparent: true, depthWrite: false,
  }));
  sp.scale.setScalar(radius * 4);
  return sp;
}

/* 별밭에 심는 자모 — 단자음 14 · 단모음 10 */
const SEED_JAMO = [
  'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
  'ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ',
];
/* 자모 별 총량 = 배경 별(warm 9000 + cool 15000)의 35% */
const JAMO_STAR_COUNT = Math.round((9000 + 15000) * 0.15 / SEED_JAMO.length);
function makeGlyphSprite(g) {
  const S = 128;
  return glyphCanvasTexture(S, S, (ctx) => {
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(206,224,255,0.95)';
    ctx.shadowBlur = S * 0.35;
    drawGlyph(ctx, g, S / 2, S / 2, S * 0.62);
    ctx.shadowBlur = 0;
  });
}
/* 글리프 텍스처는 성단마다 다시 그릴 것 없이 한 벌만 만들어 돌려 쓴다 */
const jamoSpriteCache = {};
const jamoSprite = (g) => (jamoSpriteCache[g] || (jamoSpriteCache[g] = makeGlyphSprite(g)));

/* 성단 하나치 자모 별밭 — 자소마다 한 필드씩. 성단 어디에서 보든 같은 하늘이 되도록
   원점 성단과 문장 성단이 이 함수를 함께 쓴다 */
function jamoFields() {
  return SEED_JAMO.map(g => makeStarField({
    count: JAMO_STAR_COUNT,
    radiusMin: 520, radiusMax: 1820,
    sizeMin: 20, sizeMax: 80,
    palette: [0xe6ecff, 0xffeec4, 0xcfe0ff, 0xffffff],
    twinkleAmp: 0.42, atten: 0.25, maxPx: 100,
    sprite: jamoSprite(g),
  }));
}
const jamoStars = new THREE.Group();
jamoFields().forEach(f => jamoStars.add(f));
scene.add(jamoStars);

/* ---------------- 태양 글로우 스프라이트 (01 그대로 · 텍스처 공유) 항성 빛 크기 깁노 26 ---------------- */
const GLOW_TEX = (() => {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,244,214,0.95)');
  g.addColorStop(0.25, 'rgba(255,214,110,0.55)');
  g.addColorStop(0.6, 'rgba(255,170,60,0.14)');
  g.addColorStop(1, 'rgba(255,150,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
})();
function makeGlowSprite(size) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sp.scale.setScalar(size);
  return sp;
}

/* ═════════════════════════════════════════════════════════════
   [뎁스 3] 음절 → 계 · [뎁스 2] 이름 → 성단 · [뎁스 1] 심은 이름들 → 은하
   음절 하나 = 계 하나 (중심 = 노란 발광, 행성 = 자소)
   이름 하나 = 성단 하나 — 띄어쓰기는 성단을 가르지 않고 한 성단에 함께 묶인다
   엔터로 심은 이름마다 은하 원반 위 다른 좌표의 성단이 하나씩 늘어난다
   행성 궤도 = geometry_v13 자소 궤적 · 자소마다 궤도면을 기울여 구분
═════════════════════════════════════════════════════════════ */
/* 행성 재질 사양 = 오행 표(EL) 그 자체. 자음은 오행, 모음은 달 */
const planetSpec = (o) => (o.type === 'vowel' ? VOWEL_EL : EL[o.el]);
const MAX_ORBIT = 55;         /* 가장 큰 궤적 반경 (행성·항성이 상대적으로 커 보이게 축소) 궤도 지름 */
const NPT = NS;               /* 궤적 샘플 수 = v13 궤도 샘플 수 */
const REVEAL_DUR = 6;         /* 궤도 작도 6초 */

/* ── 표면 이글거림 셰이더 ───────────────────────────────────────
   MeshStandardMaterial의 조명 계산은 그대로 두고 텍스처 샘플링 지점만
   흐르는 fbm 노이즈로 밀어 준다. 두 층의 속도가 달라서 대류처럼 보인다.
   uPlanetTime 은 전역 하나를 공유 — animate()에서 매 프레임 갱신 */
const uPlanetTime = { value: 0 };

const CHURN_GLSL = `
  uniform float uTime;
  uniform float uChurn;
  float pHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float pNoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(pHash(i), pHash(i + vec2(1,0)), f.x),
               mix(pHash(i + vec2(0,1)), pHash(i + vec2(1,1)), f.x), f.y);
  }
  float pFbm(vec2 p){
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { s += a * pNoise(p); p *= 2.03; a *= 0.5; }
    return s;
  }
`;

function addChurn(mat, churn) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uPlanetTime;
    shader.uniforms.uChurn = { value: churn };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + CHURN_GLSL)
      /* 느린 큰 소용돌이 + 빠른 잔결 — UV를 밀어 표면이 흐르게 */
      .replace('#include <map_fragment>', `
        float nSlow = pFbm(vMapUv * 5.0 + vec2(uTime * 0.020, uTime * 0.008));
        float nFast = pFbm(vMapUv * 13.0 - vec2(uTime * 0.055, uTime * 0.015));
        vec2 churnUv = vMapUv + vec2(nSlow - 0.5, nFast - 0.5) * 0.018 * uChurn;
        diffuseColor *= texture2D(map, churnUv);
        diffuseColor.rgb *= 1.0 + (nFast - 0.5) * 0.55 * uChurn;
      `)
      /* 밝은 결일수록 더 달아오르게 — 자체발광에도 같은 노이즈를 물린다 */
      .replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        totalEmissiveRadiance *= 1.0 + (nFast - 0.4) * 1.3 * uChurn;
      `);
  };
  /* 주입한 코드가 다르면 다른 프로그램이어야 하므로 캐시 키를 갈라 준다 */
  mat.customProgramCacheKey = () => 'churn' + churn;
}

const planetMatCache = {};
function planetMaterial(o) {
  const s = planetSpec(o);
  if (!planetMatCache[s.tex]) {
    const mat = new THREE.MeshStandardMaterial({
      map: loadTex(s.tex), color: C3(s.tint), roughness: 0.6, metalness: 0.2,
      emissive: C3(s.tint), emissiveMap: loadTex(s.tex), emissiveIntensity: s.glow,
    });
    addChurn(mat, s.churn);
    planetMatCache[s.tex] = mat;
  }
  return planetMatCache[s.tex];
}

/* 이름 하나 = 성단 하나. 띄어쓰기는 성단을 가르지 않고 한 성단 안에 함께 묶인다
   (음절 하나 = v13 자소 궤도를 가진 계 하나) */
function parseName(text) {
  return [...text].map(systemFor).filter(Boolean);
}

/* 이름 성단 자리 — 첫 이름은 태양 자리(원점), 나머지는 우리은하 원반 위 랜덤.
   한번 정한 자리는 이름에 눌러 두어, 다시 지어도 우주에서 움직이지 않는다.
   은하 변환이 회전+평행이동뿐이라 세계좌표 거리가 곧 은하 국소좌표 거리다 */
function assignClusterPos(names) {
  const used = names.map(n => n.pos).filter(Boolean);
  names.forEach((n, i) => {
    if (n.pos) return;
    if (i === 0) { n.pos = new THREE.Vector3(0, 0, 0); used.push(n.pos); return; }
    let p, tries = 0;
    do {
      const r = 3500 + Math.random() * 11000;
      const th = Math.random() * Math.PI * 2;
      p = new THREE.Vector3(Math.cos(th) * r, gauss() * 420, Math.sin(th) * r)
        .applyEuler(GALAXY_TILT).add(galaxy.position);
      tries++;
    } while (used.some(q => q.distanceTo(p) < 7500) && tries < 200);
    n.pos = p;
    used.push(p);
  });
}

/* 단위 원 (XZ) — 작도용 궤도원/자기원 공유 지오메트리 */
const unitCircleGeo = (() => {
  const pts = [];
  for (let i = 0; i < 128; i++) {
    const a = i / 128 * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
})();

/* 모음 띠 — geometry_v13 drawVowelPlanet 규칙: 地(ㅡ)=가로띠 · 人(ㅣ)=세로띠 */
function makeBelt(mesh, radius, inner, outer, rotX, rotZ, tint = '#e8dcc2') {
  const ringGeo = new THREE.RingGeometry(radius * inner, radius * outer, 96);
  const uv = ringGeo.attributes.uv;
  const pos3 = ringGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < uv.count; i++) {
    v.fromBufferAttribute(pos3, i);
    const t = (v.length() - radius * inner) / (radius * (outer - inner));
    uv.setXY(i, t, 0.5);
  }
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
    map: loadTex('2k_saturn_ring_alpha.png'), side: THREE.DoubleSide, color: C3(tint),
    transparent: true, opacity: 0.9, depthWrite: false,
  }));
  ring.rotation.set(rotX, 0, rotZ);
  mesh.add(ring);
}

function makeSaturnRing(mesh, radius, o) {
  const bh = o ? (o.beltH | 0) : 1, bv = o ? (o.beltV | 0) : 0;
  const s = o && o.yang === false ? -1 : 1;
  /* 地 — 적도면 가로띠 (개수만큼 바깥으로 겹쳐 쌓음) */
  for (let k = 0; k < bh; k++) {
    makeBelt(mesh, radius, 1.4 + k * 0.5, 2.4 + k * 0.5, Math.PI / 2 - 0.35, 0);
  }
  /* 人 — 극면 세로띠 (음양에 따라 기울기 방향이 반대) */
  for (let k = 0; k < bv; k++) {
    makeBelt(mesh, radius, 1.4 + k * 0.5, 2.4 + k * 0.5, 0, s * (0.38 + k * 0.3));
  }
}

/* 자음 천체 — 본체 없이 기울지 않은 正圓 링 띠만. 오방색으로 물들인다.
   병서(쌍둥이)는 궤도면 자체를 5° 틀어 2겹으로 겹친다 — 띠는 한 겹 */
function makeConsRing(group, radius, o) {
  makeBelt(group, radius, 1.5, 2.3, -Math.PI / 2, 0, o.col);
}

/* 행성 거리 랜덤 배치 — 겹치지 않게 (첫 계는 원점) 음절 거리 */
function placeSystems(n, k = 1) {
  const MIN_SEP = MAX_ORBIT * 2 * k;
  const pts = [new THREE.Vector3(0, 0, 0)];
  for (let i = 1; i < n; i++) {
    let p, tries = 0;
    do {
      const r = (MAX_ORBIT + Math.random() * 150) * k;
      const th = Math.random() * Math.PI * 2;
      const y = gauss() * 55 * k;
      p = new THREE.Vector3(r * Math.cos(th), y, r * Math.sin(th));
      tries++;
    } while (pts.some(q => q.distanceTo(p) < MIN_SEP) && tries < 300);
    pts.push(p);
  }
  return pts;
}

/* 음절 궤적면 기울임 — 세로축 기준 노드선을 n등분 + 랜덤 경사
   (y=0에 겹치던 궤적을 음절마다 다른 평면으로 분산) */
function syllableTilts(n) {
  const tilts = [];
  const off = Math.random() * Math.PI;
  for (let i = 0; i < n; i++) {
    const az = off + (i + 0.15 + Math.random() * 0.7) * (Math.PI / n);
    const incl = n === 1
      ? Math.random() * 0.12
      : (0.28 + Math.random() * 0.42) * (Math.random() < 0.5 ? -1 : 1);
    const axis = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
    tilts.push(new THREE.Quaternion().setFromAxisAngle(axis, incl));
  }
  return tilts;
}

/* 오방 십자선 — 방위 글자는 우하단 컴퍼스 HUD가 맡는다 */
const COMPASS_L = MAX_ORBIT + 6;
const compassGeo = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-COMPASS_L, 0, 0), new THREE.Vector3(COMPASS_L, 0, 0),
  new THREE.Vector3(0, 0, -COMPASS_L), new THREE.Vector3(0, 0, COMPASS_L),
]);
function makeCompass(group) {
  const mat = new THREE.LineBasicMaterial({ color: 0xe9dfc8, transparent: true, opacity: 0.07 });
  group.add(new THREE.LineSegments(compassGeo, mat));
  return { mat };
}

let clusters = [];         /* 이름 성단 — {index,pos,word,deco,beacon,beaconLabel,cF,systems:[i]} */
let words = [];            /* 이름 성단 참조 (동일) */
let systems = [];          /* 음절 계 — {index,wordIndex,clusterIndex,char,pos,group,star,jamos:[...]} */
let universe = null;       /* 모든 성단·계를 담는 그룹 */

function disposeNode(root) {
  root.traverse(o => {
    if (o.isCSS2DObject) o.element.remove();
    if (o.isSprite) return;
    if (o.geometry && o.geometry !== unitCircleGeo && o.geometry !== compassGeo) o.geometry.dispose();
  });
  if (root.parent) root.parent.remove(root);
}

function makeLabelEl(html, color, onClick) {
  const el = document.createElement('div');
  el.className = 'planet-label';
  if (color) el.style.color = color;
  el.innerHTML = html;
  el.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return new CSS2DObject(el);
}

/* v13 곡선은 모두 rmax = R0 으로 정규화되어 있다 → 모든 계 공통 스케일 */
const SCALE = MAX_ORBIT / R0;

/* 이름 하나치 성단을 짓는다 — b = {ref:{text,pos}, name, sylls} */
function buildCluster(b, wi) {
  const cpos = b.ref.pos;
  const cGroup = new THREE.Group();
  universe.add(cGroup);
  /* 눌러 본 자소는 이름에 적어 둔다 — 다시 지어도 남고, 이름이 바뀌면 처음부터.
     계를 다 돌아야 이름풀이가 열린다 */
  if (b.ref.visitedFor !== b.name) { b.ref.visited = new Set(); b.ref.visitedFor = b.name; }
  const wordEntry = {
    index: wi, clusterIndex: wi, wordIndex: wi, pos: cpos, firstWord: b.name, word: b.name,
    group: cGroup, sysStart: systems.length,
    visited: b.ref.visited,
    total: b.sylls.reduce((n, sd) => n + sd.orbits.length, 0),
    deco: null, beacon: null, beaconLabel: null, cF: 1, systems: [],
  };

  /* --- 성단 별 배경 (원점 성단은 기존 01 배경이 담당)
     원점과 동일한 4종 구성: warm 9000 + cool 15000 + core 9000 + stream 7000 --- */
  if (wi > 0) {
    const deco = new THREE.Group();
    deco.add(makeStarField({
      count: 9000, radiusMin: 420, radiusMax: 1700, sizeMin: 8, sizeMax: 30,
      palette: [0xffd75e, 0xffc44d, 0xffe9a8, 0xff9e5e, 0xfff4d6],
      twinkleAmp: 0.55, atten: 0.25,
    }));
    deco.add(makeStarField({
      count: 15000, radiusMin: 500, radiusMax: 1900, sizeMin: 3, sizeMax: 13,
      palette: [0xffffff, 0xbcd2ff, 0x8fb0ff, 0xe8e8ff],
      twinkleAmp: 0.35, atten: 0.25,
    }));
    deco.add(makeStarField({
      count: 9000, sizeMin: 8, sizeMax: 32,
      palette: [0xffd75e, 0xffc44d, 0xffe9a8, 0xfff4d6, 0xff9e5e],
      twinkleAmp: 0.5, atten: 0.25,
      generate: () => {
        const r = 420 + Math.abs(gauss()) * 1150;
        const u = Math.random() * 2 - 1;
        const th = Math.random() * Math.PI * 2;
        const sq = Math.sqrt(1 - u * u);
        return { x: r * sq * Math.cos(th), y: r * u, z: r * sq * Math.sin(th) };
      },
    }));
    /* 은하 중심 방향 별 흐름 (원점의 clusterStream과 동일 규칙) */
    const ax = galaxy.position.clone().sub(cpos).normalize();
    const u1 = new THREE.Vector3(0, 1, 0).cross(ax).normalize();
    const v1 = ax.clone().cross(u1).normalize();
    deco.add(makeStarField({
      count: 7000, sizeMin: 8, sizeMax: 28,
      palette: [0xffd75e, 0xffc44d, 0xff9e5e, 0xffe9a8],
      twinkleAmp: 0.5, atten: 0.25,
      generate: () => {
        const t = -2200 + Math.pow(Math.random(), 1.25) * 11500;
        const spread = 240 + Math.max(t, 0) * 0.085;
        const a = gauss() * spread, b = gauss() * spread;
        return {
          x: ax.x * t + u1.x * a + v1.x * b,
          y: ax.y * t + u1.y * a + v1.y * b,
          z: ax.z * t + u1.z * a + v1.z * b,
        };
      },
    }));
    /* 자모 별밭 — 원점 성단의 jamoStars와 같은 구성 */
    jamoFields().forEach(f => deco.add(f));
    deco.position.copy(cpos);
    deco.children.forEach(f => { f.visible = showStars; });
    cGroup.add(deco);
    wordEntry.deco = deco;
  }

  /* --- 은하 뷰 성단 표지 (광점 + 라벨) --- */
  const beacon = makeGlowSprite(2400);
  beacon.position.copy(cpos);
  cGroup.add(beacon);
  wordEntry.beacon = beacon;

  const beaconLabel = makeLabelEl(
    `<span class="ring-icon" style="color:#cfd8ff"></span><span class="name">${b.name} 星團</span>`,
    null, () => flyToWord(wi));
  beaconLabel.element.classList.add('cluster-label');
  beaconLabel.position.copy(cpos);
  cGroup.add(beaconLabel);
  wordEntry.beaconLabel = beaconLabel;

  /* --- 이름 안의 음절 = 계 (성단 중심 주변에 배치 — 기존 대비 2배 거리) --- */
  const sylPos = placeSystems(b.sylls.length, 2);
  b.sylls.forEach((sd, si) => {
    const sysIndex = systems.length;
    const pos = cpos.clone().add(sylPos[si]);
    const group = new THREE.Group();
    group.position.copy(pos);

    /* --- 항성 = 노란 발광만 (자소 그래픽 없음) --- */
    const star = new THREE.Group();
    star.add(makeGlowSprite(26));
    star.visible = showSun;
    group.add(star);

    const sunLabel = makeLabelEl(
      `<span class="ring-icon" style="color:#d8b551"></span><span class="name">${sd.char}계</span>`,
      null, () => flyToSystem(sysIndex));
    sunLabel.element.classList.add('sun-label');
    group.add(sunLabel);

    const sunOffLabel = makeLabelEl(
      `<span class="sun-off-name">${sd.char}</span>`, null, () => flyToSystem(sysIndex));
    sunOffLabel.element.classList.add('sun-off-label');
    group.add(sunOffLabel);

    /* --- 오방 컴퍼스 (02 geometry_v3 UI) --- */
    const compass = makeCompass(group);

    /* --- 성단 뷰 계 마커: 글로우 + 자소 행성 --- */
    const marker = new THREE.Group();
    marker.add(makeGlowSprite(560));
    sd.orbits.forEach((o, j) => {
      /* 성단 뷰 마커는 계 뷰 확대와 무관하게 제 크기를 지킨다 */
      const mr = 46 * (o.sz / 3);
      const mp = new THREE.Group();
      mp.add(makeGlyphBillboard(o, mr));
      if (o.type === 'vowel') makeSaturnRing(mp, mr, o);
      else makeConsRing(mp, mr, o);
      const a = j / sd.orbits.length * Math.PI * 2;
      mp.position.set(Math.cos(a) * 210, 0, Math.sin(a) * 210);
      marker.add(mp);
    });
    marker.scale.setScalar(0.001);
    marker.visible = false;
    group.add(marker);

    /* --- 자소 → 기울인 궤도면 + 행성 (180°를 자소 수로 나눠 랜덤 배치) --- */
    const tilts = syllableTilts(sd.orbits.length);
    const jamos = [];
    sd.orbits.forEach((o, j) => {
      const jGroup = new THREE.Group();
      jGroup.quaternion.copy(tilts[j]);
      group.add(jGroup);

      /* 궤적 (v13 곡선 → 기울인 평면) */
      const trajArr = new Float32Array((NPT + 1) * 3);
      o.pts.forEach(([x, y], k) => {
        trajArr[k * 3] = x * SCALE; trajArr[k * 3 + 1] = 0; trajArr[k * 3 + 2] = y * SCALE;
      });
      const trajGeo = new THREE.BufferGeometry();
      trajGeo.setAttribute('position', new THREE.BufferAttribute(trajArr, 3));
      trajGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((NPT + 1) * 3), 3));
      const trajMat = new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const traj = new THREE.Line(trajGeo, trajMat);
      traj.geometry.setDrawRange(0, 2);
      jGroup.add(traj);

      /* 궤적 글로우 — 정점색 가산합성 4겹 */
      const glowMat = new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.15,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const glows = [];
      for (let gi = 0; gi < 4; gi++) {
        const g = new THREE.Line(trajGeo, glowMat);
        jGroup.add(g);
        glows.push(g);
      }

      /* 병서(쌍둥이) — 같은 궤도를 5° 틀어 한 벌 더 깔아 겹궤도를 만든다 */
      let twinLines = null, twinQ = null;
      if (o.tense) {
        twinQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 5 * Math.PI / 180);
        const twinArr = new Float32Array((NPT + 1) * 3);
        o.pts.forEach(([x, y], k) => {
          const v = new THREE.Vector3(x * SCALE, 0, y * SCALE).applyQuaternion(twinQ);
          twinArr[k * 3] = v.x; twinArr[k * 3 + 1] = v.y; twinArr[k * 3 + 2] = v.z;
        });
        const tGeo = new THREE.BufferGeometry();
        tGeo.setAttribute('position', new THREE.BufferAttribute(twinArr, 3));
        tGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((NPT + 1) * 3), 3));
        const tLine = new THREE.Line(tGeo, trajMat);
        tLine.geometry.setDrawRange(0, 2);
        jGroup.add(tLine);
        const tGlows = [];
        for (let gi = 0; gi < 4; gi++) {
          const g = new THREE.Line(tGeo, glowMat);
          jGroup.add(g);
          tGlows.push(g);
        }
        twinLines = [tLine, ...tGlows];
      }

      /* 반짝이는 부스러기 */
      const ND = 90;
      const dGeo = new THREE.BufferGeometry();
      dGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ND * 3), 3));
      dGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ND * 3), 3));
      const debris = new THREE.Points(dGeo, new THREE.PointsMaterial({
        size: 0.9, map: STAR_SPRITE, vertexColors: true, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      debris.frustumCulled = false;
      jGroup.add(debris);
      const dust = {
        age: new Float32Array(ND).fill(99), life: new Float32Array(ND).fill(1),
        vel: new Float32Array(ND * 3), ph: new Float32Array(ND), idx: 0, acc: 0,
      };
      const elC = C3(o.col);
      const trailC = C3(o.trail);

      const NB = 14;
      const bGeo = new THREE.BufferGeometry();
      bGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NB * 3), 3));
      bGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NB * 3), 3));
      const debrisBig = new THREE.Points(bGeo, new THREE.PointsMaterial({
        size: 4, map: STAR_SPRITE, vertexColors: true, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      debrisBig.frustumCulled = false;
      jGroup.add(debrisBig);
      const dustBig = {
        age: new Float32Array(NB).fill(99), life: new Float32Array(NB).fill(1),
        vel: new Float32Array(NB * 3), ph: new Float32Array(NB), idx: 0, acc: 0,
      };

      /* 행성 — 본체 없는 고리 천체. 자음: 正圓 오방색 링 띠 · 모음: 천지인 띠 + 위성.
         본체 자리엔 자소 빌보드가 떠서 글자가 그대로 읽힌다 */
      const radius = o.sz;
      const planet = new THREE.Group();
      planet.add(makeGlyphBillboard(o, radius));
      planet.userData.sysIndex = sysIndex;
      planet.userData.jamoIndex = j;
      let moonGrp = null;
      if (o.type === 'vowel') {
        makeSaturnRing(planet, radius, o);
        if (o.moons) {
          moonGrp = new THREE.Group();
          for (let m = 0; m < o.moons; m++) {
            const mm = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.26, 16, 16), planetMaterial(o));
            const ma = m / o.moons * Math.PI * 2;
            mm.position.set(Math.cos(ma) * radius * 3.1, 0, Math.sin(ma) * radius * 3.1);
            moonGrp.add(mm);
          }
          planet.add(moonGrp);
        }
      } else {
        makeConsRing(planet, radius, o);
      }
      jGroup.add(planet);

      /* 띠·위성이 닿는 가장 바깥 — 반짝이는 이 밖에서만 인다 */
      const auraR = radius * (o.type === 'vowel'
        ? Math.max(2.4 + (Math.max(o.beltH | 0, o.beltV | 0) - 1) * 0.5, o.moons ? 3.4 : 0, 2.4)
        : 2.3);

      const planetLabel = makeLabelEl(
        `<span class="ring-icon"></span><span class="name">${o.glyph}</span>`,
        o.col, () => selectPlanet(sysIndex, j));
      planet.add(planetLabel);

      jamos.push({
        ...o, jGroup, planet, planetLabel, moonGrp, traj, trajMat, glows, auraR,
        twinLines, twinQ,
        debris, dust, debrisBig, dustBig, elC, trailC,
        /* age0 = 작도 시작 시각(음절·자소 순서대로 시차). 되감기 기준점 */
        age: -(si * 0.6 + j * 0.4), age0: -(si * 0.6 + j * 0.4), tc: 0,
      });
    });

    cGroup.add(group);
    wordEntry.systems.push(sysIndex);
    systems.push({
      index: sysIndex, wordIndex: wi, clusterIndex: wi, sylIndex: si,
      char: sd.char, word: b.name, el: sd.el,
      onset: sd.onset, vowel: sd.vowel, coda: sd.coda,
      pos, group, star, sunLabel, sunOffLabel, compass, marker, jamos, SCALE, sysF: 1,
    });
  });

  return wordEntry;
}

/* nameList = [{text, pos}] — 우주에 심은 이름들 + 입력 중인 이름 하나(맨 뒤).
   이미 지어 둔 성단은 그대로 두고 달라진 성단부터 뒤만 다시 짓는다.
   (통째로 다시 지으면 심어 둔 이름의 별밭이 타자마다 새로 뿌려지고,
    이름이 쌓일수록 한 자 칠 때마다 우주 전체를 짓느라 손이 굼떠진다) */
function buildAll(nameList) {
  if (!universe) { universe = new THREE.Group(); scene.add(universe); }

  const built = [];
  for (const n of nameList) {
    const sylls = parseName(n.text);
    if (sylls.length) built.push({ ref: n, name: n.text.trim(), sylls });
  }
  assignClusterPos(built.map(b => b.ref));

  let keep = 0;
  while (keep < clusters.length && keep < built.length
    && clusters[keep].word === built[keep].name) keep++;

  for (let i = clusters.length - 1; i >= keep; i--) {
    disposeNode(clusters[i].group);
    systems.length = clusters[i].sysStart;
  }
  clusters.length = keep;
  words.length = keep;

  for (let wi = keep; wi < built.length; wi++) {
    const e = buildCluster(built[wi], wi);
    words.push(e);
    clusters.push(e);
  }

  syncReadingButton();
}

/* ═════════════════════════════════════════════════════════════
   카메라 연출 / 선택 (01 베이스 + 뎁스 4 연결)
═════════════════════════════════════════════════════════════ */
let camTween = null;
let showStars = true;
let showSun = true;
let showOrbit = true;
let showName = true;

function toggleStarsVisibility() {
  showStars = !showStars;
  if (galaxy) galaxy.visible = showStars;
  if (starsWarm) starsWarm.visible = showStars;
  if (starsCool) starsCool.visible = showStars;
  if (clusterCore) clusterCore.visible = showStars;
  if (clusterStream) clusterStream.visible = showStars;
  if (jamoStars) jamoStars.visible = showStars;
  for (const s of sinsoos) s.group.visible = showStars;

  if (universe) {
    universe.traverse(child => {
      if (child.isPoints) {
        child.visible = showStars;
      }
    });
  }

  const btn = document.getElementById('btn-toggle-stars');
  if (btn) {
    btn.style.opacity = showStars ? '1' : '0.4';
  }
}

function flyTo(getTargetPos, distance, duration = 1.6, onDone = null) {
  const toTargetFn = () => getTargetPos();
  const toPosFn = () => {
    const t = getTargetPos();
    const dir = new THREE.Vector3().subVectors(camera.position, t).normalize();
    if (dir.lengthSq() === 0) dir.set(0, 0.4, 1).normalize();
    dir.y = Math.max(dir.y, 0.25);
    dir.normalize();
    return t.clone().addScaledVector(dir, distance);
  };
  camTween = {
    t: 0, dur: duration,
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPosFn, toTargetFn, onDone,
  };
}

function nearestSystem() {
  let best = null, bestD = Infinity;
  for (const s of systems) {
    const d = camera.position.distanceTo(s.pos);
    if (d < bestD) { bestD = d; best = s; }
  }
  return { sys: best, d: bestD };
}

function nearestWord() {
  let best = null, bestD = Infinity;
  for (const w of words) {
    const d = camera.position.distanceTo(w.pos);
    if (d < bestD) { bestD = d; best = w; }
  }
  return { word: best, d: bestD };
}

function nearestCluster() {
  let best = null, bestD = Infinity;
  for (const c of clusters) {
    const d = camera.position.distanceTo(c.pos);
    if (d < bestD) { bestD = d; best = c; }
  }
  return { cluster: best, d: bestD };
}

function flyToSystem(i) {
  const s = systems[i];
  if (!s) return;
  flyTo(() => s.pos.clone(), 90, 1.8);
}
function flyToWord(wi) {
  const w = words[wi];
  if (!w) return;
  flyTo(() => w.pos.clone(), 700, 2.0);
}

/* 행성 클릭 → 줌인 → 레터 오버레이 (뎁스 4) */
function selectPlanet(si, ji) {
  const s = systems[si];
  if (!s) return;
  const jm = s.jamos[ji];
  if (!jm) return;
  /* 눌러 본 자소 하나 — 성단의 자소를 다 채우면 이름풀이가 열린다 */
  const c = clusters[s.clusterIndex];
  if (c) { c.visited.add(`${s.sylIndex}:${ji}`); syncReadingButton(); }
  document.querySelectorAll('.planet-label').forEach(el => el.classList.remove('selected'));
  jm.planetLabel.element.classList.add('selected');
  const dist = jm.sz * (jm.type === 'vowel' ? 8 : 6);
  flyTo(() => jm.planet.getWorldPosition(new THREE.Vector3()), dist, 1.5, () => openLetter(jm, s));
}

document.getElementById('btn-toggle-stars').addEventListener('click', toggleStarsVisibility);



function toggleOrbitVisibility() {
  showOrbit = !showOrbit;
  const btn = document.getElementById('btn-toggle-orbit');
  if (btn) {
    btn.style.opacity = showOrbit ? '1' : '0.4';
  }
}
document.getElementById('btn-toggle-orbit').addEventListener('click', toggleOrbitVisibility);

function toggleNameVisibility() {
  showName = !showName;
  const btn = document.getElementById('btn-toggle-name');
  if (btn) {
    btn.style.opacity = showName ? '1' : '0.4';
  }
}
document.getElementById('btn-toggle-name').addEventListener('click', toggleNameVisibility);

function alignCompass() {
  const T = controls.target.clone();
  const dist = camera.position.distanceTo(T);
  // Y축 바로 위에서 아래로 수직으로 내려다보는 탑뷰 (0점 정렬: 북쪽=위, 남쪽=아래, 동쪽=우측, 서쪽=좌측)
  const targetPos = T.clone().add(new THREE.Vector3(0, dist, 0.001));

  camTween = {
    t: 0, dur: 1.2,
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPosFn: () => targetPos.clone(),
    toTargetFn: () => T.clone(),
    onDone: null
  };
}
document.getElementById('compass-hud').addEventListener('click', alignCompass);

function updateCompassHUD() {
  const canvas = document.getElementById('compass-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  // Faint circle
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.stroke();

  const T = controls.target;
  const center = new THREE.Vector3().copy(T);
  const east = new THREE.Vector3().copy(T).add(new THREE.Vector3(1, 0, 0));
  const west = new THREE.Vector3().copy(T).add(new THREE.Vector3(-1, 0, 0));
  const south = new THREE.Vector3().copy(T).add(new THREE.Vector3(0, 0, 1));
  const north = new THREE.Vector3().copy(T).add(new THREE.Vector3(0, 0, -1));

  center.project(camera);
  east.project(camera);
  west.project(camera);
  south.project(camera);
  north.project(camera);

  const dEast = new THREE.Vector2(east.x - center.x, center.y - east.y);
  const dWest = new THREE.Vector2(west.x - center.x, center.y - west.y);
  const dSouth = new THREE.Vector2(south.x - center.x, center.y - south.y);
  const dNorth = new THREE.Vector2(north.x - center.x, center.y - north.y);

  if (dEast.lengthSq() === 0 || dSouth.lengthSq() === 0) return;

  dEast.normalize().multiplyScalar(28);
  dWest.normalize().multiplyScalar(28);
  dSouth.normalize().multiplyScalar(28);
  dNorth.normalize().multiplyScalar(28);

  ctx.lineWidth = 1.5;

  // West-East (Gold-Wood) line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.moveTo(cx + dWest.x, cy + dWest.y);
  ctx.lineTo(cx + dEast.x, cy + dEast.y);
  ctx.stroke();

  // North-South (Water-Fire) line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.moveTo(cx + dNorth.x, cy + dNorth.y);
  ctx.lineTo(cx + dSouth.x, cy + dSouth.y);
  ctx.stroke();

  // Text labels
  ctx.font = '300 12px "Soonbatang", "SunBatang", serif';
  ctx.fillStyle = 'rgba(232, 234, 240, 0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textDist = 41;
  const pNorth = dNorth.clone().normalize().multiplyScalar(textDist);
  const pSouth = dSouth.clone().normalize().multiplyScalar(textDist);
  const pEast = dEast.clone().normalize().multiplyScalar(textDist);
  const pWest = dWest.clone().normalize().multiplyScalar(textDist);

  ctx.fillText('北', cx + pNorth.x, cy + pNorth.y);
  ctx.fillText('南', cx + pSouth.x, cy + pSouth.y);
  ctx.fillText('東', cx + pEast.x, cy + pEast.y);
  ctx.fillText('西', cx + pWest.x, cy + pWest.y);
}
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!readingOverlayEl.classList.contains('hidden')) closeReading();
    else if (!letterOverlayEl.classList.contains('hidden')) closeLetter();
    else { const { sys } = nearestSystem(); if (sys) flyToSystem(sys.index); }
  }
});

/* 캔버스 클릭 → 레이캐스트 행성 선택 (계 뎁스에서만) */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downXY = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downXY = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downXY) return;
  const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]);
  downXY = null;
  if (moved > 5) return;
  if (!letterOverlayEl.classList.contains('hidden')) return;
  const { d } = nearestSystem();
  if (d > 700) return;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(systems.flatMap(s => s.jamos.map(y => y.planet)), true);
  if (hits.length) {
    let o = hits[0].object;
    while (o && o.userData.sysIndex === undefined) o = o.parent;
    if (o) selectPlanet(o.userData.sysIndex, o.userData.jamoIndex);
  }
});

/* 행성 호버 → 커서 손가락으로 변경 */
renderer.domElement.addEventListener('pointermove', (e) => {
  if (letterOverlayEl && !letterOverlayEl.classList.contains('hidden')) return;
  const { d } = nearestSystem();
  if (d > 700) { renderer.domElement.style.cursor = 'default'; return; }
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(systems.flatMap(s => s.jamos.map(y => y.planet)), true);
  renderer.domElement.style.cursor = hits.length ? 'pointer' : 'default';
});

/* ---------------- 시간/재생 UI ---------------- */
const dtEl = document.getElementById('datetime');

/* 재생 컨트롤 — v13의 ⟪ ⏸ ▶ ⟫ 규칙 그대로 (되감기·완료는 재생 상태로 복귀) */
let paused = false;
const btnPause = document.getElementById('tp-pause');
const btnPlay = document.getElementById('tp-play');
function setPaused(p) {
  paused = p;
  btnPause.classList.toggle('active', p);
  btnPlay.classList.toggle('active', !p);
}
const eachJamo = (fn) => systems.forEach(s => s.jamos.forEach(fn));
btnPause.onclick = () => setPaused(true);
btnPlay.onclick = () => setPaused(false);
/* ⟪ 처음부터 다시 작도 · ⟫ 작도 즉시 완료 */
document.getElementById('tp-rewind').onclick = () => {
  eachJamo(y => { y.age = y.age0; y.tc = 0; });
  setPaused(false);
};
document.getElementById('tp-end').onclick = () => {
  eachJamo(y => { y.age = REVEAL_DUR; });
  setPaused(false);
};
setPaused(false);
function updateClockUI() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  dtEl.textContent =
    `${d.getFullYear()}年 ${pad(d.getMonth() + 1)}月 ${pad(d.getDate())}日  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
setInterval(updateClockUI, 1000);
updateClockUI();

/* ---------------- 스케일 HUD — 4뎁스 이름 ---------------- */
const scaleNameEl = document.getElementById('scale-name');
let lastScaleName = '';
function updateScaleHUD() {
  const { sys, d } = nearestSystem();
  const { word, d: dw } = nearestWord();
  let name;
  if (sys && d < 260) name = `${sys.char}계`;
  else if (word && dw < 18000) name = `${word.word} 성단`;
  else name = '우리 은하';
  if (name !== lastScaleName) {
    lastScaleName = name;
    scaleNameEl.textContent = name;
  }
  /* 이름이 여럿 심긴 우주에선 풀이 대상도 지금 다가선 성단을 따라간다 */
  if (word && word.word !== lastReadingName) syncReadingButton();

  // 00계 화면단(d < 700)이면서 행성 확대 오버레이(letter-overlay)가 안 열렸을 때만 방위 표시기(컴퍼스) 노출
  const compassHudEl = document.getElementById('compass-hud');
  const isSystemView = (sys && d < 260) && letterOverlayEl.classList.contains('hidden');
  if (isSystemView) {
    compassHudEl.classList.remove('hidden');
  } else {
    compassHudEl.classList.add('hidden');
  }
}

/* ═════════════════════════════════════════════════════════════
   [뎁스 4] 03 letter system — 행성 클릭 시 음절 3D 모델
═════════════════════════════════════════════════════════════ */
const letterOverlayEl = document.getElementById('letter-overlay');

/* --- 레터 씬 (지연 초기화) --- */
let Lscene = null, Lcamera = null, Lrenderer = null, Lcomposer = null, Lcontrols = null;
let Lrim = null;   /* 행성 껍질에 오행 색을 얹는 림 라이트 */
let Lcapsule = null;

function letterInit() {
  const wrap = document.getElementById('letter-stage');
  Lscene = new THREE.Scene();
  Lscene.background = new THREE.Color(0x0b0805);
  Lscene.fog = new THREE.FogExp2(0x0b0805, .004);

  Lcamera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .1, 400);
  Lcamera.position.set(0, .4, 14);

  Lrenderer = new THREE.WebGLRenderer({ antialias: true });
  Lrenderer.setSize(innerWidth, innerHeight);
  Lrenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  Lrenderer.toneMapping = THREE.ACESFilmicToneMapping;
  Lrenderer.toneMappingExposure = 1.28;
  wrap.appendChild(Lrenderer.domElement);

  const pmrem = new THREE.PMREMGenerator(Lrenderer);
  Lscene.environment = pmrem.fromScene(new RoomEnvironment(), .06).texture;

  const key = new THREE.DirectionalLight(0xfff1dc, 2.6);
  key.position.set(7, 11, 9); Lscene.add(key);
  Lrim = new THREE.DirectionalLight(0x5a72ff, 1.1);
  Lrim.position.set(-9, -3, -7); Lscene.add(Lrim);
  Lscene.add(new THREE.AmbientLight(0x1c2038, .7));

  Lcomposer = new EffectComposer(Lrenderer);
  Lcomposer.addPass(new RenderPass(Lscene, Lcamera));
  Lcomposer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .26, .7, .88));
  Lcomposer.addPass(new OutputPass());

  Lcontrols = new OrbitControls(Lcamera, Lrenderer.domElement);
  Lcontrols.enableDamping = true; Lcontrols.dampingFactor = .06;
  Lcontrols.autoRotate = false;
  Lcontrols.minDistance = 6; Lcontrols.maxDistance = 90;
  Lcontrols.target.set(0, -.5, 0);

  /* letter_v1 배경 별 */
  const NST = 1500, pos = [], col = [];
  for (let i = 0; i < NST; i++) {
    const r = 70 + Math.random() * 180,
      th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos.push(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * .62, r * Math.cos(ph));
    const t = Math.random(), b = .45 + Math.random() * .55;
    if (t < .78) col.push(b, b * .96, b * .86);
    else if (t < .92) col.push(.5 * b, .62 * b, b);
    else col.push(b, .6 * b, .45 * b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  Lscene.add(new THREE.Points(g, new THREE.PointsMaterial({
    size: .55, vertexColors: true, transparent: true, opacity: .85,
    blending: THREE.AdditiveBlending, depthWrite: false
  })));

}

/* ── 한지 풀이 — 가로 판형 카드 데이터 ───────────────────────
   왼쪽 열은 큰 항목, 오른쪽 열은 짧은 항목, 性格은 여러 줄 풀이 */
const RULE_KO = { '象形 基本字': '기본자', '加畫字': '가획자', '各自竝書': '병서자', '異體字': '이체자' };
const VIRTUE_KO = ['어질 인', '예절 례', '믿을 신', '의로울 의', '슬기 지'];
const FAMILY = [['ㄱ', 'ㅋ', 'ㄲ'], ['ㄴ', 'ㄷ', 'ㅌ', 'ㄹ', 'ㄸ'], ['ㅁ', 'ㅂ', 'ㅍ', 'ㅃ'], ['ㅅ', 'ㅈ', 'ㅊ', 'ㅆ', 'ㅉ'], ['ㅇ', 'ㅎ']];
const ENERGY_KO = [
  ['봄날의 나무처럼 곧게 뻗어 자라는 기운이니', '성장의 에너지를 갖는다'],
  ['여름 불꽃처럼 위로 타오르는 기운이니', '피어나는 에너지를 갖는다'],
  ['한가운데서 두루 품어 안는 기운이니', '아우르는 에너지를 갖는다'],
  ['가을 쇠붙이처럼 거두어 굳히는 기운이니', '여무는 에너지를 갖는다'],
  ['겨울 물처럼 낮은 곳으로 스며드는 기운이니', '고요히 모이는 에너지를 갖는다'],
];

function consData(jm) {
  const E = EL[jm.el], jj = jejaText(jm.glyph);
  return {
    family: FAMILY[jm.el],
    left: [
      ['五音', `${jj.soundKo} ${RULE_KO[jj.rule] || jj.rule}`],
      ['季節', E.seasonKo],
      ['方位', `${E.dirKo}쪽`],
      ['方位神', E.godKo],
    ],
    right: [
      ['五行', `${E.name} ${E.ko}`],
      ['五方色', OHBANG_KO[jm.el]],
      ['德性', VIRTUE_KO[jm.el]],
    ],
    persona: [`${E.shapeKo}에서 형태를 얻었다`, ...ENERGY_KO[jm.el]],
    quote: E.shape,
  };
}

/* 陽 ㅏㅑㅗㅛ… · 陰 ㅓㅕㅜㅠ… · 그 밖의 ㅡㅣ는 어느 쪽도 아닌 中 */
function yinyang(v) {
  return YANG.has(v) ? ['陽', '밝고 발산하는 소리']
    : YIN.has(v) ? ['陰', '깊고 수렴하는 소리']
      : ['中', '음도 양도 아닌 소리'];
}

function vowelData(jm) {
  const tail = YANG.has(jm.glyph) ? '확산하는 양의 에너지를 갖는다'
    : YIN.has(jm.glyph) ? '수렴하는 음의 에너지를 갖는다'
      : '어느 쪽에도 치우치지 않는 中의 에너지를 갖는다';
  return {
    family: jm.seq.map(x => ['ㆍ', 'ㅡ', 'ㅣ'][x]),
    left: [
      ['三才', jm.seq.map(x => SAMH[x]).join(', ')],
      ['陰陽', yinyang(jm.glyph)[1]],
    ],
    right: [
      ['天', `위성 ${jm.moons}`],
      ['地', `가로띠 ${jm.beltH}`],
      ['人', `세로띠 ${jm.beltV}`],
    ],
    persona: [
      '중성은 음양과 삼재를 따른다',
      '둥근 ㆍ는 하늘, 평평한 ㅡ는 땅, 곧게 선 ㅣ는 사람으로',
      '셋이 어우러진 형상을 이루며',
      tail,
    ],
    quote: '取象於天地人',
  };
}

/* 궤도 도형 — 종이 위에 먹선으로 다시 그린 자소 궤도.
   자음은 제 수식 곡선(병서는 살짝 돌려 한 벌 더), 모음은 원 + 띠 + 위성 */
function drawOrbitThumb(jm) {
  const cv = document.getElementById('letter-orbit');
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(43, 30, 18, 0.8)';
  ctx.fillStyle = 'rgba(43, 30, 18, 0.8)';
  ctx.lineWidth = 2;
  const cx = W / 2, cy = H / 2;
  const trace = (P) => {
    ctx.beginPath();
    P.forEach(([x, y], i) => (i ? ctx.lineTo(cx + x, cy + y) : ctx.moveTo(cx + x, cy + y)));
    ctx.stroke();
  };
  if (jm.type === 'vowel') {
    const R = H * 0.3;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    const sgn = jm.yang === false ? -1 : 1;
    for (let k = 0; k < (jm.beltH | 0); k++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * (1.7 + k * 0.35), R * 0.55, -0.42, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let k = 0; k < (jm.beltV | 0); k++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 0.55, R * (1.7 + k * 0.35), sgn * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let m = 0; m < (jm.moons | 0); m++) {
      const a = -0.7 - m * 2.4;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * R * 1.55, cy + Math.sin(a) * R * 1.55, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const P = jamoCurve(jm.glyph, Math.min(W, H) * 0.42);
    trace(P);
    if (jm.tense) {
      ctx.globalAlpha = 0.7;
      trace(rotate2(P, 0.35));
      ctx.globalAlpha = 1;
    }
  }
}

/* jm = 자소 궤도 정보, sys = 그 자소가 속한 음절 계 */
function openLetter(jm, sys) {
  if (!Lscene) letterInit();

  /* 반사광(림 라이트)은 그 자소의 오행 색으로 */
  if (Lrim) Lrim.color.copy(C3(planetSpec(jm).accent));

  /* 행성 캡슐 — 해설지를 찾아낸 곳이 그 자소의 행성 속이라는 배경 */
  if (Lcapsule) {
    Lscene.remove(Lcapsule);
    Lcapsule.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
  /* 행성 본체가 사라졌으니 캡슐도 고리만 — 발치에 낮게 깔리는 오방색 가락지 */
  Lcapsule = new THREE.Group();
  if (jm.type === 'vowel') makeBelt(Lcapsule, 9, 1.4, 2.4, -Math.PI / 2, 0, '#e8dcc2');
  else makeBelt(Lcapsule, 9, 1.4, 2.4, -Math.PI / 2, 0, jm.col);
  Lcapsule.userData.dir = jm.dir;
  Lcapsule.position.y = -8;
  Lscene.add(Lcapsule);

  Lcamera.position.set(0, .4, 14);
  Lcontrols.target.set(0, -.5, 0);

  const isV = jm.type === 'vowel';
  const D = isV ? vowelData(jm) : consData(jm);

  document.getElementById('letter-char').textContent = jm.glyph;
  document.getElementById('letter-family').innerHTML =
    D.family.map(g => (g === jm.glyph ? `<b>${g}</b>` : g)).join(' ');
  drawOrbitThumb(jm);

  const rowsHtml = (rows) => rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  document.getElementById('letter-table').innerHTML =
    rowsHtml(D.left) + `<dt>性格</dt><dd>${D.persona.join('<br>')}</dd>`;
  document.getElementById('letter-table2').innerHTML = rowsHtml(D.right);
  document.getElementById('letter-quote').textContent = D.quote;

  letterOverlayEl.classList.remove('hidden');
  document.body.classList.add('reading');
}


function closeLetter() {
  letterOverlayEl.classList.add('hidden');
  document.body.classList.remove('reading');
  const { sys } = nearestSystem();
  if (sys) flyTo(() => sys.pos.clone(), 90, 1.8);
}
document.getElementById('letter-close').addEventListener('click', closeLetter);

/* ═════════════════════════════════════════════════════════════
   이름풀이 — 다가선 이름의 음양·오행을 세어 우주 위에 세로로 편다
═════════════════════════════════════════════════════════════ */
const readingOverlayEl = document.getElementById('reading-overlay');
const btnReading = document.getElementById('btn-reading');
const READING_RATIO = 0.6;   /* 자소를 이만큼 둘러보면 게이지가 꽉 찬다 */

/* 풀이 대상 = 가장 가까운 성단(이름) */
const readingWord = () => {
  const { word } = nearestWord();
  return word || (words.length ? words[0] : null);
};
const readingName = () => {
  const w = readingWord();
  return w ? w.word : '';
};

let lastReadingName = '';
function syncReadingButton() {
  const w = readingWord();
  const n = w ? w.word : '';
  lastReadingName = n;
  btnReading.querySelector('.br-name').textContent = n;
  btnReading.classList.toggle('on', !!n);

  /* 자소를 눌러 본 만큼 단추가 차오른다. 다만 전부가 아니라 여덟 할만 봐도
     게이지가 꽉 차고 풀이가 열린다 — 마지막 한둘을 찾아 헤매지 않도록 */
  const seen = w ? w.visited.size : 0;
  const need = w ? Math.ceil(w.total * READING_RATIO) : 0;
  btnReading.style.setProperty('--br-fill', need ? `${Math.min(1, seen / need) * 100}%` : '0%');
  btnReading.classList.toggle('ready', need > 0 && seen >= need);
}

function openReading() {
  /* 자소를 다 둘러보기 전에는 열리지 않는다 */
  if (!btnReading.classList.contains('ready')) return;
  const R = nameReading(readingName());
  if (!R) return;

  /* 집계 — 음양은 있는 것만, 오행도 있는 것만 */
  const counts = [];
  if (R.yang) counts.push(`陽 ${R.yang}`);
  if (R.yin) counts.push(`陰 ${R.yin}`);
  if (R.mid) counts.push(`中 ${R.mid}`);
  R.el.forEach((n, i) => { if (n) counts.push(`${EL[i].h} ${n}`); });
  document.getElementById('reading-counts').textContent = counts.join('  ');

  document.getElementById('reading-name').textContent = R.name;
  document.getElementById('reading-traits').textContent = R.traits.join(' ');
  document.getElementById('reading-lack').textContent = R.lackLine;
  document.getElementById('reading-rx-dir').textContent =
    `${R.rx.dir}${R.rx.dir === '한가운데' ? '가' : '이'} 길하다`;
  document.getElementById('reading-rx-wear').textContent =
    `${R.rx.wear} 옷과 장신구가 이롭다`;
  document.getElementById('reading-rx-surname').textContent =
    `${R.rx.surname}씨 성이 귀인이다`;

  readingOverlayEl.classList.remove('hidden');
  document.body.classList.add('divining');
}

function closeReading() {
  readingOverlayEl.classList.add('hidden');
  document.body.classList.remove('divining');
}

btnReading.addEventListener('click', openReading);
document.getElementById('reading-close').addEventListener('click', closeReading);

/* ═════════════════════════════════════════════════════════════
   입력 → 성단·계 재구성
   savedNames = 엔터로 우주에 심은 이름들 · draft = 지금 적고 있는 이름
   (draft는 언제나 맨 뒤 성단이라, 심어도 자리가 그대로다)
═════════════════════════════════════════════════════════════ */
const input = document.getElementById('nameInput');
const savedNames = [];
let draft = { text: '', pos: null };

const normName = (s) => [...s].filter(c => decompose(c) || c === ' ').join('');

/* fly=true면 지금 적고 있는 이름의 첫 계로 카메라를 옮긴다 */
function rebuildUniverse(fly) {
  buildAll(draft.text.trim() ? [...savedNames, draft] : savedNames);
  if (!fly) return;
  const c = clusters[clusters.length - 1];
  if (c && c.systems.length) flyToSystem(c.systems[0]);
}

/* 조합 중인 낱자(ㄱ, ㅏ)는 decompose가 걸러 낸다. input.value는 건드리지 않는다
   — 되쓰면 IME 조합이 깨진다.
   한 글자에도 조합 이벤트가 서너 번 오므로, 손이 멈춘 뒤에 한 번만 짓는다 */
let buildTimer = 0;
input.addEventListener('input', () => {
  const norm = normName(input.value);
  if (norm === draft.text) return;
  draft.text = norm;
  clearTimeout(buildTimer);
  buildTimer = setTimeout(() => rebuildUniverse(true), 180);
});

/* 엔터 → 지금 이름을 우주에 남기고 입력창을 비워 다음 이름을 받는다 */
input.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.isComposing) return;
  e.preventDefault();
  if (!parseName(draft.text).length) return;
  clearTimeout(buildTimer);
  savedNames.push(draft);
  draft = { text: '', pos: null };
  input.value = '';
  rebuildUniverse(false);
});

/* ═════════════════════════════════════════════════════════════
   메인 루프
═════════════════════════════════════════════════════════════ */
const clock = new THREE.Clock();
let elapsedTime = 0;
const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const TWO_PI = Math.PI * 2;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  elapsedTime = clock.elapsedTime;
  uPlanetTime.value = elapsedTime;
  const speed = paused ? 0 : 1;

  const dOrigin = camera.position.length();
  const nc = nearestCluster();
  const dNear = nc.cluster ? nc.d : dOrigin;
  const clusterF = 1 - smooth(dNear, 26000, 72000);
  /* 초기 자리(GAZE_DIST)에서 은하가 이미 만개해 있도록 램프를 앞당긴다 */
  const galaxyF = smooth(dNear, 7000, 18500);
  /* 원점 구상 성단 = 첫 이름이 앉는 자리. 심은 이름이 없으면 우주에 띄우지 않는다 */
  const originF = clusters.length ? 1 - smooth(dOrigin, 26000, 72000) : 0;

  starsWarm.material.uniforms.uTime.value = elapsedTime;
  starsCool.material.uniforms.uTime.value = elapsedTime;
  clusterCore.material.uniforms.uTime.value = elapsedTime;
  clusterStream.material.uniforms.uTime.value = elapsedTime;
  galaxy.material.uniforms.uTime.value = elapsedTime;

  starsWarm.material.uniforms.uAlpha.value = originF;
  starsCool.material.uniforms.uAlpha.value = originF;
  clusterCore.material.uniforms.uAlpha.value = originF;
  clusterStream.material.uniforms.uAlpha.value = originF;
  galaxy.material.uniforms.uAlpha.value = galaxyF;

  /* ----- 사신수 별자리: 기본 은은히 보이고, 그 방위를 향하면 100%로 짙어진다.
     은하 램프와 따로, 계(界) 뷰만 벗어나면 성단 단계부터 바로 차오른다 ----- */
  camera.getWorldDirection(CAM_FWD);
  const fwLen = Math.hypot(CAM_FWD.x, CAM_FWD.z) || 1;
  const sinsooF = smooth(dNear, 260, 1200);
  for (const s of sinsoos) {
    /* 그림은 카메라와 무관하게 늘 정면 — 화면 정렬 빌보드 */
    s.group.quaternion.copy(camera.quaternion);

    const facing = (CAM_FWD.x * s.axis.x + CAM_FWD.z * s.axis.z) / fwLen;
    const focus = smooth(facing, 0.15, 0.85);
    const flicker = 0.86 + 0.14 * Math.sin(elapsedTime * 1.6 + s.phase);
    s.field.material.uniforms.uTime.value = elapsedTime;
    s.field.material.uniforms.uAlpha.value = sinsooF * (0.62 + 0.38 * focus) * flicker;
    s.lineMat.uniforms.uOpacity.value = sinsooF * (0.28 + 0.72 * focus);

    /* 빛이 별자리 선을 타고 한 붓으로 돈다 (한 바퀴 9초) */
    const head = ((elapsedTime / 9 + s.phase) % 1) * s.pathLen;
    s.lineMat.uniforms.uHead.value = head;
    const seg = s.path.find(p => head < p.cum + p.len) || s.path[s.path.length - 1];
    const f = Math.min(1, (head - seg.cum) / seg.len);
    s.spark.position.set(seg.ax + (seg.bx - seg.ax) * f, seg.ay + (seg.by - seg.ay) * f, 10);
    s.spark.material.opacity = sinsooF * (0.35 + 0.65 * focus)
      * (0.75 + 0.25 * Math.sin(elapsedTime * 7 + s.phase));
  }

  for (const f of jamoStars.children) {
    f.material.uniforms.uTime.value = elapsedTime;
    f.material.uniforms.uAlpha.value = originF;
  }

  /* ----- 성단별: 광채 구름 페이드 + 은하 뷰 표지 ----- */
  for (const c of clusters) {
    const dSelf = camera.position.distanceTo(c.pos);
    c.cF = 1 - smooth(dSelf, 26000, 72000);
    if (c.deco) {
      for (const f of c.deco.children) {
        f.material.uniforms.uTime.value = elapsedTime;
        f.material.uniforms.uAlpha.value = c.cF;
      }
    }
    c.beacon.material.opacity = 0.9 * galaxyF;
    c.beacon.visible = galaxyF > 0.02;
    c.beaconLabel.element.style.opacity = galaxyF;
    c.beaconLabel.element.style.pointerEvents = galaxyF < 0.05 ? 'none' : 'auto';
  }

  updateScaleHUD();

  /* ----- 계별 업데이트: 음절별 v8 체인 공전 + 페이드 ----- */
  for (const s of systems) {
    const dS = camera.position.distanceTo(s.pos);
    const sysF = 1 - smooth(dS, 350, 1300);
    s.sysF = sysF;
    const visible = sysF > 0.02;
    const SC = s.SCALE;

    for (const y of s.jamos) {
      /* 작도 진행: reveal 6초 → 이후 연속 공전 (u = 궤도 위 위상 0~1) */
      y.age += dt * speed;
      const reveal = Math.min(1, Math.max(0, y.age / REVEAL_DUR));
      let u;
      if (reveal < 1) {
        u = reveal;
        y.tc = 0;
        y.traj.geometry.setDrawRange(0, Math.max(2, Math.floor(reveal * NPT)));
      } else {
        y.tc += dt * y.w * speed;
        u = y.tc % 1;
        y.traj.geometry.setDrawRange(0, NPT + 1);
      }

      if (visible) {
        const idx = Math.min(NPT, Math.floor(u * NPT));
        const [px, py] = y.pts[idx];
        y.planet.position.set(px * SC, 0, py * SC);
        /* 병서 — 두 바퀴가 한 벌이다. 홀수 바퀴는 5° 틀어진 겹궤도 쪽으로 갈아탄다
           (궤도면을 통째로 돌린 것과 같은 회전을 좌표에 걸어 자리만 옮긴다) */
        if (y.twinQ && Math.floor(y.tc) % 2 === 1) y.planet.position.applyQuaternion(y.twinQ);
        /* 자전 — 제 공전과 같은 손으로 돈다. 위에서 볼 때 rotation.y 증가는
           반시계이므로, 시계(dir=+1)로 돌리려면 빼 준다 */
        y.planet.rotation.y -= dt * speed * 0.25 * y.dir;
        if (y.moonGrp) y.moonGrp.rotation.y -= dt * speed * 0.9 * y.dir;

        /* ----- 궤적 글로우 꼬리 (행성 뒤로 한 바퀴에 걸쳐 소멸) ----- */
        const ca = y.traj.geometry.attributes.color.array;
        const head = reveal < 1 ? Math.max(1, Math.floor(reveal * NPT) - 1) : idx;
        for (let k = 0; k <= NPT; k++) {
          let d = head - k;
          if (reveal >= 1 && d < 0) d += NPT;
          if (d < 0) { ca[k * 3] = ca[k * 3 + 1] = ca[k * 3 + 2] = 0; continue; }
          const b = Math.pow(Math.max(0, 1 - d / NPT), 1.35) * sysF;
          ca[k * 3] = y.trailC.r * b;
          ca[k * 3 + 1] = y.trailC.g * b;
          ca[k * 3 + 2] = y.trailC.b * b;
        }
        y.traj.geometry.attributes.color.needsUpdate = true;

        /* ----- 반짝이는 부스러기 ----- */
        const du = y.dust;
        const dp = y.debris.geometry.attributes.position.array;
        const dc = y.debris.geometry.attributes.color.array;
        du.acc += dt * 26;
        while (du.acc >= 1) {
          du.acc -= 1;
          const i = du.idx = (du.idx + 1) % 90;
          /* 띠 바깥 고리 안에서 인다 — 가운데 자소가 가려지지 않게 */
          const sa = Math.random() * TWO_PI;
          const sr = y.auraR * (1.05 + Math.random() * 0.35);
          dp[i * 3] = y.planet.position.x + Math.cos(sa) * sr;
          dp[i * 3 + 1] = (Math.random() - 0.5) * y.auraR * 0.45;
          dp[i * 3 + 2] = y.planet.position.z + Math.sin(sa) * sr;
          du.vel[i * 3] = Math.cos(sa) * 0.3 + (Math.random() - 0.5) * 0.9;
          du.vel[i * 3 + 1] = (Math.random() - 0.5) * 0.7;
          du.vel[i * 3 + 2] = Math.sin(sa) * 0.3 + (Math.random() - 0.5) * 0.9;
          du.age[i] = 0;
          du.life[i] = 1.1 + Math.random() * 1.5;
          du.ph[i] = Math.random() * TWO_PI;
        }
        for (let i = 0; i < 90; i++) {
          du.age[i] += dt;
          const a = du.age[i], Lf = du.life[i];
          if (a >= Lf) { dc[i * 3] = dc[i * 3 + 1] = dc[i * 3 + 2] = 0; continue; }
          dp[i * 3] += du.vel[i * 3] * dt;
          dp[i * 3 + 1] += du.vel[i * 3 + 1] * dt;
          dp[i * 3 + 2] += du.vel[i * 3 + 2] * dt;
          const fade = Math.pow(1 - a / Lf, 1.7);
          const tw = 0.55 + 0.45 * Math.sin(elapsedTime * 11 + du.ph[i]);
          const b = fade * tw * sysF;
          dc[i * 3] = y.elC.r * b; dc[i * 3 + 1] = y.elC.g * b; dc[i * 3 + 2] = y.elC.b * b;
        }
        y.debris.geometry.attributes.position.needsUpdate = true;
        y.debris.geometry.attributes.color.needsUpdate = true;

        /* ----- 큰 반짝이 ----- */
        const db = y.dustBig;
        const bp = y.debrisBig.geometry.attributes.position.array;
        const bc = y.debrisBig.geometry.attributes.color.array;
        db.acc += dt * 3;
        while (db.acc >= 1) {
          db.acc -= 1;
          const i = db.idx = (db.idx + 1) % 14;
          const ba = Math.random() * TWO_PI;
          const br = y.auraR * (1.1 + Math.random() * 0.45);
          bp[i * 3] = y.planet.position.x + Math.cos(ba) * br;
          bp[i * 3 + 1] = (Math.random() - 0.5) * y.auraR * 0.6;
          bp[i * 3 + 2] = y.planet.position.z + Math.sin(ba) * br;
          db.vel[i * 3] = Math.cos(ba) * 0.25 + (Math.random() - 0.5) * 0.6;
          db.vel[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
          db.vel[i * 3 + 2] = Math.sin(ba) * 0.25 + (Math.random() - 0.5) * 0.6;
          db.age[i] = 0;
          db.life[i] = 1.6 + Math.random() * 1.4;
          db.ph[i] = Math.random() * TWO_PI;
        }
        for (let i = 0; i < 14; i++) {
          db.age[i] += dt;
          const ab = db.age[i], Lb = db.life[i];
          if (ab >= Lb) { bc[i * 3] = bc[i * 3 + 1] = bc[i * 3 + 2] = 0; continue; }
          bp[i * 3] += db.vel[i * 3] * dt;
          bp[i * 3 + 1] += db.vel[i * 3 + 1] * dt;
          bp[i * 3 + 2] += db.vel[i * 3 + 2] * dt;
          const fadeB = Math.pow(1 - ab / Lb, 1.5);
          const twB = 0.5 + 0.5 * Math.sin(elapsedTime * 7 + db.ph[i]);
          const bB = fadeB * twB * sysF;
          bc[i * 3] = y.elC.r * bB; bc[i * 3 + 1] = y.elC.g * bB; bc[i * 3 + 2] = y.elC.b * bB;
        }
        y.debrisBig.geometry.attributes.position.needsUpdate = true;
        y.debrisBig.geometry.attributes.color.needsUpdate = true;
      }

      /* 페이드 (계 단위) */
      y.trajMat.opacity = 0.9 * sysF;
      const orbitVisible = visible && showOrbit;
      y.planet.visible = visible;
      y.traj.visible = orbitVisible;
      for (const g of y.glows) g.visible = orbitVisible;
      if (y.twinLines) for (const l of y.twinLines) l.visible = orbitVisible;
      y.debris.visible = visible;
      y.debrisBig.visible = visible;
      /* 행성 이름 태그 비활성화 — 항성(sunLabel)에서만 이름 표시 */
      y.planetLabel.element.style.opacity = 0;
      y.planetLabel.element.style.pointerEvents = 'none';
    }

    s.compass.mat.opacity = showOrbit ? 0.07 * sysF : 0;

    /* 성단 뷰 계 마커 — 계에 가까우면 숨기고 성단 거리에서 등장 */
    const mF = smooth(dS, 500, 2400) * (clusters[s.clusterIndex] ? clusters[s.clusterIndex].cF : 0);
    s.marker.visible = mF > 0.02;
    if (s.marker.visible) {
      s.marker.scale.setScalar(mF);
      s.marker.rotation.y += dt * 0.05;
    }

    const sOp = (showName && showSun) ? clusterF : 0;
    s.sunLabel.element.style.opacity = sOp;
    s.sunLabel.element.style.pointerEvents = sOp < 0.05 ? 'none' : 'auto';

    const offOp = (showName && !showSun) ? clusterF * 0.5 : 0;
    if (s.sunOffLabel) {
      s.sunOffLabel.element.style.opacity = offOp;
      s.sunOffLabel.element.style.pointerEvents = offOp < 0.05 ? 'none' : 'auto';
    }
  }

  /* ----- 카메라 트윈 ----- */
  if (camTween) {
    camTween.t += dt / camTween.dur;
    const k = easeInOut(Math.min(camTween.t, 1));
    camera.position.lerpVectors(camTween.fromPos, camTween.toPosFn(), k);
    controls.target.lerpVectors(camTween.fromTarget, camTween.toTargetFn(), k);
    if (camTween.t >= 1) {
      const done = camTween.onDone;
      camTween = null;
      if (done) done();
    }
  }


  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  updateCompassHUD();

  /* ----- 레터 오버레이 ----- */
  if (Lscene && !letterOverlayEl.classList.contains('hidden')) {
    if (Lcapsule) Lcapsule.rotation.y = -elapsedTime * 0.04 * (Lcapsule.userData.dir || 1);
    Lcontrols.update();
    Lcomposer.render();
  }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
  if (Lrenderer) {
    Lcamera.aspect = innerWidth / innerHeight;
    Lcamera.updateProjectionMatrix();
    Lrenderer.setSize(innerWidth, innerHeight);
    Lcomposer.setSize(innerWidth, innerHeight);
  }
});

/* ---------------- 시작 ---------------- */
/* 빈 입력으로 여니 첫 화면은 은하 뎁스 — 은하를 화면 한가운데 두고
   원반 법선에서 GAZE_TILT 만큼 비껴 내려다봐 사선 타원으로 보이게 한다.
   거리는 galaxyF가 다 차오르는 42000 밖으로 잡아 은하가 흐려지지 않는다 */
const GAZE_TILT = 0.55, GAZE_DIST = 20000;
{
  const c = galaxy.position;
  const n = new THREE.Vector3(0, 1, 0).applyEuler(GALAXY_TILT).normalize();  /* 원반 법선 */
  const axis = new THREE.Vector3(0, 1, 0).cross(n).normalize();              /* 법선에 수직 */
  const dir = n.clone().applyAxisAngle(axis, GAZE_TILT);
  camera.position.copy(c).addScaledVector(dir, GAZE_DIST);
  controls.target.copy(c);
  controls.update();
}

draft.text = normName(input.value);
rebuildUniverse(false);
animate()
