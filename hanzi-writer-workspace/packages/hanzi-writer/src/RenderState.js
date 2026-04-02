import { copyAndMergeDeep, colorStringToVals, noop } from './utils';
var RenderState = /** @class */ (function () {
    function RenderState(character, options, onStateChange) {
        if (onStateChange === void 0) { onStateChange = noop; }
        this._mutationChains = [];
        this._onStateChange = onStateChange;
        this.state = {
            options: {
                drawingFadeDuration: options.drawingFadeDuration,
                drawingWidth: options.drawingWidth,
                drawingColor: colorStringToVals(options.drawingColor),
                strokeColor: colorStringToVals(options.strokeColor),
                outlineColor: colorStringToVals(options.outlineColor),
                radicalColor: colorStringToVals(options.radicalColor || options.strokeColor),
                highlightColor: colorStringToVals(options.highlightColor),
            },
            character: {
                main: {
                    opacity: options.showCharacter ? 1 : 0,
                    strokes: {},
                },
                outline: {
                    opacity: options.showOutline ? 1 : 0,
                    strokes: {},
                },
                highlight: {
                    opacity: 1,
                    strokes: {},
                },
            },
            userStrokes: null,
        };
        for (var i = 0; i < character.strokes.length; i++) {
            this.state.character.main.strokes[i] = {
                opacity: 1,
                displayPortion: 1,
            };
            this.state.character.outline.strokes[i] = {
                opacity: 1,
                displayPortion: 1,
            };
            this.state.character.highlight.strokes[i] = {
                opacity: 0,
                displayPortion: 1,
            };
        }
    }
    RenderState.prototype.overwriteOnStateChange = function (onStateChange) {
        this._onStateChange = onStateChange;
    };
    RenderState.prototype.updateState = function (stateChanges) {
        var nextState = copyAndMergeDeep(this.state, stateChanges);
        this._onStateChange(nextState, this.state);
        this.state = nextState;
    };
    RenderState.prototype.run = function (mutations, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        var scopes = mutations.map(function (mut) { return mut.scope; });
        this.cancelMutations(scopes);
        return new Promise(function (resolve) {
            var mutationChain = {
                _isActive: true,
                _index: 0,
                _resolve: resolve,
                _mutations: mutations,
                _loop: options.loop,
                _scopes: scopes,
            };
            _this._mutationChains.push(mutationChain);
            _this._run(mutationChain);
        });
    };
    RenderState.prototype._run = function (mutationChain) {
        var _this = this;
        if (!mutationChain._isActive) {
            return;
        }
        var mutations = mutationChain._mutations;
        if (mutationChain._index >= mutations.length) {
            if (mutationChain._loop) {
                mutationChain._index = 0; // eslint-disable-line no-param-reassign
            }
            else {
                mutationChain._isActive = false; // eslint-disable-line no-param-reassign
                this._mutationChains = this._mutationChains.filter(function (chain) { return chain !== mutationChain; });
                // The chain is done - resolve the promise to signal it finished successfully
                mutationChain._resolve({ canceled: false });
                return;
            }
        }
        var activeMutation = mutationChain._mutations[mutationChain._index];
        activeMutation.run(this).then(function () {
            if (mutationChain._isActive) {
                mutationChain._index++; // eslint-disable-line no-param-reassign
                _this._run(mutationChain);
            }
        });
    };
    RenderState.prototype._getActiveMutations = function () {
        return this._mutationChains.map(function (chain) { return chain._mutations[chain._index]; });
    };
    RenderState.prototype.pauseAll = function () {
        this._getActiveMutations().forEach(function (mutation) { return mutation.pause(); });
    };
    RenderState.prototype.resumeAll = function () {
        this._getActiveMutations().forEach(function (mutation) { return mutation.resume(); });
    };
    RenderState.prototype.cancelMutations = function (scopesToCancel) {
        for (var _i = 0, _a = this._mutationChains; _i < _a.length; _i++) {
            var chain = _a[_i];
            for (var _b = 0, _c = chain._scopes; _b < _c.length; _b++) {
                var chainId = _c[_b];
                for (var _d = 0, scopesToCancel_1 = scopesToCancel; _d < scopesToCancel_1.length; _d++) {
                    var scopeToCancel = scopesToCancel_1[_d];
                    if (chainId.startsWith(scopeToCancel) || scopeToCancel.startsWith(chainId)) {
                        this._cancelMutationChain(chain);
                    }
                }
            }
        }
    };
    RenderState.prototype.cancelAll = function () {
        this.cancelMutations(['']);
    };
    RenderState.prototype._cancelMutationChain = function (mutationChain) {
        var _a;
        mutationChain._isActive = false;
        for (var i = mutationChain._index; i < mutationChain._mutations.length; i++) {
            mutationChain._mutations[i].cancel(this);
        }
        (_a = mutationChain._resolve) === null || _a === void 0 ? void 0 : _a.call(mutationChain, { canceled: true });
        this._mutationChains = this._mutationChains.filter(function (chain) { return chain !== mutationChain; });
    };
    return RenderState;
}());
export default RenderState;
