export type SceneType = 'title' | 'diagram' | 'mcq' | 'scenario_mcq' | 'summary';

export interface DiagramNode {
  id: string;
  label: string;
  sublabel?: string;
  color: string;
}

export interface PyramidDiagramConfig {
  kind: 'pyramid';
  tiers: DiagramNode[];
}

export interface ReactionDiagramConfig {
  kind: 'reaction';
  reactants: DiagramNode[];
  products: DiagramNode[];
  arrowLabel?: string;
  releasesGas?: boolean;
}

export type DiagramConfig = PyramidDiagramConfig | ReactionDiagramConfig;

export interface QuestionOption {
  id: string;
  /** Plain text option, or a "label: value" pair rendered as a two-column table row. */
  text: string;
  tableRow?: { label: string; value: string };
  correct: boolean;
  /** Shown only when this option is correct: ties the answer to a real-life practice. */
  correctRationale?: string;
  /** Shown only when this option is incorrect and was the learner's pick: names the misconception. */
  misconception?: string;
}

export interface BinTarget {
  id: string;
  label: string;
  color: string;
}

export interface ScenarioItem {
  id: string;
  label: string;
  /** id of the BinTarget this item belongs to when the CORRECT option is revealed. */
  correctBinId: string;
}

export interface ScenarioAnimation {
  bins: BinTarget[];
  items: ScenarioItem[];
}

export interface QuestionScene {
  id: string;
  type: 'mcq' | 'scenario_mcq';
  sourceRef: string;
  prompt: string;
  optionRenderStyle: 'plain' | 'table';
  options: QuestionOption[];
  scenarioAnimation?: ScenarioAnimation;
}

export interface TitleScene {
  id: string;
  type: 'title';
  title: string;
  subtitle?: string;
  durationInFrames: number;
}

export interface DiagramScene {
  id: string;
  type: 'diagram';
  title: string;
  diagram: DiagramConfig;
  durationInFrames: number;
}

export interface SummaryScene {
  id: string;
  type: 'summary';
  title: string;
  recapLines: string[];
  durationInFrames: number;
}

export type LessonScene = TitleScene | DiagramScene | QuestionScene | SummaryScene;

export interface ChooseNConfig {
  enabled: boolean;
  answerCount: number;
  ofTotal: number;
  prompt: string;
}

export interface Lesson {
  id: string;
  title: string;
  subtitle?: string;
  metadata: {
    board: string;
    grade: number;
    subject: string;
    chapter: string;
  };
  chooseN?: ChooseNConfig;
  fps: number;
  width: number;
  height: number;
  scenes: LessonScene[];
}
