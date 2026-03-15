import { z } from "zod";

// ─── String-literal types (replaces Prisma enums for SQLite compatibility) ────

export type ProjectStatus =
  | "DRAFT"
  | "PLANNING"
  | "GENERATING"
  | "QA_REVIEW"
  | "QA_FIXING"
  | "COMPLETED"
  | "ARCHIVED";

export type ChapterStatus =
  | "PENDING"
  | "GENERATING"
  | "DRAFT"
  | "REVIEWING"
  | "APPROVED"
  | "NEEDS_REVISION";

export type QaRunStatus = "RUNNING" | "COMPLETED" | "FAILED";

export type QaFindingType =
  | "RED_THREAD"
  | "TRANSITION"
  | "CONSISTENCY"
  | "REPETITION"
  | "WORD_COUNT"
  | "COMPLETENESS"
  | "TONALITY"
  | "SPELLING"
  | "GRAMMAR"
  | "FORMATTING"
  | "CITATION";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type QaFindingStatus = "OPEN" | "ACKNOWLEDGED" | "FIXED" | "IGNORED";

// ─── Prisma model shapes (mirrors generated types) ────────────────────────────

export interface Project {
  id: string;
  title: string;
  topic: string;
  bookType: string;
  targetAudience: string;
  language: string;
  targetPageCount: number;
  targetWordCount: number;
  actualWordCount: number;
  chapterCount: number;
  tonality: string;
  seriesContext: string | null;
  seriesId: string | null;
  bookIndexInSeries: number | null;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookPlan {
  id: string;
  projectId: string;
  outline: string;
  globalSummary: string;
  styleRules: string;
  conceptList: string;
  noGoList: string;
  generatedAt: Date;
}

export interface Chapter {
  id: string;
  projectId: string;
  order: number;
  title: string;
  goal: string;
  targetWordCount: number;
  actualWordCount: number;
  status: ChapterStatus;
  summary: string | null;
  prevChapterSummary: string | null;
  nextChapterSummary: string | null;
  currentContent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChapterVersion {
  id: string;
  chapterId: string;
  version: number;
  content: string;
  wordCount: number;
  summary: string | null;
  createdAt: Date;
}

export interface QaRun {
  id: string;
  projectId: string;
  status: QaRunStatus;
  overallScore: number | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface QaFinding {
  id: string;
  qaRunId: string;
  chapterId: string | null;
  findingType: QaFindingType;
  severity: Severity;
  description: string;
  suggestion: string;
  status: QaFindingStatus;
}

export interface ManuscriptVersion {
  id: string;
  projectId: string;
  version: number;
  content: string;
  wordCount: number;
  createdAt: Date;
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

export const CreateProjectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  topic: z.string().min(10, "Topic must be at least 10 characters").max(1000),
  bookType: z.enum(["Non-Fiction", "Self-Help", "How-To", "Business", "Fiction"]),
  targetAudience: z.string().min(5).max(500),
  language: z.enum(["German", "English"]).default("German"),
  targetPageCount: z.number().int().min(10).max(1000),
  targetWordCount: z.number().int().min(2500).max(250000).optional(),
  chapterCount: z.number().int().min(3).max(50),
  tonality: z.enum([
    "Professional",
    "Conversational",
    "Academic",
    "Motivational",
    "Storytelling",
    "Technical",
  ]),
  seriesContext: z.string().max(2000).optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const GenerateChapterSchema = z.object({
  instructions: z.string().max(2000).optional(),
});

export type GenerateChapterInput = z.infer<typeof GenerateChapterSchema>;

export const ApplyQaFixesSchema = z.object({
  findingIds: z.array(z.string()).optional(),
});

export type ApplyQaFixesInput = z.infer<typeof ApplyQaFixesSchema>;

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  event?: string;
  error?: string;
}

// ─── Rich Response Types (with relations) ────────────────────────────────────

export type ProjectResponse = Project & {
  bookPlan?: BookPlan | null;
  chapters?: ChapterResponse[];
  qaRuns?: QaRunResponse[];
  _count?: {
    chapters: number;
    qaRuns: number;
  };
};

export type BookPlanResponse = BookPlan & {
  project?: Project;
};

export type ChapterResponse = Chapter & {
  versions?: ChapterVersion[];
  qaFindings?: QaFinding[];
};

export type QaRunResponse = QaRun & {
  findings: QaFinding[];
};

export type ManuscriptVersionResponse = ManuscriptVersion & {
  project?: Project;
};

// ─── Agent I/O Types ──────────────────────────────────────────────────────────

export interface ChapterOutlineItem {
  order: number;
  title: string;
  goal: string;
  keyPoints: string[];
  targetWordCount: number;
}

export interface BookPlannerInput {
  title: string;
  topic: string;
  bookType: string;
  targetAudience: string;
  language: string;
  targetWordCount: number;
  chapterCount: number;
  tonality: string;
  seriesContext?: string;
}

export interface BookPlanResult {
  outline: ChapterOutlineItem[];
  globalSummary: string;
  styleRules: string;
  conceptList: string[];
  noGoList: string[];
}

export interface ChapterAgentInput {
  bookTitle: string;
  bookTopic: string;
  bookType: string;
  targetAudience: string;
  language: string;
  tonality: string;
  globalSummary: string;
  styleRules: string;
  conceptList: string[];
  noGoList: string[];
  seriesContext?: string;
  outline: ChapterOutlineItem[];
  chapterOrder: number;
  chapterTitle: string;
  chapterGoal: string;
  targetWordCount: number;
  prevChapterSummary?: string;
  nextChapterSummary?: string;
  rewriteInstructions?: string;
}

export interface ChapterAgentOutput {
  content: string;
  summary: string;
  wordCount: number;
}

export interface QaAgentInput {
  projectId: string;
  bookTitle: string;
  bookTopic: string;
  targetAudience: string;
  language: string;
  tonality: string;
  globalSummary: string;
  styleRules: string;
  conceptList: string[];
  noGoList: string[];
  targetWordCount: number;
  chapters: Array<{
    id: string;
    order: number;
    title: string;
    goal: string;
    content: string;
    wordCount: number;
    targetWordCount: number;
  }>;
}

export interface QaFindingData {
  chapterId?: string;
  findingType: QaFindingType;
  severity: Severity;
  description: string;
  suggestion: string;
}

export interface QaAgentOutput {
  findings: QaFindingData[];
  overallScore: number;
  summary: string;
}

export interface LengthIssue {
  chapterId: string;
  chapterTitle: string;
  currentWordCount: number;
  targetWordCount: number;
  issue: string;
  recommendation: string;
  adjustmentWords: number;
}

export interface LengthCheckResult {
  status: "OK" | "WARNING" | "CRITICAL";
  projectedTotal: number;
  targetTotal: number;
  issues: LengthIssue[];
  summary: string;
}

// ─── Event Types ──────────────────────────────────────────────────────────────

export type EventType =
  | "project.created"
  | "plan.generated"
  | "chapter.generated"
  | "chapter.rewritten"
  | "qa.started"
  | "qa.completed"
  | "manuscript.ready"
  | "series.created"
  | "series.confirmed";

export interface WebhookEvent<T = unknown> {
  eventType: EventType;
  timestamp: string;
  projectId: string;
  payload: T;
}

// ─── Book Series Types ────────────────────────────────────────────────────────

export type SeriesStatus = "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export interface BookSeries {
  id: string;
  title: string;
  topic: string;
  targetAudience: string;
  language: string;
  tonality: string;
  status: SeriesStatus;
  suggestedPlan: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeriesPlannerInput {
  title: string;
  topic: string;
  targetAudience: string;
  language: string;
  tonality: string;
}

export interface SeriesBookSuggestion {
  index: number;
  title: string;
  subtitle: string;
  topic: string;
  description: string;
  targetWordCount: number;
  targetPageCount: number;
  keyThemes: string[];
  seriesRole: string;
}

export interface SeriesPlanSuggestion {
  recommendedBookCount: number;
  reasoning: string;
  books: SeriesBookSuggestion[];
}

export type SeriesResponse = BookSeries & {
  projects?: ProjectResponse[];
};

export const CreateSeriesSchema = z.object({
  title: z.string().min(3).max(200),
  topic: z.string().min(10).max(1000),
  targetAudience: z.string().min(5).max(500),
  language: z.enum(["German", "English"]).default("German"),
  tonality: z.enum([
    "Professional",
    "Conversational",
    "Academic",
    "Motivational",
    "Storytelling",
    "Technical",
  ]),
});

export type CreateSeriesInput = z.infer<typeof CreateSeriesSchema>;

export const ConfirmSeriesPlanSchema = z.object({
  books: z.array(
    z.object({
      index: z.number(),
      title: z.string().min(3),
      subtitle: z.string(),
      topic: z.string().min(10),
      description: z.string(),
      targetWordCount: z.number().int().min(5000),
      targetPageCount: z.number().int().min(20),
      keyThemes: z.array(z.string()),
      seriesRole: z.string(),
    })
  ),
});

export type ConfirmSeriesPlanInput = z.infer<typeof ConfirmSeriesPlanSchema>;
