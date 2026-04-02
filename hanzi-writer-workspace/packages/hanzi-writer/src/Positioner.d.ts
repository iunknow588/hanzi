import { Point } from './typings/types';
export type PositionerOptions = {
    /** Default: 0 */
    width: number;
    /** Default: 0 */
    height: number;
    /** Default: 20 */
    padding: number;
};
export default class Positioner {
    padding: number;
    width: number;
    height: number;
    xOffset: number;
    yOffset: number;
    scale: number;
    constructor(options: PositionerOptions);
    convertExternalPoint(point: Point): {
        x: number;
        y: number;
    };
}
