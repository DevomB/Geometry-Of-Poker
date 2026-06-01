export type Street = "preflop" | "flop" | "turn" | "river";

export type FeatureMode = "compact" | "extended";

export interface PokerStateInput {
  hero: [string, string];
  board: string[];
  deadCards?: string[];
}

export interface GeometryFeatureOptions {
  mode?: FeatureMode;
  /** Villain range as dense Float64Array(1326); defaults to uniform weights. */
  villainRange?: Float64Array;
}

export interface GeometryFeatureGroups {
  core: Record<string, number>;
  board: Record<string, number>;
  draws: Record<string, number>;
  runouts: Record<string, number>;
  vulnerability: Record<string, number>;
  removal: Record<string, number>;
  transitions: Record<string, number>;
}

export interface GeometryFeatureMetadata {
  category: string;
  categoryIndex: number;
}

export interface GeometryFeatureResult {
  state: PokerStateInput;
  street: Street;
  featureNames: string[];
  vector: number[];
  groups: GeometryFeatureGroups;
  metadata: GeometryFeatureMetadata;
}

export class GeometryFeatureError extends Error {
  constructor(
    message: string,
    readonly errors: string[] = [message],
  ) {
    super(message);
    this.name = "GeometryFeatureError";
  }
}
