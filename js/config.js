// מידות המגרש והפיזיקה (מטרים / שניות)
export const FIELD = {
  asphaltX: 15,     // חצי אורך האספלט
  asphaltZ: 8.5,    // חצי רוחב האספלט
  boundX: 16.3,     // גבול פיזי (גדר/משוכה)
  boundZ: 9.8,
  goalX: 13,        // קו השער
  postZ: 1.6,       // חצי רוחב השער
  goalH: 1.75,      // גובה המשקוף
  postR: 0.07,
};

export const BALL = {
  r: 0.18,
  gravity: 9.8,
  restitution: 0.58,
  rollFriction: 1.1,   // האטה יחסית על הקרקע
  airDrag: 0.08,
};

export const PLAYER = {
  speed: 5.6,
  accel: 30,
  turnRate: 11,
  bodyR: 0.3,
  legOffset: 0.29,
  legR: 0.065,
  reach: 0.8,
  grace: 0.38,       // זמן חסד אחרי בעיטה (הכדור עובר דרך הבועט)
};

// ניקוד לפי ויקיפדיה
export const POINTS = {
  goal: 1,
  post: 2,
  crossbar: 3,
  heel: 4,
  scissors: 5,
  nutmeg: 10,
};

// בורות במגרש – הכדור קופץ מהם לכיוון אקראי
export const POTHOLES = [
  { x: -6.2, z: 3.4, r: 0.55 },
  { x: 4.8, z: -4.6, r: 0.7 },
  { x: 9.6, z: 5.2, r: 0.45 },
  { x: -10.2, z: -5.6, r: 0.6 },
  { x: 1.2, z: 6.3, r: 0.4 },
  { x: -2.8, z: -2.2, r: 0.35 },
];
