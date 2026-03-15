import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up existing seed data
  await prisma.manuscriptVersion.deleteMany({});
  await prisma.qaFinding.deleteMany({});
  await prisma.qaRun.deleteMany({});
  await prisma.chapterVersion.deleteMany({});
  await prisma.chapter.deleteMany({});
  await prisma.bookPlan.deleteMany({});
  await prisma.project.deleteMany({});

  // ─── Create Test Project ───────────────────────────────────────────────────

  const project = await prisma.project.create({
    data: {
      title: "Produktivität im digitalen Zeitalter",
      topic:
        "Ein umfassendes Handbuch für Wissensarbeiter, das erklärt, wie man im Zeitalter der digitalen Ablenkungen fokussiert, effektiv und nachhaltig produktiv bleibt. Das Buch kombiniert neurowissenschaftliche Erkenntnisse mit praxiserprobten Methoden.",
      bookType: "Non-Fiction",
      targetAudience:
        "Unternehmer, Freelancer und Wissensarbeiter im digitalen Bereich, 28–50 Jahre, die bereits erste Produktivitäts-Tools kennen, aber ein kohärentes System suchen.",
      language: "German",
      targetPageCount: 240,
      targetWordCount: 60000,
      chapterCount: 5,
      tonality: "Conversational",
      status: "GENERATING",
    },
  });

  console.log("✅ Project created:", project.title);

  // ─── Create Book Plan ──────────────────────────────────────────────────────

  const outline = [
    {
      order: 1,
      title: "Die Produktivitätslüge: Warum wir uns selbst betrügen",
      goal:
        "Den Mythos der klassischen Produktivität entlarven und den Leser für einen neuen Ansatz öffnen.",
      keyPoints: [
        "Was Produktivität wirklich bedeutet (nicht Beschäftigung)",
        "Die Kosten der ständigen Erreichbarkeit",
        "Warum To-Do-Listen allein nicht funktionieren",
        "Das neue Paradigma: Energie statt Zeit",
      ],
      targetWordCount: 9200,
    },
    {
      order: 2,
      title: "Das Fundament: Energie, Fokus und Rituale",
      goal:
        "Die biologischen und psychologischen Grundlagen für nachhaltige Leistungsfähigkeit vorstellen.",
      keyPoints: [
        "Circadianer Rhythmus und Produktivitätspeak",
        "Die Neurobiologie des Fokus",
        "Rituale als kognitive Abkürzungen",
        "Das Minimum Viable Routine (MVR) Framework",
      ],
      targetWordCount: 12400,
    },
    {
      order: 3,
      title: "Deep Work in einer flachen Welt",
      goal:
        "Konkrete Strategien für tiefes, konzentriertes Arbeiten im Alltag vorstellen und implementieren.",
      keyPoints: [
        "Die vier Deep-Work-Philosophien",
        "Ablenkungsarchitektur: die Umgebung gestalten",
        "Das Time-Blocking-System",
        "Digitale Hygiene und Tool-Minimalismus",
      ],
      targetWordCount: 13800,
    },
    {
      order: 4,
      title: "Das System: Vom Chaos zur Klarheit",
      goal:
        "Ein vollständiges, persönliches Produktivitätssystem aufbauen, das mit dem Leser wächst.",
      keyPoints: [
        "Capture → Clarify → Organize → Reflect → Engage",
        "Die Wochenreview-Routine",
        "Projekte vs. Aufgaben: Die richtige Granularität",
        "Digitale vs. analoge Werkzeuge",
      ],
      targetWordCount: 13800,
    },
    {
      order: 5,
      title: "Nachhaltigkeit: Produktiv bleiben ohne auszubrennen",
      goal:
        "Langfristige Strategien für nachhaltige Produktivität ohne Burnout-Risiko vorstellen.",
      keyPoints: [
        "Erholung als Teil der Produktivitätsstrategie",
        "Die Kunst des strategischen Nichtstuns",
        "Sozialer Support und Accountability",
        "Der persönliche Aktionsplan für die nächsten 90 Tage",
      ],
      targetWordCount: 10800,
    },
  ];

  const bookPlan = await prisma.bookPlan.create({
    data: {
      projectId: project.id,
      outline: JSON.stringify(outline),
      globalSummary: `„Produktivität im digitalen Zeitalter" räumt mit den gängigen Mythen über Produktivität auf und bietet Wissensarbeitern ein wissenschaftlich fundiertes, praxiserprobtes System für nachhaltige Hochleistung.

Das Buch folgt einer klaren Progression: Von der Desillusionierung über die biologischen Grundlagen bis hin zu einem vollständigen, personalisierbaren System und schließlich den Strategien für langfristige Nachhaltigkeit. Jedes Kapitel baut auf dem vorherigen auf.

Das Kernversprechen: Mit weniger Aufwand und Stress mehr von dem erreichen, was wirklich zählt — durch ein System, das zur persönlichen Energie und Lebensrealität passt, nicht gegen sie arbeitet.`,
      styleRules: `**Ton und Stimme**: Direkt und gesprächsnah, wie ein erfahrener Coach. Duzen ist Standard ("du" nicht "Sie"). Manchmal provokant und direktsprechen.

**Satzstruktur**: Kurze Sätze bevorzugen (max. 20 Wörter). Lange Sätze sparsam für Rhythmus. Aktiv statt Passiv.

**Beispiele**: Jede abstrakte Aussage mit einem konkreten Beispiel aus der digitalen Arbeitswelt untermauern. Startup-, Freelance- und Unternehmenskontext abwechselnd verwenden.

**Listen**: Maximal 5 Punkte pro Liste. Keine verschachtelten Listen. Listen nur, wenn wirklich Listenpunkte sinnvoll sind.

**Zahlen**: Zahlen ab 13 als Ziffern. Statistiken immer als Ziffern mit Quelle.`,
      conceptList: JSON.stringify([
        "Deep Work",
        "Produktivitätssystem",
        "Energiemanagement",
        "Fokuszone",
        "Circadianer Rhythmus",
        "Minimum Viable Routine (MVR)",
        "Ablenkungsarchitektur",
        "Time-Blocking",
        "Wochenreview",
        "Kognitive Last",
        "Slow Productivity",
        "Newport-Prinzip",
      ]),
      noGoList: JSON.stringify([
        "Hustle-Culture-Phrasen (Work hard, play hard, always be grinding etc.)",
        "Inhalte aus vorherigen Kapiteln ohne Mehrwert wiederholen",
        "Produktivitaets-Apps oder -Tools namentlich empfehlen (zu schnell veraltet)",
        "Absolute Versprechungen (Du wirst nie wieder ueberarbeitet sein)",
        "Akademischer Stil mit Fussnoten und Literaturverweisen",
        "Mehr als 5 Aufzaehlungspunkte in einer Liste",
      ]),
    },
  });

  console.log("✅ Book plan created");

  // ─── Create Chapters ───────────────────────────────────────────────────────

  const chapterContents = [
    {
      content: `## Die Produktivitätslüge: Warum wir uns selbst betrügen

Stell dir vor, du beendest einen langen Arbeitstag und schaust auf deine To-Do-Liste. 23 Aufgaben, 19 davon abgehakt. Du hast praktisch den ganzen Tag gearbeitet. Und trotzdem hast du das nagende Gefühl, dass du heute nichts wirklich Wichtiges getan hast.

Willkommen im Produktivitätsparadox des 21. Jahrhunderts.

### Die Beschäftigungsfalle

Wir haben Beschäftigung mit Produktivität verwechselt. Das ist nicht deine Schuld — es ist ein systematisches Problem. Die meisten Arbeitsplätze belohnen sichtbare Aktivität: volle Kalender, schnelle Antworten, permanente Verfügbarkeit. Tiefe, konzentrierte Arbeit hingegen ist unsichtbar.

Wenn Produktivität wirklich bedeuten würde "so viele Aufgaben wie möglich abhaken", dann wäre ein Hamster im Rad das produktivste Lebewesen der Welt. Viel Bewegung. Null Fortschritt.

Echte Produktivität ist etwas anderes. Sie fragt nicht: "Wie viel habe ich getan?" Sie fragt: "Wie viel von dem, was ich getan habe, hat wirklich etwas verändert?"

### Was Produktivität wirklich kostet

Die permanente Verbindung hat ihren Preis. Studien zeigen, dass Wissensarbeiter im Durchschnitt alle 11 Minuten unterbrochen werden — und nach einer Unterbrechung 23 Minuten brauchen, um wieder vollständig in eine Aufgabe einzutauchen.

Mach die Rechnung: Wenn du an einem 8-Stunden-Tag nur 10-mal unterbrochen wirst, verlierst du theoretisch mehr Zeit durch Wiederanlaufen als du tatsächlich konzentriert arbeitest.

### Das neue Paradigma

Das Buch, das du gerade in den Händen hältst, folgt einer anderen Logik. Nicht mehr Zeit, sondern bessere Energie. Nicht mehr Aufgaben, sondern die richtigen Entscheidungen. Nicht mehr Tools, sondern ein kohärentes System.

Im nächsten Kapitel legen wir das Fundament dafür.`,
      wordCount: 312,
      summary:
        "Kapitel 1 entlarvt den Mythos der Beschäftigungsproduktiviät und zeigt, warum permanente Verfügbarkeit uns schadest. Einführung des neuen Paradigmas: Energie statt Zeit, Wirksamkeit statt Quantität.",
    },
    {
      content: `## Das Fundament: Energie, Fokus und Rituale

Es gibt eine Frage, die ich in fast jedem meiner Workshops stelle: "Wann bist du am leistungsfähigsten?"

Die meisten zögern. Einige sagen "morgens". Andere "abends". Manche antworten "wenn ich einen Deadline habe". Was mich daran fasziniert: Die wenigsten nutzen diese Information aktiv.

### Circadianer Rhythmus und dein persönlicher Produktivitätspeak

Dein Körper ist keine konstante Maschine. Er folgt einem 24-Stunden-Rhythmus, dem circadianen Rhythmus, der nahezu jede biologische Funktion steuert: Körpertemperatur, Hormonspiegel, Reaktionszeit, Kreativität.

Kognitive Leistungsfähigkeit, Reaktionszeit und die Fähigkeit zu Deep Work folgen einem vorhersagbaren Muster. Bei den meisten Menschen gibt es ein Hauptfenster (morgens bis mittags), ein Leistungsloch (früher Nachmittag) und ein zweites, kleineres Fenster (später Nachmittag).

Das Wichtigste: Diese Phasen sind nicht verhandelbar. Du kannst deinen circadianen Rhythmus nicht überreden.

### Die Neurobiologie des Fokus

Wenn du fokussiert arbeitest, aktivierst du was Neurowissenschaftler als "Default Mode Network Off-Mode" bezeichnen — ein Zustand, in dem dein Gehirn auf eine einzige Aufgabe ausgerichtet ist und externe Reize aktiv unterdrückt.

Dieser Zustand braucht Zeit zum Aufwärmen (typisch: 15–25 Minuten), wird durch Unterbrechungen sofort durchbrochen, und kann mit Training verlängert und vertieft werden.

### Das Minimum Viable Routine Framework

Rituale sind kognitive Abkürzungen. Wenn du jeden Morgen dieselbe Sequenz von Handlungen ausführst, beginnt dein Gehirn, diese Sequenz mit dem Zustand "jetzt arbeite ich konzentriert" zu verknüpfen.

Das MVR besteht aus nur drei Elementen: einem klaren Start-Signal, einer kurzen Intentions-Setzung (3 Minuten) und einem definierten Erste-Aufgabe-Protokoll. Nicht mehr. Nicht weniger.`,
      wordCount: 328,
      summary:
        "Kapitel 2 erklärt die biologischen Grundlagen der Leistungsfähigkeit: circadianer Rhythmus, Neurobiologie des Fokus, und das Minimum Viable Routine Framework als praxisnaher Einstieg in tägliche Rituale.",
    },
    null,
    null,
    null,
  ];

  const createdChapters = [];
  for (let i = 0; i < outline.length; i++) {
    const chapterData = outline[i];
    const mockContent = chapterContents[i];

    const chapter = await prisma.chapter.create({
      data: {
        projectId: project.id,
        order: chapterData.order,
        title: chapterData.title,
        goal: chapterData.goal,
        targetWordCount: chapterData.targetWordCount,
        actualWordCount: mockContent?.wordCount ?? 0,
        status: mockContent ? "DRAFT" : "PENDING",
        summary: mockContent?.summary ?? null,
        currentContent: mockContent?.content ?? null,
      },
    });

    if (mockContent) {
      await prisma.chapterVersion.create({
        data: {
          chapterId: chapter.id,
          version: 1,
          content: mockContent.content,
          wordCount: mockContent.wordCount,
          summary: mockContent.summary,
        },
      });
    }

    createdChapters.push(chapter);
    console.log(`  ✅ Chapter ${chapterData.order}: ${chapterData.title}`);
  }

  // ─── Create a QA Run ───────────────────────────────────────────────────────

  const qaRun = await prisma.qaRun.create({
    data: {
      projectId: project.id,
      status: "COMPLETED",
      overallScore: 72.5,
      completedAt: new Date(),
    },
  });

  await prisma.qaFinding.createMany({
    data: [
      {
        qaRunId: qaRun.id,
        chapterId: createdChapters[2].id,
        findingType: "WORD_COUNT",
        severity: "CRITICAL",
        description:
          "Chapter 3 \"Deep Work in einer flachen Welt\" has no content yet (0 of 13,800 target words).",
        suggestion:
          "Generate content for this chapter. It is the most content-heavy chapter in the book.",
        status: "OPEN",
      },
      {
        qaRunId: qaRun.id,
        chapterId: createdChapters[3].id,
        findingType: "WORD_COUNT",
        severity: "CRITICAL",
        description:
          "Chapter 4 \"Das System: Vom Chaos zur Klarheit\" has no content yet (0 of 13,800 target words).",
        suggestion:
          "Generate this chapter. It contains the core system of the book.",
        status: "OPEN",
      },
      {
        qaRunId: qaRun.id,
        chapterId: null,
        findingType: "COMPLETENESS",
        severity: "HIGH",
        description:
          "The manuscript is severely under the target word count: 640 of 60,000 words (1%). Three chapters have no content.",
        suggestion:
          "Generate chapters 3, 4, and 5 to reach a viable manuscript state.",
        status: "OPEN",
      },
      {
        qaRunId: qaRun.id,
        chapterId: createdChapters[0].id,
        findingType: "TRANSITION",
        severity: "LOW",
        description:
          "Chapter 1 ends somewhat abruptly. The transition to Chapter 2 could be smoother.",
        suggestion:
          "Add a closing paragraph that explicitly bridges the concept of the 'new paradigm' to the biological foundation discussed in Chapter 2.",
        status: "ACKNOWLEDGED",
      },
      {
        qaRunId: qaRun.id,
        chapterId: createdChapters[1].id,
        findingType: "RED_THREAD",
        severity: "LOW",
        description:
          "The MVR Framework is introduced in Chapter 2 but not explicitly linked back to the core thesis from Chapter 1.",
        suggestion:
          "Add a brief sentence connecting MVR to the energy-vs-time paradigm introduced in Chapter 1.",
        status: "OPEN",
      },
    ],
  });

  console.log("✅ QA run and findings created");

  // Update project word count
  await prisma.project.update({
    where: { id: project.id },
    data: { actualWordCount: 640 },
  });

  console.log("\n🎉 Seed complete!");
  console.log(`   Project ID: ${project.id}`);
  console.log(`   Book Plan ID: ${bookPlan.id}`);
  console.log(`   QA Run ID: ${qaRun.id}`);
  console.log("\n   Access the project at:");
  console.log(`   http://localhost:3000/projects/${project.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
