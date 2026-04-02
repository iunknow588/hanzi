var StrokeRendererBase = /** @class */ (function () {
    function StrokeRendererBase(stroke) {
        this.stroke = stroke;
        this._pathLength = stroke.getLength() + StrokeRendererBase.STROKE_WIDTH / 2;
    }
    StrokeRendererBase.prototype._getStrokeDashoffset = function (displayPortion) {
        return this._pathLength * 0.999 * (1 - displayPortion);
    };
    StrokeRendererBase.prototype._getColor = function (_a) {
        var strokeColor = _a.strokeColor, radicalColor = _a.radicalColor;
        return radicalColor && this.stroke.isInRadical ? radicalColor : strokeColor;
    };
    StrokeRendererBase.STROKE_WIDTH = 200;
    return StrokeRendererBase;
}());
export default StrokeRendererBase;
