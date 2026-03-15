export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  COURSES: "/courses",
  COURSE_DETAIL: (id: string) => `/courses/${id}`,
  COURSE_NEW: "/courses/new",
  CALENDAR: "/calendar",
  SETTINGS: "/settings",
} as const;

