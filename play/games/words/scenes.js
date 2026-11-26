// תסריטים: איך כל סיפור "קורה" בשכונה אחרי שמשלימים אותו.
// כל תסריט מקבל T (ראו theater.js) ו-S (משפטי הסיפור) ומשחק את העלילה צעד אחרי צעד.
// אחרי כל await בודקים T.skipped – אם לחצו "דלג", יוצאים.
import * as THREE from 'three';
import { PROPS } from './theater.js';

// דמויות קבועות של השכונה
const AVI = { model: 'Casual_Male', shirt: '#7fb2e0', pants: '#2f4a73', skin: '#e2b08a', hair: '#2a1a10' };
const YANIV = { model: 'Casual2_Male', shirt: '#e8e4da', pants: '#4a4d55', skin: '#c48e62', hair: '#140c07' };
const GRANDMA_RACHEL = { model: 'Casual_Female', shirt: '#8e6bb8', pants: '#5a4a6a', skin: '#e9c3a5', hair: '#d9d6d0', height: 1.62 };

export const SCENES = {
  // "הכדור שנפל לגינה"
  async garden(T) {
    const GX = -10.6, GZ = -6.2; // הגינה של סבתא רחל, בפינת המגרש
    T.add(PROPS.garden(GX, GZ));
    const avi = T.actor('אבי', { ...AVI, x: -2.6, z: 1.6, facing: 0 });
    const yaniv = T.actor('יניב', { ...YANIV, x: 2.6, z: 1.2, facing: Math.PI });
    const rachel = T.actor('סבתא רחל', { ...GRANDMA_RACHEL, x: -15.4, z: -7.6, facing: 0 });
    T.cam([0, 6.5, 11], [-1, 0.5, 0]);
    T.caption('אחרי בית הספר ירדו אבי ויניב למגרש של השכונה. הם שיחקו סטנגה וצחקו הרבה.');
    // מסירות
    for (let i = 0; i < 2; i++) {
      T.anim(avi, 'kick'); await T.kick(-2.3, 1.6, 2.3, 1.2, 0.3, 0.8); if (T.skipped) return;
      T.anim(yaniv, 'kick'); await T.kick(2.3, 1.2, -2.3, 1.6, 0.3, 0.8); if (T.skipped) return;
    }
    T.say(avi, 'חחח! עוד פעם!', 1.4);
    await T.wait(0.8); if (T.skipped) return;
    // הבעיטה החזקה מדי
    T.caption('פתאום יניב בעט חזק מדי. הכדור עף מעל הגדר ונחת בגינה של סבתא רחל, ליד העגבניות שהיא שתלה.');
    T.anim(avi, 'kick'); await T.kick(-2.3, 1.6, 2.3, 1.2, 0.3, 0.8); if (T.skipped) return;
    T.face(yaniv, GX, GZ);
    await T.wait(0.3); if (T.skipped) return;
    T.anim(yaniv, 'lob');
    T.cam([-4.5, 4.5, 3.5], [-8.5, 0.5, -4.5]);
    await T.kick(2.3, 1.2, GX + 0.4, GZ - 0.2, 4.5, 1.6); if (T.skipped) return;
    await T.wait(0.6); if (T.skipped) return;
    // הילדים נבהלים
    T.caption('הילדים נבהלו. "עכשיו היא תכעס עלינו," לחש אבי.');
    T.face(avi, GX, GZ); T.anim(avi, 'sad'); T.anim(yaniv, 'sad');
    T.cam([-1, 3.2, 6], [-1.5, 1, 0]);
    await T.wait(0.6); if (T.skipped) return;
    T.say(avi, 'עכשיו היא תכעס עלינו...', 2.6);
    await T.wait(2.8); if (T.skipped) return;
    // סבתא רחל יוצאת
    T.caption('אחרי רגע יצאה סבתא רחל מהבית. ביד אחת היא החזיקה את הכדור, וביד השנייה מגש עם שתי כוסות של לימונדה קרה.');
    T.cam([-8, 4, 2], [-11, 0.8, -5.5]);
    await T.walk(rachel, GX - 0.6, GZ - 0.2, 1.4); if (T.skipped) return;
    T.holdBall(rachel);
    const tray = T.add(PROPS.tray());
    tray.userData.follow = rachel;
    await T.wait(0.5); if (T.skipped) return;
    T.walk(avi, -5.2, -1.4, 1.6); T.walk(yaniv, -4.2, -1.9, 1.8);
    T.cam([-3, 3.4, 4.5], [-6, 1, -2.2]);
    await T.walk(rachel, -6.8, -2.6, 1.3); if (T.skipped) return;
    T.face(rachel, -4.7, -1.6); T.face(avi, -6.8, -2.6); T.face(yaniv, -6.8, -2.6);
    // לא כועסת
    T.caption('"אני לא כועסת," אמרה וחייכה. "אבל העגבניות שלי עוד קטנות ועדינות. אולי תשחקו בצד השני של המגרש?"');
    T.say(rachel, 'אני לא כועסת 😊', 2.2);
    await T.wait(2.4); if (T.skipped) return;
    T.say(rachel, 'אולי תשחקו בצד השני של המגרש?', 3);
    await T.wait(3.2); if (T.skipped) return;
    // לימונדה
    T.caption('אבי ויניב הודו לה ושתו את הלימונדה.');
    T.say(avi, 'תודה סבתא רחל!', 2); T.say(yaniv, 'תודה!', 2);
    T.anim(avi, 'cheer'); T.anim(yaniv, 'cheer');
    tray.userData.follow = null; tray.position.set(-5.9, 0.95, -2.1);
    await T.wait(2.6); if (T.skipped) return;
    // למחרת: שלט, ומשחקים בצד השני
    T.caption('למחרת הם הכינו שלט מקרטון וכתבו עליו: "זהירות! הגינה של סבתא רחל". הם תלו את השלט על הגדר, ומאז הם תמיד משחקים רחוק מהעגבניות.');
    T.remove(tray); T.dropBall(-6.2, -2);
    const sign = T.add(PROPS.sign('זהירות!\nהגינה של סבתא רחל'));
    sign.position.set(GX, 0.85, GZ + 1.42);
    T.walk(rachel, -15.4, -7.6, 1.3);
    T.cam([-8.5, 2.2, -1], [GX, 0.8, GZ + 1.4]);
    await T.wait(3); if (T.skipped) return;
    T.walk(avi, 6, 1.6, 2.4); T.walk(yaniv, 10, 1.2, 2.4);
    T.cam([7, 6, 11], [7.5, 0.5, 0]);
    await T.kick(-6.2, -2, 6.3, 1.6, 0.6, 2.4); if (T.skipped) return;
    T.face(avi, 10, 1.2); T.face(yaniv, 6, 1.6);
    T.anim(avi, 'kick'); await T.kick(6.3, 1.6, 9.7, 1.2, 0.3, 0.7); if (T.skipped) return;
    T.anim(yaniv, 'kick'); await T.kick(9.7, 1.2, 6.3, 1.6, 0.3, 0.7); if (T.skipped) return;
    T.say(yaniv, 'כאן העגבניות בטוחות!', 2.4);
    await T.wait(2.6);
  },
};
