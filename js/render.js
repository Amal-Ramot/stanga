// רנדרר WebGPU (עם נפילה אוטומטית ל-WebGL2), תאורה, צללים ו-AO
import * as THREE from 'three';
import { pass, mrt, output, normalView, vec3, vec4, uv, smoothstep, float, saturation, renderOutput } from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

// בדיקה אם הדפדפן מסוגל בכלל לצייר תלת-ממד
export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (gl) { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } // לא להשאיר הקשר פתוח
    return !!gl;
  } catch { return false; }
}

// ניסיון ליצור רנדרר בכמה דרכים – ממהיר לבטוח
async function makeRenderer() {
  const attempts = [
    { antialias: true, powerPreference: 'high-performance' },               // WebGPU, ואם אין – WebGL2
    { antialias: false, forceWebGL: true },                                  // WebGL2 בלבד, בלי דרישות
    { antialias: false, forceWebGL: true, powerPreference: 'low-power' },    // כרטיס מסך חלש / מובנה
  ];
  let lastErr;
  for (const opts of attempts) {
    let r;
    try {
      r = new THREE.WebGPURenderer(opts);
      await r.init();
      return r;
    } catch (e) {
      lastErr = e;
      try { r && r.dispose(); } catch {}
      try { r && r.domElement && r.domElement.remove(); } catch {}
    }
  }
  const err = new Error('NO_3D');
  err.cause = lastErr;
  throw err;
}

export async function createRenderer(container, A, quality) {
  if (!webglAvailable() && !navigator.gpu) { const e = new Error('NO_3D'); throw e; }
  const renderer = await makeRenderer();
  renderer.domElement.addEventListener('webglcontextlost', (ev) => {
    ev.preventDefault();
    const m = document.getElementById('msg');
    if (m) { m.textContent = 'הגרפיקה נעצרה (כרטיס המסך התאפס). מרעננים...'; m.classList.add('show'); }
    setTimeout(() => location.reload(), 1500);
  });
  renderer.setPixelRatio(1);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#c9d9e4');
  scene.fog = new THREE.Fog('#e3d6c2', 40, 115); // אובך חמים של שעת בין ערביים
  if (A.hdri) {
    scene.environment = A.hdri;
    scene.environmentIntensity = 0.75;
    scene.background = A.hdri;
    scene.backgroundBlurriness = 0.15;
  }

  // "שעת הזהב" – שמש נמוכה מהמערב, אור כתום וצללים ארוכים
  const SUN_OFFSET = new THREE.Vector3(-24, 22, 15);
  const sun = new THREE.DirectionalLight('#ffdcae', 3.6);
  sun.position.copy(SUN_OFFSET);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality === 'low' ? 1024 : 2048, quality === 'low' ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 36, bottom: -36, near: 1, far: 120 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  scene.add(sun);
  scene.add(sun.target);
  const hemi = new THREE.HemisphereLight('#c4d8ee', '#9a7a56', 0.75);
  scene.add(hemi);

  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.5, 400);

  // פוסט-פרוססינג קולנועי: הצללה סביבתית (AO), זוהר (Bloom), תיקון צבע, וינייטה והחלקת קצוות (FXAA)
  let post = null, postTried = false;
  function buildPost() {
    postTried = true;
    try {
      post = new THREE.PostProcessing(renderer);
      post.outputColorTransform = false;
      // MSAA – קצוות חלקים בלי לטשטש את התמונה
      const scenePass = pass(scene, camera, { samples: 4 });
      scenePass.setMRT(mrt({ output, normal: normalView }));
      const color = scenePass.getTextureNode('output');
      const depth = scenePass.getTextureNode('depth');
      const normal = scenePass.getTextureNode('normal');
      const aoPass = ao(depth, normal, camera);
      aoPass.resolutionScale = 0.5;
      aoPass.radius.value = 0.6;
      aoPass.thickness.value = 1.2;
      const lit = color.rgb.mul(aoPass.getTextureNode().r);
      // זוהר עדין על אזורים מוארים (שמש על טיח לבן, דודי שמש)
      const glow = bloom(vec4(lit, 1), 0.1, 0.15, 0.92); // רק על הנקודות הבהירות ביותר, בלי ערפול
      // מיפוי טונים (ACES) + sRGB, ואחריו תיקון צבע בסגנון שקיעה
      const toned = renderOutput(vec4(lit.add(glow.rgb), 1));
      let c = toned.rgb;
      const lum = c.dot(vec3(0.2126, 0.7152, 0.0722));
      c = c.mul(vec3(0.97, 0.99, 1.04).mix(vec3(1.04, 1.0, 0.93), smoothstep(0.15, 0.75, lum)));
      c = saturation(c, 1.1);
      const d = uv().sub(0.5).length();
      c = c.mul(float(1).sub(smoothstep(0.55, 1.0, d).mul(0.22)));
      const graded = vec4(c, 1);
      post.outputNode = graded;
    } catch (e) {
      console.warn('post disabled', e);
      post = null;
    }
  }

  // רמות גרפיקה – המשחק בוחר לבד לפי מהירות המכשיר
  //  high:   הצללה סביבתית + זוהר + תיקון צבע, רזולוציה עד ×1.5, צללים 2048
  //  medium: בלי אפקטים, רזולוציה ×1, צללים 2048
  //  low:    רזולוציה ×0.75, צללים 1024 – רץ חלק גם על מחשבים וטלפונים חלשים
  let level = quality;
  // גודל מפת הצללים נקבע פעם אחת (החלפה תוך כדי ריצה שוברת חומרים שקופים כמו עלים ועשב)
  function setShadow(n, radius) { sun.shadow.radius = radius; }
  function setQuality(l) {
    level = l;
    if (l === 'high') {
      if (!postTried) buildPost();
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      setShadow(2048, 3);
    } else if (l === 'medium') {
      renderer.setPixelRatio(1);
      setShadow(2048, 2);
    } else {
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1) * 0.75);
      setShadow(1024, 1);
    }
    renderer.setSize(innerWidth, innerHeight);
  }
  setQuality(level);

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });

  const backend = renderer.backend && renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2';
  return {
    renderer, scene, camera, sun, backend, SUN_OFFSET, setQuality,
    get level() { return level; },
    render() { if (post && level === 'high') post.render(); else renderer.render(scene, camera); },
  };
}
