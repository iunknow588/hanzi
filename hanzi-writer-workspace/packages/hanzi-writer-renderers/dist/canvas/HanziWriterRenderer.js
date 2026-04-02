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
import renderUserStroke from './renderUserStroke';
import { noop } from '../../utils';
var HanziWriterRenderer = /** @class */ (function () {
    function HanziWriterRenderer(character, positioner) {
        this.destroy = noop;
        this._character = character;
        this._positioner = positioner;
        this._mainCharRenderer = new CharacterRenderer(character);
        this._outlineCharRenderer = new CharacterRenderer(character);
        this._highlightCharRenderer = new CharacterRenderer(character);
    }
    HanziWriterRenderer.prototype.mount = function (target) {
        this._target = target;
    };
    HanziWriterRenderer.prototype._animationFrame = function (cb) {
        var _a = this._positioner, width = _a.width, height = _a.height, scale = _a.scale, xOffset = _a.xOffset, yOffset = _a.yOffset;
        var ctx = this._target.getContext();
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(xOffset, height - yOffset);
        ctx.transform(1, 0, 0, -1, 0, 0);
        ctx.scale(scale, scale);
        cb(ctx);
        ctx.restore();
        // @ts-expect-error Verify if this is still needed for the "wechat miniprogram".
        if (ctx.draw) {
            // @ts-expect-error
            ctx.draw();
        }
    };
    HanziWriterRenderer.prototype.render = function (props) {
        var _this = this;
        var _a = props.character, outline = _a.outline, main = _a.main, highlight = _a.highlight;
        var _b = props.options, outlineColor = _b.outlineColor, strokeColor = _b.strokeColor, radicalColor = _b.radicalColor, highlightColor = _b.highlightColor, drawingColor = _b.drawingColor, drawingWidth = _b.drawingWidth;
        this._animationFrame(function (ctx) {
            _this._outlineCharRenderer.render(ctx, {
                opacity: outline.opacity,
                strokes: outline.strokes,
                strokeColor: outlineColor,
            });
            _this._mainCharRenderer.render(ctx, {
                opacity: main.opacity,
                strokes: main.strokes,
                strokeColor: strokeColor,
                radicalColor: radicalColor,
            });
            _this._highlightCharRenderer.render(ctx, {
                opacity: highlight.opacity,
                strokes: highlight.strokes,
                strokeColor: highlightColor,
            });
            var userStrokes = props.userStrokes || {};
            for (var userStrokeId in userStrokes) {
                var userStroke = userStrokes[userStrokeId];
                if (userStroke) {
                    var userStrokeProps = __assign({ strokeWidth: drawingWidth, strokeColor: drawingColor }, userStroke);
                    renderUserStroke(ctx, userStrokeProps);
                }
            }
        });
    };
    return HanziWriterRenderer;
}());
export default HanziWriterRenderer;
