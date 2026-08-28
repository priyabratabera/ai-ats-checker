import { create } from "zustand";
import type { AnalysisProgressEvent, AnalysisResult } from "@/types/analysis";
import { AnalysisRequestError, streamAnalysis } from "@/lib/api/stream-analysis";
import { emailSchema, nameSchema } from "@/lib/validation/upload";

export type AnalysisStatus = "idle" | "analyzing" | "done" | "error";

interface AnalysisState {
  name: string;
  email: string;
  resumeFile: File | null;
  jobDescription: string;
  status: AnalysisStatus;
  progressEvents: AnalysisProgressEvent[];
  result: AnalysisResult | null;
  error: string | null;

  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setResumeFile: (file: File | null) => void;
  setJobDescription: (text: string) => void;
  startAnalysis: () => Promise<void>;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  name: "",
  email: "",
  resumeFile: null,
  jobDescription: "",
  status: "idle",
  progressEvents: [],
  result: null,
  error: null,

  setName: (name) => set({ name }),
  setEmail: (email) => set({ email }),
  setResumeFile: (file) => set({ resumeFile: file }),
  setJobDescription: (text) => set({ jobDescription: text }),

  startAnalysis: async () => {
    const { name, email, resumeFile, jobDescription } = get();
    if (!resumeFile || !jobDescription.trim()) return;
    if (!nameSchema.safeParse(name).success || !emailSchema.safeParse(email).success) return;

    set({ status: "analyzing", progressEvents: [], result: null, error: null });

    try {
      for await (const event of streamAnalysis({ resumeFile, jobDescription, name, email })) {
        if (event.type === "progress") {
          set((state) => ({ progressEvents: [...state.progressEvents, event.data] }));
        } else if (event.type === "result") {
          set({ status: "done", result: event.data });
        } else if (event.type === "error") {
          set({ status: "error", error: event.data.message });
        }
      }
    } catch (err) {
      const message = err instanceof AnalysisRequestError
        ? err.message
        : "Something went wrong while analyzing your resume. Please try again.";
      set({ status: "error", error: message });
    }
  },

  // Name/email deliberately survive a reset - a returning visitor
  // shouldn't have to retype their details to analyze another resume.
  reset: () =>
    set({
      resumeFile: null,
      jobDescription: "",
      status: "idle",
      progressEvents: [],
      result: null,
      error: null,
    }),
}));
