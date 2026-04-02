import { cancelAnimationFrame, requestAnimationFrame, inflate, performanceNow, } from './utils';
var Delay = /** @class */ (function () {
    function Delay(duration) {
        this._duration = duration;
        this._startTime = null;
        this._paused = false;
        this.scope = "delay.".concat(duration);
    }
    Delay.prototype.run = function () {
        var _this = this;
        this._startTime = performanceNow();
        this._runningPromise = new Promise(function (resolve) {
            _this._resolve = resolve;
            // @ts-ignore return type of "setTimeout" in builds is parsed as `number` instead of `Timeout`
            _this._timeout = setTimeout(function () { return _this.cancel(); }, _this._duration);
        });
        return this._runningPromise;
    };
    Delay.prototype.pause = function () {
        if (this._paused)
            return;
        // to pause, clear the timeout and rewrite this._duration with whatever time is remaining
        var elapsedDelay = performanceNow() - (this._startTime || 0);
        this._duration = Math.max(0, this._duration - elapsedDelay);
        clearTimeout(this._timeout);
        this._paused = true;
    };
    Delay.prototype.resume = function () {
        var _this = this;
        if (!this._paused)
            return;
        this._startTime = performanceNow();
        // @ts-ignore return type of "setTimeout" in builds is parsed as `number` instead of `Timeout`
        this._timeout = setTimeout(function () { return _this.cancel(); }, this._duration);
        this._paused = false;
    };
    Delay.prototype.cancel = function () {
        clearTimeout(this._timeout);
        if (this._resolve) {
            this._resolve();
        }
        this._resolve = undefined;
    };
    return Delay;
}());
var Mutation = /** @class */ (function () {
    /**
     *
     * @param scope a string representation of what fields this mutation affects from the state. This is used to cancel conflicting mutations
     * @param valuesOrCallable a thunk containing the value to set, or a callback which will return those values
     */
    function Mutation(scope, valuesOrCallable, options) {
        if (options === void 0) { options = {}; }
        var _this = this;
        this._tick = function (timing) {
            if (_this._startPauseTime !== null) {
                return;
            }
            var progress = Math.min(1, (timing - _this._startTime - _this._pausedDuration) / _this._duration);
            if (progress === 1) {
                _this._renderState.updateState(_this._values);
                _this._frameHandle = undefined;
                _this.cancel(_this._renderState);
            }
            else {
                var easedProgress = ease(progress);
                var stateChanges = getPartialValues(_this._startState, _this._values, easedProgress);
                _this._renderState.updateState(stateChanges);
                _this._frameHandle = requestAnimationFrame(_this._tick);
            }
        };
        this.scope = scope;
        this._valuesOrCallable = valuesOrCallable;
        this._duration = options.duration || 0;
        this._force = options.force;
        this._pausedDuration = 0;
        this._startPauseTime = null;
    }
    Mutation.prototype.run = function (renderState) {
        var _this = this;
        if (!this._values)
            this._inflateValues(renderState);
        if (this._duration === 0)
            renderState.updateState(this._values);
        if (this._duration === 0 || isAlreadyAtEnd(renderState.state, this._values)) {
            return Promise.resolve();
        }
        this._renderState = renderState;
        this._startState = renderState.state;
        this._startTime = performanceNow();
        this._frameHandle = requestAnimationFrame(this._tick);
        return new Promise(function (resolve) {
            _this._resolve = resolve;
        });
    };
    Mutation.prototype._inflateValues = function (renderState) {
        var values = this._valuesOrCallable;
        if (typeof this._valuesOrCallable === 'function') {
            values = this._valuesOrCallable(renderState.state);
        }
        this._values = inflate(this.scope, values);
    };
    Mutation.prototype.pause = function () {
        if (this._startPauseTime !== null) {
            return;
        }
        if (this._frameHandle) {
            cancelAnimationFrame(this._frameHandle);
        }
        this._startPauseTime = performanceNow();
    };
    Mutation.prototype.resume = function () {
        if (this._startPauseTime === null) {
            return;
        }
        this._frameHandle = requestAnimationFrame(this._tick);
        this._pausedDuration += performanceNow() - this._startPauseTime;
        this._startPauseTime = null;
    };
    Mutation.prototype.cancel = function (renderState) {
        var _a;
        (_a = this._resolve) === null || _a === void 0 ? void 0 : _a.call(this);
        this._resolve = undefined;
        cancelAnimationFrame(this._frameHandle || -1);
        this._frameHandle = undefined;
        if (this._force) {
            if (!this._values)
                this._inflateValues(renderState);
            renderState.updateState(this._values);
        }
    };
    Mutation.Delay = Delay;
    return Mutation;
}());
export default Mutation;
function getPartialValues(startValues, endValues, progress) {
    var target = {};
    for (var key in endValues) {
        var endValue = endValues[key];
        var startValue = startValues === null || startValues === void 0 ? void 0 : startValues[key];
        if (typeof startValue === 'number' && typeof endValue === 'number' && endValue >= 0) {
            target[key] = progress * (endValue - startValue) + startValue;
        }
        else {
            target[key] = getPartialValues(startValue, endValue, progress);
        }
    }
    return target;
}
function isAlreadyAtEnd(startValues, endValues) {
    for (var key in endValues) {
        var endValue = endValues[key];
        var startValue = startValues === null || startValues === void 0 ? void 0 : startValues[key];
        if (endValue >= 0) {
            if (endValue !== startValue) {
                return false;
            }
        }
        else if (!isAlreadyAtEnd(startValue, endValue)) {
            return false;
        }
    }
    return true;
}
// from https://github.com/maxwellito/vivus
var ease = function (x) { return -Math.cos(x * Math.PI) / 2 + 0.5; };
