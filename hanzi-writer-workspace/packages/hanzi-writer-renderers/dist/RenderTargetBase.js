/** Generic render target */
var RenderTargetBase = /** @class */ (function () {
    function RenderTargetBase(node) {
        this.node = node;
    }
    RenderTargetBase.prototype.addPointerStartListener = function (callback) {
        var _this = this;
        this.node.addEventListener('mousedown', function (evt) {
            callback(_this._eventify(evt, _this._getMousePoint));
        });
        this.node.addEventListener('touchstart', function (evt) {
            callback(_this._eventify(evt, _this._getTouchPoint));
        });
    };
    RenderTargetBase.prototype.addPointerMoveListener = function (callback) {
        var _this = this;
        this.node.addEventListener('mousemove', function (evt) {
            callback(_this._eventify(evt, _this._getMousePoint));
        });
        this.node.addEventListener('touchmove', function (evt) {
            callback(_this._eventify(evt, _this._getTouchPoint));
        });
    };
    RenderTargetBase.prototype.addPointerEndListener = function (callback) {
        // TODO: find a way to not need global listeners
        document.addEventListener('mouseup', callback);
        document.addEventListener('touchend', callback);
    };
    RenderTargetBase.prototype.getBoundingClientRect = function () {
        return this.node.getBoundingClientRect();
    };
    RenderTargetBase.prototype.updateDimensions = function (width, height) {
        this.node.setAttribute('width', "".concat(width));
        this.node.setAttribute('height', "".concat(height));
    };
    RenderTargetBase.prototype._eventify = function (evt, pointFunc) {
        var _this = this;
        return {
            getPoint: function () { return pointFunc.call(_this, evt); },
            preventDefault: function () { return evt.preventDefault(); },
        };
    };
    RenderTargetBase.prototype._getMousePoint = function (evt) {
        var _a = this.getBoundingClientRect(), left = _a.left, top = _a.top;
        var x = evt.clientX - left;
        var y = evt.clientY - top;
        return { x: x, y: y };
    };
    RenderTargetBase.prototype._getTouchPoint = function (evt) {
        var _a = this.getBoundingClientRect(), left = _a.left, top = _a.top;
        var x = evt.touches[0].clientX - left;
        var y = evt.touches[0].clientY - top;
        return { x: x, y: y };
    };
    return RenderTargetBase;
}());
export default RenderTargetBase;
