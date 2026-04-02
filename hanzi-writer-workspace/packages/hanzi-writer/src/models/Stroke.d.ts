import { Point } from '../typings/types';
export default class Stroke {
    path: string;
    points: Point[];
    strokeNum: number;
    isInRadical: boolean;
    constructor(path: string, points: Point[], strokeNum: number, isInRadical?: boolean);
    getStartingPoint(): Point;
    getEndingPoint(): Point;
    getLength(): number;
    getVectors(): {
        x: number;
        y: number;
    }[];
    getDistance(point: Point): number;
    getAverageDistance(points: Point[]): number;
}
