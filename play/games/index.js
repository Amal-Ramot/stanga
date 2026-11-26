// רשימת המשחקים במגרש המשחקים.
// כדי להוסיף משחק: יוצרים תיקייה ב-games/ עם קובץ משחק (ראו words/words.js), ומוסיפים אותו כאן.
// station – איפה התחנה של המשחק עומדת בחצר (מטרים; x ימינה-שמאלה, z קדימה-אחורה, 0,0 = אמצע המגרש).
// soon: true – תחנה של משחק שעוד לא מוכן ("בקרוב").
import { WORDS } from './words/words.js';

export const GAMES = [
  WORDS,
  { id: 'soon-1', title: 'משחק חדש', emoji: '🚧', soon: true, station: { x: 0, z: -3.6 }, desc: 'משחק חדש יגיע לכאן בקרוב!' },
  { id: 'soon-2', title: 'משחק חדש', emoji: '🎨', soon: true, station: { x: 7, z: 1.2 }, desc: 'משחק חדש יגיע לכאן בקרוב!' },
];
