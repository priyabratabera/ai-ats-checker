import { create } from "zustand";
import type { AnalysisProgressEvent, AnalysisResult } from "@/types/analysis";
import { AnalysisRequestError, streamAnalysis } from "@/lib/api/stream-analysis";

export type AnalysisStatus = "idle" | "analyzing" | "done" | "error";

interface AnalysisState {
  resumeFile: File | null;
  jobDescription: string;
  status: AnalysisStatus;
  progressEvents: AnalysisProgressEvent[];
  result: AnalysisResult | null;
  error: string | null;

  setResumeFile: (file: File | null) => void;
  setJobDescription: (text: string) => void;
  startAnalysis: () => Promise<void>;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  resumeFile: null,
  jobDescription: "",
  status: "idle",
  progressEvents: [],
  result: null,
  error: null,

  setResumeFile: (file) => set({ resumeFile: file }),
  setJobDescription: (text) => set({ jobDescription: text }),

  startAnalysis: async () => {
    const { resumeFile, jobDescription } = get();
    if (!resumeFile || !jobDescription.trim()) return;

    set({ status: "analyzing", progressEvents: [], result: null, error: null });

    try {
      for await (const event of streamAnalysis({ resumeFile, jobDescription })) {
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
