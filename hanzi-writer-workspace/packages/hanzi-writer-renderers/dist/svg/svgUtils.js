export function createElm(elmType) {
    return document.createElementNS('http://www.w3.org/2000/svg', elmType);
}
export function attr(elm, name, value) {
    elm.setAttributeNS(null, name, value);
}
export function attrs(elm, attrsMap) {
    Object.keys(attrsMap).forEach(function (attrName) { return attr(elm, attrName, attrsMap[attrName]); });
}
// inspired by https://talk.observablehq.com/t/hanzi-writer-renders-incorrectly-inside-an-observable-notebook-on-a-mobile-browser/1898
export function urlIdRef(id) {
    var prefix = '';
    if (window.location && window.location.href) {
        prefix = window.location.href.replace(/#[^#]*$/, '').replace(/"/gi, '%22');
    }
    return "url(\"".concat(prefix, "#").concat(id, "\")");
}
export function removeElm(elm) {
    var _a;
    (_a = elm === null || elm === void 0 ? void 0 : elm.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(elm);
}
