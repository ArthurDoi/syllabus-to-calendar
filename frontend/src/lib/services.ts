import api, { tokenStorage } from "@/lib/api";
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
    // Save tokens to localStorage for mobile compatibility (cross-site cookie blocked)
    // if (res.data?.access_token) {
    //   tokenStorage.set(res.data.access_token, res.data.refresh_token || "");
    // }
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

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Always clear localStorage tokens
      tokenStorage.clear();
    }
  },

  googleLogin: (state?: string) => {
    // Build Google OAuth URL directly on frontend — avoids navigating through Render
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
      || `${window.location.origin}/auth/callback`;

    if (!clientId) {
      // Fallback: navigate through backend (old behavior)
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      window.location.href = `${baseUrl}/auth/google/login${state ? `?state=${state}` : ""}`;
      return;
    }

    const scopes = [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar",
    ].join(" ");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "consent",
    });
    if (state) params.set("state", state);

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  googleExchange: async (code: string, state?: string): Promise<void> => {
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
      || `${window.location.origin}/auth/callback`;
    await api.post("/auth/google/exchange", {
      code,
      state: state || null,
      redirect_uri: redirectUri,  // Must match what was sent to Google
    });
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

  extract: async (uploadId: string): Promise<SyllabusUpload> => {
    const res = await api.post(`/syllabus/${uploadId}/extract`);
    return res.data;
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

// ── AI Chat ───────────────────────────────────────────────────────────────────
export interface ChatMessage { role: "user" | "assistant"; text: string; }

export interface ChatResponse {
  answer: string;
  action_taken: string | null;
}

export const chatService = {
  send: async (message: string, history: ChatMessage[] = []): Promise<ChatResponse> => {
    const res = await api.post("/chat/", { message, history });
    return res.data;
  },
};
