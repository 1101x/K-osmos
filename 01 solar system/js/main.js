// ===== 한글 이름 추상화 · 오행 태양계 SAMPLE =====
// NASA Eyes on Exoplanets(반짝이는 별 배경) + Eyes on Asteroids(행성 궤도) 스타일 재현
// 줌 스케일 3단계: 태양계 → 태양 근방 성단 → 우리은하 (카메라 거리에 따라 자연스럽게 전환)
// 추후: 이름 → 음양오행 → 행성 치환 알고리즘이 PLANETS 배열을 동적으로 생성하도록 교체 예정

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ---------------------------------------------------------------- 기본 셋업
const container = document.getElementById('scene-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000004);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 300000);
camera.position.set(0, 46, 78);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'fixed';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 4;
controls.maxDistance = 90000;

scene.add(new THREE.AmbientLight(0xffffff, 0.18));
const sunLight = new THREE.PointLight(0xfff2d5, 2600, 0, 2);
scene.add(sunLight);

const texLoader = new THREE.TextureLoader();
const loadTex = (p) => {
  const t = texLoader.load(p);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

// 가우시안 난수 (Box-Muller)
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

// ---------------------------------------------------------------- 별 스프라이트 (십자 광채)
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
  ctx.translate(s / 2, s / 2);
  ctx.rotate(Math.PI / 2);
  ctx.translate(-s / 2, -s / 2);
  flare(2.2, 30);
  ctx.restore();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const STAR_SPRITE = makeStarSprite();

// ---------------------------------------------------------------- 반짝이는 포인트 필드
// generate(i) 를 넘기면 임의 분포, 없으면 radiusMin~Max 구면 셸 분포
// atten: 거리 감쇠 지수. 1 = 물리적 원근, 0에 가까울수록 화면 픽셀 크기 고정(NASA Eyes 별 느낌)
function makeStarField({ count, radiusMin, radiusMax, sizeMin, sizeMax, palette, twinkleAmp, maxPx = 512, atten = 1, generate }) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const speed = new Float32Array(count);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    let p;
    if (generate) {
      p = generate(i);
    } else {
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
      uMap: { value: STAR_SPRITE },
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
        vec4 tex = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(vColor, 1.0) * tex * vAlpha * uAlpha;
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geo, mat);
}

// ---------------------------------------------------------------- [스케일 3] 우리은하
// 나선팔 파티클 은하. 태양(원점)이 은하 나선팔 위(중심에서 약 2/3 지점)에 오도록 배치.
const GALAXY_TILT = new THREE.Euler(0.55, 0.35, 0.12);
const SUN_LOCAL = new THREE.Vector3(9800, 0, 1200);   // 은하 로컬 좌표에서의 태양 위치

function galaxyGenerate() {
  const N_BULGE = 11000, N_ARM = 20000, N_HII = 900;
  const pts = [];
  // 중심핵(벌지): 노란빛 도는 흰색
  const bulgeCols = [0xfff4d8, 0xffe9b8, 0xffffff, 0xffddaa];
  for (let i = 0; i < N_BULGE; i++) {
    pts.push({
      x: gauss() * 2100, y: gauss() * 800, z: gauss() * 2100,
      color: bulgeCols[Math.floor(Math.random() * bulgeCols.length)],
      size: 300 + Math.pow(Math.random(), 1.8) * 1100,
    });
  }
  // 나선팔 2개: 로그 나선, 푸른 흰색 + 군데군데 따뜻한 별
  const armCols = [0xdfe8ff, 0xffffff, 0xcdd8ff, 0xfff2d8];
  for (let i = 0; i < N_ARM; i++) {
    const t = Math.pow(Math.random(), 0.72) * 12.6;      // theta
    let r = 1500 * Math.exp(0.18 * t);
    let th = t + (i % 2) * Math.PI;                       // 팔 2개
    r += gauss() * (280 + r * 0.07);
    th += gauss() * 0.06;
    pts.push({
      x: Math.cos(th) * r, y: gauss() * (130 + r * 0.012), z: Math.sin(th) * r,
      color: armCols[Math.floor(Math.random() * armCols.length)],
      size: 260 + Math.pow(Math.random(), 2.0) * 1000,
    });
  }
  // 나선팔 위 분홍 성운(HII 영역) 알갱이
  for (let i = 0; i < N_HII; i++) {
    const t = 2.5 + Math.pow(Math.random(), 0.8) * 10;
    let r = 1500 * Math.exp(0.18 * t);
    let th = t + (i % 2) * Math.PI + gauss() * 0.04;
    r += gauss() * (200 + r * 0.05);
    pts.push({
      x: Math.cos(th) * r, y: gauss() * 150, z: Math.sin(th) * r,
      color: 0xff9db8,
      size: 500 + Math.random() * 900,
    });
  }
  let i = 0;
  return () => pts[i++];
}

const galaxy = makeStarField({
  count: 31900,
  sizeMin: 0, sizeMax: 0, palette: [0xffffff],
  twinkleAmp: 0.12,
  maxPx: 10,
  generate: galaxyGenerate(),
});
galaxy.rotation.copy(GALAXY_TILT);
// 로컬 태양 위치가 월드 원점에 오도록 이동
const sunWorldOfLocal = SUN_LOCAL.clone().applyEuler(GALAXY_TILT);
galaxy.position.copy(sunWorldOfLocal.clone().negate());
galaxy.material.uniforms.uAlpha.value = 0;
scene.add(galaxy);

// 은하 중심 방향 (성단의 '별 띠'가 이 방향을 향함 → 줌아웃 시 자연스럽게 이어짐)
const GALAXY_CENTER_DIR = galaxy.position.clone().normalize();

// ---------------------------------------------------------------- [스케일 1~2] 별 배경 + 성단
// Exoplanets 화면처럼: 노랑·주황 위주의 밝은 별 + 흰/파랑 잔별 (셸 분포)
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
  palette: [0xffffff, 0xbcd2ff, 0x8fb0ff, 0xe8e8ff],
  twinkleAmp: 0.35,
  atten: 0.25,
});
scene.add(starsWarm, starsCool);

