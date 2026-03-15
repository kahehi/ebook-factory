# E-Book Factory

A production-ready Next.js web application for AI-powered e-book generation, built on an n8n agent architecture where one agent handles each chapter and a QA/cohesion agent reviews the complete manuscript.

## Architecture Overview

```
User → Dashboard
         ↓
  New Project Form
         ↓
  BookPlannerAgent → Chapter outlines + word budgets + style rules
         ↓
  n8n Workflow (parallel)
  ├── ChapterAgent (Chapter 1)
  ├── ChapterAgent (Chapter 2)
  ├── ChapterAgent (Chapter 3)
  └── ... (one agent per chapter, all parallel)
         ↓
  LengthSupervisorAgent → Word count validation
         ↓
  QaCohesionAgent → Finds issues (red thread, consistency, transitions)
         ↓
  ManuscriptService → Assembles final document
```

### Agent Roles

| Agent | Responsibility |
|-------|---------------|
| `BookPlannerAgent` | Creates full chapter outline, global summary, style rules, concept list, no-go list |
| `ChapterAgent` | Writes one chapter using full context (outline, summaries, style rules) |
| `LengthSupervisorAgent` | Checks word count compliance per chapter and overall |
| `QaCohesionAgent` | Reviews full manuscript for red thread, transitions, consistency, tonality |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict)
- **Database**: PostgreSQL via Prisma ORM
- **UI**: Tailwind CSS + shadcn/ui components
- **Validation**: Zod
- **AI**: Mock implementations — easily swappable to Anthropic Claude or any LLM

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or pnpm

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env with your database credentials
# DATABASE_URL="postgresql://user:password@localhost:5432/ebook_factory"

# 4. Run database migrations
npm run db:migrate

# 5. Generate Prisma client
npm run db:generate

# 6. (Optional) Seed with demo data
npm run db:seed

# 7. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Management

```bash
npm run db:migrate      # Run migrations
npm run db:generate     # Regenerate Prisma client after schema changes
npm run db:seed         # Seed with demo project
npm run db:studio       # Open Prisma Studio (visual DB browser)
```

## Project Status Flow

```
DRAFT → PLANNING → GENERATING → QA_REVIEW → QA_FIXING → COMPLETED → (ARCHIVED)
```

| Status | Meaning |
|--------|---------|
| DRAFT | Project created, no plan yet |
| PLANNING | BookPlannerAgent is running |
| GENERATING | Chapters being generated |
| QA_REVIEW | QA agent analyzing manuscript |
| QA_FIXING | Applying QA fix suggestions |
| COMPLETED | Manuscript assembled and ready |
| ARCHIVED | No longer active |

## API Reference

All endpoints return `{ success: boolean, data: T, event?: string }`.

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project with full details |
| DELETE | `/api/projects/:id` | Delete project |

### Book Plan

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:id/plan` | Generate book plan |
| GET | `/api/projects/:id/plan` | Get existing plan |

### Chapter Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:id/generate-chapters` | Get chapter IDs for parallel generation |
| POST | `/api/projects/:id/chapters/:cid/generate` | Generate single chapter |
| POST | `/api/projects/:id/chapters/:cid/rewrite` | Rewrite chapter (with optional instructions) |

### QA

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:id/run-qa` | Run full QA analysis |
| GET | `/api/projects/:id/run-qa` | Get latest QA run |
| POST | `/api/projects/:id/apply-qa-fixes` | Acknowledge/apply QA findings |

### Manuscript

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:id/manuscript` | Assemble manuscript |
| GET | `/api/projects/:id/manuscript` | Get latest manuscript |

### Request Bodies

**POST /api/projects**
```json
{
  "title": "My E-Book",
  "topic": "A detailed description of the topic...",
  "bookType": "Non-Fiction",
  "targetAudience": "Professionals aged 30-50...",
  "language": "German",
  "targetPageCount": 200,
  "chapterCount": 10,
  "tonality": "Conversational",
  "seriesContext": "Optional: part of a series..."
}
```

**POST /api/projects/:id/chapters/:cid/rewrite**
```json
{
  "instructions": "Make this chapter more engaging with more examples..."
}
```

**POST /api/projects/:id/apply-qa-fixes**
```json
{
  "findingIds": ["cuid1", "cuid2"]
}
```

## n8n Integration Guide

### Overview

The application emits webhook events to `WEBHOOK_URL` (if configured in `.env`). Each event is a POST request with:

```json
{
  "eventType": "chapter.generated",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "projectId": "clxxx...",
  "payload": { ... }
}
```

### Event Types

