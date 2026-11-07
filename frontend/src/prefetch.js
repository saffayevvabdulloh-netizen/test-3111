// Every page is its own chunk (small first load). Right after sign-in, while the browser is idle, download the
// chunks of the person's own area too, so tapping a menu item opens instantly instead of waiting for the network.
const SETS = {
  student: [
    () => import("./pages/student/Fun"), () => import("./pages/student/Games"), () => import("./pages/student/GameDetail"),
    () => import("./pages/student/Lessons"), () => import("./pages/student/Progress"), () => import("./pages/student/Profile"),
    () => import("./pages/student/Classes"), () => import("./pages/student/Activity"), () => import("./pages/student/Play"),
  ],
  teacher: [
    () => import("./pages/teacher/Games"), () => import("./pages/teacher/Classes"), () => import("./pages/teacher/ClassDetail"),
    () => import("./pages/teacher/Lessons"), () => import("./pages/chat/Chat"), () => import("./pages/student/Profile"),
    () => import("./pages/teacher/NewGame"), () => import("./pages/teacher/StudentReport"),
  ],
  parent: [() => import("./pages/chat/Chat"), () => import("./pages/student/Profile"), () => import("./pages/parent/Children")],
};

const done = new Set();
export function prefetchFor(role) {
  if (done.has(role) || !SETS[role]) return;
  done.add(role);
  if (navigator.connection?.saveData) return;                     // data-saver mode: do not spend the person's traffic
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
  const run = (i = 0) => {
    if (i >= SETS[role].length) return;
    idle(() => { SETS[role][i]().catch(() => {}); run(i + 1); });  // one at a time: never competes with what the person is doing
  };
  run();
}
