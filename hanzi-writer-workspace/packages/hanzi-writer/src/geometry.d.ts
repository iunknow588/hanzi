import { Point } from './typings/types';
export declare const subtract: (p1: Point, p2: Point) => {
    x: number;
    y: number;
};
export declare const magnitude: (point: Point) => number;
export declare const distance: (point1: Point, point2: Point) => number;
export declare const equals: (point1: Point, point2: Point) => boolean;
export declare const round: (point: Point, precision?: number) => {
    x: number;
    y: number;
};
export declare const length: (points: Point[]) => number;
export declare const cosineSimilarity: (point1: Point, point2: Point) => number;
/**
 * return a new point, p3, which is on the same line as p1 and p2, but distance away
 * from p2. p1, p2, p3 will always lie on the line in that order
 */
export declare const _extendPointOnLine: (p1: Point, p2: Point, dist: number) => {
    x: number;
    y: number;
};
/** based on http://www.kr.tuwien.ac.at/staff/eiter/et-archive/cdtr9464.pdf */
export declare const frechetDist: (curve1: Point[], curve2: Point[]) => number;
/** break up long segments in the curve into smaller segments of len maxLen or smaller */
export declare const subdivideCurve: (curve: Point[], maxLen?: number) => Point[];
/** redraw the curve using numPoints equally spaced out along the length of the curve */
export declare const outlineCurve: (curve: Point[], numPoints?: number) => Point[];
/** translate and scale from https://en.wikipedia.org/wiki/Procrustes_analysis */
export declare const normalizeCurve: (curve: Point[]) => Point[];
export declare const rotate: (curve: Point[], theta: number) => {
    x: number;
    y: number;
}[];
export declare const _filterParallelPoints: (points: Point[]) => Point[];
export declare function getPathString(points: Point[], close?: boolean): string;
/** take points on a path and move their start point backwards by distance */
export declare const extendStart: (points: Point[], dist: number) => Point[];
