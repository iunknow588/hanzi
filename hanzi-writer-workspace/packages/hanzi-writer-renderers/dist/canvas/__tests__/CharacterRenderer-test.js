import ren from 'hanzi-writer-data/人.json';
import CharacterRenderer from '../CharacterRenderer';
import parseCharData from '../../../parseCharData';
var char = parseCharData('人', ren);
describe('CharacterRenderer', function () {
    var ctx;
    beforeEach(function () {
        ctx = document.createElement('canvas').getContext('2d');
    });
    it('renders the strokes of the character', function () {
        var props = {
            strokeColor: { r: 120, g: 17, b: 101, a: 0.3 },
            radicalColor: null,
            strokeWidth: 2,
            opacity: 0.7,
            strokes: {
                0: {
                    opacity: 1,
                    displayPortion: 1,
                },
                1: {
                    opacity: 1,
                    displayPortion: 1,
                },
            },
        };
        var charRenderer = new CharacterRenderer(char);
        charRenderer.render(ctx, props);
        expect(ctx.__getEvents()).toMatchSnapshot();
    });
    it('skips rendering if opacity is close to 0', function () {
        var props = {
            strokeColor: { r: 101, g: 101, b: 101, a: 1 },
            radicalColor: null,
            strokeWidth: 2,
            opacity: 0,
            strokes: {
                0: {
                    opacity: 1,
                    displayPortion: 1,
                },
                1: {
                    opacity: 1,
                    displayPortion: 1,
                },
            },
        };
        var charRenderer = new CharacterRenderer(char);
        charRenderer.render(ctx, props);
        expect(ctx.__getEvents()).toEqual([]);
    });
});
