import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { FullLoader, GuestOnly, RequireRole } from "./auth/guards";
import ParentShell from "./layouts/ParentShell";
import PublicShell from "./layouts/PublicShell";
import StudentShell from "./layouts/StudentShell";
import TeacherShell from "./layouts/TeacherShell";
import RouteError from "./RouteError";
import { ConfirmProvider } from "./ui/Modal";
import { ToastProvider } from "./ui/Toast";

// every page is its own chunk: students never download the Game Creator
const page = (loader) => ({ lazy: async () => ({ Component: (await loader()).default }) });

const router = createBrowserRouter([{ HydrateFallback: () => <FullLoader />, children: [
  {
    element: <GuestOnly />,
    children: [{
      element: <PublicShell />, errorElement: <RouteError />,
      children: [
        { path: "/", ...page(() => import("./pages/public/Landing")) },
        { path: "/login", ...page(() => import("./pages/public/Login")) },
        { path: "/register", ...page(() => import("./pages/public/Register")) },
        { path: "/verify", ...page(() => import("./pages/public/Verify")) },
        { path: "/forgot", ...page(() => import("./pages/public/Forgot")) },
      ],
    }],
  },
  {
    path: "/app", element: <RequireRole role="student" />,
    children: [
      {
        element: <StudentShell />,
        children: [{
          errorElement: <RouteError />,
          children: [
            { index: true, ...page(() => import("./pages/student/Home")) },
            { path: "fun", ...page(() => import("./pages/student/Fun")) },
            { path: "games", ...page(() => import("./pages/student/Games")) },
            { path: "games/:id", ...page(() => import("./pages/student/GameDetail")) },
            { path: "lessons", ...page(() => import("./pages/student/Lessons")) },
            { path: "lessons/:id", ...page(() => import("./pages/student/LessonDetail")) },
            { path: "progress", ...page(() => import("./pages/student/Progress")) },
            { path: "classes", ...page(() => import("./pages/student/Classes")) },
            { path: "profile", ...page(() => import("./pages/student/Profile")) },
            { path: "results/:attemptId", ...page(() => import("./pages/student/Result")) },
          ],
        }],
      },
      { path: "fun/:id", errorElement: <RouteError />, ...page(() => import("./pages/student/Activity")) },
      { path: "play/:attemptId", errorElement: <RouteError />, ...page(() => import("./pages/student/Play")) },
    ],
  },
  {
    path: "/teach", element: <RequireRole role="teacher" />,
    children: [
      {
        element: <TeacherShell />,
        children: [{
          errorElement: <RouteError />,
          children: [
            { index: true, ...page(() => import("./pages/teacher/Dashboard")) },
            { path: "games", ...page(() => import("./pages/teacher/Games")) },
            { path: "games/new", ...page(() => import("./pages/teacher/NewGame")) },
            { path: "games/:id", ...page(() => import("./pages/teacher/GameCreator")) },
            { path: "games/:id/stats", ...page(() => import("./pages/teacher/GameStats")) },
            { path: "classes", ...page(() => import("./pages/teacher/Classes")) },
            { path: "classes/:id", ...page(() => import("./pages/teacher/ClassDetail")) },
            { path: "lessons", ...page(() => import("./pages/teacher/Lessons")) },
            { path: "lessons/new", ...page(() => import("./pages/teacher/LessonEditor")) },
            { path: "lessons/:id", ...page(() => import("./pages/teacher/LessonEditor")) },
            { path: "chat", ...page(() => import("./pages/chat/Chat")) },
            { path: "chat/:peerId", ...page(() => import("./pages/chat/Chat")) },
            { path: "profile", ...page(() => import("./pages/student/Profile")) },
          ],
        }],
      },
      { path: "games/:id/preview", errorElement: <RouteError />, ...page(() => import("./pages/teacher/Preview")) },
      { path: "classes/:id/report/:studentId", errorElement: <RouteError />, ...page(() => import("./pages/teacher/StudentReport")) },
    ],
  },
  {
    path: "/parent", element: <RequireRole role="parent" />,
    children: [{
      element: <ParentShell />,
      children: [{
        errorElement: <RouteError />,
        children: [
          { index: true, ...page(() => import("./pages/parent/Children")) },
          { path: "chat", ...page(() => import("./pages/chat/Chat")) },
          { path: "chat/:peerId", ...page(() => import("./pages/chat/Chat")) },
          { path: "profile", ...page(() => import("./pages/student/Profile")) },
        ],
      }],
    }],
  },
  { path: "/privacy", errorElement: <RouteError />, ...page(() => import("./pages/public/Legal")) },
  { path: "/terms", errorElement: <RouteError />, ...page(() => import("./pages/public/LegalTerms")) },
  { path: "*", errorElement: <RouteError />, ...page(() => import("./pages/public/NotFound")) },
] }]);

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <RouterProvider router={router} />
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
