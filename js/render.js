// רנדרר WebGPU (עם נפילה אוטומטית ל-WebGL2), תאורה, צללים ו-AO
import * as THREE from 'three';
import { pass, mrt, output, normalView, vec4, uniform, uv, smoothstep, float } from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';

export async function createRenderer(container, A, quality) {
  const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: 'high-performance' });
  await renderer.init();
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 2 : 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#c9d9e4');
  scene.fog = new THREE.Fog('#d6dfe2', 45, 120);
  if (A.hdri) {
    scene.environment = A.hdri;
    scene.environmentIntensity = 0.55;
    scene.background = A.hdri;
    scene.backgroundBlurriness = 0.15;
  }

  // שמש של אחר הצהריים – צללים ארוכים וחמים
  const sun = new THREE.DirectionalLight('#fff0dc', 3.0);
  sun.position.set(-22, 24, 16);
  sun.castShadow = true;
  const sm = quality === 'high' ? 4096 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 34, bottom: -34, near: 1, far: 110 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  scene.add(sun);
  scene.add(sun.target);
  const hemi = new THREE.HemisphereLight('#cfe2f3', '#8a7558', 0.45);
  scene.add(hemi);

  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.5, 400);

  // פוסט-פרוססינג: AO + וינייטה
  let post = null;
  if (quality !== 'low') {
    try {
      post = new THREE.PostProcessing(renderer);
      const scenePass = pass(scene, camera);
      scenePass.setMRT(mrt({ output, normal: normalView }));
      const color = scenePass.getTextureNode('output');
      const depth = scenePass.getTextureNode('depth');
      const normal = scenePass.getTextureNode('normal');
      const aoPass = ao(depth, normal, camera);
      aoPass.resolutionScale = quality === 'high' ? 0.75 : 0.5;
      aoPass.radius.value = 0.6;
      aoPass.thickness.value = 1.2;
      const aoTex = aoPass.getTextureNode();
      const d = uv().sub(0.5).length();
      const vig = float(1).sub(smoothstep(0.45, 0.95, d).mul(0.35));
      post.outputNode = vec4(color.rgb.mul(aoTex.r).mul(vig), color.a);
    } catch (e) {
      console.warn('post disabled', e);
      post = null;
    }
  }

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });

  const backend = renderer.backend && renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2';
  return {
    renderer, scene, camera, sun, backend,
    render() { if (post) post.render(); else renderer.render(scene, camera); },
  };
}
