import api from "@/lib/api";
import type {
  TokenResponse, UserResponse, LoginRequest, RegisterRequest,
  Course, CourseCreate,
  CalEvent, EventCreate, EventUpdate,
  SyllabusUpload,
  GoogleSyncStatus,
} from "@/types";

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authService = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const form = new URLSearchParams();
    form.append("username", data.username);
    form.append("password", data.password);
    const res = await api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return res.data;
  },

  register: async (data: RegisterRequest): Promise<UserResponse> => {
    const res = await api.post("/auth/register", data);
    return res.data;
  },

  me: async (): Promise<UserResponse> => {
    const res = await api.get("/auth/me");
    return res.data;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  googleLogin: () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google/login`;
  },
};

// ── Courses ───────────────────────────────────────────────────────────────────
export const courseService = {
  list: async (): Promise<Course[]> => {
    const res = await api.get("/courses/");
    return res.data;
  },

  get: async (id: string): Promise<Course> => {
    const res = await api.get(`/courses/${id}`);
    return res.data;
  },

  create: async (data: CourseCreate): Promise<Course> => {
    const res = await api.post("/courses/", data);
    return res.data;
  },

  update: async (id: string, data: Partial<CourseCreate>): Promise<Course> => {
    const res = await api.patch(`/courses/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/courses/${id}`);
  },
};

// ── Events ────────────────────────────────────────────────────────────────────
export const eventService = {
  list: async (params?: { course_id?: string; status?: string }): Promise<CalEvent[]> => {
    const res = await api.get("/events/", { params });
    return res.data;
  },

  get: async (id: string): Promise<CalEvent> => {
    const res = await api.get(`/events/${id}`);
    return res.data;
  },

  create: async (data: EventCreate): Promise<CalEvent> => {
    const res = await api.post("/events/", data);
    return res.data;
  },

  update: async (id: string, data: EventUpdate): Promise<CalEvent> => {
    const res = await api.patch(`/events/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}`);
  },
};

// ── Syllabus ──────────────────────────────────────────────────────────────────
export const syllabusService = {
  upload: async (file: File, courseId?: string): Promise<SyllabusUpload> => {
    const form = new FormData();
    form.append("file", file);
    if (courseId) form.append("course_id", courseId);
    const res = await api.post("/syllabus/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getStatus: async (uploadId: string): Promise<SyllabusUpload> => {
    const res = await api.get(`/syllabus/${uploadId}`);
    return res.data;
  },

  list: async (): Promise<SyllabusUpload[]> => {
    const res = await api.get("/syllabus/");
    return res.data;
  },

  delete: async (uploadId: string): Promise<void> => {
    await api.delete(`/syllabus/${uploadId}`);
  },

  // Poll status cho đến khi done/error
  pollUntilDone: (
    uploadId: string,
    onUpdate: (upload: SyllabusUpload) => void,
    intervalMs = 2000
  ): (() => void) => {
    const timer = setInterval(async () => {
      try {
        const upload = await syllabusService.getStatus(uploadId);
        onUpdate(upload);
        if (upload.status === "done" || upload.status === "error") {
          clearInterval(timer);
        }
      } catch {
        clearInterval(timer);
      }
    }, intervalMs);
    return () => clearInterval(timer);
  },
};

// ── Calendar ──────────────────────────────────────────────────────────────────
export const calendarService = {
  status: async (): Promise<GoogleSyncStatus> => {
    const res = await api.get("/calendar/status");
    return res.data;
  },

  sync: async (): Promise<{ message: string }> => {
    const res = await api.post("/calendar/sync");
    return res.data;
  },

  events: async () => {
    const res = await api.get("/calendar/events");
    return res.data;
  },

  disconnect: async (): Promise<void> => {
    await api.delete("/calendar/disconnect");
  },
};
