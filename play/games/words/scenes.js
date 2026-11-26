// תסריטים: איך כל סיפור "קורה" בשכונה אחרי שמשלימים אותו.
// כל תסריט מקבל T (ראו theater.js). T.beat(i, ...) מציג את פסקה i של הסיפור ומשחק אותה.
// המפתח הוא ה-id של הסיפור (stories.js / stories-a.js).
import * as THREE from 'three';
import { PROPS, addSplash } from './theater.js';

// פס מבריק (שביל של חילזון)
function THREE_PLANE(w, h) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: '#dfe8ee', roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.6 })); m.rotation.x = -Math.PI / 2; return m; }
function C_shake() {}
function C_kick(T) { T.music && 0; }

// ---------- דמויות השכונה ----------
const AVI = { model: 'Casual_Male', shirt: '#7fb2e0', pants: '#2f4a73', skin: '#e2b08a', hair: '#2a1a10' };
const YANIV = { model: 'Casual2_Male', shirt: '#e8e4da', pants: '#4a4d55', skin: '#c48e62', hair: '#140c07' };
const NOA = { model: 'Casual_Female', shirt: '#f29bb8', pants: '#3c5a86', skin: '#f0c9a8', hair: '#6b3e1f' };
const SASHA = { model: 'Casual3_Male', shirt: '#7fbf7a', pants: '#3a3a3a', skin: '#f3d2b5', hair: '#e0c27a' };
const MOTI = { model: 'Casual_Bald', shirt: '#9fc2df', pants: '#3a5a86', skin: '#d9a27a', hair: '#2a1a10' };
const DANA = { model: 'Casual2_Female', shirt: '#ffd166', pants: '#2f3f66', skin: '#e8bb94', hair: '#b8862e' };
const MOSHE = { model: 'Worker_Male', shirt: '#9ad1a0', pants: '#4a4a4a', skin: '#a8714a', hair: '#0f0905' };
const KID_SMALL = { model: 'Casual2_Male', shirt: '#ffd166', pants: '#3a5a86', skin: '#e8bb94', hair: '#3b2414', height: 1.12 };
const SISTER = { model: 'Casual2_Female', shirt: '#c98bd9', pants: '#5a4a6a', skin: '#f0c9a8', hair: '#6b3e1f', height: 1.1 };
// מבוגרים – אותן דמויות, גבוהות יותר ובבגדים של מבוגרים
const GRANDMA = { model: 'Casual_Female', shirt: '#8e6bb8', pants: '#5a4a6a', skin: '#e9c3a5', hair: '#d9d6d0', height: 1.62 };
const GRANDPA = { model: 'Casual_Bald', shirt: '#c9b48a', pants: '#5a5246', skin: '#e2b08a', hair: '#d9d6d0', height: 1.72 };
const MOM = { model: 'Casual3_Female', shirt: '#e07a5f', pants: '#3d405b', skin: '#e8bb94', hair: '#3b2414', height: 1.66 };
const WOMAN = { model: 'Casual2_Female', shirt: '#81b29a', pants: '#3d405b', skin: '#d9a27a', hair: '#1c1008', height: 1.66 };
const MAN = { model: 'Worker_Male', shirt: '#e6c34a', pants: '#4a4a4a', skin: '#c48e62', hair: '#140c07', height: 1.76 };
const SELLER = { model: 'Casual2_Male', shirt: '#ffffff', pants: '#3a3a3a', skin: '#c48e62', hair: '#2a1a10', height: 1.74 };

const W = (x, z) => [x, z];

