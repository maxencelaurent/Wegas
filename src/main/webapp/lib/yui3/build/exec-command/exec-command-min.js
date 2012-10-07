/*
YUI 3.7.2 (build 5639)
Copyright 2012 Yahoo! Inc. All rights reserved.
Licensed under the BSD License.
http://yuilibrary.com/license/
*/
YUI.add("exec-command",function(e,t){var n=function(){n.superclass.constructor.apply(this,arguments)};e.extend(n,e.Base,{_lastKey:null,_inst:null,command:function(e,t){var r=n.COMMANDS[e];return r?r.call(this,e,t):this._command(e,t)},_command:function(e,t){var n=this.getInstance();try{try{n.config.doc.execCommand("styleWithCSS",null,1)}catch(r){try{n.config.doc.execCommand("useCSS",null,0)}catch(i){}}n.config.doc.execCommand(e,null,t)}catch(s){}},getInstance:function(){return this._inst||(this._inst=this.get("host").getInstance()),this._inst},initializer:function(){e.mix(this.get("host"),{execCommand:function(e,t){return this.exec.command(e,t)},_execCommand:function(e,t){return this.exec._command(e,t)}}),this.get("host").on("dom:keypress",e.bind(function(e){this._lastKey=e.keyCode},this))},_wrapContent:function(e,t){var n=this.getInstance().host.editorPara&&!t?!0:!1;return n?e="<p>"+e+"</p>":e+="<br>",e}},{NAME:"execCommand",NS:"exec",ATTRS:{host:{value:!1}},COMMANDS:{wrap:function(e,t){var n=this.getInstance();return(new n.EditorSelection).wrapContent(t)},inserthtml:function(t,n){var r=this.getInstance();if(r.EditorSelection.hasCursor()||e.UA.ie)return(new r.EditorSelection).insertContent(n);this._command("inserthtml",n)},insertandfocus:function(e,t){var n=this.getInstance(),r,i;return n.EditorSelection.hasCursor()?(t+=n.EditorSelection.CURSOR,r=this.command("inserthtml",t),i=new n.EditorSelection,i.focusCursor(!0,!0)):this.command("inserthtml",t),r},insertbr:function(t){var n=this.getInstance(),r=new n.EditorSelection,i="<var>|</var>",s=null,o=e.UA.webkit?"span.Apple-style-span,var":"var";r._selection.pasteHTML?r._selection.pasteHTML(i):this._command("inserthtml",i);var u=function(e){var t=n.Node.create("<br>");return e.insert(t,"before"),t};n.all(o).each(function(t){var n=!0;e.UA.webkit&&(n=!1,t.get("innerHTML")==="|"&&(n=!0));if(n){s=u(t);if((!s.previous()||!s.previous().test("br"))&&e.UA.gecko){var r=s.cloneNode();s.insert(r,"after"),s=r}t.remove()}}),e.UA.webkit&&s&&(u(s),r.selectNode(s))},insertimage:function(e,t){return this.command("inserthtml",'<img src="'+t+'">')},addclass:function(e,t){var n=this.getInstance();return(new n.EditorSelection).getSelected().addClass(t)},removeclass:function(e,t){var n=this.getInstance();return(new n.EditorSelection).getSelected().removeClass(t)},forecolor:function(t,n){var r=this.getInstance(),i=new r.EditorSelection,s;e.UA.ie||this._command("useCSS",!1);if(r.EditorSelection.hasCursor())return i.isCollapsed?(i.anchorNode&&i.anchorNode.get("innerHTML")==="&nbsp;"?(i.anchorNode.setStyle("color",n),s=i.anchorNode):(s=this.command("inserthtml",'<span style="color: '+n+'">'+r.EditorSelection.CURSOR+"</span>"),i.focusCursor(!0,!0)),s):this._command(t,n);this._command(t,n)},backcolor:function(t,n){var r=this.getInstance(),i=new r.EditorSelection,s;if(e.UA.gecko||e.UA.opera)t="hilitecolor";e.UA.ie||this._command("useCSS",!1);if(r.EditorSelection.hasCursor())return i.isCollapsed?(i.anchorNode&&i.anchorNode.get("innerHTML")==="&nbsp;"?(i.anchorNode.setStyle("backgroundColor",n),s=i.anchorNode):(s=this.command("inserthtml",'<span style="background-color: '+n+'">'+r.EditorSelection.CURSOR+"</span>"),i.focusCursor(!0,!0)),s):this._command(t,n);this._command(t,n)},hilitecolor:function(){return n.COMMANDS.backcolor.apply(this,arguments)},fontname2:function(e,t){this._command("fontname",t);var n=this.getInstance(),r=new n.EditorSelection;r.isCollapsed&&this._lastKey!=32&&r.anchorNode.test("font")&&r.anchorNode.set("face",t)},fontsize2:function(t,n){this._command("fontsize",n);var r=this.getInstance(),i=new r.EditorSelection;if(i.isCollapsed&&i.anchorNode&&this._lastKey!=32){e.UA.webkit&&i.anchorNode.getStyle("lineHeight")&&i.anchorNode.setStyle("lineHeight","");if(i.anchorNode.test("font"))i.anchorNode.set("size",n);else if(e.UA.gecko){var s=i.anchorNode.ancestor(r.EditorSelection.DEFAULT_BLOCK_TAG);s&&s.setStyle("fontSize","")}}},insertunorderedlist:function(e){this.command("list","ul")},insertorderedlist:function(e){this.command("list","ol")},list:function(t,n){var r=this.getInstance(),i,s=this,o="dir",u="yui3-touched",a,f,l,c,h,p,d,v,m,g,y=r.host.editorPara?!0:!1,b=new r.EditorSelection;t="insert"+(n==="ul"?"un":"")+"orderedlist";if(e.UA.ie&&!b.isCollapsed){f=b._selection,i=f.htmlText,l=r.Node.create(i)||r.one("body");if(l.test("li")||l.one("li")){this._command(t,null);return}if(l.test(n))c=f.item?f.item(0):f.parentElement(),h=r.one(c),g=h.all("li"),p="<div>",g.each(function(e){p=s._wrapContent(e.get("innerHTML"))}),p+="</div>",d=r.Node.create(p),h.get("parentNode").test("div")&&(h=h.get("parentNode")),h&&h.hasAttribute(o)&&(y?d.all("p").setAttribute(o,h.getAttribute(o)):d.setAttribute(o,h.getAttribute(o))),y?h.replace(d.get("innerHTML")):h.replace(d),f.moveToElementText&&f.moveToElementText(d._node),f.select();else{v=e.one(f.parentElement()),v.test(r.EditorSelection.BLOCKS)||(v=v.ancestor(r.EditorSelection.BLOCKS)),v&&v.hasAttribute(o)&&(a=v.getAttribute(o));if(i.indexOf("<br>")>-1)i=i.split(/<br>/i);else{var w=r.Node.create(i),E=w?w.all("p"):null;E&&E.size()?(i=[],E.each(function(e){i.push(e.get("innerHTML"))})):i=[i]}m="<"+n+' id="ie-list">',e.each(i,function(e){var t=r.Node.create(e);t&&t.test("p")&&(t.hasAttribute(o)&&(a=t.getAttribute(o)),e=t.get("innerHTML")),m+="<li>"+e+"</li>"}),m+="</"+n+">",f.pasteHTML(m),c=r.config.doc.getElementById("ie-list"),c.id="",a&&c.setAttribute(o,a),f.moveToElementText&&f.moveToElementText(c),f.select()}}else if(e.UA.ie){v=r.one(b._selection.parentElement());if(v.test("p")){v&&v.hasAttribute(o)&&(a=v.getAttribute(o)),i=e.EditorSelection.getText(v);if(i===""){var S="";a&&(S=' dir="'+a+'"'),m=r.Node.create(e.Lang.sub("<{tag}{dir}><li></li></{tag}>",{tag:n,dir:S})),v.replace(m),b.selectNode(m.one("li"))}else this._command(t,null)}else this._command(t,null)}else{r.all(n).addClass(u),b.anchorNode.test(r.EditorSelection.BLOCKS)?v=b.anchorNode:v=b.anchorNode.ancestor(r.EditorSelection.BLOCKS),v||(v=b.anchorNode.one(r.EditorSelection.BLOCKS)),v&&v.hasAttribute(o)&&(a=v.getAttribute(o));if(v&&v.test(n)){var x=v.ancestor("p");i=r.Node.create("<div/>"),c=v.all("li"),c.each(function(e){i.append(s._wrapContent(e.get("innerHTML"),x))}),a&&(y?i.all("p").setAttribute(o,a):i.setAttribute(o,a)),y&&(i=r.Node.create(i.get("innerHTML")));var T=i.get("firstChild");v.replace(i),b.selectNode(T)}else this._command(t,null);m=r.all(n),a&&m.size()&&m.each(function(e){e.hasClass(u)||e.setAttribute(o,a)}),m.removeClass(u)}},justify:function(t,n){if(e.UA.webkit){var r=this.getInstance(),i=new r.EditorSelection,s=i.anchorNode,o=s.getStyle("backgroundColor");this._command(n),i=new r.EditorSelection;if(i.anchorNode.test("div")){var u="<span>"+i.anchorNode.get("innerHTML")+"</span>";i.anchorNode.set("innerHTML",u),i.anchorNode.one("span").setStyle("backgroundColor",o),i.selectNode(i.anchorNode.one("span"))}}else this._command(n)},justifycenter:function(e){this.command("justify","justifycenter")},justifyleft:function(e){this.command("justify","justifyleft")},justifyright:function(e){this.command("justify","justifyright")},justifyfull:function(e){this.command("justify","justifyfull")}}});var r=function(t,n,r){var i=this.getInstance(),s=i.config.doc,o=s.selection.createRange(),u=s.queryCommandValue(t),a,f,l,c,h,p,d;u&&(a=o.htmlText,f=new RegExp(r,"g"),l=a.match(f),l&&(a=a.replace(r+";","").replace(r,""),o.pasteHTML('<var id="yui-ie-bs">'),c=s.getElementById("yui-ie-bs"),h=s.createElement("div"),p=s.createElement(n),h.innerHTML=a,c.parentNode!==i.config.doc.body&&(c=c.parentNode),d=h.childNodes,c.parentNode.replaceChild(p,c),e.each(d,function(e){p.appendChild(e)}),o.collapse(),o.moveToElementText&&o.moveToElementText(p),o.select())),this._command(t)};e.UA.ie&&(n.COMMANDS.bold=function(){r.call(this,"bold","b","FONT-WEIGHT: bold")},n.COMMANDS.italic=function(){r.call(this,"italic","i","FONT-STYLE: italic")},n.COMMANDS.underline=function(){r.call(this,"underline","u","TEXT-DECORATION: underline")}),e.namespace("Plugin"),e.Plugin.ExecCommand=n},"3.7.2",{requires:["frame"]});
