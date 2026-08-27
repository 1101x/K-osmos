/* ═══════════════════════════════════════════════════════════════
   코드북 — 훈민정음 제자원리 · 오행 · 음양 · 궤도 파라미터
   원본: 00 mater / codeBook_v1.md
   ─────────────────────────────────────────────────────────────
   순수 데이터와 규칙 함수만 담는다.
   Three.js 등 렌더링 의존성은 없다.
═══════════════════════════════════════════════════════════════ */

/* ═══ 자모 코드북 ═══
   [오행 인덱스, 가획 횟수, 병서(쌍) 여부]
   오행: 0木 1火 2土 3金 4水 */
export const JAMO = {
  'ㄱ': [0, 0, 0], 'ㅋ': [0, 1, 0], 'ㄲ': [0, 0, 1],
  'ㄴ': [1, 0, 0], 'ㄷ': [1, 1, 0], 'ㅌ': [1, 2, 0], 'ㄸ': [1, 1, 1], 'ㄹ': [1, 3, 0],
  'ㅁ': [2, 0, 0], 'ㅂ': [2, 1, 0], 'ㅍ': [2, 2, 0], 'ㅃ': [2, 1, 1],
  'ㅅ': [3, 0, 0], 'ㅈ': [3, 1, 0], 'ㅊ': [3, 2, 0], 'ㅆ': [3, 0, 1], 'ㅉ': [3, 1, 1],
  'ㅇ': [4, 0, 0], 'ㅎ': [4, 1, 0]
};

/* ═══ 오행 표 ═══
   순서 = 오행 인덱스(0木 1火 2土 3金 4水). JAMO의 element 값이 이 인덱스다.
   col   : 궤도 라인 · 라벨 · 파편/먼지 입자
   trail : 행성 꼬리(잔상). 가산 6겹에서도 색이 유지되도록 진한 톤
           (검정 오행은 가산합성 특성상 짙은 남빛으로 표현)
   accent: 자소 레터링 화면의 조명 색 (0x… 형식 — THREE.PointLight용)
   tint  : 행성 표면 색 (회색 지형맵에 셰이더에서 곱함)
   glow  : 표면 자체발광 — 어두운 오행일수록 올려서 배경에 안 묻히게
   churn : 표면이 이글거리는 세기 (0이면 정지) */
export const EL = [
  {
    h: '木', accent: 0x45dbde, ko: '목', name: '나무',
    col: '#5aa1d3ff', trail: '#4fbbc3ff',
    tex: 'gray_mok.jpg', tint: '#5c9ebfff', glow: 0.10, churn: 1.0, latin: 'WOOD',
    sound: '牙音', soundKo: '어금닛소리', shape: '象舌根閉喉之形', shapeKo: '혀뿌리가 목구멍을 닫는 꼴',
    dir: '東', dirKo: '동', season: '春', seasonKo: '봄', ohbang: '靑', ohbangKo: '푸름',
    god: '靑龍', godKo: '청룡', virtue: '仁', virtueKo: '어짊', ink: '#1d5c86',
    trait: '곧게 뻗어 자라는 기운이니, 너그럽고 어질다.',
  },
  {
    h: '火', accent: 0xe06055, ko: '화', name: '불',
    col: '#e06055', trail: '#d8352a',
    /* M형 항성 표면(입상반) — 행성이 아니라 타는 표면이라 발광이 높다 */
    tex: 'gray_hwa.jpg', tint: '#ff6a42', glow: 0.38, churn: 1.8, latin: 'FIRE',
    sound: '舌音', soundKo: '혓소리', shape: '象舌附上腭之形', shapeKo: '혀가 윗잇몸에 붙는 꼴',
    dir: '南', dirKo: '남', season: '夏', seasonKo: '여름', ohbang: '赤', ohbangKo: '붉음',
    god: '朱雀', godKo: '주작', virtue: '禮', virtueKo: '예의', ink: '#9c2f22',
    trait: '위로 타오르는 기운이니, 밝고 예를 안다.',
  },
  {
    h: '土', accent: 0xf0cf3f, ko: '토', name: '흙',
    col: '#f0cf3f', trail: '#fce898ff',
    tex: 'gray_to.jpg', tint: '#ffe570ff', glow: 0.10, churn: 1.1, latin: 'EARTH',
    sound: '脣音', soundKo: '입술소리', shape: '象口形', shapeKo: '입의 꼴',
    dir: '中央', dirKo: '가운데', season: '長夏', seasonKo: '늦여름', ohbang: '黃', ohbangKo: '누름',
    god: '黃龍', godKo: '황룡', virtue: '信', virtueKo: '믿음', ink: '#7d5f0e',
    trait: '가운데서 두루 품는 기운이니, 두텁고 미덥다.',
  },
  {
    h: '金', accent: 0xdfe6f2, ko: '금', name: '쇠',
    col: '#efdfc0', trail: '#f2eedfff',
    /* 白 — 순백이면 하이라이트가 날아가므로 살짝 따뜻한 백 */
    tex: 'gray_geum.jpg', tint: '#f4efe4', glow: 0.06, churn: 0.7, latin: 'METAL',
    sound: '齒音', soundKo: '잇소리', shape: '象齒形', shapeKo: '이의 꼴',
    dir: '西', dirKo: '서', season: '秋', seasonKo: '가을', ohbang: '白', ohbangKo: '흼',
    god: '白虎', godKo: '백호', virtue: '義', virtueKo: '의로움', ink: '#4b4136',
    trait: '거두어 굳히는 기운이니, 굳세고 의롭다.',
  },
  {
    h: '水', accent: 0x6fa8ff, ko: '수', name: '물',
    col: '#b2c0d7ff', trail: '#3d476bff',
    /* 黑 — 검정에 가장 가깝게, 대신 발광을 올려 보이는 한계까지만 */
    tex: 'gray_su.jpg', tint: '#3b4658', glow: 0.34, churn: 0.9, latin: 'WATER',
    sound: '喉音', soundKo: '목구멍소리', shape: '象喉形', shapeKo: '목구멍의 꼴',
    dir: '北', dirKo: '북', season: '冬', seasonKo: '겨울', ohbang: '黑', ohbangKo: '검음',
    god: '玄武', godKo: '현무', virtue: '智', virtueKo: '슬기', ink: '#1b2a40',
    trait: '아래로 스며드는 기운이니, 깊고 슬기롭다.',
  },
];