export const SCENES = {
  // ===================== כיתה ג' =====================

  // הכדור שנפל לגינה
  async garden(T) {
    const GX = -10.6, GZ = -6.2;
    T.add(PROPS.garden(GX, GZ));
    const avi = T.actor('אבי', { ...AVI, x: -2.6, z: 1.6, facing: 0 });
    const yaniv = T.actor('יניב', { ...YANIV, x: 2.6, z: 1.2, facing: Math.PI });
    const rachel = T.actor('סבתא רחל', { ...GRANDMA, x: -15.4, z: -7.6, facing: 0 });
    T.cam([0, 6.5, 11], [-1, 0.5, 0]);
    await T.beat(0, async () => {
      for (let i = 0; i < 2; i++) {
        T.anim(avi, 'kick'); await T.kick(-2.3, 1.6, 2.3, 1.2, 0.3, 0.8);
        T.anim(yaniv, 'kick'); await T.kick(2.3, 1.2, -2.3, 1.6, 0.3, 0.8);
      }
      T.anim(avi, 'kick'); await T.kick(-2.3, 1.6, 2.3, 1.2, 0.3, 0.8);
      T.face(yaniv, GX, GZ); await T.wait(0.3);
      T.anim(yaniv, 'lob');
      T.cam([-4.5, 4.5, 3.5], [-8.5, 0.5, -4.5]);
      await T.kick(2.3, 1.2, GX + 0.4, GZ - 0.2, 4.5, 1.6);
    });
    await T.beat(1, async () => {
      T.face(avi, GX, GZ); T.anim(avi, 'sad'); T.anim(yaniv, 'sad');
      T.cam([-1, 3.2, 6], [-1.5, 1, 0]);
      await T.wait(0.6);
      T.say(avi, 'עכשיו היא תכעס עלינו...', 3);
    });
    const tray = T.add(PROPS.tray());
    tray.visible = false;
    await T.beat(2, async () => {
      T.cam([-8, 4, 2], [-11, 0.8, -5.5]);
      await T.walk(rachel, GX - 0.6, GZ - 0.2, 1.4);
      T.holdBall(rachel); tray.visible = true; T.hold(tray, rachel);
      T.walk(avi, -5.2, -1.4, 1.6); T.walk(yaniv, -4.2, -1.9, 1.8);
      T.cam([-3, 3.4, 4.5], [-6, 1, -2.2]);
      await T.walk(rachel, -6.8, -2.6, 1.3);
      T.face(rachel, -4.7, -1.6); T.face(avi, -6.8, -2.6); T.face(yaniv, -6.8, -2.6);
    });
    await T.beat(3, async () => {
      T.say(rachel, 'אני לא כועסת 😊', 2.4); await T.wait(2.6);
      T.say(rachel, 'אולי תשחקו בצד השני של המגרש?', 3.4);
    });
    await T.beat(4, async () => {
      T.say(avi, 'תודה סבתא רחל!', 2.4); T.say(yaniv, 'תודה!', 2.4);
      T.anim(avi, 'cheer'); T.anim(yaniv, 'cheer');
      await T.wait(2.4);
      T.remove(tray); T.dropBall(-6.2, -2);
      const sign = T.add(PROPS.sign('זהירות!\nהגינה של סבתא רחל'));
      sign.position.set(GX, 0.85, GZ + 1.42);
      T.walk(rachel, -15.4, -7.6, 1.3);
      T.cam([-8.5, 2.2, -1], [GX, 0.8, GZ + 1.4]);
      await T.wait(3);
      T.walk(avi, 6, 1.6, 2.4); T.walk(yaniv, 10, 1.2, 2.4);
      T.cam([7, 6, 11], [7.5, 0.5, 0]);
      await T.kick(-6.2, -2, 6.3, 1.6, 0.6, 2.4);
      T.face(avi, 10, 1.2); T.face(yaniv, 6, 1.6);
      T.anim(avi, 'kick'); await T.kick(6.3, 1.6, 9.7, 1.2, 0.3, 0.7);
      T.say(yaniv, 'כאן העגבניות בטוחות!', 2.4);
    });
  },

  // החתול על הגג
  async cat(T) {
    const RX = -9, RZ = -8.6, RH = 2.6;
    const roof = T.add(PROPS.roof(3.4, RH, 2.2)); roof.position.set(RX, 0, RZ);
    const cat = T.add(PROPS.cat()); cat.position.set(RX + 0.6, RH, RZ + 0.9);
    const noa = T.actor('נועה', { ...NOA, x: -4, z: 0.5 });
    const avi = T.actor('אבי', { ...AVI, x: 2, z: 2 });
    const yaniv = T.actor('יניב', { ...YANIV, x: 3, z: 1 });
    const shimon = T.actor('שמעון', { ...MAN, x: 12, z: -6 });
    T.cam([-4.5, 2.6, 1.5], [-8.5, 1.8, -7.5]);
    await T.beat(0, async () => {
      await T.walk(noa, -6.5, -4.6, 1.6);
      T.face(noa, RX, RZ); T.say(noa, 'מיאו? 👀', 2);
    });
    await T.beat(1, async () => {
      T.say(noa, 'הוא לא יודע איך לרדת!', 2.6);
      T.walk(avi, -7.6, -4.3, 2.6); await T.walk(yaniv, -5.4, -5.4, 2.6);
      T.cam([-3.5, 3, 0.5], [-7.5, 1.4, -6.5]);
      await T.walk(yaniv, RX + 1.6, RZ + 1.3, 2);
      T.say(yaniv, 'אני אטפס!', 1.8); await T.wait(1.6);
      T.face(noa, yaniv.pos.x, yaniv.pos.z); T.say(noa, 'זה מסוכן! צריך לקרוא למבוגר', 2.8);
      await T.wait(1.4); T.anim(yaniv, 'sad'); await T.walk(yaniv, -5.6, -5.2, 1.5);
    });
    const ladder = T.add(PROPS.ladder(2.9)); ladder.visible = false;
    await T.beat(2, async () => {
      T.cam([-3, 3.4, 1.2], [-8.5, 1.4, -6.5]);
      await T.walk(shimon, RX + 0.6, RZ + 1.7, 2.2);
      ladder.visible = true; ladder.position.set(RX + 0.6, 0, RZ + 1.45); ladder.rotation.x = -0.18;
      T.face(shimon, RX + 0.6, RZ);
      await T.tween(shimon.root, { y: 1.1 }, 1); shimon.pos.y = 1.1;
      await T.tween(cat, { x: RX - 1.3, z: RZ - 0.7 }, 0.9);
      T.say(shimon, 'הוא ברח לפינה...', 2.4);
      await T.wait(1.2); await T.tween(shimon.root, { y: 0 }, 0.9); shimon.pos.y = 0;
      await T.walk(shimon, RX + 2.2, RZ + 2.4, 1.6);
    });
    const can = T.add(PROPS.can()); can.visible = false;
    await T.beat(3, async () => {
      await T.walk(noa, -12, -3, 3); T.hold(can, noa); can.visible = true; can.userData.holdY = 1;
      await T.walk(noa, RX + 1.4, RZ + 2.2, 3);
      T.say(noa, 'הנה טונה!', 1.6); T.remove(can); T.add(can); can.position.set(RX + 0.6, RH - 0.1, RZ + 1.2);
      T.say(avi, 'שששש...', 2); T.say(yaniv, 'שששש...', 2);
      T.cam([-6.2, 2.6, -3.5], [RX + 0.2, 2, RZ + 0.6]);
    });
    await T.beat(4, async () => {
      await T.tween(cat, { x: RX + 0.6, z: RZ + 1 }, 1.8);
      await T.wait(1);
      can.visible = false;
      await T.tween(cat, { y: 0.05, z: RZ + 1.9 }, 1.8);
      await T.tween(cat, { x: noa.pos.x - 0.3, z: noa.pos.z - 0.2 }, 1);
      T.anim(avi, 'cheer'); T.anim(yaniv, 'cheer'); T.anim(noa, 'cheer');
      T.say(noa, 'מעכשיו קוראים לך טונה! 🐱', 3);
      T.cam([-5.5, 2, 0.5], [-8, 0.6, -6]);
    });
  },

  // גשם ראשון ביום ההולדת
  async birthday(T) {
    const avi = T.actor('אבי', { ...AVI, x: -1, z: 2 });
    const mom = T.actor('אמא', { ...MOM, x: 1.2, z: 2.2, facing: Math.PI });
    const kids = [T.actor('נועה', { ...NOA, x: -5, z: -2 }), T.actor('יניב', { ...YANIV, x: 4, z: -2.5 }), T.actor('סשה', { ...SASHA, x: 6, z: 0 })];
    const grandpa = T.actor('סבא', { ...GRANDPA, x: 14, z: 7.5 });
    T.cam([0, 3.5, 8], [0, 1, 1]);
    await T.beat(0, async () => { T.say(avi, 'עוד מעט יום ההולדת שלי! 🎉', 3); T.anim(avi, 'cheer'); });
    await T.beat(1, async () => {
      T.rain(true); T.anim(avi, 'sad');
      await T.wait(1.2); T.say(avi, 'המסיבה התקלקלה...', 3);
    });
    await T.beat(2, async () => {
      T.face(mom, avi.pos.x, avi.pos.z); T.say(mom, 'אולי לא. יש לי רעיון!', 3);
      await T.wait(2);
      T.cam([10, 4, 9], [16, 1, 3.5]);
      T.walk(mom, 15.4, 4.6, 2); await T.walk(avi, 15, 3, 2.2);
    });
    let balloons, mat;
    await T.beat(3, async () => {
      T.walk(kids[0], 14.2, 2.2, 3); T.walk(kids[1], 15.6, 1.6, 3); await T.walk(kids[2], 13.6, 4, 3);
      balloons = T.add(PROPS.balloons()); balloons.position.set(16.8, 0, 3.5);
      mat = T.add(PROPS.mat()); mat.position.set(14.6, 0, 3); mat.rotation.y = 0.2;
      T.say(kids[0], 'בלונים!', 1.6);
      await T.walk(grandpa, 15.8, 4.6, 1.4); T.say(grandpa, 'הבאתי פנס 🔦', 2.2);
    });
    const cake = T.add(PROPS.cake(9)); cake.position.set(14.6, 0.05, 3);
    await T.beat(4, async () => {
      for (const k of [avi, ...kids]) T.face(k, 14.6, 3);
      T.say(kids[1], 'ארץ עיר! מתחילים באות ב׳', 2.6);
      await T.wait(2.6);
      T.night(true); T.lampAt(14.6, 1.6, 3);
      T.cam([12.3, 1.8, 5.6], [14.6, 0.6, 3]);
      await T.wait(1.6);
      T.say(avi, 'פוווו! 🎂', 1.6);
      for (const f of cake.userData.flames) f.visible = false;
      for (const k of [avi, ...kids]) T.anim(k, 'cheer');
    });
    await T.beat(5, async () => {
      T.night(false); T.rain(false);
      T.cam([13, 2.2, 6], [14.8, 1, 3]);
      T.face(avi, mom.pos.x, mom.pos.z);
      T.say(avi, 'זה היה יום ההולדת הכי טוב שהיה לי!', 3.4);
    });
  },

  // לאקי חוזר הביתה
  async lucky(T) {
    const board = T.add(PROPS.sign('אבד כלב!\nחום, קולר אדום\nעונה לשם לאקי', '#fff8dc', '#b02020', 1.5, 1)); board.position.set(-6.5, 1.5, -8.6);
    const stand = T.add(PROPS.stand('מכולת')); stand.position.set(-2.2, 0, -8);
    const dog = T.add(PROPS.dog()); dog.position.set(0.8, 0, -6.4); dog.rotation.y = -2.2;
    const yaniv = T.actor('יניב', { ...YANIV, x: 9, z: 1 });
    const seller = T.actor('אברהם', { ...SELLER, x: -2.2, z: -8.8, facing: Math.PI / 2 });
    const rina = T.actor('רינה', { ...WOMAN, x: 12, z: -14 });
    T.cam([-4.5, 2.2, -4], [-6.5, 1.4, -8.6]);
    await T.beat(0);
    await T.beat(1, async () => {
      T.cam([4, 3, 1.5], [0.5, 0.6, -5.5]);
      await T.walk(yaniv, 2.6, -4.6, 2);
      T.face(yaniv, 0.8, -6.4); T.say(yaniv, 'לאקי?', 1.8);
      for (let i = 0; i < 8; i++) { dog.rotation.y = -2.2 + Math.sin(i) * 0.15; dog.getObjectByName('tail').rotation.z = Math.sin(i * 2) * 0.8; await T.wait(0.2); }
    });
    await T.beat(2, async () => {
      T.cam([1.5, 2.6, -2.5], [-1.5, 0.8, -7]);
      T.say(yaniv, 'אברהם, אפשר עזרה?', 2.4);
      await T.walk(yaniv, -0.6, -6.6, 1.6);
      await T.tween(dog, { x: -1.4, z: -7.1 }, 1.2);
      const bowl = T.add(PROPS.bucket()); bowl.scale.setScalar(0.7); bowl.position.set(-1.6, 0, -6.8);
      T.say(seller, 'הנה מים לכלב 💧', 2.4);
    });
    await T.beat(3, async () => {
      T.cam([-14.5, 2.4, -4.5], [-17.6, 1.2, -7.5]);
      await T.walk(yaniv, -16.8, -7.3, 2.6);
      T.face(yaniv, -18.4, -7.5);
      T.say(yaniv, 'הלו? מצאתי את לאקי! 📞', 2.8); await T.wait(2.6);
      T.cam([4, 3, -6], [9, 1, -11]);
      T.say(rina, 'אני באה מיד!', 2.4);
    });
    await T.beat(4, async () => {
      T.cam([2, 3, -1], [-1, 0.8, -6]);
      T.walk(yaniv, 0.4, -5.6, 3);
      await T.walk(rina, -0.4, -5.8, 3.2);
      await T.tween(dog, { x: -0.6, z: -6.2 }, 0.6);
      T.anim(rina, 'cheer'); T.say(rina, 'לאקי! 🐶❤️', 2);
      await T.wait(2);
      T.face(rina, yaniv.pos.x, yaniv.pos.z); T.say(rina, 'קח עשרים שקלים', 2.2); await T.wait(2.2);
      T.say(yaniv, 'לא צריך. רק תשמרי עליו טוב 😊', 3);
    });
    await T.beat(5, async () => {
      T.cam([4, 4, 6], [6, 0.8, 0]);
      T.say(yaniv, 'אני מאחר לבית הספר!', 2.2);
      await T.walk(yaniv, 14, 6, 3.4);
    });
  },

  // הילד החדש מבניין 3
  async sasha(T) {
    const bench = T.add(PROPS.table(1.6, 0.45)); bench.scale.set(1, 0.6, 1); bench.position.set(-9, 0, 3);
    const sasha = T.actor('סשה', { ...SASHA, x: -9, z: 3.7, facing: 0 });
    const noa = T.actor('נועה', { ...NOA, x: 0, z: 1.5, facing: 0 });
    const avi = T.actor('אבי', { ...AVI, x: 3.5, z: 1, facing: Math.PI });
    T.cam([-4, 3.5, 8.5], [-4, 0.8, 2]);
    await T.beat(0, async () => {
      T.anim(noa, 'kick'); await T.kick(0.3, 1.5, 3.2, 1, 0.3, 0.8);
      T.anim(avi, 'kick'); await T.kick(3.2, 1, 0.3, 1.5, 0.3, 0.8);
      T.anim(sasha, 'sad');
    });
    await T.beat(1, async () => {
      T.face(noa, avi.pos.x, avi.pos.z); T.face(avi, noa.pos.x, noa.pos.z);
      T.cam([1.6, 2, 5], [1.6, 1, 1.2]);
      T.say(noa, 'אולי נזמין אותו?', 2.4); await T.wait(2.4);
      T.say(avi, 'אבל איך נדבר איתו?', 2.6);
    });
    await T.beat(2, async () => {
      T.holdBall(noa);
      T.cam([-6, 2.4, 7.5], [-8, 0.9, 3.2]);
      await T.walk(noa, -7.8, 4.3, 2);
      T.face(noa, sasha.pos.x, sasha.pos.z);
      T.say(noa, '⚽ ➡️ 🏟️ ?', 2.4); await T.wait(2);
      T.anim(sasha, 'cheer'); T.say(sasha, '😃!', 1.6);
    });
    await T.beat(3, async () => {
      T.walk(sasha, -1.2, 2.2, 2.4); T.walk(noa, 0.8, 3, 2.4); await T.walk(avi, 1.6, 0.8, 2.4);
      T.face(sasha, 0, 4); T.face(noa, sasha.pos.x, sasha.pos.z); T.face(avi, sasha.pos.x, sasha.pos.z);
      T.cam([-0.6, 1.8, 5.6], [-1, 1, 2]);
      const b = T.ball(-1.2, 2.5);
      for (let i = 1; i <= 10; i++) {
        T.anim(sasha, 'lob');
        await T.tween(b, { y: 0.9 }, 0.22); await T.tween(b, { y: 0.45 }, 0.22);
        T.say(i % 2 ? avi : noa, String(i), 0.5);
      }
      T.say(avi, 'עשר!!', 1.6); T.anim(avi, 'cheer'); T.anim(noa, 'cheer');
    });
    await T.beat(4, async () => {
      T.say(avi, 'גול!', 1.6); await T.wait(1.4);
      T.say(noa, 'תור שלי!', 1.6); await T.wait(1.4);
      T.say(sasha, 'ספסיבה! 🙂', 2);
    });
    await T.beat(5, async () => { T.anim(sasha, 'cheer'); T.anim(avi, 'cheer'); T.say(sasha, 'אני מדבר עברית!', 2.6); });
  },

  // הערב שבו כבה החשמל
  async blackout(T) {
    const kids = [T.actor('נועה', { ...NOA, x: -1, z: -11 }), T.actor('יניב', { ...YANIV, x: 4, z: -12 }), T.actor('אבי', { ...AVI, x: -6, z: -12 })];
    const grandpa = T.actor('סבא של נועה', { ...GRANDPA, x: -8, z: -14 });
    const neighbor = T.actor('שכן', { ...MAN, x: 9, z: -14 });
    T.cam([0, 6, 10], [0, 1, -3]);
    await T.beat(0, async () => { await T.wait(1.2); T.night(true); T.lampAt(0, 2, -1); });
    let melon;
    await T.beat(1, async () => {
      T.walk(kids[0], -1.2, -0.6, 1.8); T.walk(kids[1], 1.6, -1.2, 1.8); T.walk(kids[2], -2.4, -1.8, 1.8);
      await T.walk(neighbor, 2.4, -2.6, 1.6);
      for (const [x, z] of [W(-0.6, -2.2), W(0.6, -2.4), W(0, -1.6)]) { const c = T.add(PROPS.candle()); c.position.set(x, 0, z); }
      melon = T.add(PROPS.watermelon()); melon.position.set(1.4, 0, -2.6);
      T.say(neighbor, 'הבאתי אבטיח קר! 🍉', 2.6);
    });
    await T.beat(2, async () => {
      const chair = T.add(PROPS.chair(T.A)); chair.position.set(-2.4, 0, -3.4);
      await T.walk(grandpa, -2.4, -3.2, 1.3);
      T.face(grandpa, 0, 0); T.lampAt(-2.4, 1.9, -2.8);
      T.cam([-0.6, 1.8, 1.8], [-2.2, 1.2, -3]);
      T.say(grandpa, 'כשהייתי ילד, בערבים ספרנו כוכבים ✨', 3.6);
    });
    await T.beat(3, async () => {
      T.cam([0, 1.4, 3], [0, 9, -16]);
      await T.wait(1.6);
      T.say(kids[1], 'אף פעם לא ראיתי כל כך הרבה!', 3);
    });
    await T.beat(4, async () => { T.say(grandpa, 'הנה העגלה הגדולה!', 2.6); T.cam([0, 1.4, 3], [-6, 10, -16]); });
    await T.beat(5, async () => {
      T.night(false);
      T.cam([0, 3, 5], [0, 1, -1.8]);
      await T.wait(1);
      T.anim(kids[0], 'sad'); T.say(kids[0], 'אוף... דווקא היה כיף בחושך', 3);
    });
  },

  // המתנה מהקיוסק
  async kiosk(T) {
    const stand = T.add(PROPS.stand('הקיוסק של שלום', '#2f7de0')); stand.position.set(6, 0, -7);
    const shalom = T.actor('שלום', { ...SELLER, x: 6, z: -7.8, facing: Math.PI / 2 });
    const noa = T.actor('נועה', { ...NOA, x: -4, z: 2 });
    const dad = T.actor('אבא', { ...MAN, x: -5.2, z: 2.6, facing: 0 });
    const brother = T.actor('האח הקטן', { ...KID_SMALL, x: -9, z: -6 });
    T.cam([1, 3, 4], [2, 1, -3]);
    await T.beat(0, async () => {
      T.face(dad, noa.pos.x, noa.pos.z); T.say(dad, 'הנה חמישה שקלים 🪙', 2.4); await T.wait(2.2);
      T.cam([3.6, 2.2, -2.6], [6, 1.2, -6.8]);
      await T.walk(noa, 6, -5.9, 2.2);
      T.face(noa, 6, -7);
    });
    const gift = T.add(PROPS.smallBall()); gift.visible = false;
    await T.beat(1, async () => {
      T.say(noa, 'אני רוצה מתנה לאח שלי', 2.6); await T.wait(2.6);
      T.say(shalom, 'אולי כדור קטן וצבעוני?', 2.6); await T.wait(2.4);
      gift.visible = true; T.hold(gift, noa); gift.userData.holdY = 0.9;
      T.say(shalom, 'הוא ישמח מאוד 😊', 2.4); await T.wait(2);
      T.cam([-5.5, 2.4, -2.5], [-8.6, 0.8, -5.8]);
      await T.walk(noa, -8.2, -5.2, 2.4);
      T.face(noa, brother.pos.x, brother.pos.z); T.face(brother, noa.pos.x, noa.pos.z);
      T.hold(gift, brother); T.anim(brother, 'cheer'); T.say(brother, 'תודה נועה! 💛', 2.6);
    });
  },

  // מלחמת המים
  async water(T) {
    const yaniv = T.actor('יניב', { ...YANIV, x: -6, z: -9 });
    const kids = [T.actor('אבי', { ...AVI, x: -1, z: 1 }), T.actor('נועה', { ...NOA, x: 1.5, z: 2 }), T.actor('דנה', { ...SISTER, height: 1.4, x: 3, z: 0 })];
    const neighbor = T.actor('השכנה', { ...WOMAN, x: -9.5, y: 4.2, z: -13.6, facing: Math.PI / 2 });
    const bucket = T.add(PROPS.bucket()); bucket.visible = false;
    T.cam([0, 3.4, 7], [0, 0.8, -1]);
    await T.beat(0, async () => {
      bucket.visible = true; T.hold(bucket, yaniv); bucket.userData.holdY = 0.5;
      await T.walk(yaniv, -0.4, -1.2, 2.2);
      T.say(yaniv, 'מי רוצה להתקרר? 💦', 2.4);
      for (const k of kids) T.face(k, yaniv.pos.x, yaniv.pos.z);
    });
    await T.beat(1, async () => {
      const spots = [[-2, -2], [2, 1], [-1, 2.5], [3, -1.5], [0, 0]];
      for (let r = 0; r < 2; r++) for (let i = 0; i < kids.length; i++) {
        const [x, z] = spots[(i + r * 2) % spots.length];
        T.walk(kids[i], x, z, 3.4);
        addSplash(T, x, z);
        await T.wait(0.5);
      }
      T.anim(kids[0], 'sad'); T.say(kids[0], 'חחח! נפלתי על הדשא!', 2.2); await T.wait(2);
      T.cam([-6, 3, -7], [-9.5, 4, -13.6]);
      T.say(neighbor, 'היי, אל תבזבזו מים!', 3); await T.wait(2.8);
      T.cam([0, 3.4, 7], [0, 0.8, -1]);
      for (const k of [...kids, yaniv]) T.anim(k, 'sad');
      T.say(yaniv, 'צודקת... סוגרים את הברז', 2.8);
    });
  },

  // הספר שנעלם
  async library(T) {
    const book = T.add(PROPS.book()); book.visible = false;
    const sasha = T.actor('סשה', { ...SASHA, x: -8, z: 2 });
    const sister = T.actor('האחות הקטנה', { ...SISTER, x: 15, z: -6 });
    T.cam([-2, 3, 7], [-3, 1, 1]);
    await T.beat(0, async () => {
      book.visible = true; T.hold(book, sasha);
      await T.walk(sasha, -2, 1, 1.6);
      T.say(sasha, 'ספר על דינוזאורים! 🦖', 2.6);
      await T.wait(2); book.visible = false; T.remove(book);
    });
    await T.beat(1, async () => {
      T.cam([0, 5, 10], [0, 0.8, -1]);
      for (const [x, z] of [W(-6, -3), W(4, -4), W(8, 2)]) {
        await T.walk(sasha, x, z, 2.6);
        T.say(sasha, 'איפה הספר?! 😟', 1.4); await T.wait(1.2);
      }
      T.anim(sasha, 'sad');
      T.add(book); book.visible = true; T.hold(book, sister);
      T.cam([7, 2.6, 6], [9, 1, 1.6]);
      await T.walk(sister, 9.6, 1.6, 2);
      T.face(sister, sasha.pos.x, sasha.pos.z); T.face(sasha, sister.pos.x, sister.pos.z);
      T.say(sister, 'קראתי על הדינוזאורים!', 2.6); await T.wait(2.6);
      T.hold(book, sasha); T.anim(sasha, 'cheer'); T.say(sasha, 'פפפו... 😮‍💨', 2);
    });
  },

  // הרדיו של סבא
  async radio(T) {
    const table = T.add(PROPS.table()); table.position.set(-3, 0, -5);
    const radio = T.add(PROPS.radio()); radio.position.set(-3, 0.75, -5);
    const chair = T.add(PROPS.chair(T.A)); chair.position.set(-4.2, 0, -5);
    const grandpa = T.actor('סבא', { ...GRANDPA, x: -4.2, z: -4.6, facing: 0 });
    const avi = T.actor('אבי', { ...AVI, x: 4, z: 1 });
    const moti = T.actor('מוטי', { ...MOTI, x: 5, z: 2 });
    T.music(true);
    T.cam([-1.2, 2, -1.4], [-3.3, 1, -5]);
    await T.beat(0, async () => { T.say(grandpa, '♪ חדשות של הבוקר... ☕', 3); });
    await T.beat(1, async () => {
      T.music(false); await T.wait(0.6);
      T.anim(grandpa, 'sad'); T.say(grandpa, 'הרדיו שלי התקלקל...', 2.6); await T.wait(2.2);
      T.walk(avi, -2.6, -3.9, 2.6); await T.walk(moti, -1.8, -4.4, 2.6);
      T.face(avi, -3, -5); T.face(moti, -3, -5);
      T.say(avi, 'בוא נפתח אותו בזהירות', 2.4); await T.wait(2.4);
      const sp = T.add(PROPS.sparkle()); sp.position.set(-3, 1.15, -5);
      T.say(moti, 'מצאתי חוט קרוע!', 2.2); await T.wait(1.8);
      T.remove(sp);
      T.music(true);
      T.say(avi, '♪♪♪', 1.6);
      for (let i = 0; i < 4; i++) { T.anim(grandpa, 'cheer'); grandpa.facing += Math.PI / 2; await T.wait(0.7); }
      T.say(grandpa, 'אתם גאונים! 💃', 2.6);
    });
  },

  // העפיפון של דנה
  async kite(T) {
    const dana = T.actor('דנה', { ...DANA, x: -2, z: 2 });
    const avi = T.actor('אבי', { ...AVI, x: 6, z: 4 });
    const tree = T.add(PROPS.tree()); tree.position.set(9, 0, -6);
    const kite = T.add(PROPS.kite()); kite.position.set(-1.6, 1, 2.3); kite.rotation.x = -1.2;
    T.cam([-1.5, 2, 5.5], [-1.8, 0.8, 2]);
    await T.beat(0, async () => { T.say(dana, 'אדום וצהוב! 🪁', 2.4); await T.wait(1); T.anim(dana, 'cheer'); });
    await T.beat(1, async () => {
      T.cam([-2, 5, 12], [2, 3, -2]);
      kite.rotation.x = 0;
      const run = T.walk(dana, 6, 2, 2.6);
      await T.tween(kite, { x: 2, y: 7, z: -3 }, 3); await run;
      await T.tween(kite, { x: 6, y: 9, z: -5 }, 2);
      T.say(dana, 'הוא עף גבוה! 😃', 2);
      await T.wait(1.4);
      T.say(dana, 'אוי! החוט נקרע!', 2.2);
      await T.tween(kite, { x: 9, y: 3.6, z: -5.4 }, 2);
      T.cam([5, 3, 1], [8.5, 2.6, -5.5]);
      T.walk(dana, 8, -4, 2.4);
      const stick = T.add(PROPS.stick()); stick.visible = false;
      await T.walk(avi, 9.6, -4.2, 2.4);
      stick.visible = true; stick.position.set(9.4, 2, -4.6); stick.rotation.x = 0.5;
      T.say(avi, 'בזהירות...', 1.8);
      await T.tween(kite, { y: 1.2, z: -4.4 }, 2);
      T.remove(stick); T.anim(dana, 'cheer'); T.anim(avi, 'cheer'); T.say(dana, 'תודה אבי!', 2.2);
    });
  },

  // יום שישי בשוק
  async shuk(T) {
    const s1 = T.add(PROPS.stand('ירקות', '#43a047')); s1.position.set(-4, 0, -6); s1.add(PROPS.produce('#e53935'));
    const s2 = T.add(PROPS.stand('פירות', '#fb8c00')); s2.position.set(1, 0, -6); s2.add(PROPS.produce('#ff9800'));
    const s3 = T.add(PROPS.stand('פלאפל', '#8d6e63')); s3.position.set(6.5, 0, -6);
    const sel1 = T.actor('מוכר', { ...SELLER, x: -4, z: -6.8, facing: Math.PI / 2 });
    const sel2 = T.actor('מוכרת', { ...WOMAN, x: 1, z: -6.8, facing: Math.PI / 2 });
    const sel3 = T.actor('מוכר פלאפל', { ...MAN, x: 6.5, z: -6.8, facing: Math.PI / 2 });
    const noa = T.actor('נועה', { ...NOA, x: -10, z: 2 });
    const savta = T.actor('סבתא', { ...GRANDMA, x: -11, z: 2.6 });
    T.cam([-2, 4, 6], [0, 1, -4]);
    await T.beat(0, async () => {
      T.walk(savta, -4.6, -3.8, 1.6); await T.walk(noa, -3.4, -3.6, 1.6);
      T.say(sel1, 'עגבניות בזול!', 2); await T.wait(1.2); T.say(sel2, 'תפוזים מתוקים!', 2);
    });
    const basket = T.add(PROPS.basket()); basket.visible = false;
    await T.beat(1, async () => {
      await T.wait(1);
      basket.visible = true; T.hold(basket, noa); basket.userData.holdY = 0.7;
      T.say(noa, 'אוף, הסל כבד! 😅', 2.2);
      T.cam([4, 3, 0], [6, 1, -5]);
      T.walk(savta, 5.6, -4.2, 1.6); await T.walk(noa, 7, -4.4, 1.4);
      const pita = T.add(PROPS.pita()); T.hold(pita, noa); pita.userData.holdY = 1.15;
      T.say(sel3, 'פיתה חמה! 🥙', 2.2); await T.wait(2);
      T.say(noa, 'ממממ! טעים!', 2.2); T.anim(noa, 'cheer');
    });
  },

  // חילזון אחרי הגשם
  async snail(T) {
    T.rain(true);
    const yaniv = T.actor('יניב', { ...YANIV, x: -6, z: 4 });
    const snail = T.add(PROPS.snail()); snail.position.set(-1, 0.02, 1);
    const trail = T.add(THREE_PLANE(0.06, 1.2)); trail.position.set(-1, 0.07, 1.7);
    T.cam([0.6, 1.2, 3], [-0.8, 0.2, 1]);
    await T.beat(0, async () => {
      await T.wait(1.6); T.rain(false);
      T.walk(yaniv, -1.6, 2.2, 1.6);
      await T.tween(snail, { z: 0.4 }, 4);
    });
    const leaf = T.add(PROPS.leaf()); leaf.position.set(-8, 0.25, -5);
    await T.beat(1, async () => {
      T.face(yaniv, -1, 0.4); T.say(yaniv, 'מישהו עוד ידרוך עליך!', 2.4); await T.wait(2);
      T.hold(snail, yaniv); snail.userData.holdY = 0.9;
      T.cam([-3, 2.4, 1], [-6, 0.6, -3]);
      await T.walk(yaniv, -7.3, -4.2, 1.2);
      T.hold(snail, null); snail.position.set(-8, 0.32, -5);
      T.say(yaniv, 'כאן יהיה לך בטוח 🐌', 2.6); await T.wait(2.6);
      await T.walk(yaniv, -3, 1, 2.4);
      T.say(yaniv, 'למחרת...', 1.4);
      await T.walk(yaniv, -7.2, -4.2, 2.4);
      T.face(yaniv, -8, -5); T.anim(yaniv, 'cheer'); T.say(yaniv, 'הוא עדיין פה! 😊', 2.4);
    });
  },

  // האופניים האדומים
  async bike(T) {
    const avi = T.actor('אבי', { ...AVI, x: -6, z: 2, facing: 0 });
    const dad = T.actor('אבא', { ...MAN, x: 8, z: 6 });
    const mom = T.actor('אמא', { ...MOM, x: -9.5, y: 4.2, z: -13.6, facing: Math.PI / 2 });
    const bike = T.add(PROPS.bike()); T.hold(bike, avi); bike.userData.holdY = 0;
    T.cam([0, 4, 9], [0, 0.8, 0]);
    await T.beat(0, async () => {
      for (const [x, z] of [[4, 2], [5, -4], [-5, -4], [-5, 2]]) { await T.walk(avi, x, z, 3.6); T.say(avi, 'דינג דינג! 🔔', 0.9); }
    });
    await T.beat(1, async () => {
      await T.walk(avi, 1, 1, 3.6);
      T.hold(bike, null); bike.rotation.z = Math.PI / 2; bike.position.set(1.4, 0.05, 1);
      T.anim(avi, 'sad'); T.say(avi, 'אאוץ׳! הברך...', 2.2); await T.wait(2);
      T.say(avi, 'אני לא מוותר!', 2);
      await T.walk(dad, 2.2, 1.6, 2);
      T.say(dad, 'נוריד את המושב 🔧', 2.2); await T.wait(2);
      bike.rotation.z = 0; T.hold(bike, avi);
      T.cam([0, 5, 10], [0, 0.8, -1]);
      T.say(avi, 'אחרי שבוע... בלי ידיים! 🙌', 2.2);
      await T.walk(avi, 6, -2, 4);
      T.cam([-5, 3.4, -6], [-9.5, 4, -13.6]);
      T.say(mom, 'תחזיק את הכידון!', 2.8);
    });
  },

  // העוגיות של סבתא שושנה
  async cookies(T) {
    const shosh = T.actor('סבתא שושנה', { ...GRANDMA, shirt: '#d98b8b', x: -9.5, y: 4.2, z: -13.6, facing: Math.PI / 2 });
    const kids = [T.actor('אבי', { ...AVI, x: -2, z: 3 }), T.actor('נועה', { ...NOA, x: 0, z: 3.5 }), T.actor('יניב', { ...YANIV, x: 2, z: 3 })];
    const tray = T.add(PROPS.cookies()); T.hold(tray, shosh);
    T.cam([-6, 5, -5], [-9.5, 4, -13.6]);
    await T.beat(0, async () => {
      T.say(shosh, 'העוגיות מוכנות! 🍪', 2.4); await T.wait(2.2);
      T.cam([0, 2.2, 7], [0, 1, 2]);
      for (const k of kids) T.face(k, -9.5, -13);
      T.say(kids[1], 'מריחים את זה?!', 2);
    });
    await T.beat(1, async () => {
      T.cam([-5, 3, -6], [-9, 1.5, -12]);
      for (const k of kids) T.walk(k, -9.5 + Math.random(), -11.5, 3.6);
      await T.wait(2.4);
      T.say(kids[0], 'טוק טוק!', 1.4); await T.wait(1.2);
      T.say(shosh, 'רק אחרי שתשטפו ידיים!', 2.6); await T.wait(2.6);
      for (const k of kids) T.walk(k, -6 - Math.random(), -10.5, 3.6);
      T.say(kids[2], 'שוטפים! 🚰', 1.6); await T.wait(1.8);
      T.cam([-6.5, 4.4, -9], [-9.5, 4, -13.4]);
      T.say(kids[1], 'ממממ... 😋', 2); T.anim(kids[0], 'cheer');
    });
  },

  // המפתח בתעלה
  async key(T) {
    const moshe = T.actor('משה', { ...MOSHE, x: 2, z: 2 });
    const noa = T.actor('נועה', { ...NOA, x: 9, z: 3 });
    const drain = T.add(PROPS.drain()); drain.position.set(-2, 0.05, -3);
    const key = T.add(PROPS.key()); T.hold(key, moshe); key.userData.holdY = 1.05;
    T.cam([1, 2.4, 4], [-1, 0.8, -2]);
    await T.beat(0, async () => {
      await T.walk(moshe, -2, -2.2, 1.6);
      T.say(moshe, 'הדלת נעולה... יש לי מפתח 🔑', 2.6);
    });
    await T.beat(1, async () => {
      await T.wait(0.8);
      T.hold(key, null); await T.tween(key, { y: -0.4, z: -3 }, 0.6);
      T.say(moshe, 'לא! המפתח נפל!', 2);
      moshe.root.rotation.x = 0; T.anim(moshe, 'sad');
      await T.wait(1.6); T.say(moshe, 'היד שלי קצרה מדי...', 2.2); await T.wait(1.6);
      await T.walk(noa, -1.2, -2.2, 3);
      const mag = T.add(PROPS.magnet()); mag.position.set(-1.8, 0.8, -3);
      T.say(noa, 'מגנט מהמקרר! 🧲', 2.2);
      for (let i = 1; i <= 3; i++) { await T.tween(mag, { y: 0.1 }, 0.6); T.say(noa, `ניסיון ${i}`, 1); if (i === 3) key.position.set(-1.8, -0.05, -3); await T.tween(mag, { y: 0.8 }, 0.6); }
      key.position.set(-1.8, 0.7, -3);
      T.anim(moshe, 'cheer'); T.anim(noa, 'cheer'); T.say(moshe, 'הוא עלה! תודה! 🎉', 2.6);
    });
  },

  // היום הראשון בכיתה ג'
  async firstday(T) {
    const board = T.add(PROPS.chalkboard('רותי')); board.position.set(0, 1.6, -7.5);
    const desks = [[-2, -4], [0, -4], [2, -4], [-2, -2.2], [0, -2.2], [2, -2.2]];
    for (const [x, z] of desks) { const d = T.add(PROPS.table(1, 0.6)); d.position.set(x, 0, z); }
    const ruti = T.actor('המורה רותי', { ...MOM, shirt: '#5b8def', x: 1.6, z: -6.6, facing: Math.PI / 2 });
    const dana = T.actor('דנה', { ...DANA, x: -9, z: 6 });
    const others = [T.actor('אבי', { ...AVI, x: 2, z: -1.4, facing: -Math.PI / 2 }), T.actor('נועה', { ...NOA, x: -2, z: -3.2, facing: -Math.PI / 2 }), T.actor('יניב', { ...YANIV, x: 2, z: -3.2, facing: -Math.PI / 2 })];
    const bag = T.add(PROPS.book('#2f7de0')); T.hold(bag, dana);
    T.cam([-6, 2.4, 9], [-8, 1, 5]);
    await T.beat(0, async () => {
      T.anim(dana, 'cheer'); T.say(dana, 'היום הראשון בכיתה ג׳! 🎒', 2.6); await T.wait(2.4);
      T.cam([0, 4, 6], [0, 1, -3]);
      await T.walk(dana, 0, -1.4, 2.6); T.face(dana, 0, -7); T.remove(bag);
    });
    await T.beat(1, async () => {
      T.cam([0, 2.6, 3], [0, 1.4, -6]);
      T.say(ruti, 'השנה נקרא הרבה ספרים 📚', 2.8); await T.wait(2.8);
      T.anim(dana, 'lob'); T.say(dana, 'אפשר להתחיל כבר היום?', 2.6); await T.wait(2.4);
      for (const k of others) T.anim(k, 'cheer');
      T.say(others[0], 'חחח 😄', 1.4);
      T.say(ruti, 'בטח שאפשר! 😊', 2.4);
    });
  },

  // הגוזל שנפל מהקן
  async chick(T) {
    const tree = T.add(PROPS.tree()); tree.position.set(-6, 0, -5);
    const nest = T.add(PROPS.nest()); nest.position.set(-5.4, 2.8, -4.6);
    const chick = T.add(PROPS.chick()); chick.position.set(-4.6, 0.02, -3.4);
    const noa = T.actor('נועה', { ...NOA, x: 0, z: 2 });
    const shimon = T.actor('שמעון', { ...MAN, x: 10, z: 4 });
    T.cam([-2.6, 1.6, -0.4], [-4.6, 0.3, -3.4]);
    await T.beat(0, async () => {
      await T.walk(noa, -4, -2.6, 1.6);
      T.say(noa, 'גוזל קטן! 🐣', 2.2);
      for (let i = 0; i < 4; i++) { chick.rotation.y = Math.sin(i) * 0.6; await T.wait(0.4); }
    });
    await T.beat(1, async () => {
      T.cam([-1, 3, 2], [-5, 1.8, -4]);
      T.say(noa, 'הקן גבוה מדי... שמעון!', 2.4);
      await T.walk(shimon, -4.2, -3.8, 2.4);
      const ladder = T.add(PROPS.ladder(2.6)); ladder.position.set(-4.9, 0, -4.1); ladder.rotation.x = 0.12;
      T.hold(chick, shimon); chick.userData.holdY = 1.1;
      await T.tween(shimon.root, { y: 1.2 }, 1); shimon.pos.y = 1.2;
      T.hold(chick, null); chick.position.set(-5.4, 2.85, -4.6);
      await T.tween(shimon.root, { y: 0 }, 0.9); shimon.pos.y = 0;
      const bird = T.add(PROPS.chick()); bird.scale.setScalar(1.8); bird.position.set(-9, 5, -6);
      const worm = T.add(PROPS.worm()); worm.position.set(-9, 5.2, -5.8);
      T.cam([-2.4, 3.2, -1], [-5.4, 2.8, -4.6]);
      await Promise.all([T.tween(bird, { x: -5.6, y: 2.9, z: -4.4 }, 2), T.tween(worm, { x: -5.6, y: 3.15, z: -4.2 }, 2)]);
      T.anim(noa, 'cheer'); T.say(noa, 'אמא ציפור הגיעה! 👏', 2.6);
    });
  },

  // החלון השבור
  async window(T) {
    const win = T.add(PROPS.window()); win.position.set(-6, 1.6, -9.2);
    const yaniv = T.actor('יניב', { ...YANIV, x: -3, z: 1.5, facing: -Math.PI / 2 });
    const kids = [T.actor('אבי', { ...AVI, x: 1, z: 2 }), T.actor('נועה', { ...NOA, x: 2.5, z: 0.6 })];
    const cohen = T.actor('מר כהן', { ...GRANDPA, hair: '#555', x: -6, z: -10.6, facing: Math.PI / 2 });
    cohen.root.visible = false;
    T.cam([-1, 3, 6], [-4, 1.2, -3]);
    await T.beat(0, async () => {
      T.face(yaniv, -6, -9.2); T.anim(yaniv, 'lob');
      await T.kick(-3, 1, -6, -9, 2.2, 1);
      win.getObjectByName('glass').visible = false;
      T.add(PROPS.shards(-6, 0, -8.8));
      T.say(yaniv, 'אוי לא! 😱', 1.8); C_shake();
      for (const k of kids) T.walk(k, 14, 6, 4);
      await T.wait(1.2);
    });
    await T.beat(1, async () => {
      T.say(yaniv, 'אני לא בורח.', 2);
      await T.walk(yaniv, -6, -8.2, 1.6);
      cohen.root.visible = true; await T.walk(cohen, -6, -8.9, 1);
      T.cam([-4, 1.8, -5.2], [-6, 1.3, -8.6]);
      T.face(yaniv, -6, -9);
      T.say(yaniv, 'סליחה, זה אני ששברתי את החלון', 3); await T.wait(3);
      T.say(cohen, 'תודה שאמרת את האמת 🙂', 2.8); await T.wait(2.8);
      const broom = T.add(PROPS.broom()); T.hold(broom, yaniv); broom.userData.holdY = 0;
      T.say(yaniv, 'אני אעזור לנקות 🧹', 2.4); await T.wait(2);
      T.anim(cohen, 'cheer'); T.anim(yaniv, 'cheer');
    });
  },

  // המדבקה האחרונה
  async album(T) {
    const avi = T.actor('אבי', { ...AVI, x: -1, z: 1, facing: 0 });
    const sasha = T.actor('סשה', { ...SASHA, x: 1.2, z: 1, facing: Math.PI });
    const kids = [T.actor('נועה', { ...NOA, x: -4, z: -2 }), T.actor('יניב', { ...YANIV, x: 4, z: -2.5 })];
    const album = T.add(PROPS.book('#1f5fa8')); T.hold(album, avi);
    T.cam([0, 2, 4.5], [0, 1, 1]);
    await T.beat(0, async () => {
      T.say(kids[0], 'יש לי מדבקה של השוער!', 2.2); await T.wait(1.4);
      T.say(avi, 'חסרה לי רק מדבקה אחת... 😕', 2.6);
    });
    await T.beat(1, async () => {
      T.say(sasha, 'יש לי שתיים של אותו שחקן', 2.4); await T.wait(2.4);
      T.say(avi, 'אתה רוצה להחליף?', 2); await T.wait(2);
      T.say(sasha, '...כן! 🤝', 1.8); await T.wait(1.6);
      const st1 = T.add(PROPS.sign('⚽', '#fff', '#222', 0.18, 0.24)); st1.position.set(0.6, 1.2, 1); 
      await T.tween(st1, { x: -0.6 }, 0.8); T.remove(st1);
      T.say(avi, 'בזהירות...', 1.4); await T.wait(1.4);
      T.anim(avi, 'cheer'); T.say(avi, 'האלבום מלא!!! 🏆', 2.6);
      for (const k of kids) T.anim(k, 'cheer');
    });
  },

  // הקפיצה הגדולה
  async pool(T) {
    const pool = T.add(PROPS.pool()); pool.position.set(0, 0, -3);
    const dana = T.actor('דנה', { ...DANA, x: 3, z: 1 });
    const guard = T.actor('המציל', { ...MAN, shirt: '#e53935', x: -6, z: 1 });
    const kids = [T.actor('אבי', { ...AVI, x: -2, z: 1.6 }), T.actor('נועה', { ...NOA, x: 0, z: 1.8 })];
    T.cam([0, 4, 8], [0, 1, -3]);
    await T.beat(0, async () => {
      T.say(kids[0], 'המים קרים! 🥶', 2);
      dana.pos.set(2.8, 0, -6.6); T.walk(dana, 2.8, -6.2, 1);
      dana.pos.y = 2.4; T.face(dana, 2.8, -3);
      T.cam([6, 3.2, -1], [2.8, 2.4, -5.8]);
      T.anim(dana, 'sad'); T.say(dana, 'זה גבוה מדי... 😟', 2.4);
    });
    await T.beat(1, async () => {
      T.say(guard, 'אפשר להתחיל מהמקפצה הנמוכה!', 2.8); await T.wait(2.8);
      dana.pos.set(-2.8, 0.7, -5.8);
      T.cam([-6, 2.4, 0], [-2.8, 0.8, -4]);
      for (let i = 0; i < 2; i++) {
        await T.tween(dana.root, { z: -4.2, y: 1.2 }, 0.4); dana.root.visible = false;
        addSplash(T, -2.8, -4); await T.wait(1); dana.root.visible = true; dana.pos.set(-2.8, 0.7, -5.8); dana.root.position.copy(dana.pos);
      }
      T.say(dana, 'בסוף היום – מהגבוהה!', 2.2);
      dana.pos.set(2.8, 2.4, -5.8); dana.root.position.copy(dana.pos);
      T.cam([6, 3, 1], [2.8, 1.6, -4.5]);
      await T.wait(1.2);
      await T.tween(dana.root, { z: -3.8, y: 3 }, 0.4); await T.tween(dana.root, { y: 0.4 }, 0.5);
      dana.root.visible = false; addSplash(T, 2.8, -3.6);
      for (const k of [...kids, guard]) T.anim(k, 'cheer');
      T.say(kids[1], 'כל הכבוד דנה! 👏', 2.4);
      await T.wait(1.2); dana.root.visible = true; dana.pos.set(3, 0.3, -3.4); dana.root.position.copy(dana.pos); T.anim(dana, 'cheer');
    });
  },

  // החמניות של סשה ונועה
  async sunflowers(T) {
    const bed = T.add(PROPS.mat('#5a3d22')); bed.position.set(-1, 0.02, -3); bed.scale.set(1.2, 4, 1.2);
    const sasha = T.actor('סשה', { ...SASHA, x: -3, z: 0 });
    const noa = T.actor('נועה', { ...NOA, x: 1, z: 0 });
    const vaad = T.actor('ועד הבית', { ...MAN, x: 4, z: 1.5, facing: Math.PI });
    T.cam([0, 3, 5], [-0.5, 0.8, -2]);
    await T.beat(0, async () => { T.say(vaad, 'כל משפחה מקבלת ערוגה! 🌱', 2.8); await T.wait(2); T.anim(sasha, 'cheer'); T.anim(noa, 'cheer'); });
    const flowers = [];
    await T.beat(1, async () => {
      T.walk(sasha, -1.8, -1.8, 1.6); await T.walk(noa, 0, -1.8, 1.6);
      for (const k of [sasha, noa]) T.face(k, -1, -3);
      for (let i = 0; i < 4; i++) { const f = T.add(PROPS.stem()); f.position.set(-2 + i * 0.6, 0.05, -3); f.scale.set(1, 0.05, 1); flowers.push(f); }
      const can = T.add(PROPS.bucket()); T.hold(can, noa); can.userData.holdY = 0.7;
      T.say(noa, 'משקים כל יום 💧', 2); await T.wait(2);
      T.say(sasha, 'אחרי שבועיים...', 1.6);
      for (const f of flowers) f.scale.set(1, 0.4, 1);
      await T.wait(1.6);
      T.say(noa, 'סוף הקיץ!', 1.6);
      for (let i = 0; i < 20; i++) { for (const f of flowers) f.scale.y = Math.min(2.1, f.scale.y + 0.09); await T.wait(0.06); }
      const dad = T.actor('אבא של סשה', { ...MAN, shirt: '#7a9cc6', x: 1.2, z: -3 });
      T.cam([2, 2.4, 3], [-0.5, 1.6, -3]);
      T.say(dad, 'הן יותר גבוהות ממני! 🌻', 2.8); T.anim(sasha, 'cheer'); T.anim(noa, 'cheer');
    });
  },

  // ההצגה במקלט
  async play(T) {
    const stage = T.add(PROPS.curtain()); stage.position.set(14.5, 0, 3.5); stage.rotation.y = -Math.PI / 2;
    const avi = T.actor('אבי', { ...AVI, x: 4, z: 2 });
    const noa = T.actor('נועה', { ...NOA, x: 5, z: 3 });
    const dana = T.actor('דנה', { ...DANA, x: 3, z: 3.6 });
    T.cam([6, 3, 7], [8, 1, 3]);
    await T.beat(0, async () => {
      T.say(dana, 'בואו נעלה הצגה! 🎭', 2.4); await T.wait(2);
      T.say(avi, 'על מלך שאיבד את הכתר!', 2.4);
    });
    await T.beat(1, async () => {
      const crown = T.add(PROPS.crown()); T.hold(crown, avi); crown.userData.holdY = 1.5;
      T.say(noa, 'ואני המכשפה! 🧙‍♀️', 2); await T.wait(1.6);
      T.say(dana, 'תפרתי תחפושות מסדינים', 2.2); await T.wait(2);
      for (let i = 0; i < 4; i++) { const p = T.actor('הורה', { ...[MOM, MAN, WOMAN, GRANDPA][i], x: 10, z: 1.5 + i * 1, facing: 0 }); const ch = T.add(PROPS.chair(T.A)); ch.position.set(9.6, 0, 1.5 + i); ch.rotation.y = Math.PI / 2; }
      T.cam([7, 2.4, 3.5], [14, 1.2, 3.5]);
      T.walk(avi, 13.6, 3, 2); T.walk(noa, 13.6, 4.4, 2); await T.wait(2.4);
      T.face(avi, 9, 3); T.face(noa, 9, 3.5);
      T.say(avi, 'איפה הכתר שלי?! 👑', 2.2); await T.wait(2);
      T.say(noa, 'חה חה חה!', 1.8); await T.wait(1.8);
      T.anim(avi, 'cheer'); T.anim(noa, 'cheer'); T.say(dana, 'סוף! 👏👏👏', 2.4);
    });
  },

  // האוטו של הגלידה
  async icecream(T) {
    const truck = T.add(PROPS.truck()); truck.position.set(-3, 0, -6); truck.rotation.y = Math.PI / 2;
    const kids = [T.actor('נועה', { ...NOA, x: 6, z: 4 }), T.actor('אבי', { ...AVI, x: 8, z: 3 })];
    const dani = T.actor('דני', { ...KID_SMALL, x: 5, z: 6 });
    T.cam([3, 3.4, 6], [-1, 1, -4]);
    await T.beat(0, async () => {
      T.say(kids[1], '♪ האוטו של הגלידה! ♪', 2.4);
      T.walk(kids[0], -0.4, -4.2, 3.4); T.walk(kids[1], 0.6, -4.6, 3.4); await T.walk(dani, 0.6, -2.6, 2.6);
    });
    await T.beat(1, async () => {
      const ps = T.add(PROPS.popsicle()); T.hold(ps, kids[0]); ps.userData.holdY = 1.1;
      T.cam([2.2, 1.8, 0.5], [0, 1, -3]);
      T.say(dani, 'אין לי כסף... 😢', 2.4); T.anim(dani, 'sad');
      await T.walk(dani, 2.4, -1.8, 1); await T.wait(1.4);
      await T.walk(kids[0], 1.6, -2, 2);
      T.face(kids[0], dani.pos.x, dani.pos.z); T.face(dani, kids[0].pos.x, kids[0].pos.z);
      const half = T.add(PROPS.popsicle()); T.hold(half, dani); half.userData.holdY = 0.9;
      T.say(kids[0], 'חברים מתחלקים 😊', 2.6); await T.wait(2.4);
      T.anim(dani, 'cheer'); T.say(dani, 'הלשון שלי צהובה! 😛', 2.6);
    });
  },

  // שחמט עם סבא
  async chess(T) {
    const bench = T.add(PROPS.table(1.2, 0.6)); bench.scale.set(1, 0.65, 1); bench.position.set(-2, 0, -2);
    const board = T.add(PROPS.chessboard()); board.position.set(-2, 0.5, -2);
    const sasha = T.actor('סשה', { ...SASHA, x: -2, z: -1.1, facing: -Math.PI / 2 });
    const saba = T.actor('סבא', { ...GRANDPA, x: -2, z: -2.9, facing: Math.PI / 2 });
    T.cam([0.6, 1.8, 0.6], [-2, 0.6, -2]);
    await T.beat(0, async () => { T.say(saba, 'זה הפרש, הוא קופץ ככה ♞', 3); });
    await T.beat(1, async () => {
      T.say(saba, 'שח מט!', 1.6); await T.wait(1.4);
      T.anim(sasha, 'sad'); T.say(sasha, 'הפסדתי שוב... אני רוצה להפסיק 😤', 2.8); await T.wait(2.8);
      T.say(saba, 'גם אני הפסדתי הרבה כשהייתי קטן', 3); await T.wait(3);
      T.say(saba, 'כל הפסד מלמד משהו', 2.4); await T.wait(2.4);
      T.say(sasha, 'אחרי חודש...', 1.6); await T.wait(1.6);
      T.say(sasha, 'שח מט! ♚', 2); await T.wait(1.4);
      T.anim(sasha, 'cheer'); T.anim(saba, 'cheer');
      T.say(saba, 'כל הכבוד! 😄', 2.6);
    });
  },

  // ===================== כיתה א' (עם ניקוד) =====================

  // הַכַּדּוּר שֶׁל דָּנִי
  async 'a-ball'(T) {
    const dani = T.actor('דָּנִי', { ...KID_SMALL, height: 1.25, x: 0, z: 1 });
    const kids = [T.actor('נוֹעָה', { ...NOA, x: -3, z: -1 }), T.actor('אַבִּי', { ...AVI, x: 3, z: -1.4 })];
    const ball = T.add(PROPS.smallBall('#e53935')); ball.scale.setScalar(1.4); ball.position.set(0, 0.17, -0.1);
    T.cam([0, 1.8, 4.5], [0, 0.8, 0]);
    await T.beat(0, async () => { T.face(dani, 0, -1); T.say(dani, 'הַכַּדּוּר הָאָדֹם שֶׁלִּי! 🔴', 2.4); });
    await T.beat(1, async () => {
      T.anim(dani, 'lob'); C_kick(T);
      T.cam([0, 2, 6], [0, 4, -3]);
      await T.tween(ball, { y: 9, z: -3 }, 1.4); await T.tween(ball, { y: 0.17, z: -2 }, 1.2);
      for (const k of [...kids, dani]) T.anim(k, 'cheer');
      T.say(kids[0], 'חחח! 😄', 1.8); T.say(kids[1], 'עוֹד פַּעַם!', 1.8);
    });
  },

  // הֶחָתוּל מִיצִי
  async 'a-cat'(T) {
    const noa = T.actor('נוֹעָה', { ...NOA, x: -1, z: 1.5, facing: 0 });
    const cat = T.add(PROPS.cat('#9a9a9a')); cat.position.set(0.4, 0, 1.4); cat.rotation.y = -Math.PI / 2;
    const pillow = T.add(PROPS.pillow()); pillow.position.set(2, 0, 0);
    const milk = T.add(PROPS.bucket()); milk.scale.setScalar(0.6); milk.position.set(0.6, 0, 0.4);
    T.cam([0.4, 1.4, 3.6], [0.4, 0.4, 1]);
    await T.beat(0, async () => { T.say(noa, 'זֶה מִיצִי שֶׁלִּי 🐱', 2.4); });
    await T.beat(1, async () => {
      await T.tween(cat, { x: 0.6, z: 0.75 }, 1); T.say(noa, 'מִיצִי שׁוֹתֶה חָלָב 🥛', 2.2); await T.wait(2);
      await T.tween(cat, { x: 2, y: 0.16, z: 0 }, 1.2);
      cat.scale.y = 0.7; T.say(noa, 'לַיְלָה טוֹב, מִיצִי 😴', 2.6);
      T.cam([2, 1, 1.4], [2, 0.2, 0]);
    });
  },

  // גֶּשֶׁם
  async 'a-rain'(T) {
    T.rain(true);
    const avi = T.actor('אַבִּי', { ...AVI, shirt: '#f2c230', x: -3, z: 1 });
    const mom = T.actor('אִמָּא', { ...MOM, x: -9.5, y: 4.2, z: -13.6, facing: Math.PI / 2 });
    const puddle = T.add(PROPS.puddle()); puddle.position.set(0, 0.04, 0);
    T.cam([0, 2.2, 5], [0, 0.8, 0]);
    await T.beat(0, async () => { T.say(avi, 'יֵשׁ לִי מְעִיל צָהֹב! 🧥', 2.4); await T.walk(avi, -1.2, 0.4, 1.6); });
    await T.beat(1, async () => {
      for (let i = 0; i < 3; i++) {
        await T.tween(avi.root, { y: 0.5 }, 0.25); await T.tween(avi.root, { y: 0 }, 0.25);
        addSplash(T, avi.pos.x, avi.pos.z);
        if (i === 0) await T.walk(avi, 0, 0, 2);
      }
      T.say(avi, 'הַנַּעֲלַיִם רְטֻבּוֹת! 😄', 2);
      T.cam([-5, 3.4, -6], [-9.5, 4, -13.6]);
      T.say(mom, 'הַבַּיְתָה!', 2.4);
    });
  },

  // הַתַּפּוּחַ שֶׁל סָבָא
  async 'a-apple'(T) {
    const saba = T.actor('סָבָא', { ...GRANDPA, x: 1, z: 0.4, facing: Math.PI });
    const michal = T.actor('מִיכַל', { ...SISTER, height: 1.3, x: -0.6, z: 0.6, facing: 0 });
    const apple = T.add(PROPS.apple()); T.hold(apple, saba); apple.userData.holdY = 1.0;
    T.cam([0.2, 1.4, 3.2], [0.2, 0.9, 0.5]);
    await T.beat(0, async () => { T.say(saba, 'זֶה בִּשְׁבִילֵךְ 🍎', 2.4); await T.wait(1.6); T.hold(apple, michal); apple.userData.holdY = 0.85; });
    await T.beat(1, async () => {
      T.say(michal, 'גָּדוֹל וְאָדֹם!', 2); await T.wait(2);
      for (let i = 0; i < 3; i++) { apple.scale.setScalar(1 - i * 0.3); await T.wait(0.6); }
      apple.visible = false;
      T.anim(michal, 'cheer'); T.say(michal, 'תּוֹדָה, סָבָא! 💛', 2.6);
    });
  },

  // הַכֶּלֶב רֶקְסִי
  async 'a-dog'(T) {
    const dog = T.add(PROPS.dog('#3b2a1a', '#2f7de0')); dog.scale.setScalar(1.4); dog.position.set(0, 0, 0); dog.rotation.y = Math.PI / 2;
    const yoni = T.actor('יוֹנָתָן', { ...YANIV, x: -2, z: 1.5 });
    T.cam([0, 1.6, 4], [0, 0.6, 0]);
    await T.beat(0, async () => { for (let i = 0; i < 10; i++) { dog.getObjectByName('tail').rotation.z = Math.sin(i * 2) * 0.9; await T.wait(0.15); } });
    await T.beat(1, async () => {
      T.say(yoni, 'בֹּקֶר טוֹב, רֶקְסִי!', 2); await T.wait(1.2);
      const bark = T.actor('', { ...KID_SMALL, x: 0, z: 0 }); bark.root.visible = false;
      T.say(bark, 'הַב! הַב! 🐶', 2); await T.wait(2);
      T.cam([0, 4, 8], [2, 0.6, -1]);
      const walk = T.walk(yoni, 6, -2, 1.8);
      await T.tween(dog, { x: 5.4, z: -2.6 }, 3.4); await walk;
      T.say(yoni, 'יוֹצְאִים לְטַיֵּל!', 2.2);
    });
  },

  // לַיְלָה טוֹב, יָרֵחַ
  async 'a-moon'(T) {
    T.night(true);
    const noa = T.actor('נוֹעָה', { ...NOA, x: 0, z: 1, facing: -Math.PI / 2 });
    const frame = T.add(PROPS.windowFrame()); frame.position.set(0, 1.5, 0);
    const moon = T.add(PROPS.moon()); moon.position.set(-18, 24, -70);
    T.lampAt(0, 2, 2);
    T.cam([0, 1.5, 3.6], [0, 1.4, 0]);
    await T.beat(0, async () => { T.say(noa, '🌙 ✨', 2); });
    await T.beat(1, async () => {
      T.cam([0, 1.4, 2], [-6, 9, -30]);
      await T.wait(2.4);
      T.cam([0, 1.5, 3.6], [0, 1.4, 0]);
      T.say(noa, 'לַיְלָה טוֹב, יָרֵחַ!', 2.6); await T.wait(2.4);
      await T.walk(noa, 1.6, 3, 1);
      T.say(noa, '😴', 1.6);
    });
  },

  // יוֹם הֻלֶּדֶת לְתָמָר
  async 'a-birthday'(T) {
    const tamar = T.actor('תָּמָר', { ...SISTER, height: 1.3, shirt: '#ff8fb8', x: 0, z: 1.2, facing: -Math.PI / 2 });
    const mom = T.actor('אִמָּא', { ...MOM, x: 1.4, z: -0.8, facing: Math.PI });
    const kids = [T.actor('נוֹעָה', { ...NOA, x: -1.4, z: 0.8, facing: 0 }), T.actor('אַבִּי', { ...AVI, x: 1.6, z: 1, facing: Math.PI })];
    const table = T.add(PROPS.table()); table.position.set(0, 0, 0);
    const balloons = T.add(PROPS.balloons()); balloons.position.set(-1.8, 0, -1);
    T.cam([0, 1.8, 4.2], [0, 0.9, 0]);
    await T.beat(0, async () => { T.anim(tamar, 'cheer'); T.say(tamar, 'הַיּוֹם יוֹם הֻלֶּדֶת שֶׁלִּי! 🎉', 2.6); });
    await T.beat(1, async () => {
      const cake = T.add(PROPS.cake(6)); cake.position.set(0, 0.75, 0);
      T.say(mom, 'אָפִיתִי עוּגָה 🎂', 2.2); await T.wait(2.2);
      T.cam([0, 1.5, 2.2], [0, 1, 0]);
      T.say(tamar, 'פּוּוּוּ!', 1.4); await T.wait(0.8);
      for (const f of cake.userData.flames) f.visible = false;
      for (const k of [...kids, tamar, mom]) T.anim(k, 'cheer');
      T.say(kids[0], '♪ הַיּוֹם יוֹם הֻלֶּדֶת ♪', 2.6); T.say(kids[1], '♪♪♪', 2.6);
    });
  },

  // בָּאוֹטוֹבּוּס
  async 'a-bus'(T) {
    const bus = T.add(PROPS.bus()); bus.position.set(-8, 0, 0); bus.rotation.y = Math.PI / 2;
    const ori = T.actor('אוֹרִי', { ...KID_SMALL, x: -8, y: 0.6, z: 0.6, facing: Math.PI / 2 });
    const cow = T.add(PROPS.cow()); cow.position.set(4, 0, 4); cow.rotation.y = -Math.PI / 2;
    for (const [x, z] of [[-2, 4.5], [8, 5]]) { const t = T.add(PROPS.tree()); t.position.set(x, 0, z); }
    T.cam([-4, 2.4, 7], [-6, 1, 1]);
    await T.beat(0, async () => { T.say(ori, 'נוֹסְעִים! 🚌', 2); });
    await T.beat(1, async () => {
      T.cam([2, 3, 10], [3, 1, 3]);
      const drive = T.tween(bus, { x: 6 }, 6);
      for (let i = 0; i < 24; i++) { ori.pos.x = bus.position.x; await T.wait(0.25); }
      await drive; ori.pos.x = bus.position.x;
      T.say(ori, 'פָּרָה! 🐄', 1.8); await T.wait(1.6);
      const moo = T.actor('', { ...KID_SMALL, x: 4, z: 4 }); moo.root.visible = false;
      T.say(moo, 'מוּ!', 2); await T.wait(1.4);
      T.anim(ori, 'cheer'); T.say(ori, 'חחח! 😆', 2);
    });
  },

  // פֶּרַח בַּגִּנָּה
  async 'a-flower'(T) {
    const idan = T.actor('עִדָּן', { ...KID_SMALL, height: 1.3, shirt: '#7fbf7a', x: -1, z: 1.2, facing: -0.6 });
    const bed = T.add(PROPS.mat('#5a3d22')); bed.position.set(0, 0.02, 0); bed.scale.set(0.6, 1, 0.8);
    const seed = T.add(PROPS.seed()); T.hold(seed, idan); seed.userData.holdY = 0.8;
    T.cam([0.4, 1.4, 3], [0, 0.4, 0]);
    await T.beat(0, async () => { await T.wait(1); T.hold(seed, null); await T.tween(seed, { x: 0, y: 0.03, z: 0 }, 0.8); T.say(idan, 'שָׁתַלְתִּי זֶרַע 🌱', 2.2); });
    await T.beat(1, async () => {
      const can = T.add(PROPS.bucket()); T.hold(can, idan); can.userData.holdY = 0.6;
      T.say(idan, 'מַיִם 💧', 1.6); await T.wait(1.8);
      const fl = T.add(PROPS.stem()); fl.position.set(0, 0.03, 0); fl.scale.set(0.6, 0.02, 0.6);
      for (let i = 0; i < 25; i++) { fl.scale.y = Math.min(0.8, fl.scale.y + 0.035); await T.wait(0.08); }
      T.say(idan, 'פֶּרַח צָהֹב! 🌼', 2); T.anim(idan, 'cheer');
      for (let i = 0; i < 3; i++) { await T.tween(idan.root, { y: 0.45 }, 0.22); await T.tween(idan.root, { y: 0 }, 0.22); }
    });
  },

  // אַרְמוֹן בַּחוֹל
  async 'a-sand'(T) {
    const sand = T.add(PROPS.sand(14, 8)); sand.position.set(0, 0, 0);
    const sea = T.add(PROPS.sea(30, 10)); sea.position.set(0, 0, -9);
    const roni = T.actor('רוֹנִי', { ...KID_SMALL, height: 1.3, shirt: '#4ecdc4', x: -0.8, y: 0.08, z: 0.6, facing: -0.5 });
    const sis = T.actor('אֲחוֹתוֹ', { ...SISTER, height: 1.2, x: 0.8, y: 0.08, z: 0.7, facing: -2.6 });
    const castle = T.add(PROPS.castle()); castle.position.set(0, 0.08, -0.3); castle.scale.setScalar(0.05);
    T.cam([0, 1.6, 4], [0, 0.5, -0.5]);
    await T.beat(0, async () => {
      for (let i = 0; i < 20; i++) { castle.scale.setScalar(0.05 + i * 0.05); await T.wait(0.1); }
      T.say(sis, 'אַרְמוֹן! 🏰', 2);
    });
    await T.beat(1, async () => {
      const wave = T.add(PROPS.wave()); wave.position.set(0, 0.2, -6);
      T.cam([3, 2, 3], [0, 0.4, -2]);
      await T.tween(wave, { z: -0.3 }, 1.6);
      castle.visible = false; addSplash(T, 0, -0.3);
      await T.tween(wave, { z: -7, y: -0.5 }, 1.2);
      T.anim(roni, 'cheer');
      T.say(roni, 'חחח! בּוֹאִי נִבְנֶה עוֹד אֶחָד!', 3);
    });
  },
};

