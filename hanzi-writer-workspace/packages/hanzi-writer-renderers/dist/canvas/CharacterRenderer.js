import StrokeRenderer from './StrokeRenderer';
var CharacterRenderer = /** @class */ (function () {
    function CharacterRenderer(character) {
        this._strokeRenderers = character.strokes.map(function (stroke) { return new StrokeRenderer(stroke); });
    }
    CharacterRenderer.prototype.render = function (ctx, props) {
        if (props.opacity < 0.05)
            return;
        var opacity = props.opacity, strokeColor = props.strokeColor, radicalColor = props.radicalColor, strokes = props.strokes;
        for (var i = 0; i < this._strokeRenderers.length; i++) {
            this._strokeRenderers[i].render(ctx, {
                strokeColor: strokeColor,
                radicalColor: radicalColor,
                opacity: strokes[i].opacity * opacity,
                displayPortion: strokes[i].displayPortion || 0,
            });
        }
    };
    return CharacterRenderer;
}());
export default CharacterRenderer;
