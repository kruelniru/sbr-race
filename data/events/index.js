// Collects every event file. Add new files here.
import common from './common.js';
import finish from './finish.js';
import runners from './runners.js';
import retired from './retired.js';
import canon from './canon.js';
import stage1 from './stage-1.js';
import stage2 from './stage-2.js';
import stage3 from './stage-3.js';
import stage4 from './stage-4.js';
import stage5 from './stage-5.js';
import stage6 from './stage-6.js';
import stage7 from './stage-7.js';
import stage8 from './stage-8.js';
import stage9 from './stage-9.js';
import stands from './stands.js';
import palm from './palm.js';
import alliesHorses from './allies-horses.js';
import requiems from './requiems.js';
import m7d from './m7d.js';

export default [
  ...common, ...finish, ...runners, ...retired, ...canon,
  ...stage1, ...stage2, ...stage3, ...stage4, ...stage5, ...stage6, ...stage7, ...stage8, ...stage9,
  ...stands, ...palm, ...alliesHorses, ...requiems, ...m7d,
];
