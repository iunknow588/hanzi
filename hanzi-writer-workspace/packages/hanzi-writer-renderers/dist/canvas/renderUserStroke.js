import { drawPath } from './canvasUtils';
export default function renderUserStroke(ctx, props) {
    if (props.opacity < 0.05) {
        return;
    }
    var opacity = props.opacity, strokeWidth = props.strokeWidth, strokeColor = props.strokeColor, points = props.points;
    var r = strokeColor.r, g = strokeColor.g, b = strokeColor.b, a = strokeColor.a;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = "rgba(".concat(r, ",").concat(g, ",").concat(b, ",").concat(a, ")");
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawPath(ctx, points);
    ctx.restore();
}
