// src/index.ts
var averageScores = (cells) => {
  const values = cells.map((cell) => {
    var _a, _b;
    return (_b = (_a = cell.score) == null ? void 0 : _a.overall) != null ? _b : null;
  }).filter((value) => typeof value === "number");
  if (!values.length) {
    return { scoredCount: 0, averageScore: null };
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    scoredCount: values.length,
    averageScore: total / values.length
  };
};
export {
  averageScores
};
