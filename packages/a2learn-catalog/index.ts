import { Catalog } from "@a2ui/web_core/v0_9";
import { LitComponentApi, basicCatalog } from "@a2ui/lit/v0_9";
import { A2learnLearningPath } from "./components/LearningPath";
import { A2learnFlashcard } from "./components/Flashcard";
import { A2learnQuizCard } from "./components/QuizCard";
import { A2learnAchievement } from "./components/Achievement";
import { A2learnConceptCard } from "./components/ConceptCard";
import { A2learnKnowledgeTree } from "./components/KnowledgeTree";
import { A2learnCourseOutline } from "./components/CourseOutline";
import { A2learnSectionNavigator } from "./components/SectionNavigator";
import { A2learnResourceList } from "./components/ResourceList";
import { A2learnInteractiveSandbox } from "./components/InteractiveSandbox";
import { A2learnClozeTest } from "./components/ClozeTest";
import { A2learnDragAndDropMatch } from "./components/DragAndDropMatch";
import { A2learnTimeline } from "./components/Timeline";
import { A2learnAnalogyCard } from "./components/AnalogyCard";
import { A2learnDeepDivePrompt } from "./components/DeepDivePrompt";
import { A2learnCodeSnippet } from "./components/CodeSnippet";
import { A2learnSmartAnnotationBoard } from "./components/SmartAnnotationBoard";
import { A2learnDocumentFigure } from "./components/DocumentFigure";
import { A2learnScenarioDialogue } from "./components/ScenarioDialogue";

export const a2learnCatalog = new Catalog<LitComponentApi>(
  "https://a2learn.ai/spec/v1/catalog.json",
  [
    ...(basicCatalog?.components ? Array.from(basicCatalog.components.values()) : []),
    A2learnLearningPath,
    A2learnConceptCard,
    A2learnFlashcard,
    A2learnQuizCard,
    A2learnAchievement,
    A2learnKnowledgeTree,
    A2learnCourseOutline,
    A2learnSectionNavigator,
    A2learnResourceList,
    A2learnInteractiveSandbox,
    A2learnClozeTest,
    A2learnDragAndDropMatch,
    A2learnTimeline,
    A2learnAnalogyCard,
    A2learnDeepDivePrompt,
    A2learnCodeSnippet,
    A2learnSmartAnnotationBoard,
    A2learnDocumentFigure,
    A2learnScenarioDialogue,
  ],
  basicCatalog?.functions ? Array.from(basicCatalog.functions.values()) : []
);
