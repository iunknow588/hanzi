import { average } from './utils';
import {
  cosineSimilarity,
  equals,
  frechetDist,
  distance,
  subtract,
  normalizeCurve,
  rotate,
  length,
} from './geometry';
import { Point } from './typings/types';
import UserStroke from './models/UserStroke';
import Stroke from './models/Stroke';
import Character from './models/Character';

const COSINE_SIMILARITY_THRESHOLD = 0; // -1 to 1, smaller = more lenient
const START_AND_END_DIST_THRESHOLD = 250; // bigger = more lenient
const FRECHET_THRESHOLD = 0.4; // bigger = more lenient
const MIN_LEN_THRESHOLD = 0.35; // smaller = more lenient

export interface StrokeMatchMetrics {
  startDistance: number;
  endDistance: number;
  avgDirectionSimilarity: number;
  shapeDistance: number;
  lengthRatio: number;
}

export interface StrokeMatchResultMeta {
  isStrokeBackwards: boolean;
}

export interface StrokeMatchResult {
  isMatch: boolean;
  meta: StrokeMatchResultMeta;
}

export type StrokeSimilarityComponents = {
  endpoints: number;
  direction: number;
  shape: number;
  order: number;
};

export type StrokeSimilarityWeights = StrokeSimilarityComponents;

export interface StrokeSimilarityScore {
  strokeIndex: number;
  overall: number;
  components: StrokeSimilarityComponents;
  meta: StrokeMatchResultMeta;
  accepted: boolean;
}

export type StrokeSimilarityOptions = {
  leniency?: number;
  isOutlineVisible?: boolean;
  averageDistanceThreshold?: number;
  weights?: Partial<StrokeSimilarityWeights>;
};

const clamp01 = (val: number) => Math.max(0, Math.min(1, val));

const defaultSimilarityWeights: StrokeSimilarityWeights = {
  endpoints: 0.3,
  direction: 0.25,
  shape: 0.35,
  order: 0.1,
};

export default function strokeMatches(
  userStroke: UserStroke,
  character: Character,
  strokeNum: number,
  options: {
    leniency?: number;
    isOutlineVisible?: boolean;
    averageDistanceThreshold?: number;
  } = {},
): StrokeMatchResult {
  const strokes = character.strokes;
  const points = stripDuplicates(userStroke.points);

  if (points.length < 2) {
    return { isMatch: false, meta: { isStrokeBackwards: false } };
  }

  const { isMatch, meta, avgDist } = evaluateStrokeMatch(points, strokes[strokeNum], options);

  if (!isMatch) {
    return { isMatch, meta };
  }

  // if there is a better match among strokes the user hasn't drawn yet, the user probably drew the wrong stroke
  const laterStrokes = strokes.slice(strokeNum + 1);
  let closestMatchDist = avgDist;

  for (let i = 0; i < laterStrokes.length; i++) {
    const { isMatch, avgDist } = evaluateStrokeMatch(points, laterStrokes[i], {
      ...options,
      checkBackwards: false,
    });
    if (isMatch && avgDist < closestMatchDist) {
      closestMatchDist = avgDist;
    }
  }
  // if there's a better match, rather that returning false automatically, try reducing leniency instead
  // if leniency is already really high we can allow some similar strokes to pass
  if (closestMatchDist < avgDist) {
    // adjust leniency between 0.3 and 0.6 depending on how much of a better match the new match is
    const leniencyAdjustment = (0.6 * (closestMatchDist + avgDist)) / (2 * avgDist);
    const { isMatch, meta } = evaluateStrokeMatch(points, strokes[strokeNum], {
      ...options,
      leniency: (options.leniency || 1) * leniencyAdjustment,
    });
    return { isMatch, meta };
  }

  return { isMatch, meta };
}

const getEndpointDistances = (points: Point[], stroke: Stroke) => {
  return {
    startDistance: distance(stroke.getStartingPoint(), points[0]),
    endDistance: distance(stroke.getEndingPoint(), points[points.length - 1]),
  };
};

// returns a list of the direction of all segments in the line connecting the points
const getEdgeVectors = (points: Point[]) => {
  const vectors: Point[] = [];
  let lastPoint = points[0];
  points.slice(1).forEach((point) => {
    vectors.push(subtract(point, lastPoint));
    lastPoint = point;
  });
  return vectors;
};

const getAverageDirectionSimilarity = (points: Point[], stroke: Stroke) => {
  const edgeVectors = getEdgeVectors(points);
  const strokeVectors = stroke.getVectors();
  const similarities = edgeVectors.map((edgeVector) => {
    const strokeSimilarities = strokeVectors.map((strokeVector) =>
      cosineSimilarity(strokeVector, edgeVector),
    );
    return Math.max(...strokeSimilarities);
  });
  return similarities.length ? average(similarities) : 0;
};

const lengthRatio = (points: Point[], stroke: Stroke) => {
  return (length(points) + 25) / (stroke.getLength() + 25);
};

const stripDuplicates = (points: Point[]) => {
  if (points.length < 2) return points;
  const [firstPoint, ...rest] = points;
  const dedupedPoints = [firstPoint];

  for (const point of rest) {
    if (!equals(point, dedupedPoints[dedupedPoints.length - 1])) {
      dedupedPoints.push(point);
    }
  }

  return dedupedPoints;
};

const SHAPE_FIT_ROTATIONS = [
  Math.PI / 16,
  Math.PI / 32,
  0,
  (-1 * Math.PI) / 32,
  (-1 * Math.PI) / 16,
];

