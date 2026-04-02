var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var _a, _b, _c;
// hacky way to get around rollup not properly setting `global` to `window` in browser
var globalObj = typeof window === 'undefined' ? global : window;
export var performanceNow = (globalObj.performance && (function () { return globalObj.performance.now(); })) || (function () { return Date.now(); });
export var requestAnimationFrame = ((_a = globalObj.requestAnimationFrame) === null || _a === void 0 ? void 0 : _a.bind(globalObj)) ||
    (function (callback) { return setTimeout(function () { return callback(performanceNow()); }, 1000 / 60); });
export var cancelAnimationFrame = ((_b = globalObj.cancelAnimationFrame) === null || _b === void 0 ? void 0 : _b.bind(globalObj)) || clearTimeout;
// Object.assign polyfill, because IE :/
export var _assign = function (target) {
    var overrides = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        overrides[_i - 1] = arguments[_i];
    }
    var overrideTarget = Object(target);
    overrides.forEach(function (override) {
        if (override != null) {
            for (var key in override) {
                if (Object.prototype.hasOwnProperty.call(override, key)) {
                    overrideTarget[key] = override[key];
                }
            }
        }
    });
    return overrideTarget;
};
export var assign = Object.assign || _assign;
export function arrLast(arr) {
    return arr[arr.length - 1];
}
export var fixIndex = function (index, length) {
    // helper to handle negative indexes in array indices
    if (index < 0) {
        return length + index;
    }
    return index;
};
export var selectIndex = function (arr, index) {
    // helper to select item from array at index, supporting negative indexes
    return arr[fixIndex(index, arr.length)];
};
export function copyAndMergeDeep(base, override) {
    var output = __assign({}, base);
    for (var key in override) {
        var baseVal = base[key];
        var overrideVal = override[key];
        if (baseVal === overrideVal) {
            continue;
        }
        if (baseVal &&
            overrideVal &&
            typeof baseVal === 'object' &&
            typeof overrideVal === 'object' &&
            !Array.isArray(overrideVal)) {
            output[key] = copyAndMergeDeep(baseVal, overrideVal);
        }
        else {
            // @ts-ignore
            output[key] = overrideVal;
        }
    }
    return output;
}
/** basically a simplified version of lodash.get, selects a key out of an object like 'a.b' from {a: {b: 7}} */
export function inflate(scope, obj) {
    var parts = scope.split('.');
    var final = {};
    var current = final;
    for (var i = 0; i < parts.length; i++) {
        var cap = i === parts.length - 1 ? obj : {};
        current[parts[i]] = cap;
        current = cap;
    }
    return final;
}
var count = 0;
export function counter() {
    count++;
    return count;
}
export function average(arr) {
    var sum = arr.reduce(function (acc, val) { return val + acc; }, 0);
    return sum / arr.length;
}
export function timeout(duration) {
    if (duration === void 0) { duration = 0; }
    return new Promise(function (resolve) { return setTimeout(resolve, duration); });
}
export function colorStringToVals(colorString) {
    var normalizedColor = colorString.toUpperCase().trim();
    // based on https://stackoverflow.com/a/21648508
    if (/^#([A-F0-9]{3}){1,2}$/.test(normalizedColor)) {
        var hexParts = normalizedColor.substring(1).split('');
        if (hexParts.length === 3) {
            hexParts = [
                hexParts[0],
                hexParts[0],
                hexParts[1],
                hexParts[1],
                hexParts[2],
                hexParts[2],
            ];
        }
        var hexStr = "".concat(hexParts.join(''));
        return {
            r: parseInt(hexStr.slice(0, 2), 16),
            g: parseInt(hexStr.slice(2, 4), 16),
            b: parseInt(hexStr.slice(4, 6), 16),
            a: 1,
        };
    }
    var rgbMatch = normalizedColor.match(/^RGBA?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d*\.?\d+))?\)$/);
    if (rgbMatch) {
        return {
            r: parseInt(rgbMatch[1], 10),
            g: parseInt(rgbMatch[2], 10),
            b: parseInt(rgbMatch[3], 10),
            // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 2.
            a: parseFloat(rgbMatch[4] || 1, 10),
        };
    }
    throw new Error("Invalid color: ".concat(colorString));
}
export var trim = function (string) { return string.replace(/^\s+/, '').replace(/\s+$/, ''); };
// return a new array-like object with int keys where each key is item
// ex: objRepeat({x: 8}, 3) === {0: {x: 8}, 1: {x: 8}, 2: {x: 8}}
export function objRepeat(item, times) {
    var obj = {};
    for (var i = 0; i < times; i++) {
        obj[i] = item;
    }
    return obj;
}
// similar to objRepeat, but takes in a callback which is called for each index in the object
export function objRepeatCb(times, cb) {
    var obj = {};
    for (var i = 0; i < times; i++) {
        obj[i] = cb(i);
    }
    return obj;
}
var ua = ((_c = globalObj.navigator) === null || _c === void 0 ? void 0 : _c.userAgent) || '';
export var isMsBrowser = ua.indexOf('MSIE ') > 0 || ua.indexOf('Trident/') > 0 || ua.indexOf('Edge/') > 0;
// eslint-disable-next-line @typescript-eslint/no-empty-function
export var noop = function () { };
