type StrokeScoreComponents = {
    endpoints: number;
    direction: number;
    shape: number;
    order: number;
};
type StrokeScore = {
    overall: number;
    components: StrokeScoreComponents;
};
type CellScore = {
    id: string;
    char: string;
    standardStrokeCount?: number | null;
    score?: StrokeScore | null;
};
type ScoreMetrics = {
    scoredCount: number;
    averageScore: number | null;
};
declare const averageScores: (cells: CellScore[]) => ScoreMetrics;

export { type CellScore, type ScoreMetrics, type StrokeScore, type StrokeScoreComponents, averageScores };
