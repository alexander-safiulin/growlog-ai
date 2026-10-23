export type NutrientHelpSectionId =
  | 'quick-start'
  | 'solver'
  | 'wand'
  | 'deviations'
  | 'water'
  | 'elements'
  | 'systems'
  | 'data-trust'
  | 'practical'
  | 'faq';

export type NutrientHelpInnerBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'math'; latex: string; display?: boolean };

export type NutrientHelpBlock =
  | NutrientHelpInnerBlock
  | { type: 'example'; exampleId: string }
  | { type: 'link'; href: string; text: string }
  | { type: 'curious'; blocks: NutrientHelpInnerBlock[] };

export interface NutrientHelpSection {
  id: NutrientHelpSectionId;
  title: string;
  summary: string;
  blocks: NutrientHelpBlock[];
}

export interface NutrientHelpLocaleContent {
  locale: string;
  pageTitle: string;
  pageIntro: string;
  sections: NutrientHelpSection[];
  /** Tab / UI area → help section for contextual links */
  contextMap: Record<string, NutrientHelpSectionId>;
}

export interface NutrientHelpWorkedExample {
  id: string;
  title: string;
  lines: string[];
}
