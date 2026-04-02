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
import CharacterRenderer from './CharacterRenderer';
import UserStrokeRenderer from './UserStrokeRenderer';
import * as svg from './svgUtils';
var HanziWriterRenderer = /** @class */ (function () {
    function HanziWriterRenderer(character, positioner) {
        this._character = character;
        this._positioner = positioner;
        this._mainCharRenderer = new CharacterRenderer(character);
        this._outlineCharRenderer = new CharacterRenderer(character);
        this._highlightCharRenderer = new CharacterRenderer(character);
        this._userStrokeRenderers = {};
    }
    HanziWriterRenderer.prototype.mount = function (target) {
        var positionedTarget = target.createSubRenderTarget();
        var group = positionedTarget.svg;
        var _a = this._positioner, xOffset = _a.xOffset, yOffset = _a.yOffset, height = _a.height, scale = _a.scale;
        svg.attr(group, 'transform', "translate(".concat(xOffset, ", ").concat(height - yOffset, ") scale(").concat(scale, ", ").concat(-1 * scale, ")"));
        this._outlineCharRenderer.mount(positionedTarget);
        this._mainCharRenderer.mount(positionedTarget);
        this._highlightCharRenderer.mount(positionedTarget);
        this._positionedTarget = positionedTarget;
    };
    HanziWriterRenderer.prototype.render = function (props) {
        var _this = this;
        var _a;
        var _b = props.character, main = _b.main, outline = _b.outline, highlight = _b.highlight;
        var _c = props.options, outlineColor = _c.outlineColor, radicalColor = _c.radicalColor, highlightColor = _c.highlightColor, strokeColor = _c.strokeColor, drawingWidth = _c.drawingWidth, drawingColor = _c.drawingColor;
        this._outlineCharRenderer.render({
            opacity: outline.opacity,
            strokes: outline.strokes,
            strokeColor: outlineColor,
        });
        this._mainCharRenderer.render({
            opacity: main.opacity,
            strokes: main.strokes,
            strokeColor: strokeColor,
            radicalColor: radicalColor,
        });
        this._highlightCharRenderer.render({
            opacity: highlight.opacity,
            strokes: highlight.strokes,
            strokeColor: highlightColor,
        });
        var userStrokes = props.userStrokes || {};
        for (var userStrokeId in this._userStrokeRenderers) {
            if (!userStrokes[userStrokeId]) {
                (_a = this._userStrokeRenderers[userStrokeId]) === null || _a === void 0 ? void 0 : _a.destroy();
                delete this._userStrokeRenderers[userStrokeId];
            }
        }
        var _loop_1 = function (userStrokeId) {
            var stroke = userStrokes[userStrokeId];
            if (!stroke) {
                return "continue";
            }
            var userStrokeProps = __assign({ strokeWidth: drawingWidth, strokeColor: drawingColor }, stroke);
            var strokeRenderer = (function () {
                if (_this._userStrokeRenderers[userStrokeId]) {
                    return _this._userStrokeRenderers[userStrokeId];
                }
                var newStrokeRenderer = new UserStrokeRenderer();
                newStrokeRenderer.mount(_this._positionedTarget);
                _this._userStrokeRenderers[userStrokeId] = newStrokeRenderer;
                return newStrokeRenderer;
            })();
            strokeRenderer.render(userStrokeProps);
        };
        for (var userStrokeId in userStrokes) {
            _loop_1(userStrokeId);
        }
    };
    HanziWriterRenderer.prototype.destroy = function () {
        svg.removeElm(this._positionedTarget.svg);
        this._positionedTarget.defs.innerHTML = '';
    };
    return HanziWriterRenderer;
}());
export default HanziWriterRenderer;
