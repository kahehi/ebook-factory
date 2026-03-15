import { prisma } from "@/lib/prisma";
import { SeriesPlannerAgent } from "@/agents/series-planner-agent";
import type {
  CreateSeriesInput,
  SeriesResponse,
  SeriesPlanSuggestion,
  ConfirmSeriesPlanInput,
  BookSeries,
} from "@/types";

export class SeriesService {
  private agent = new SeriesPlannerAgent();

  async createSeries(data: CreateSeriesInput): Promise<SeriesResponse> {
    const series = await prisma.bookSeries.create({
      data: {
        title: data.title,
        topic: data.topic,
        targetAudience: data.targetAudience,
        language: data.language,
        tonality: data.tonality,
        status: "PLANNING",
      },
      include: {
        projects: {
          include: {
            bookPlan: true,
            _count: { select: { chapters: true, qaRuns: true } },
          },
        },
      },
    });

    return series as unknown as SeriesResponse;
  }

  async getSeries(): Promise<SeriesResponse[]> {
    const allSeries = await prisma.bookSeries.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { projects: true } },
        projects: {
          select: { id: true },
        },
      },
    });

    return allSeries as unknown as SeriesResponse[];
  }

  async getSeriesById(id: string): Promise<SeriesResponse | null> {
    const series = await prisma.bookSeries.findUnique({
      where: { id },
      include: {
        projects: {
          orderBy: { bookIndexInSeries: "asc" },
          include: {
            bookPlan: true,
            _count: { select: { chapters: true, qaRuns: true } },
          },
        },
      },
    });

    if (!series) return null;
    return series as unknown as SeriesResponse;
  }

  async generatePlan(id: string): Promise<SeriesPlanSuggestion> {
    const series = await prisma.bookSeries.findUnique({ where: { id } });
    if (!series) throw new Error(`Series with id "${id}" not found`);

    const suggestion = await this.agent.generatePlan({
      title: series.title,
      topic: series.topic,
      targetAudience: series.targetAudience,
      language: series.language,
      tonality: series.tonality,
    });

    await prisma.bookSeries.update({
      where: { id },
      data: { suggestedPlan: JSON.stringify(suggestion) },
    });

    return suggestion;
  }

  async confirmPlan(
    id: string,
    data: ConfirmSeriesPlanInput
  ): Promise<SeriesResponse> {
    const series = await prisma.bookSeries.findUnique({ where: { id } });
    if (!series) throw new Error(`Series with id "${id}" not found`);

    // Create one Project per book
    await Promise.all(
      data.books.map((book) =>
        prisma.project.create({
          data: {
            title: book.title,
            topic: `${book.topic}\n\n${book.description}`,
            bookType: "Non-Fiction",
            targetAudience: series.targetAudience,
            language: series.language,
            tonality: series.tonality,
            targetWordCount: book.targetWordCount,
            targetPageCount: book.targetPageCount,
            chapterCount: Math.max(5, Math.round(book.targetWordCount / 6000)),
            seriesId: series.id,
            bookIndexInSeries: book.index,
            seriesContext: `Dies ist Buch ${book.index} von ${data.books.length} in der Serie "${series.title}". ${book.seriesRole}: ${book.description}`,
            status: "DRAFT",
          },
        })
      )
    );

    const updated = await prisma.bookSeries.update({
      where: { id },
      data: {
        confirmedAt: new Date(),
        status: "ACTIVE",
      },
      include: {
        projects: {
          orderBy: { bookIndexInSeries: "asc" },
          include: {
            bookPlan: true,
            _count: { select: { chapters: true, qaRuns: true } },
          },
        },
      },
    });

    return updated as unknown as SeriesResponse;
  }

  parseSuggestedPlan(series: BookSeries): SeriesPlanSuggestion | null {
    if (!series.suggestedPlan) return null;
    try {
      return JSON.parse(series.suggestedPlan) as SeriesPlanSuggestion;
    } catch {
      return null;
    }
  }
}

  async deleteSeries(id: string): Promise<void> {
    await prisma.bookSeries.delete({ where: { id } });
  }
}

export const seriesService = new SeriesService();
