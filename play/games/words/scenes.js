// תסריטים: איך כל סיפור "קורה" בשכונה אחרי שמשלימים אותו.
// כל תסריט מקבל T (ראו theater.js). T.beat(i, ...) מציג את פסקה i של הסיפור ומשחק אותה.
// המפתח הוא ה-id של הסיפור (stories.js / stories-a.js).
import { PROPS, addSplash } from './theater.js';

// ---------- דמויות השכונה ----------
const AVI = { model: 'Casual_Male', shirt: '#7fb2e0', pants: '#2f4a73', skin: '#e2b08a', hair: '#2a1a10' };
const YANIV = { model: 'Casual2_Male', shirt: '#e8e4da', pants: '#4a4d55', skin: '#c48e62', hair: '#140c07' };
const NOA = { model: 'Casual_Female', shirt: '#f29bb8', pants: '#3c5a86', skin: '#f0c9a8', hair: '#6b3e1f' };
const SASHA = { model: 'Casual3_Male', shirt: '#7fbf7a', pants: '#3a3a3a', skin: '#f3d2b5', hair: '#e0c27a' };
const MOTI = { model: 'Casual_Bald', shirt: '#9fc2df', pants: '#3a5a86', skin: '#d9a27a', hair: '#2a1a10' };
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
};

