// טעינת טקסטורות מצולמות (Poly Haven, CC0), מודלים ו-HDRI
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const manager = new THREE.LoadingManager();
const texLoader = new THREE.TextureLoader(manager);
const gltfLoader = new GLTFLoader(manager);
const hdrLoader = new HDRLoader(manager);

export function onProgress(cb) {
  manager.onProgress = (url, loaded, total) => cb(loaded / total);
}

const PBR = ['worn_asphalt', 'white_rough_plaster', 'concrete_tiles', 'white_sandstone_bricks', 'dry_ground_01', 'rusty_metal_02', 'painted_metal_shutter'];
export const KID_MODELS = ['Casual_Male', 'Casual2_Male', 'Casual3_Male', 'Casual_Female', 'Casual2_Female', 'Casual3_Female', 'Worker_Male', 'Casual_Bald'];
const MODELS = ['covered_car', 'dirty_football', 'plastic_monobloc_chair_01', 'street_lamp_01', 'painted_wooden_bench'];

// אספלט ומרצפות ישראליים הם אפורים – מורידים את הגוון החום מהצילום
const GRAY = { worn_asphalt: 'grayscale(1) brightness(1.9) contrast(0.8)', concrete_tiles: 'grayscale(0.9) brightness(1.15)' };
function desaturate(tex, filter) {
  const img = tex.image;
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.filter = filter;
  g.drawImage(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function loadTex(url, srgb) {
  return new Promise((res) => {
    texLoader.load(url, (t) => {
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      res(t);
    }, undefined, () => res(null));
  });
}

export async function loadAll() {
  const A = { pbr: {}, models: {}, kids: {}, hdri: null };
  const jobs = [];
  for (const n of PBR) {
    jobs.push((async () => {
      const [map, normalMap, arm] = await Promise.all([
        loadTex(`assets/tex/${n}_diff.jpg`, true),
        loadTex(`assets/tex/${n}_nor.jpg`, false),
        loadTex(`assets/tex/${n}_arm.jpg`, false),
      ]);
      A.pbr[n] = { map: GRAY[n] && map ? desaturate(map, GRAY[n]) : map, normalMap, roughnessMap: arm };
    })());
  }
  for (const n of MODELS) {
    jobs.push(new Promise((res) => {
      gltfLoader.load(`assets/models/${n}/${n}.gltf`, (g) => {
        g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        A.models[n] = g.scene; res();
      }, undefined, () => res());
    }));
  }
  // דמויות ילדים מצוירות עם אנימציות (Quaternius, CC0) – GLB מקודד ב-JSON
  for (const n of KID_MODELS) {
    jobs.push((async () => {
      try {
        const g = await gltfLoader.loadAsync(`assets/kids/${n}.glb`);
        g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
        A.kids[n] = { scene: g.scene, animations: g.animations };
      } catch (e) { console.warn('kid', n, e); }
    })());
  }
  // שמיים (HDR מקודד ב-JSON כדי שכל שרת יגיש אותו)
  jobs.push((async () => {
    try {
      const buf = await (await fetch('assets/hdri/sky_1k.hdr')).arrayBuffer();
      const d = hdrLoader.parse(buf);
      const t = new THREE.DataTexture(d.data, d.width, d.height);
      t.type = d.type; t.colorSpace = THREE.LinearSRGBColorSpace; t.flipY = true;
      t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
      t.mapping = THREE.EquirectangularReflectionMapping;
      A.hdri = t;
    } catch (e) { console.warn('sky', e); }
  })());
  await Promise.all(jobs);
  return A;
}

// חומר PBR עם חזרה לפי מטרים
export function pbrMaterial(A, name, opts = {}) {
  const set = A.pbr[name];
  const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, ...opts });
  if (set && set.map) {
    m.map = set.map;
    m.normalMap = set.normalMap;
    m.roughnessMap = set.roughnessMap;
    m.metalnessMap = opts.metalness ? set.roughnessMap : null;
    if (opts.normalScale) m.normalScale = new THREE.Vector2(opts.normalScale, opts.normalScale);
  }
  delete m.userData.normalScale;
  return m;
}

// הגדלת מודל לגודל רצוי (לפי ממד מקסימלי או גובה)
export function fitModel(obj, { height, maxDim }) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const s = height ? height / size.y : maxDim / Math.max(size.x, size.y, size.z);
  obj.scale.multiplyScalar(s);
  const box2 = new THREE.Box3().setFromObject(obj);
  const c = box2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= box2.min.y;
  const wrap = new THREE.Group();
  wrap.add(obj);
  return wrap;
}
