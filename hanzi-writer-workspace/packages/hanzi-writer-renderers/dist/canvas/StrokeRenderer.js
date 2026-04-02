var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { extendStart } from '../../geometry';
import { drawPath, pathStringToCanvas } from './canvasUtils';
import StrokeRendererBase from '../StrokeRendererBase';
/** this is a stroke composed of several stroke parts */
var StrokeRenderer = /** @class */ (function (_super) {
    __extends(StrokeRenderer, _super);
    function StrokeRenderer(stroke, usePath2D) {
        if (usePath2D === void 0) { usePath2D = true; }
        var _this = _super.call(this, stroke) || this;
        if (usePath2D && Path2D) {
            _this._path2D = new Path2D(_this.stroke.path);
        }
        else {
            _this._pathCmd = pathStringToCanvas(_this.stroke.path);
        }
        _this._extendedMaskPoints = extendStart(_this.stroke.points, StrokeRendererBase.STROKE_WIDTH / 2);
        return _this;
    }
    StrokeRenderer.prototype.render = function (ctx, props) {
        var _a;
        if (props.opacity < 0.05) {
            return;
        }
        ctx.save();
        if (this._path2D) {
            ctx.clip(this._path2D);
        }
        else {
            (_a = this._pathCmd) === null || _a === void 0 ? void 0 : _a.call(this, ctx);
            // wechat bugs out if the clip path isn't stroked or filled
            ctx.globalAlpha = 0;
            ctx.stroke();
            ctx.clip();
        }
        var _b = this._getColor(props), r = _b.r, g = _b.g, b = _b.b, a = _b.a;
        var color = a === 1 ? "rgb(".concat(r, ",").concat(g, ",").concat(b, ")") : "rgb(".concat(r, ",").concat(g, ",").concat(b, ",").concat(a, ")");
        var dashOffset = this._getStrokeDashoffset(props.displayPortion);
        ctx.globalAlpha = props.opacity;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = StrokeRendererBase.STROKE_WIDTH;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // wechat sets dashOffset as a second param here. Should be harmless for browsers to add here too
        // @ts-ignore
        ctx.setLineDash([this._pathLength, this._pathLength], dashOffset);
        ctx.lineDashOffset = dashOffset;
        drawPath(ctx, this._extendedMaskPoints);
        ctx.restore();
    };
    return StrokeRenderer;
}(StrokeRendererBase));
export default StrokeRenderer;
