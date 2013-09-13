/*
YUI 3.12.0 (build 8655935)
Copyright 2013 Yahoo! Inc. All rights reserved.
Licensed under the BSD License.
http://yuilibrary.com/license/
*/

if (typeof __coverage__ === 'undefined') { __coverage__ = {}; }
if (!__coverage__['build/node-style/node-style.js']) {
   __coverage__['build/node-style/node-style.js'] = {"path":"build/node-style/node-style.js","s":{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0},"b":{},"f":{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0},"fnMap":{"1":{"name":"(anonymous_1)","line":1,"loc":{"start":{"line":1,"column":22},"end":{"line":1,"column":41}}},"2":{"name":"(anonymous_2)","line":3,"loc":{"start":{"line":3,"column":1},"end":{"line":3,"column":13}}},"3":{"name":"(anonymous_3)","line":19,"loc":{"start":{"line":19,"column":14},"end":{"line":19,"column":34}}},"4":{"name":"(anonymous_4)","line":31,"loc":{"start":{"line":31,"column":15},"end":{"line":31,"column":30}}},"5":{"name":"(anonymous_5)","line":45,"loc":{"start":{"line":45,"column":15},"end":{"line":45,"column":30}}},"6":{"name":"(anonymous_6)","line":56,"loc":{"start":{"line":56,"column":23},"end":{"line":56,"column":38}}}},"statementMap":{"1":{"start":{"line":1,"column":0},"end":{"line":106,"column":55}},"2":{"start":{"line":3,"column":0},"end":{"line":103,"column":6}},"3":{"start":{"line":10,"column":0},"end":{"line":59,"column":3}},"4":{"start":{"line":20,"column":8},"end":{"line":20,"column":46}},"5":{"start":{"line":21,"column":8},"end":{"line":21,"column":20}},"6":{"start":{"line":32,"column":8},"end":{"line":32,"column":42}},"7":{"start":{"line":33,"column":8},"end":{"line":33,"column":20}},"8":{"start":{"line":46,"column":8},"end":{"line":46,"column":48}},"9":{"start":{"line":57,"column":8},"end":{"line":57,"column":56}},"10":{"start":{"line":102,"column":0},"end":{"line":102,"column":101}}},"branchMap":{},"code":["(function () { YUI.add('node-style', function (Y, NAME) {","","(function(Y) {","/**"," * Extended Node interface for managing node styles."," * @module node"," * @submodule node-style"," */","","Y.mix(Y.Node.prototype, {","    /**","     * Sets a style property of the node.","     * Use camelCase (e.g. 'backgroundColor') for multi-word properties.","     * @method setStyle","     * @param {String} attr The style attribute to set. ","     * @param {String|Number} val The value. ","     * @chainable","     */","    setStyle: function(attr, val) {","        Y.DOM.setStyle(this._node, attr, val);","        return this;","    },","","    /**","     * Sets multiple style properties on the node.","     * Use camelCase (e.g. 'backgroundColor') for multi-word properties.","     * @method setStyles","     * @param {Object} hash An object literal of property:value pairs. ","     * @chainable","     */","    setStyles: function(hash) {","        Y.DOM.setStyles(this._node, hash);","        return this;","    },","","    /**","     * Returns the style's current value.","     * Use camelCase (e.g. 'backgroundColor') for multi-word properties.","     * @method getStyle","     * @for Node","     * @param {String} attr The style attribute to retrieve. ","     * @return {String} The current value of the style property for the element.","     */","","     getStyle: function(attr) {","        return Y.DOM.getStyle(this._node, attr);","     },","","    /**","     * Returns the computed value for the given style property.","     * Use camelCase (e.g. 'backgroundColor') for multi-word properties.","     * @method getComputedStyle","     * @param {String} attr The style attribute to retrieve. ","     * @return {String} The computed value of the style property for the element.","     */","     getComputedStyle: function(attr) {","        return Y.DOM.getComputedStyle(this._node, attr);","     }","});","","/**"," * Returns an array of values for each node."," * Use camelCase (e.g. 'backgroundColor') for multi-word properties."," * @method getStyle"," * @for NodeList"," * @see Node.getStyle"," * @param {String} attr The style attribute to retrieve. "," * @return {Array} The current values of the style property for the element."," */","","/**"," * Returns an array of the computed value for each node."," * Use camelCase (e.g. 'backgroundColor') for multi-word properties."," * @method getComputedStyle"," * @see Node.getComputedStyle"," * @param {String} attr The style attribute to retrieve. "," * @return {Array} The computed values for each node."," */","","/**"," * Sets a style property on each node."," * Use camelCase (e.g. 'backgroundColor') for multi-word properties."," * @method setStyle"," * @see Node.setStyle"," * @param {String} attr The style attribute to set. "," * @param {String|Number} val The value. "," * @chainable"," */","","/**"," * Sets multiple style properties on each node."," * Use camelCase (e.g. 'backgroundColor') for multi-word properties."," * @method setStyles"," * @see Node.setStyles"," * @param {Object} hash An object literal of property:value pairs. "," * @chainable"," */","","// These are broken out to handle undefined return (avoid false positive for","// chainable)","","Y.NodeList.importMethod(Y.Node.prototype, ['getStyle', 'getComputedStyle', 'setStyle', 'setStyles']);","})(Y);","","","}, '3.12.0', {\"requires\": [\"dom-style\", \"node-base\"]});","","}());"]};
}
var __cov_DYVP_bG0JqD8NAQnvB9Z$A = __coverage__['build/node-style/node-style.js'];
__cov_DYVP_bG0JqD8NAQnvB9Z$A.s['1']++;YUI.add('node-style',function(Y,NAME){__cov_DYVP_bG0JqD8NAQnvB9Z$A.f['1']++;__cov_DYVP_bG0JqD8NAQnvB9Z$A.s['2']++;(function(Y){__cov_DYVP_bG0JqD8NAQnvB9Z$A.f['2']++;__cov_DYVP_bG0JqD8NAQnvB9Z$A.s['3']++;Y.mix(Y.Node.prototype,{setStyle:function(attr,val){__cov_DYVP_bG0JqD8NAQnvB9Z$A.f['3']++;__cov_DYVP_bG0JqD8NAQnvB9Z$A.s['4']++;Y.DOM.setStyle(this._node,attr,val);__cov_DYVP_bG0JqD8NAQnvB9Z$A.s['5']++;return this;},setStyles:function(hash){__cov_DYVP_bG0JqD8NAQnvB9Z$A.f['4']++;__cov_DYVP_bG0JqD8NAQnvB9Z$A.s['6']++;Y.DOM.setStyles(this._node,hash);__cov_DYVP_bG0JqD8NAQnvB9Z$A.s['7']++;return this;},getStyle:function(attr){__cov_DYVP_bG0JqD8NAQnvB9Z$A.f['5']++;__cov_DYVP_bG0JqD8NAQnvB9Z$A.s['8']++;return Y.DOM.getStyle(this._node,attr);},getComputedStyle:function(attr){__cov_DYVP_bG0JqD8NAQnvB9Z$A.f['6']++;__cov_DYVP_bG0JqD8NAQnvB9Z$A.s['9']++;return Y.DOM.getComputedStyle(this._node,attr);}});__cov_DYVP_bG0JqD8NAQnvB9Z$A.s['10']++;Y.NodeList.importMethod(Y.Node.prototype,['getStyle','getComputedStyle','setStyle','setStyles']);}(Y));},'3.12.0',{'requires':['dom-style','node-base']});
