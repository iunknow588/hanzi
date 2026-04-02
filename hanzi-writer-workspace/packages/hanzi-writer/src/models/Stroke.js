import { subtract, distance, length } from '../geometry';
var Stroke = /** @class */ (function () {
    function Stroke(path, points, strokeNum, isInRadical) {
        if (isInRadical === void 0) { isInRadical = false; }
        this.path = path;
        this.points = points;
        this.strokeNum = strokeNum;
        this.isInRadical = isInRadical;
    }
    Stroke.prototype.getStartingPoint = function () {
        return this.points[0];
    };
    Stroke.prototype.getEndingPoint = function () {
        return this.points[this.points.length - 1];
    };
    Stroke.prototype.getLength = function () {
        return length(this.points);
    };
    Stroke.prototype.getVectors = function () {
        var lastPoint = this.points[0];
        var pointsSansFirst = this.points.slice(1);
        return pointsSansFirst.map(function (point) {
            var vector = subtract(point, lastPoint);
            lastPoint = point;
            return vector;
        });
    };
    Stroke.prototype.getDistance = function (point) {
        var distances = this.points.map(function (strokePoint) { return distance(strokePoint, point); });
        return Math.min.apply(Math, distances);
    };
    Stroke.prototype.getAverageDistance = function (points) {
        var _this = this;
        var totalDist = points.reduce(function (acc, point) { return acc + _this.getDistance(point); }, 0);
        return totalDist / points.length;
    };
    return Stroke;
}());
export default Stroke;
