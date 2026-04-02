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
import RenderTargetBase from '../RenderTargetBase';
var RenderTarget = /** @class */ (function (_super) {
    __extends(RenderTarget, _super);
    function RenderTarget(canvas) {
        return _super.call(this, canvas) || this;
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
        var canvas = (function () {
            if (nodeType === 'CANVAS') {
                return element;
            }
            var canvas = document.createElement('canvas');
            element.appendChild(canvas);
            return canvas;
        })();
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);
        return new RenderTarget(canvas);
    };
    RenderTarget.prototype.getContext = function () {
        return this.node.getContext('2d');
    };
    return RenderTarget;
}(RenderTargetBase));
export default RenderTarget;
