// All makemeahanzi characters have the same bounding box
var CHARACTER_BOUNDS = [
    { x: 0, y: -124 },
    { x: 1024, y: 900 },
];
var from = CHARACTER_BOUNDS[0], to = CHARACTER_BOUNDS[1];
var preScaledWidth = to.x - from.x;
var preScaledHeight = to.y - from.y;
var Positioner = /** @class */ (function () {
    function Positioner(options) {
        var padding = options.padding, width = options.width, height = options.height;
        this.padding = padding;
        this.width = width;
        this.height = height;
        var effectiveWidth = width - 2 * padding;
        var effectiveHeight = height - 2 * padding;
        var scaleX = effectiveWidth / preScaledWidth;
        var scaleY = effectiveHeight / preScaledHeight;
        this.scale = Math.min(scaleX, scaleY);
        var xCenteringBuffer = padding + (effectiveWidth - this.scale * preScaledWidth) / 2;
        var yCenteringBuffer = padding + (effectiveHeight - this.scale * preScaledHeight) / 2;
        this.xOffset = -1 * from.x * this.scale + xCenteringBuffer;
        this.yOffset = -1 * from.y * this.scale + yCenteringBuffer;
    }
    Positioner.prototype.convertExternalPoint = function (point) {
        var x = (point.x - this.xOffset) / this.scale;
        var y = (this.height - this.yOffset - point.y) / this.scale;
        return { x: x, y: y };
    };
    return Positioner;
}());
export default Positioner;