// 성단 핵: 태양 주변 가우시안 군집 (줌아웃하면 태양이 빛나는 점처럼 보이는 밀집 군집)
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

// 별 띠: 태양 → 은하 중심 방향으로 이어지는 별의 흐름 (Exoplanets의 은하수 띠 느낌)
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
    const t = -2200 + Math.pow(Math.random(), 1.25) * 11500;   // 은하 중심 쪽으로 향할수록 밀집
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

// ---------------------------------------------------------------- 태양
const SUN_RADIUS = 3.4;
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(SUN_RADIUS, 64, 64),
  new THREE.MeshBasicMaterial({ map: loadTex('../00 mater/textures/2k_sun.jpg') })
);
scene.add(sun);

function makeGlowSprite(size) {
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
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sp.scale.setScalar(size);
  return sp;
}
sun.add(makeGlowSprite(26));

// ---------------------------------------------------------------- 행성 정의 (목화토금수)
// 추후 이름→오행 알고리즘이 이 배열을 생성하게 하면 됨
const PLANETS = [
  {
    id: 'mercury', name: '수성', latin: 'MERCURY', element: '水 · 수',
    color: 0xb18cf0, tex: '../00 mater/textures/2k_mercury.jpg',
    radius: 0.85, dist: 13, period: 7.5, tilt: 0.03,
    desc: '오행의 水(수)에 대응하는 행성. 태양에 가장 가까우며 궤도를 가장 빠르게 돕니다.',
  },
  {
    id: 'venus', name: '금성', latin: 'VENUS', element: '金 · 금',
    color: 0xe8c766, tex: '../00 mater/textures/2k_venus_atmosphere.jpg',
    radius: 1.25, dist: 18.5, period: 12, tilt: 0.05,
    desc: '오행의 金(금)에 대응하는 행성. 두꺼운 대기가 태양빛을 반사해 가장 밝게 빛납니다.',
  },
  {
    id: 'mars', name: '화성', latin: 'MARS', element: '火 · 화',
    color: 0xff6d4d, tex: '../00 mater/textures/2k_mars.jpg',
    radius: 1.05, dist: 25, period: 19, tilt: 0.04,
    desc: '오행의 火(화)에 대응하는 행성. 산화철로 붉게 물든 표면을 갖고 있습니다.',
  },
  {
    id: 'jupiter', name: '목성', latin: 'JUPITER', element: '木 · 목',
    color: 0xe8a06b, tex: '../00 mater/textures/2k_jupiter.jpg',
    radius: 2.7, dist: 34, period: 31, tilt: 0.02,
    desc: '오행의 木(목)에 대응하는 행성. 태양계에서 가장 큰 거대 가스 행성입니다.',
  },
  {
    id: 'saturn', name: '토성', latin: 'SATURN', element: '土 · 토',
    color: 0xd9c9a3, tex: '../00 mater/textures/2k_saturn.jpg',
    radius: 2.3, dist: 44, period: 45, tilt: 0.06, ring: true,
    desc: '오행의 土(토)에 대응하는 행성. 얼음과 암석 조각으로 이루어진 고리를 두르고 있습니다.',
  },
];