| Event | Trigger | Payload |
|-------|---------|---------|
| `project.created` | New project created | `{ projectId, projectTitle, planUrl }` |
| `plan.generated` | Book plan ready | `{ projectId, chapterCount, totalTargetWords, generateChaptersUrl }` |
| `chapter.generated` | Single chapter done | `{ projectId, chapterId, chapterOrder, wordCount }` |
| `chapter.rewritten` | Chapter rewritten | `{ projectId, chapterId, chapterOrder, wordCount }` |
| `qa.started` | QA analysis started | `{ projectId }` |
| `qa.completed` | QA analysis done | `{ projectId, qaRunId, overallScore, findingCount, applyFixesUrl }` |
| `manuscript.ready` | Manuscript assembled | `{ projectId, version, wordCount, manuscriptUrl }` |

### Recommended n8n Workflow: Parallel Chapter Generation

```
Webhook (plan.generated)
  ↓
HTTP Request: POST /api/projects/{{projectId}}/generate-chapters
  ↓ Returns: { chapterIds: ["id1", "id2", ...] }
SplitInBatches (chapterIds, batch size: 3-5)
  ↓ (parallel for each batch)
HTTP Request: POST /api/projects/{{projectId}}/chapters/{{chapterId}}/generate
  ↓ (wait for all to complete)
Merge
  ↓
HTTP Request: POST /api/projects/{{projectId}}/run-qa
  ↓
HTTP Request: POST /api/projects/{{projectId}}/manuscript
```

### n8n Workflow: Full Automation

1. **Trigger**: Webhook on `project.created`
2. **Step 1**: `POST /api/projects/{id}/plan` — generate book plan
3. **Step 2**: `POST /api/projects/{id}/generate-chapters` — get chapter IDs
4. **Step 3**: SplitInBatches + parallel `POST /api/projects/{id}/chapters/{cid}/generate`
5. **Step 4**: After all chapters done: `POST /api/projects/{id}/run-qa`
6. **Step 5**: If score < 70: `POST /api/projects/{id}/apply-qa-fixes` + regenerate low-scoring chapters
7. **Step 6**: `POST /api/projects/{id}/manuscript` — assemble final document
8. **Notify**: Email/Slack with download link

### Environment Variable Setup

```bash
WEBHOOK_URL="https://your-n8n-instance.com/webhook/ebook-factory"
```

## Connecting Real AI

The agents are designed with a clear swap point. In each agent file, look for:

```typescript
// Replace with real AI call
// Example with Anthropic:
// const response = await anthropic.messages.create({
//   model: "claude-3-5-sonnet-20241022",
//   max_tokens: 4096,
//   messages: [{ role: "user", content: prompt }],
// });
```

To connect Anthropic Claude:

1. `npm install @anthropic-ai/sdk`
2. Add `ANTHROPIC_API_KEY` to `.env`
3. Replace the mock return in each agent with the real API call
4. The prompts are already built in `src/agents/prompt-builder.ts`

## Development Notes

### Word Count Math

- `WORDS_PER_PAGE = 250`
- `targetWordCount = targetPageCount × 250`
- Word budgets are distributed across chapters with slight bonuses for first and last chapters

### Adding New Book Types

Add to the `bookType` enum in:
1. `src/types/index.ts` — Zod schema
2. `src/app/projects/new/page.tsx` — form dropdown

### Extending QA Findings

Add new finding types to:
1. `prisma/schema.prisma` — `QaFindingType` enum
2. `src/agents/qa-cohesion-agent.ts` — detection logic
3. `src/app/projects/[id]/page.tsx` — display labels

## Folder Structure

```
src/
├── agents/                  # AI agent implementations
│   ├── book-planner-agent.ts
│   ├── chapter-agent.ts
│   ├── qa-cohesion-agent.ts
│   ├── length-supervisor-agent.ts
│   └── prompt-builder.ts    # All prompt templates
├── app/                     # Next.js App Router
│   ├── api/                 # API routes
│   │   └── projects/
│   ├── projects/            # UI pages
│   │   ├── new/
│   │   └── [id]/
│   ├── layout.tsx
│   └── page.tsx             # Dashboard
├── components/
│   ├── layout/              # Sidebar, Header
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── prisma.ts            # DB singleton
│   └── utils.ts             # Utility functions
├── services/                # Business logic layer
│   ├── book-plan-service.ts
│   ├── chapter-service.ts
│   ├── event-service.ts
│   ├── manuscript-service.ts
│   ├── project-service.ts
│   └── qa-service.ts
└── types/
    └── index.ts             # All TypeScript types + Zod schemas
prisma/
├── schema.prisma            # Database schema
└── seed.ts                  # Demo data
```
