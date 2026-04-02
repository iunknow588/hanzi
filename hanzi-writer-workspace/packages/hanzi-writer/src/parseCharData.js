import Stroke from './models/Stroke';
import Character from './models/Character';
function generateStrokes(_a) {
    var radStrokes = _a.radStrokes, strokes = _a.strokes, medians = _a.medians;
    var isInRadical = function (strokeNum) { var _a; return ((_a = radStrokes === null || radStrokes === void 0 ? void 0 : radStrokes.indexOf(strokeNum)) !== null && _a !== void 0 ? _a : -1) >= 0; };
    return strokes.map(function (path, index) {
        var points = medians[index].map(function (pointData) {
            var x = pointData[0], y = pointData[1];
            return { x: x, y: y };
        });
        return new Stroke(path, points, index, isInRadical(index));
    });
}
export default function parseCharData(symbol, charJson) {
    var strokes = generateStrokes(charJson);
    return new Character(symbol, strokes);
}
