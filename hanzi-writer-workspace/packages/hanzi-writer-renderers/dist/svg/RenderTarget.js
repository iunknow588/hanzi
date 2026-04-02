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
import { createElm, attrs } from './svgUtils';
import RenderTargetBase from '../RenderTargetBase';
var RenderTarget = /** @class */ (function (_super) {
    __extends(RenderTarget, _super);
    function RenderTarget(svg, defs) {
        var _this = _super.call(this, svg) || this;
        _this.svg = svg;
        _this.defs = defs;
        if ('createSVGPoint' in svg) {
            _this._pt = svg.createSVGPoint();
        }
        return _this;
    }
    RenderTarget.init = function (elmOrId, width, height) {
        if (width === void 0) { width = '100%'; }
        if (height === void 0) { height = '100%'; }
        var element = (function () {
            if (typeof elmOrId === 'string') {
                return document.getElementById(elmOrId);
            }
            return elmOrId;
        })();
        if (!element) {
            throw new Error("HanziWriter target element not found: ".concat(elmOrId));
        }
        var nodeType = element.nodeName.toUpperCase();
        var svg = (function () {
            if (nodeType === 'SVG' || nodeType === 'G') {
                return element;
            }
            else {
                var svg_1 = createElm('svg');
                element.appendChild(svg_1);
                return svg_1;
            }
        })();
        attrs(svg, { width: width, height: height });
        var defs = createElm('defs');
        svg.appendChild(defs);
        return new RenderTarget(svg, defs);
    };
    RenderTarget.prototype.createSubRenderTarget = function () {
        var group = createElm('g');
        this.svg.appendChild(group);
        return new RenderTarget(group, this.defs);
    };
    RenderTarget.prototype._getMousePoint = function (evt) {
        var _a;
        if (this._pt) {
            this._pt.x = evt.clientX;
            this._pt.y = evt.clientY;
            if ('getScreenCTM' in this.node) {
                var localPt = this._pt.matrixTransform((_a = this.node.getScreenCTM()) === null || _a === void 0 ? void 0 : _a.inverse());
                return { x: localPt.x, y: localPt.y };
            }
        }
        return _super.prototype._getMousePoint.call(this, evt);
    };
    RenderTarget.prototype._getTouchPoint = function (evt) {
        var _a;
        if (this._pt) {
            this._pt.x = evt.touches[0].clientX;
            this._pt.y = evt.touches[0].clientY;
            if ('getScreenCTM' in this.node) {
                var localPt = this._pt.matrixTransform((_a = this.node.getScreenCTM()) === null || _a === void 0 ? void 0 : _a.inverse());
                return { x: localPt.x, y: localPt.y };
            }
        }
        return _super.prototype._getTouchPoint.call(this, evt);
    };
    return RenderTarget;
}(RenderTargetBase));
export default RenderTarget;
