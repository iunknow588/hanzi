export var drawPath = function (ctx, points) {
    ctx.beginPath();
    var start = points[0];
    var remainingPoints = points.slice(1);
    ctx.moveTo(start.x, start.y);
    for (var _i = 0, remainingPoints_1 = remainingPoints; _i < remainingPoints_1.length; _i++) {
        var point = remainingPoints_1[_i];
        ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
};
/**
 * Break a path string into a series of canvas path commands
 *
 * Note: only works with the subset of SVG paths used by MakeMeAHanzi data
 * @param pathString
 */
export var pathStringToCanvas = function (pathString) {
    var pathParts = pathString.split(/(^|\s+)(?=[A-Z])/).filter(function (part) { return part !== ' '; });
    var commands = [function (ctx) { return ctx.beginPath(); }];
    var _loop_1 = function (part) {
        var _a = part.split(/\s+/), cmd = _a[0], rawParams = _a.slice(1);
        var params = rawParams.map(function (param) { return parseFloat(param); });
        if (cmd === 'M') {
            commands.push(function (ctx) { return ctx.moveTo.apply(ctx, params); });
        }
        else if (cmd === 'L') {
            commands.push(function (ctx) { return ctx.lineTo.apply(ctx, params); });
        }
        else if (cmd === 'C') {
            commands.push(function (ctx) {
                return ctx.bezierCurveTo.apply(ctx, params);
            });
        }
        else if (cmd === 'Q') {
            commands.push(function (ctx) {
                return ctx.quadraticCurveTo.apply(ctx, params);
            });
        }
        else if (cmd === 'Z') {
            // commands.push((ctx) => ctx.closePath());
        }
    };
    for (var _i = 0, pathParts_1 = pathParts; _i < pathParts_1.length; _i++) {
        var part = pathParts_1[_i];
        _loop_1(part);
    }
    return function (ctx) { return commands.forEach(function (cmd) { return cmd(ctx); }); };
};