const planetObjs = [];

function makeOrbitLine(dist, color) {
  const N = 256;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * dist, 0, Math.sin(a) * dist));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 });
  return new THREE.Line(geo, mat);
}

function makeLabel(p) {
  const el = document.createElement('div');
  el.className = 'planet-label';
  el.style.color = '#' + new THREE.Color(p.color).getHexString();
  el.innerHTML = `<span class="ring-icon"></span><span class="name">${p.name} ${p.latin}</span>`;
  el.addEventListener('click', (e) => { e.stopPropagation(); selectPlanet(p.id); });
  return new CSS2DObject(el);
}

for (const p of PLANETS) {
  const pivot = new THREE.Object3D();
  pivot.rotation.x = p.tilt;
  scene.add(pivot);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(p.radius, 48, 48),
    new THREE.MeshStandardMaterial({ map: loadTex(p.tex), roughness: 1, metalness: 0 })
  );
  mesh.userData.planetId = p.id;
  pivot.add(mesh);

  if (p.ring) {
    const ringTex = texLoader.load('../00 mater/textures/2k_saturn_ring_alpha.png');
    ringTex.colorSpace = THREE.SRGBColorSpace;
    const ringGeo = new THREE.RingGeometry(p.radius * 1.4, p.radius * 2.4, 96);
    const uv = ringGeo.attributes.uv;
    const pos3 = ringGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < uv.count; i++) {
      v.fromBufferAttribute(pos3, i);
      const t = (v.length() - p.radius * 1.4) / (p.radius * 1.0);
      uv.setXY(i, t, 0.5);
    }
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false,
    }));
    ring.rotation.x = Math.PI / 2 - 0.35;
    mesh.add(ring);
  }

  const label = makeLabel(p);
  mesh.add(label);

  const orbit = makeOrbitLine(p.dist, p.color);
  pivot.add(orbit);

  planetObjs.push({
    ...p,
    mesh, pivot, label,
    orbitMat: orbit.material,
    angle: Math.random() * Math.PI * 2,
  });
}

// 태양 라벨 (모든 스케일에서 표시 — 성단/은하 뷰에서 태양 위치를 알려줌)
{
  const el = document.createElement('div');
  el.className = 'planet-label sun-label';
  el.innerHTML = `<span class="ring-icon" style="color:#ffd76a"></span><span class="name">SUN 태양</span>`;
  el.addEventListener('click', (e) => { e.stopPropagation(); resetView(); });
  sun.add(new CSS2DObject(el));
}

// ---------------------------------------------------------------- 선택 / 카메라 연출
const panel = document.getElementById('info-panel');
let selected = null;
let camTween = null;

function flyTo(getTargetPos, distance, duration = 1.6) {
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
    toPosFn, toTargetFn,
  };
}

function clearSelection() {
  selected = null;
  panel.classList.add('hidden');
  document.querySelectorAll('.planet-label').forEach(el => el.classList.remove('selected'));
}

function selectPlanet(id) {
  const p = planetObjs.find(o => o.id === id);
  if (!p) return;
  selected = p;

  document.querySelectorAll('.planet-label').forEach(el => el.classList.remove('selected'));
  p.label.element.classList.add('selected');

  document.getElementById('panel-element').textContent = p.element;
  document.getElementById('panel-name').textContent = p.name;
  document.getElementById('panel-latin').textContent = p.latin;
  document.getElementById('panel-desc').textContent = p.desc;
  panel.classList.remove('hidden');

  const dist = p.radius * (p.ring ? 6.5 : 5.5);
  flyTo(() => p.mesh.getWorldPosition(new THREE.Vector3()), dist);
}

