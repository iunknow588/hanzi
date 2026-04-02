export type StrokeScoreComponents = {
  endpoints: number;
  direction: number;
  shape: number;
  order: number;
};

export type StrokeScore = {
  overall: number;
  components: StrokeScoreComponents;
};

export type CellScore = {
  id: string;
  char: string;
  standardStrokeCount?: number | null;
  score?: StrokeScore | null;
};

export type ScoreMetrics = {
  scoredCount: number;
  averageScore: number | null;
};

export const averageScores = (cells: CellScore[]): ScoreMetrics => {
  const values = cells
    .map((cell) => cell.score?.overall ?? null)
    .filter((value): value is number => typeof value === 'number');
  if (!values.length) {
    return { scoredCount: 0, averageScore: null };
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    scoredCount: values.length,
    averageScore: total / values.length,
  };
};