const getShapeDistance = (curve1: Point[], curve2: Point[]) => {
  const normCurve1 = normalizeCurve(curve1);
  const normCurve2 = normalizeCurve(curve2);
  let minDist = Infinity;
  SHAPE_FIT_ROTATIONS.forEach((theta) => {
    const dist = frechetDist(normCurve1, rotate(normCurve2, theta));
    if (dist < minDist) {
      minDist = dist;
    }
  });
  return minDist;
};

export const evaluateStrokeMatch = (
  points: Point[],
  stroke: Stroke,
  options: {
    leniency?: number;
    isOutlineVisible?: boolean;
    checkBackwards?: boolean;
    averageDistanceThreshold?: number;
  },
): StrokeMatchResult & { avgDist: number; metrics: StrokeMatchMetrics } => {
  const {
    leniency = 1,
    isOutlineVisible = false,
    checkBackwards = true,
    averageDistanceThreshold = 350,
  } = options;
  const avgDist = stroke.getAverageDistance(points);
  const distMod = isOutlineVisible || stroke.strokeNum > 0 ? 0.5 : 1;
  const withinDistThresh = avgDist <= averageDistanceThreshold * distMod * leniency;
  const metrics = collectMetrics(points, stroke);
  // short circuit for faster matching
  if (!withinDistThresh) {
    return { isMatch: false, avgDist, meta: { isStrokeBackwards: false }, metrics };
  }
  const endpointsMatch =
    metrics.startDistance <= START_AND_END_DIST_THRESHOLD * leniency &&
    metrics.endDistance <= START_AND_END_DIST_THRESHOLD * leniency;
  const directionMatch = metrics.avgDirectionSimilarity > COSINE_SIMILARITY_THRESHOLD;
  const shapeMatch = metrics.shapeDistance <= FRECHET_THRESHOLD * leniency;
  const lengthMatch = metrics.lengthRatio * leniency >= MIN_LEN_THRESHOLD;

  const isMatch =
    withinDistThresh && endpointsMatch && directionMatch && shapeMatch && lengthMatch;

  if (checkBackwards && !isMatch) {
    const backwardsMatchData = evaluateStrokeMatch([...points].reverse(), stroke, {
      ...options,
      checkBackwards: false,
    });

    if (backwardsMatchData.isMatch) {
      return {
        isMatch,
        avgDist,
        meta: { isStrokeBackwards: true },
        metrics,
      };
    }
  }

  return { isMatch, avgDist, meta: { isStrokeBackwards: false }, metrics };
};

const collectMetrics = (points: Point[], stroke: Stroke): StrokeMatchMetrics => {
  const { startDistance, endDistance } = getEndpointDistances(points, stroke);
  return {
    startDistance,
    endDistance,
    avgDirectionSimilarity: getAverageDirectionSimilarity(points, stroke),
    shapeDistance: getShapeDistance(points, stroke.points),
    lengthRatio: lengthRatio(points, stroke),
  };
};

export function evaluateStrokeSimilarity(
  userStroke: UserStroke,
  character: Character,
  strokeNum: number,
  options: StrokeSimilarityOptions = {},
): StrokeSimilarityScore {
  const strokes = character.strokes;
  const points = stripDuplicates(userStroke.points);
  const stroke = strokes[strokeNum];
  if (!stroke || points.length < 2) {
    return {
      strokeIndex: strokeNum,
      overall: 0,
      components: { endpoints: 0, direction: 0, shape: 0, order: 0 },
      meta: { isStrokeBackwards: false },
      accepted: false,
    };
  }
  const { metrics, meta } = evaluateStrokeMatch(points, stroke, {
    leniency: options.leniency,
    isOutlineVisible: options.isOutlineVisible,
    averageDistanceThreshold: options.averageDistanceThreshold,
    checkBackwards: true,
  });

  const leniency = options.leniency || 1;
  const endpointThreshold = START_AND_END_DIST_THRESHOLD * leniency;
  const startScore = clamp01(1 - metrics.startDistance / endpointThreshold);
  const endScore = clamp01(1 - metrics.endDistance / endpointThreshold);
  const endpoints = (startScore + endScore) / 2;

  const direction = clamp01((metrics.avgDirectionSimilarity + 1) / 2);

  const shapeDistanceScore = clamp01(1 - metrics.shapeDistance / (FRECHET_THRESHOLD * leniency));
  const lengthScore = clamp01(1 - Math.abs(1 - metrics.lengthRatio));
  const shape = clamp01(shapeDistanceScore * 0.7 + lengthScore * 0.3);

  const order = meta.isStrokeBackwards ? 0.3 : 1;

  const weights = {
    ...defaultSimilarityWeights,
    ...options.weights,
  };
  const totalWeight = Object.values(weights).reduce((sum, val) => sum + val, 0) || 1;
  const normalizedWeights = {
    endpoints: weights.endpoints / totalWeight,
    direction: weights.direction / totalWeight,
    shape: weights.shape / totalWeight,
    order: weights.order / totalWeight,
  };

  const components: StrokeSimilarityComponents = { endpoints, direction, shape, order };
  const overall =
    endpoints * normalizedWeights.endpoints +
    direction * normalizedWeights.direction +
    shape * normalizedWeights.shape +
    order * normalizedWeights.order;

  return {
    strokeIndex: strokeNum,
    overall,
    components,
    meta,
    accepted: false,
  };
}
