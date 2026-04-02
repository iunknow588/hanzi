import * as svg from './svgUtils';
import { getPathString } from '../../geometry';
var UserStrokeRenderer = /** @class */ (function () {
    function UserStrokeRenderer() {
        this._oldProps = undefined;
    }
    UserStrokeRenderer.prototype.mount = function (target) {
        this._path = svg.createElm('path');
        target.svg.appendChild(this._path);
    };
    UserStrokeRenderer.prototype.render = function (props) {
        var _a, _b, _c, _d;
        if (!this._path || props === this._oldProps) {
            return;
        }
        if (props.strokeColor !== ((_a = this._oldProps) === null || _a === void 0 ? void 0 : _a.strokeColor) ||
            props.strokeWidth !== ((_b = this._oldProps) === null || _b === void 0 ? void 0 : _b.strokeWidth)) {
            var _e = props.strokeColor, r = _e.r, g = _e.g, b = _e.b, a = _e.a;
            svg.attrs(this._path, {
                fill: 'none',
                stroke: "rgba(".concat(r, ",").concat(g, ",").concat(b, ",").concat(a, ")"),
                'stroke-width': props.strokeWidth.toString(),
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
            });
        }
        if (props.opacity !== ((_c = this._oldProps) === null || _c === void 0 ? void 0 : _c.opacity)) {
            svg.attr(this._path, 'opacity', props.opacity.toString());
        }
        if (props.points !== ((_d = this._oldProps) === null || _d === void 0 ? void 0 : _d.points)) {
            svg.attr(this._path, 'd', getPathString(props.points));
        }
        this._oldProps = props;
    };
    UserStrokeRenderer.prototype.destroy = function () {
        svg.removeElm(this._path);
    };
    return UserStrokeRenderer;
}());
export default UserStrokeRenderer;
