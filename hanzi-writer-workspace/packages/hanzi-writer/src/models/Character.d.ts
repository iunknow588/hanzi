import Stroke from './Stroke';
export default class Character {
    symbol: string;
    strokes: Stroke[];
    constructor(symbol: string, strokes: Stroke[]);
}
