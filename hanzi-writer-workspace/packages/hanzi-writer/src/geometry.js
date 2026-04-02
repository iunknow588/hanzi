import { average, arrLast } from './utils';
export var subtract = function (p1, p2) { return ({ x: p1.x - p2.x, y: p1.y - p2.y }); };
export var magnitude = function (point) {
    return Math.sqrt(Math.pow(point.x, 2) + Math.pow(point.y, 2));
};
export var distance = function (point1, point2) {
    return magnitude(subtract(point1, point2));
};
export var equals = function (point1, point2) {
    return point1.x === point2.x && point1.y === point2.y;
};
export var round = function (point, precision) {
    if (precision === void 0) { precision = 1; }
    var multiplier = precision * 10;
    return {
        x: Math.round(multiplier * point.x) / multiplier,
        y: Math.round(multiplier * point.y) / multiplier,
    };
};
export var length = function (points) {
    var lastPoint = points[0];
    var pointsSansFirst = points.slice(1);
    return pointsSansFirst.reduce(function (acc, point) {
        var dist = distance(point, lastPoint);
        lastPoint = point;
        return acc + dist;
    }, 0);
};
export var cosineSimilarity = function (point1, point2) {
    var rawDotProduct = point1.x * point2.x + point1.y * point2.y;
    return rawDotProduct / magnitude(point1) / magnitude(point2);
};
/**
 * return a new point, p3, which is on the same line as p1 and p2, but distance away
 * from p2. p1, p2, p3 will always lie on the line in that order
 */