function resetView() {
  clearSelection();
  flyTo(() => new THREE.Vector3(0, 0, 0), 90, 1.8);
}
function goCluster() {
  clearSelection();
  flyTo(() => new THREE.Vector3(0, 0, 0), 8000, 2.4);
}
function goGalaxy() {
  clearSelection();
  flyTo(() => new THREE.Vector3(0, 0, 0), 62000, 2.8);
}

document.getElementById('panel-close').addEventListener('click', resetView);
document.getElementById('btn-reset').addEventListener('click', resetView);
document.getElementById('btn-cluster').addEventListener('click', goCluster);
document.getElementById('btn-galaxy').addEventListener('click', goGalaxy);
addEventListener('keydown', (e) => { if (e.key === 'Escape') resetView(); });

// 캔버스 클릭 → 레이캐스트로 행성 선택 (태양계 스케일에서만)
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downXY = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downXY = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downXY) return;
  const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]);
  downXY = null;
  if (moved > 5) return;
  if (camera.position.length() > 600) return;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(planetObjs.map(o => o.mesh), false);
  if (hits.length) selectPlanet(hits[0].object.userData.planetId);
});

// ---------------------------------------------------------------- 시간/속도 UI
const dtEl = document.getElementById('datetime');
const speedSlider = document.getElementById('speed-slider');
function updateClockUI() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  dtEl.textContent =
    `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
setInterval(updateClockUI, 1000);
updateClockUI();

// ---------------------------------------------------------------- 스케일 HUD
const scaleNameEl = document.getElementById('scale-name');
let lastScaleName = '';
function updateScaleHUD(d) {
  const name = d < 700 ? '태양계' : d < 18000 ? '태양 근방 성단' : '우리은하';
  if (name !== lastScaleName) {
    lastScaleName = name;
    scaleNameEl.textContent = name;
  }
}

// ---------------------------------------------------------------- 루프
const clock = new THREE.Clock();
const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const elapsed = clock.elapsedTime;
  const speed = parseFloat(speedSlider.value);

  // ----- 스케일 전환 (카메라가 원점에서 얼마나 떨어졌는가)
  const d = camera.position.length();
  const solarF = 1 - smooth(d, 350, 1300);      // 태양계 요소: 멀어지면 사라짐
  const clusterF = 1 - smooth(d, 26000, 72000); // 성단/배경 별: 은하 스케일에서 사라짐
  const galaxyF = smooth(d, 9000, 42000);       // 은하: 충분히 멀어지면 나타남

  starsWarm.material.uniforms.uTime.value = elapsed;
  starsCool.material.uniforms.uTime.value = elapsed;
  clusterCore.material.uniforms.uTime.value = elapsed;
  clusterStream.material.uniforms.uTime.value = elapsed;
  galaxy.material.uniforms.uTime.value = elapsed;

  starsWarm.material.uniforms.uAlpha.value = clusterF;
  starsCool.material.uniforms.uAlpha.value = clusterF;
  clusterCore.material.uniforms.uAlpha.value = clusterF;
  clusterStream.material.uniforms.uAlpha.value = clusterF;
  galaxy.material.uniforms.uAlpha.value = galaxyF;

  updateScaleHUD(d);

  // ----- 공전 + 자전 / 태양계 요소 페이드
  for (const p of planetObjs) {
    p.angle += (dt * speed * Math.PI * 2) / p.period;
    p.mesh.position.set(Math.cos(p.angle) * p.dist, 0, Math.sin(p.angle) * p.dist);
    p.mesh.rotation.y += dt * 0.25;

    p.orbitMat.opacity = 0.45 * solarF;
    p.mesh.visible = solarF > 0.02;
    p.label.element.style.opacity = solarF;
    p.label.element.style.pointerEvents = solarF < 0.05 ? 'none' : 'auto';
  }
  sun.rotation.y += dt * 0.02;

  // ----- 카메라 트윈 / 선택 추적
  if (camTween) {
    camTween.t += dt / camTween.dur;
    const k = easeInOut(Math.min(camTween.t, 1));
    camera.position.lerpVectors(camTween.fromPos, camTween.toPosFn(), k);
    controls.target.lerpVectors(camTween.fromTarget, camTween.toTargetFn(), k);
    if (camTween.t >= 1) camTween = null;
  } else if (selected) {
    const wp = selected.mesh.getWorldPosition(new THREE.Vector3());
    const delta = wp.clone().sub(controls.target);
    controls.target.copy(wp);
    camera.position.add(delta);
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});
