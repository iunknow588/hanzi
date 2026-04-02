import { isMsBrowser } from '../../utils';
import StrokeRenderer from './StrokeRenderer';
var CharacterRenderer = /** @class */ (function () {
    function CharacterRenderer(character) {
        this._oldProps = undefined;
        this._strokeRenderers = character.strokes.map(function (stroke) { return new StrokeRenderer(stroke); });
    }
    CharacterRenderer.prototype.mount = function (target) {
        var subTarget = target.createSubRenderTarget();
        this._group = subTarget.svg;
        this._strokeRenderers.forEach(function (strokeRenderer) {
            strokeRenderer.mount(subTarget);
        });
    };
    CharacterRenderer.prototype.render = function (props) {
        var _a, _b, _c, _d;
        if (props === this._oldProps || !this._group) {
            return;
        }
        var opacity = props.opacity, strokes = props.strokes, strokeColor = props.strokeColor, _e = props.radicalColor, radicalColor = _e === void 0 ? null : _e;
        if (opacity !== ((_a = this._oldProps) === null || _a === void 0 ? void 0 : _a.opacity)) {
            this._group.style.opacity = opacity.toString();
            // MS browsers seem to have a bug where if SVG is set to display:none, it sometimes breaks.
            // More info: https://github.com/chanind/hanzi-writer/issues/164
            // this is just a perf improvement, so disable for MS browsers
            if (!isMsBrowser) {
                if (opacity === 0) {
                    this._group.style.display = 'none';
                }
                else if (((_b = this._oldProps) === null || _b === void 0 ? void 0 : _b.opacity) === 0) {
                    this._group.style.removeProperty('display');
                }
            }
        }
        var colorsChanged = !this._oldProps ||
            strokeColor !== this._oldProps.strokeColor ||
            radicalColor !== this._oldProps.radicalColor;
        if (colorsChanged || strokes !== ((_c = this._oldProps) === null || _c === void 0 ? void 0 : _c.strokes)) {
            for (var i = 0; i < this._strokeRenderers.length; i++) {
                if (!colorsChanged &&
                    ((_d = this._oldProps) === null || _d === void 0 ? void 0 : _d.strokes) &&
                    strokes[i] === this._oldProps.strokes[i]) {
                    continue;
                }
                this._strokeRenderers[i].render({
                    strokeColor: strokeColor,
                    radicalColor: radicalColor,
                    opacity: strokes[i].opacity,
                    displayPortion: strokes[i].displayPortion,
                });
            }
        }
        this._oldProps = props;
    };
    return CharacterRenderer;
}());
export default CharacterRenderer;