export var _extendPointOnLine = function (p1, p2, dist) {
    var vect = subtract(p2, p1);
    var norm = dist / magnitude(vect);
    return { x: p2.x + norm * vect.x, y: p2.y + norm * vect.y };
};
/** based on http://www.kr.tuwien.ac.at/staff/eiter/et-archive/cdtr9464.pdf */
export var frechetDist = function (curve1, curve2) {
    var longCurve = curve1.length >= curve2.length ? curve1 : curve2;
    var shortCurve = curve1.length >= curve2.length ? curve2 : curve1;
    var calcVal = function (i, j, prevResultsCol, curResultsCol) {
        if (i === 0 && j === 0) {
            return distance(longCurve[0], shortCurve[0]);
        }
        if (i > 0 && j === 0) {
            return Math.max(prevResultsCol[0], distance(longCurve[i], shortCurve[0]));
        }
        var lastResult = curResultsCol[curResultsCol.length - 1];
        if (i === 0 && j > 0) {
            return Math.max(lastResult, distance(longCurve[0], shortCurve[j]));
        }
        return Math.max(Math.min(prevResultsCol[j], prevResultsCol[j - 1], lastResult), distance(longCurve[i], shortCurve[j]));
    };
    var prevResultsCol = [];
    for (var i = 0; i < longCurve.length; i++) {
        var curResultsCol = [];
        for (var j = 0; j < shortCurve.length; j++) {
            // we only need the results from i - 1 and j - 1 to continue the calculation
            // so we only need to hold onto the last column of calculated results
            // prevResultsCol is results[i-1][:] in the original algorithm
            // curResultsCol is results[i][:j-1] in the original algorithm
            curResultsCol.push(calcVal(i, j, prevResultsCol, curResultsCol));
        }
        prevResultsCol = curResultsCol;
    }
    return prevResultsCol[shortCurve.length - 1];
};
/** break up long segments in the curve into smaller segments of len maxLen or smaller */
export var subdivideCurve = function (curve, maxLen) {
    if (maxLen === void 0) { maxLen = 0.05; }
    var newCurve = curve.slice(0, 1);
    for (var _i = 0, _a = curve.slice(1); _i < _a.length; _i++) {
        var point = _a[_i];
        var prevPoint = newCurve[newCurve.length - 1];
        var segLen = distance(point, prevPoint);
        if (segLen > maxLen) {
            var numNewPoints = Math.ceil(segLen / maxLen);
            var newSegLen = segLen / numNewPoints;
            for (var i = 0; i < numNewPoints; i++) {
                newCurve.push(_extendPointOnLine(point, prevPoint, -1 * newSegLen * (i + 1)));
            }
        }
        else {
            newCurve.push(point);
        }
    }
    return newCurve;
};
/** redraw the curve using numPoints equally spaced out along the length of the curve */
export var outlineCurve = function (curve, numPoints) {
    if (numPoints === void 0) { numPoints = 30; }
    var curveLen = length(curve);
    var segmentLen = curveLen / (numPoints - 1);
    var outlinePoints = [curve[0]];
    var endPoint = arrLast(curve);
    var remainingCurvePoints = curve.slice(1);
    for (var i = 0; i < numPoints - 2; i++) {
        var lastPoint = arrLast(outlinePoints);
        var remainingDist = segmentLen;
        var outlinePointFound = false;
        while (!outlinePointFound) {
            var nextPointDist = distance(lastPoint, remainingCurvePoints[0]);
            if (nextPointDist < remainingDist) {
                remainingDist -= nextPointDist;
                lastPoint = remainingCurvePoints.shift();
            }
            else {
                var nextPoint = _extendPointOnLine(lastPoint, remainingCurvePoints[0], remainingDist - nextPointDist);
                outlinePoints.push(nextPoint);
                outlinePointFound = true;
            }
        }
    }
    outlinePoints.push(endPoint);
    return outlinePoints;
};
/** translate and scale from https://en.wikipedia.org/wiki/Procrustes_analysis */
export var normalizeCurve = function (curve) {
    var outlinedCurve = outlineCurve(curve);
    var meanX = average(outlinedCurve.map(function (point) { return point.x; }));
    var meanY = average(outlinedCurve.map(function (point) { return point.y; }));
    var mean = { x: meanX, y: meanY };
    var translatedCurve = outlinedCurve.map(function (point) { return subtract(point, mean); });
    var scale = Math.sqrt(average([
        Math.pow(translatedCurve[0].x, 2) + Math.pow(translatedCurve[0].y, 2),
        Math.pow(arrLast(translatedCurve).x, 2) + Math.pow(arrLast(translatedCurve).y, 2),
    ]));
    var scaledCurve = translatedCurve.map(function (point) { return ({
        x: point.x / scale,
        y: point.y / scale,
    }); });
    return subdivideCurve(scaledCurve);
};
// rotate around the origin
export var rotate = function (curve, theta) {
    return curve.map(function (point) { return ({
        x: Math.cos(theta) * point.x - Math.sin(theta) * point.y,
        y: Math.sin(theta) * point.x + Math.cos(theta) * point.y,
    }); });
};
// remove intermediate points that are on the same line as the points to either side
export var _filterParallelPoints = function (points) {
    if (points.length < 3)
        return points;
    var filteredPoints = [points[0], points[1]];
    points.slice(2).forEach(function (point) {
        var numFilteredPoints = filteredPoints.length;
        var curVect = subtract(point, filteredPoints[numFilteredPoints - 1]);
        var prevVect = subtract(filteredPoints[numFilteredPoints - 1], filteredPoints[numFilteredPoints - 2]);
        // this is the z coord of the cross-product. If this is 0 then they're parallel
        var isParallel = curVect.y * prevVect.x - curVect.x * prevVect.y === 0;
        if (isParallel) {
            filteredPoints.pop();
        }
        filteredPoints.push(point);
    });
    return filteredPoints;
};
export function getPathString(points, close) {
    if (close === void 0) { close = false; }
    var start = round(points[0]);
    var remainingPoints = points.slice(1);
    var pathString = "M ".concat(start.x, " ").concat(start.y);
    remainingPoints.forEach(function (point) {
        var roundedPoint = round(point);
        pathString += " L ".concat(roundedPoint.x, " ").concat(roundedPoint.y);
    });
    if (close) {
        pathString += 'Z';
    }
    return pathString;
}
/** take points on a path and move their start point backwards by distance */
export var extendStart = function (points, dist) {
    var filteredPoints = _filterParallelPoints(points);
    if (filteredPoints.length < 2)
        return filteredPoints;
    var p1 = filteredPoints[1];
    var p2 = filteredPoints[0];
    var newStart = _extendPointOnLine(p1, p2, dist);
    var extendedPoints = filteredPoints.slice(1);
    extendedPoints.unshift(newStart);
    return extendedPoints;
};
