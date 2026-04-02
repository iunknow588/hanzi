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
import { counter } from '../../utils';
import * as svg from './svgUtils';
import { extendStart, getPathString } from '../../geometry';
import StrokeRendererBase from '../StrokeRendererBase';
var STROKE_WIDTH = 200;
/** This is a stroke composed of several stroke parts **/
var StrokeRenderer = /** @class */ (function (_super) {
    __extends(StrokeRenderer, _super);
    function StrokeRenderer(stroke) {
        var _this = _super.call(this, stroke) || this;
        _this._oldProps = undefined;
        return _this;
    }
    StrokeRenderer.prototype.mount = function (target) {
        this._animationPath = svg.createElm('path');
        this._clip = svg.createElm('clipPath');
        this._strokePath = svg.createElm('path');
        var maskId = "mask-".concat(counter());
        svg.attr(this._clip, 'id', maskId);
        svg.attr(this._strokePath, 'd', this.stroke.path);
        this._animationPath.style.opacity = '0';
        svg.attr(this._animationPath, 'clip-path', svg.urlIdRef(maskId));
        var extendedMaskPoints = extendStart(this.stroke.points, STROKE_WIDTH / 2);
        svg.attr(this._animationPath, 'd', getPathString(extendedMaskPoints));
        svg.attrs(this._animationPath, {
            stroke: '#FFFFFF',
            'stroke-width': STROKE_WIDTH.toString(),
            fill: 'none',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'miter',
            'stroke-dasharray': "".concat(this._pathLength, ",").concat(this._pathLength),
        });
        this._clip.appendChild(this._strokePath);
        target.defs.appendChild(this._clip);
        target.svg.appendChild(this._animationPath);
        return this;
    };
    StrokeRenderer.prototype.render = function (props) {
        var _a, _b;
        if (props === this._oldProps || !this._animationPath) {
            return;
        }
        if (props.displayPortion !== ((_a = this._oldProps) === null || _a === void 0 ? void 0 : _a.displayPortion)) {
            this._animationPath.style.strokeDashoffset = this._getStrokeDashoffset(props.displayPortion).toString();
        }
        var color = this._getColor(props);
        if (!this._oldProps || color !== this._getColor(this._oldProps)) {
            var r = color.r, g = color.g, b = color.b, a = color.a;
            svg.attrs(this._animationPath, { stroke: "rgba(".concat(r, ",").concat(g, ",").concat(b, ",").concat(a, ")") });
        }
        if (props.opacity !== ((_b = this._oldProps) === null || _b === void 0 ? void 0 : _b.opacity)) {
            this._animationPath.style.opacity = props.opacity.toString();
        }
        this._oldProps = props;
    };
    return StrokeRenderer;
}(StrokeRendererBase));
export default StrokeRenderer;