/* ═══ 초·중·종성 리스트 ═══ */
export const OL = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
export const VL = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
export const CL = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

/* ═══ 겹받침 분해 ═══ */
export const CODA_PARTS = {
  'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'], 'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'],
  'ㄼ': ['ㄹ', 'ㅂ'], 'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'], 'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ']
};

/* ═══ 한글 음절 분해 ═══ */
export function decompose(ch) {
  const c = ch.charCodeAt(0) - 0xAC00;
  if (c < 0 || c > 11171) return null;
  return { onset: OL[Math.floor(c / 588)], vowel: VL[Math.floor((c % 588) / 28)], coda: CL[c % 28] };
}

/* ═══════════════════════════════════════════════════════════════
   궤도 곡선 파라미터 — 자소별 수학 곡선 정의
   자음 = 오행별 수식 곡선 (하이포/장미/리사주/에피)
   모음 = 원 궤도
═══════════════════════════════════════════════════════════════ */
const PI2 = Math.PI / 2;
export const CURVE = {
  /* 木 */ 'ㄱ': { f: 'hypo', A: 2, B: 3, p: 2, q: 1 }, 'ㅋ': { f: 'hypo', A: 4, B: 3, p: 4, q: 1 },
  /* 火 */ 'ㄴ': { f: 'rose', k: 3 }, 'ㄷ': { f: 'rose', k: 2 }, 'ㅌ': { f: 'rose', k: 5 }, 'ㄹ': { f: 'rose', k: 7 },
  /* 土 */ 'ㅁ': { f: 'liss', a: 2, b: 1, d: 0 }, 'ㅂ': { f: 'liss', a: 3, b: 1, d: PI2 }, 'ㅍ': { f: 'liss', a: 3, b: 2, d: PI2 },
  /* 金 */ 'ㅅ': { f: 'hypo', A: 4, B: 3, p: 2, q: 1 }, 'ㅈ': { f: 'hypo', A: 6, B: 3, p: 3, q: 1 }, 'ㅊ': { f: 'hypo', A: 5, B: 3, p: 5, q: 3 },
  /* 水 */ 'ㅇ': { f: 'epi', A: 3, B: 3, p: 3, q: 1 }, 'ㅎ': { f: 'epi', A: 5, B: 6, p: 5, q: 3 },
};

/* 곡선 한국어 이름 */
export const FAMKO = { hypo: '하이포트로코이드', rose: '장미곡선', liss: '리사주곡선', epi: '에피트로코이드' };

/* 병서 — 궤도는 기본자와 같다. 표기만 쌍둥이 행성 */
export const TWIN = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };

