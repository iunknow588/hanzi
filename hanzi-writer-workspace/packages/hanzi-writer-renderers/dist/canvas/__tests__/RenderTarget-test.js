import RenderTarget from '../RenderTarget';
describe('RenderTarget', function () {
    it('can render a canvas into a div on the page', function () {
        document.body.innerHTML = '<div id="target"></canvas>';
        var target = RenderTarget.init('target', '200px', '120px');
        var canvas = document.querySelector('#target canvas');
        expect(canvas.width).toBe(200);
        expect(canvas.height).toBe(120);
        expect(target.node).toBe(canvas);
    });
    it('can use an existing canvas on the page', function () {
        document.body.innerHTML = '<canvas id="target"></canvas>';
        var target = RenderTarget.init('target', '200px', '120px');
        var canvas = document.querySelector('canvas#target');
        expect(canvas.width).toBe(200);
        expect(canvas.height).toBe(120);
        expect(target.node).toBe(canvas);
    });
    it("Errors if the element can't be found", function () {
        document.body.innerHTML = '<canvas id="target"></canvas>';
        expect(function () {
            RenderTarget.init('wrong-target', '200px', '120px');
        }).toThrow('HanziWriter target element not found: wrong-target');
    });
});