/* ═══ 모음 천지인 필순 ═══
   0=天(·) 1=地(ㅡ) 2=人(ㅣ) */
export const VSEQ = {
  'ㅏ': [2, 0], 'ㅑ': [2, 0, 0], 'ㅓ': [0, 2], 'ㅕ': [0, 0, 2],
  'ㅗ': [0, 1], 'ㅛ': [0, 0, 1], 'ㅜ': [1, 0], 'ㅠ': [1, 0, 0],
  'ㅐ': [2, 0, 2], 'ㅒ': [2, 0, 0, 2], 'ㅔ': [0, 2, 2], 'ㅖ': [0, 0, 2, 2],
  'ㅚ': [0, 1, 2], 'ㅟ': [1, 0, 2], 'ㅢ': [1, 2],
  'ㅘ': [0, 1, 2, 0], 'ㅝ': [1, 0, 0, 2],
  'ㅙ': [0, 1, 2, 0, 2], 'ㅞ': [1, 0, 0, 2, 2],
  'ㅡ': [1], 'ㅣ': [2],
};

/* ═══ 음양 ═══ */
export const YANG = new Set(['ㅏ', 'ㅑ', 'ㅗ', 'ㅛ', 'ㅐ', 'ㅒ', 'ㅚ', 'ㅘ', 'ㅙ']);
export const YIN = new Set(['ㅓ', 'ㅕ', 'ㅜ', 'ㅠ', 'ㅔ', 'ㅖ', 'ㅟ', 'ㅝ', 'ㅞ']);

/* 천지인 한자 이름 */
export const SAMH = ['天', '地', '人'];

/* ═══ 모음 오행(중성 전용) ═══
   모음은 오행이 아니라 음양을 따른다 — EL과 같은 칸을 가진 여섯 번째 항목 격.
   달 텍스처를 쓰며 위성도 같은 재질을 공유한다 */
export const VOWEL_EL = {
  h: '中', accent: 0x9a9a9aff, ko: '중성', name: '달',
  col: '#3d3d3dff', trail: '#505050ff',
  tex: '2k_moon.jpg', tint: '#505050ff', glow: 0.08, churn: 0.35, latin: 'MOON',
  sound: '中聲', soundKo: '가운뎃소리', shape: '取象於天地人', shapeKo: '하늘·땅·사람에서 꼴을 취함',
  dir: '中', dirKo: '가운데', season: '四時', seasonKo: '네 철', ohbang: '玄', ohbangKo: '가믈',
  god: '太極', godKo: '태극', virtue: '和', virtueKo: '어우러짐', ink: '#3a3226',
  trait: '음양이 갈마드는 기운이니, 하늘과 땅 사이에 사람이 선다.',
};

/* ═══ 훈민정음 제자해(制字解) ═══
   오음(五音)은 EL 인덱스와 그대로 맞물린다
   0牙木 · 1舌火 · 2脣土 · 3齒金 · 4喉水. JAMO의 stroke 값이 가획 횟수다 */
export const IRR = { 'ㄹ': ['半舌音', '반혓소리'] };

export function jejaText(g) {
  const [el, stroke, tense] = JAMO[g] || [4, 0, 0];
  const irr = IRR[g];
  return {
    sound: irr ? irr[0] : EL[el].sound,
    soundKo: irr ? irr[1] : EL[el].soundKo,
    rule: irr ? '異體字' : tense ? '各自竝書' : stroke ? '加畫字' : '象形 基本字',
    ruleKo: irr ? '꼴을 달리 한 글자' : tense ? '나란히 써서 된소리를 이룸'
      : stroke ? `기본자에 획을 ${stroke}번 더함` : EL[el].shapeKo,
  };
}

/* 중성 제자 — 기본자 ㆍㅡㅣ · 초출 ㅗㅏㅜㅓ · 재출 ㅛㅑㅠㅕ · 나머지 합용 */
export const VBASE = new Set(['ㅡ', 'ㅣ']);
export const VFIRST = new Set(['ㅗ', 'ㅏ', 'ㅜ', 'ㅓ']);
export const VSECOND = new Set(['ㅛ', 'ㅑ', 'ㅠ', 'ㅕ']);

/* ═══ 방향 뒤집기 규칙 ═══ */
export const FLIP_TWICE = new Set(['ㅂ', 'ㅍ', 'ㅊ', 'ㅋ']);

/* ═══ 곡선 수식 텍스트 ═══ */
export function eqText(g) {
  const C = CURVE[TWIN[g] || g];
  if (!C) return '';
  const m = C.q === 1 ? C.p : `${C.p}/${C.q}`;
  if (C.f === 'rose') return `r = cos(${C.k}t)`;
  if (C.f === 'liss') return `x = sin(${C.a}t${C.d ? ' + π/2' : ''}) , y = sin(${C.b}t)`;
  return `x = ${C.A}cos t ${C.f === 'hypo' ? '+' : '−'} ${C.B}cos(${m}t)`;
}

/* ═══ 곡선 회전 수 ═══ */
export function curveTurns(g) {
  const C = CURVE[TWIN[g] || g];
  if (!C) return 1;
  return (C.f === 'hypo' || C.f === 'epi') ? C.q : 1;
}

/* ═══════════════════════════════════════════════════════════════
   이름풀이 — 이름 한 낱말의 음양·오행 집계와 처방
   초성·종성은 오행을, 중성은 음양을 센다. 없는 기운이 곧 처방이 된다
═══════════════════════════════════════════════════════════════ */

/* 성정 — conn은 이어 가는 꼴, adn은 '성격이다'를 받는 관형형 */
export const EL_TRAIT = [
  { conn: '곧게 뻗어 나아가고', adn: '어질고 너그러운' },
  { conn: '열정적이나', adn: '밝고 뜨거운' },
  { conn: '두루 품어 유연하며', adn: '두텁고 미더운' },
  { conn: '맺고 끊음이 분명하고', adn: '굳세고 의로운' },
  { conn: '깊이 스며들 듯', adn: '생각이 깊은' },
];

/* 오방색 — 표기용(오행 인덱스 순) */
export const OHBANG_KO = ['푸른색', '붉은색', '누런색', '흰색', '검은색'];
export const WEAR_KO = ['푸른빛', '붉은빛', '누런빛', '흰빛', '검은빛'];

/* 성씨 — 흔한 순. 초성의 오행으로 갈라 쓴다 */
export const SURNAMES = [
  '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송',
  '전', '홍', '고', '문', '손', '양', '배', '백', '허', '유', '남', '심', '노', '하', '곽', '성', '차', '주',
  '우', '구', '민', '나', '진', '지', '채', '원', '천', '방', '공', '현', '함', '변', '염', '여', '추', '도',
  '소', '석', '선', '설', '마', '길', '연', '위', '표', '명', '기', '금', '류',
];
export function surnamesOf(el) {
  return SURNAMES.filter(s => {
    const d = decompose(s);
    return d && (JAMO[d.onset] || [4])[0] === el;
  });
}

/* 이름 한 낱말 → 집계 · 성정 · 처방 */
export function nameReading(name) {
  const el = [0, 0, 0, 0, 0];
  let yang = 0, yin = 0, mid = 0;
  for (const ch of name) {
    const d = decompose(ch);
    if (!d) continue;
    el[(JAMO[d.onset] || [4])[0]]++;
    if (d.coda) (CODA_PARTS[d.coda] || [d.coda]).forEach(g => el[(JAMO[g] || [4])[0]]++);
    if (YANG.has(d.vowel)) yang++;
    else if (YIN.has(d.vowel)) yin++;
    else mid++;
  }
  if (!el.some(n => n)) return null;

  /* 성정 — 기운이 많은 차례로 셋까지. 마지막만 관형형으로 받아 맺는다 */
  const order = el.map((n, i) => [n, i]).filter(([n]) => n > 0)
    .sort((a, b) => b[0] - a[0] || a[1] - b[1]).map(([, i]) => i);
  const top = order.slice(0, 3);
  const traits = top.map((i, k) => (k === top.length - 1 ? EL_TRAIT[i].adn : EL_TRAIT[i].conn));
  traits.push('성격이다');

  /* 처방 — 없는 기운, 다 있으면 가장 옅은 기운. 같으면 상생 차례(木火土金水)가 앞선다 */
  let lack = 0;
  for (let i = 1; i < 5; i++) if (el[i] < el[lack]) lack = i;
  const E = EL[lack];
  return {
    name, el, yang, yin, mid, traits, lack,
    lackLine: `${E.h} ${E.name}의 기운이 ${el[lack] === 0 ? '없으니' : '가장 옅으니'}`,
    advice: [
      /* 土는 방위가 '가운데'라 '쪽'을 붙이면 말이 어색하다 */
      E.dirKo === '가운데' ? '한가운데가 길하며' : `${E.dirKo}쪽이 길하며`,
      `${WEAR_KO[lack]} 옷이 이롭고`,
      `${surnamesOf(lack)[0]}씨 성이 귀인이다`,
    ],
  };
}
