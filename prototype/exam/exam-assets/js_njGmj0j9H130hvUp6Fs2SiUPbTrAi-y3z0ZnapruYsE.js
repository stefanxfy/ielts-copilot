/*! jQuery v3.3.1 | (c) JS Foundation and other contributors | jquery.org/license */
!function(e,t){"use strict";"object"==typeof module&&"object"==typeof module.exports?module.exports=e.document?t(e,!0):function(e){if(!e.document)throw new Error("jQuery requires a window with a document");return t(e)}:t(e)}("undefined"!=typeof window?window:this,function(e,t){"use strict";var n=[],r=e.document,i=Object.getPrototypeOf,o=n.slice,a=n.concat,s=n.push,u=n.indexOf,l={},c=l.toString,f=l.hasOwnProperty,p=f.toString,d=p.call(Object),h={},g=function e(t){return"function"==typeof t&&"number"!=typeof t.nodeType},y=function e(t){return null!=t&&t===t.window},v={type:!0,src:!0,noModule:!0};function m(e,t,n){var i,o=(t=t||r).createElement("script");if(o.text=e,n)for(i in v)n[i]&&(o[i]=n[i]);t.head.appendChild(o).parentNode.removeChild(o)}function x(e){return null==e?e+"":"object"==typeof e||"function"==typeof e?l[c.call(e)]||"object":typeof e}var b="3.3.1",w=function(e,t){return new w.fn.init(e,t)},T=/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;w.fn=w.prototype={jquery:"3.3.1",constructor:w,length:0,toArray:function(){return o.call(this)},get:function(e){return null==e?o.call(this):e<0?this[e+this.length]:this[e]},pushStack:function(e){var t=w.merge(this.constructor(),e);return t.prevObject=this,t},each:function(e){return w.each(this,e)},map:function(e){return this.pushStack(w.map(this,function(t,n){return e.call(t,n,t)}))},slice:function(){return this.pushStack(o.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(e){var t=this.length,n=+e+(e<0?t:0);return this.pushStack(n>=0&&n<t?[this[n]]:[])},end:function(){return this.prevObject||this.constructor()},push:s,sort:n.sort,splice:n.splice},w.extend=w.fn.extend=function(){var e,t,n,r,i,o,a=arguments[0]||{},s=1,u=arguments.length,l=!1;for("boolean"==typeof a&&(l=a,a=arguments[s]||{},s++),"object"==typeof a||g(a)||(a={}),s===u&&(a=this,s--);s<u;s++)if(null!=(e=arguments[s]))for(t in e)n=a[t],a!==(r=e[t])&&(l&&r&&(w.isPlainObject(r)||(i=Array.isArray(r)))?(i?(i=!1,o=n&&Array.isArray(n)?n:[]):o=n&&w.isPlainObject(n)?n:{},a[t]=w.extend(l,o,r)):void 0!==r&&(a[t]=r));return a},w.extend({expando:"jQuery"+("3.3.1"+Math.random()).replace(/\D/g,""),isReady:!0,error:function(e){throw new Error(e)},noop:function(){},isPlainObject:function(e){var t,n;return!(!e||"[object Object]"!==c.call(e))&&(!(t=i(e))||"function"==typeof(n=f.call(t,"constructor")&&t.constructor)&&p.call(n)===d)},isEmptyObject:function(e){var t;for(t in e)return!1;return!0},globalEval:function(e){m(e)},each:function(e,t){var n,r=0;if(C(e)){for(n=e.length;r<n;r++)if(!1===t.call(e[r],r,e[r]))break}else for(r in e)if(!1===t.call(e[r],r,e[r]))break;return e},trim:function(e){return null==e?"":(e+"").replace(T,"")},makeArray:function(e,t){var n=t||[];return null!=e&&(C(Object(e))?w.merge(n,"string"==typeof e?[e]:e):s.call(n,e)),n},inArray:function(e,t,n){return null==t?-1:u.call(t,e,n)},merge:function(e,t){for(var n=+t.length,r=0,i=e.length;r<n;r++)e[i++]=t[r];return e.length=i,e},grep:function(e,t,n){for(var r,i=[],o=0,a=e.length,s=!n;o<a;o++)(r=!t(e[o],o))!==s&&i.push(e[o]);return i},map:function(e,t,n){var r,i,o=0,s=[];if(C(e))for(r=e.length;o<r;o++)null!=(i=t(e[o],o,n))&&s.push(i);else for(o in e)null!=(i=t(e[o],o,n))&&s.push(i);return a.apply([],s)},guid:1,support:h}),"function"==typeof Symbol&&(w.fn[Symbol.iterator]=n[Symbol.iterator]),w.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "),function(e,t){l["[object "+t+"]"]=t.toLowerCase()});function C(e){var t=!!e&&"length"in e&&e.length,n=x(e);return!g(e)&&!y(e)&&("array"===n||0===t||"number"==typeof t&&t>0&&t-1 in e)}var E=function(e){var t,n,r,i,o,a,s,u,l,c,f,p,d,h,g,y,v,m,x,b="sizzle"+1*new Date,w=e.document,T=0,C=0,E=ae(),k=ae(),S=ae(),D=function(e,t){return e===t&&(f=!0),0},N={}.hasOwnProperty,A=[],j=A.pop,q=A.push,L=A.push,H=A.slice,O=function(e,t){for(var n=0,r=e.length;n<r;n++)if(e[n]===t)return n;return-1},P="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",M="[\\x20\\t\\r\\n\\f]",R="(?:\\\\.|[\\w-]|[^\0-\\xa0])+",I="\\["+M+"*("+R+")(?:"+M+"*([*^$|!~]?=)"+M+"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|("+R+"))|)"+M+"*\\]",W=":("+R+")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|"+I+")*)|.*)\\)|)",$=new RegExp(M+"+","g"),B=new RegExp("^"+M+"+|((?:^|[^\\\\])(?:\\\\.)*)"+M+"+$","g"),F=new RegExp("^"+M+"*,"+M+"*"),_=new RegExp("^"+M+"*([>+~]|"+M+")"+M+"*"),z=new RegExp("="+M+"*([^\\]'\"]*?)"+M+"*\\]","g"),X=new RegExp(W),U=new RegExp("^"+R+"$"),V={ID:new RegExp("^#("+R+")"),CLASS:new RegExp("^\\.("+R+")"),TAG:new RegExp("^("+R+"|[*])"),ATTR:new RegExp("^"+I),PSEUDO:new RegExp("^"+W),CHILD:new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+M+"*(even|odd|(([+-]|)(\\d*)n|)"+M+"*(?:([+-]|)"+M+"*(\\d+)|))"+M+"*\\)|)","i"),bool:new RegExp("^(?:"+P+")$","i"),needsContext:new RegExp("^"+M+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+M+"*((?:-\\d)?\\d*)"+M+"*\\)|)(?=[^-]|$)","i")},G=/^(?:input|select|textarea|button)$/i,Y=/^h\d$/i,Q=/^[^{]+\{\s*\[native \w/,J=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,K=/[+~]/,Z=new RegExp("\\\\([\\da-f]{1,6}"+M+"?|("+M+")|.)","ig"),ee=function(e,t,n){var r="0x"+t-65536;return r!==r||n?t:r<0?String.fromCharCode(r+65536):String.fromCharCode(r>>10|55296,1023&r|56320)},te=/([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,ne=function(e,t){return t?"\0"===e?"\ufffd":e.slice(0,-1)+"\\"+e.charCodeAt(e.length-1).toString(16)+" ":"\\"+e},re=function(){p()},ie=me(function(e){return!0===e.disabled&&("form"in e||"label"in e)},{dir:"parentNode",next:"legend"});try{L.apply(A=H.call(w.childNodes),w.childNodes),A[w.childNodes.length].nodeType}catch(e){L={apply:A.length?function(e,t){q.apply(e,H.call(t))}:function(e,t){var n=e.length,r=0;while(e[n++]=t[r++]);e.length=n-1}}}function oe(e,t,r,i){var o,s,l,c,f,h,v,m=t&&t.ownerDocument,T=t?t.nodeType:9;if(r=r||[],"string"!=typeof e||!e||1!==T&&9!==T&&11!==T)return r;if(!i&&((t?t.ownerDocument||t:w)!==d&&p(t),t=t||d,g)){if(11!==T&&(f=J.exec(e)))if(o=f[1]){if(9===T){if(!(l=t.getElementById(o)))return r;if(l.id===o)return r.push(l),r}else if(m&&(l=m.getElementById(o))&&x(t,l)&&l.id===o)return r.push(l),r}else{if(f[2])return L.apply(r,t.getElementsByTagName(e)),r;if((o=f[3])&&n.getElementsByClassName&&t.getElementsByClassName)return L.apply(r,t.getElementsByClassName(o)),r}if(n.qsa&&!S[e+" "]&&(!y||!y.test(e))){if(1!==T)m=t,v=e;else if("object"!==t.nodeName.toLowerCase()){(c=t.getAttribute("id"))?c=c.replace(te,ne):t.setAttribute("id",c=b),s=(h=a(e)).length;while(s--)h[s]="#"+c+" "+ve(h[s]);v=h.join(","),m=K.test(e)&&ge(t.parentNode)||t}if(v)try{return L.apply(r,m.querySelectorAll(v)),r}catch(e){}finally{c===b&&t.removeAttribute("id")}}}return u(e.replace(B,"$1"),t,r,i)}function ae(){var e=[];function t(n,i){return e.push(n+" ")>r.cacheLength&&delete t[e.shift()],t[n+" "]=i}return t}function se(e){return e[b]=!0,e}function ue(e){var t=d.createElement("fieldset");try{return!!e(t)}catch(e){return!1}finally{t.parentNode&&t.parentNode.removeChild(t),t=null}}function le(e,t){var n=e.split("|"),i=n.length;while(i--)r.attrHandle[n[i]]=t}function ce(e,t){var n=t&&e,r=n&&1===e.nodeType&&1===t.nodeType&&e.sourceIndex-t.sourceIndex;if(r)return r;if(n)while(n=n.nextSibling)if(n===t)return-1;return e?1:-1}function fe(e){return function(t){return"input"===t.nodeName.toLowerCase()&&t.type===e}}function pe(e){return function(t){var n=t.nodeName.toLowerCase();return("input"===n||"button"===n)&&t.type===e}}function de(e){return function(t){return"form"in t?t.parentNode&&!1===t.disabled?"label"in t?"label"in t.parentNode?t.parentNode.disabled===e:t.disabled===e:t.isDisabled===e||t.isDisabled!==!e&&ie(t)===e:t.disabled===e:"label"in t&&t.disabled===e}}function he(e){return se(function(t){return t=+t,se(function(n,r){var i,o=e([],n.length,t),a=o.length;while(a--)n[i=o[a]]&&(n[i]=!(r[i]=n[i]))})})}function ge(e){return e&&"undefined"!=typeof e.getElementsByTagName&&e}n=oe.support={},o=oe.isXML=function(e){var t=e&&(e.ownerDocument||e).documentElement;return!!t&&"HTML"!==t.nodeName},p=oe.setDocument=function(e){var t,i,a=e?e.ownerDocument||e:w;return a!==d&&9===a.nodeType&&a.documentElement?(d=a,h=d.documentElement,g=!o(d),w!==d&&(i=d.defaultView)&&i.top!==i&&(i.addEventListener?i.addEventListener("unload",re,!1):i.attachEvent&&i.attachEvent("onunload",re)),n.attributes=ue(function(e){return e.className="i",!e.getAttribute("className")}),n.getElementsByTagName=ue(function(e){return e.appendChild(d.createComment("")),!e.getElementsByTagName("*").length}),n.getElementsByClassName=Q.test(d.getElementsByClassName),n.getById=ue(function(e){return h.appendChild(e).id=b,!d.getElementsByName||!d.getElementsByName(b).length}),n.getById?(r.filter.ID=function(e){var t=e.replace(Z,ee);return function(e){return e.getAttribute("id")===t}},r.find.ID=function(e,t){if("undefined"!=typeof t.getElementById&&g){var n=t.getElementById(e);return n?[n]:[]}}):(r.filter.ID=function(e){var t=e.replace(Z,ee);return function(e){var n="undefined"!=typeof e.getAttributeNode&&e.getAttributeNode("id");return n&&n.value===t}},r.find.ID=function(e,t){if("undefined"!=typeof t.getElementById&&g){var n,r,i,o=t.getElementById(e);if(o){if((n=o.getAttributeNode("id"))&&n.value===e)return[o];i=t.getElementsByName(e),r=0;while(o=i[r++])if((n=o.getAttributeNode("id"))&&n.value===e)return[o]}return[]}}),r.find.TAG=n.getElementsByTagName?function(e,t){return"undefined"!=typeof t.getElementsByTagName?t.getElementsByTagName(e):n.qsa?t.querySelectorAll(e):void 0}:function(e,t){var n,r=[],i=0,o=t.getElementsByTagName(e);if("*"===e){while(n=o[i++])1===n.nodeType&&r.push(n);return r}return o},r.find.CLASS=n.getElementsByClassName&&function(e,t){if("undefined"!=typeof t.getElementsByClassName&&g)return t.getElementsByClassName(e)},v=[],y=[],(n.qsa=Q.test(d.querySelectorAll))&&(ue(function(e){h.appendChild(e).innerHTML="<a id='"+b+"'></a><select id='"+b+"-\r\\' msallowcapture=''><option selected=''></option></select>",e.querySelectorAll("[msallowcapture^='']").length&&y.push("[*^$]="+M+"*(?:''|\"\")"),e.querySelectorAll("[selected]").length||y.push("\\["+M+"*(?:value|"+P+")"),e.querySelectorAll("[id~="+b+"-]").length||y.push("~="),e.querySelectorAll(":checked").length||y.push(":checked"),e.querySelectorAll("a#"+b+"+*").length||y.push(".#.+[+~]")}),ue(function(e){e.innerHTML="<a href='' disabled='disabled'></a><select disabled='disabled'><option/></select>";var t=d.createElement("input");t.setAttribute("type","hidden"),e.appendChild(t).setAttribute("name","D"),e.querySelectorAll("[name=d]").length&&y.push("name"+M+"*[*^$|!~]?="),2!==e.querySelectorAll(":enabled").length&&y.push(":enabled",":disabled"),h.appendChild(e).disabled=!0,2!==e.querySelectorAll(":disabled").length&&y.push(":enabled",":disabled"),e.querySelectorAll("*,:x"),y.push(",.*:")})),(n.matchesSelector=Q.test(m=h.matches||h.webkitMatchesSelector||h.mozMatchesSelector||h.oMatchesSelector||h.msMatchesSelector))&&ue(function(e){n.disconnectedMatch=m.call(e,"*"),m.call(e,"[s!='']:x"),v.push("!=",W)}),y=y.length&&new RegExp(y.join("|")),v=v.length&&new RegExp(v.join("|")),t=Q.test(h.compareDocumentPosition),x=t||Q.test(h.contains)?function(e,t){var n=9===e.nodeType?e.documentElement:e,r=t&&t.parentNode;return e===r||!(!r||1!==r.nodeType||!(n.contains?n.contains(r):e.compareDocumentPosition&&16&e.compareDocumentPosition(r)))}:function(e,t){if(t)while(t=t.parentNode)if(t===e)return!0;return!1},D=t?function(e,t){if(e===t)return f=!0,0;var r=!e.compareDocumentPosition-!t.compareDocumentPosition;return r||(1&(r=(e.ownerDocument||e)===(t.ownerDocument||t)?e.compareDocumentPosition(t):1)||!n.sortDetached&&t.compareDocumentPosition(e)===r?e===d||e.ownerDocument===w&&x(w,e)?-1:t===d||t.ownerDocument===w&&x(w,t)?1:c?O(c,e)-O(c,t):0:4&r?-1:1)}:function(e,t){if(e===t)return f=!0,0;var n,r=0,i=e.parentNode,o=t.parentNode,a=[e],s=[t];if(!i||!o)return e===d?-1:t===d?1:i?-1:o?1:c?O(c,e)-O(c,t):0;if(i===o)return ce(e,t);n=e;while(n=n.parentNode)a.unshift(n);n=t;while(n=n.parentNode)s.unshift(n);while(a[r]===s[r])r++;return r?ce(a[r],s[r]):a[r]===w?-1:s[r]===w?1:0},d):d},oe.matches=function(e,t){return oe(e,null,null,t)},oe.matchesSelector=function(e,t){if((e.ownerDocument||e)!==d&&p(e),t=t.replace(z,"='$1']"),n.matchesSelector&&g&&!S[t+" "]&&(!v||!v.test(t))&&(!y||!y.test(t)))try{var r=m.call(e,t);if(r||n.disconnectedMatch||e.document&&11!==e.document.nodeType)return r}catch(e){}return oe(t,d,null,[e]).length>0},oe.contains=function(e,t){return(e.ownerDocument||e)!==d&&p(e),x(e,t)},oe.attr=function(e,t){(e.ownerDocument||e)!==d&&p(e);var i=r.attrHandle[t.toLowerCase()],o=i&&N.call(r.attrHandle,t.toLowerCase())?i(e,t,!g):void 0;return void 0!==o?o:n.attributes||!g?e.getAttribute(t):(o=e.getAttributeNode(t))&&o.specified?o.value:null},oe.escape=function(e){return(e+"").replace(te,ne)},oe.error=function(e){throw new Error("Syntax error, unrecognized expression: "+e)},oe.uniqueSort=function(e){var t,r=[],i=0,o=0;if(f=!n.detectDuplicates,c=!n.sortStable&&e.slice(0),e.sort(D),f){while(t=e[o++])t===e[o]&&(i=r.push(o));while(i--)e.splice(r[i],1)}return c=null,e},i=oe.getText=function(e){var t,n="",r=0,o=e.nodeType;if(o){if(1===o||9===o||11===o){if("string"==typeof e.textContent)return e.textContent;for(e=e.firstChild;e;e=e.nextSibling)n+=i(e)}else if(3===o||4===o)return e.nodeValue}else while(t=e[r++])n+=i(t);return n},(r=oe.selectors={cacheLength:50,createPseudo:se,match:V,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(e){return e[1]=e[1].replace(Z,ee),e[3]=(e[3]||e[4]||e[5]||"").replace(Z,ee),"~="===e[2]&&(e[3]=" "+e[3]+" "),e.slice(0,4)},CHILD:function(e){return e[1]=e[1].toLowerCase(),"nth"===e[1].slice(0,3)?(e[3]||oe.error(e[0]),e[4]=+(e[4]?e[5]+(e[6]||1):2*("even"===e[3]||"odd"===e[3])),e[5]=+(e[7]+e[8]||"odd"===e[3])):e[3]&&oe.error(e[0]),e},PSEUDO:function(e){var t,n=!e[6]&&e[2];return V.CHILD.test(e[0])?null:(e[3]?e[2]=e[4]||e[5]||"":n&&X.test(n)&&(t=a(n,!0))&&(t=n.indexOf(")",n.length-t)-n.length)&&(e[0]=e[0].slice(0,t),e[2]=n.slice(0,t)),e.slice(0,3))}},filter:{TAG:function(e){var t=e.replace(Z,ee).toLowerCase();return"*"===e?function(){return!0}:function(e){return e.nodeName&&e.nodeName.toLowerCase()===t}},CLASS:function(e){var t=E[e+" "];return t||(t=new RegExp("(^|"+M+")"+e+"("+M+"|$)"))&&E(e,function(e){return t.test("string"==typeof e.className&&e.className||"undefined"!=typeof e.getAttribute&&e.getAttribute("class")||"")})},ATTR:function(e,t,n){return function(r){var i=oe.attr(r,e);return null==i?"!="===t:!t||(i+="","="===t?i===n:"!="===t?i!==n:"^="===t?n&&0===i.indexOf(n):"*="===t?n&&i.indexOf(n)>-1:"$="===t?n&&i.slice(-n.length)===n:"~="===t?(" "+i.replace($," ")+" ").indexOf(n)>-1:"|="===t&&(i===n||i.slice(0,n.length+1)===n+"-"))}},CHILD:function(e,t,n,r,i){var o="nth"!==e.slice(0,3),a="last"!==e.slice(-4),s="of-type"===t;return 1===r&&0===i?function(e){return!!e.parentNode}:function(t,n,u){var l,c,f,p,d,h,g=o!==a?"nextSibling":"previousSibling",y=t.parentNode,v=s&&t.nodeName.toLowerCase(),m=!u&&!s,x=!1;if(y){if(o){while(g){p=t;while(p=p[g])if(s?p.nodeName.toLowerCase()===v:1===p.nodeType)return!1;h=g="only"===e&&!h&&"nextSibling"}return!0}if(h=[a?y.firstChild:y.lastChild],a&&m){x=(d=(l=(c=(f=(p=y)[b]||(p[b]={}))[p.uniqueID]||(f[p.uniqueID]={}))[e]||[])[0]===T&&l[1])&&l[2],p=d&&y.childNodes[d];while(p=++d&&p&&p[g]||(x=d=0)||h.pop())if(1===p.nodeType&&++x&&p===t){c[e]=[T,d,x];break}}else if(m&&(x=d=(l=(c=(f=(p=t)[b]||(p[b]={}))[p.uniqueID]||(f[p.uniqueID]={}))[e]||[])[0]===T&&l[1]),!1===x)while(p=++d&&p&&p[g]||(x=d=0)||h.pop())if((s?p.nodeName.toLowerCase()===v:1===p.nodeType)&&++x&&(m&&((c=(f=p[b]||(p[b]={}))[p.uniqueID]||(f[p.uniqueID]={}))[e]=[T,x]),p===t))break;return(x-=i)===r||x%r==0&&x/r>=0}}},PSEUDO:function(e,t){var n,i=r.pseudos[e]||r.setFilters[e.toLowerCase()]||oe.error("unsupported pseudo: "+e);return i[b]?i(t):i.length>1?(n=[e,e,"",t],r.setFilters.hasOwnProperty(e.toLowerCase())?se(function(e,n){var r,o=i(e,t),a=o.length;while(a--)e[r=O(e,o[a])]=!(n[r]=o[a])}):function(e){return i(e,0,n)}):i}},pseudos:{not:se(function(e){var t=[],n=[],r=s(e.replace(B,"$1"));return r[b]?se(function(e,t,n,i){var o,a=r(e,null,i,[]),s=e.length;while(s--)(o=a[s])&&(e[s]=!(t[s]=o))}):function(e,i,o){return t[0]=e,r(t,null,o,n),t[0]=null,!n.pop()}}),has:se(function(e){return function(t){return oe(e,t).length>0}}),contains:se(function(e){return e=e.replace(Z,ee),function(t){return(t.textContent||t.innerText||i(t)).indexOf(e)>-1}}),lang:se(function(e){return U.test(e||"")||oe.error("unsupported lang: "+e),e=e.replace(Z,ee).toLowerCase(),function(t){var n;do{if(n=g?t.lang:t.getAttribute("xml:lang")||t.getAttribute("lang"))return(n=n.toLowerCase())===e||0===n.indexOf(e+"-")}while((t=t.parentNode)&&1===t.nodeType);return!1}}),target:function(t){var n=e.location&&e.location.hash;return n&&n.slice(1)===t.id},root:function(e){return e===h},focus:function(e){return e===d.activeElement&&(!d.hasFocus||d.hasFocus())&&!!(e.type||e.href||~e.tabIndex)},enabled:de(!1),disabled:de(!0),checked:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&!!e.checked||"option"===t&&!!e.selected},selected:function(e){return e.parentNode&&e.parentNode.selectedIndex,!0===e.selected},empty:function(e){for(e=e.firstChild;e;e=e.nextSibling)if(e.nodeType<6)return!1;return!0},parent:function(e){return!r.pseudos.empty(e)},header:function(e){return Y.test(e.nodeName)},input:function(e){return G.test(e.nodeName)},button:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&"button"===e.type||"button"===t},text:function(e){var t;return"input"===e.nodeName.toLowerCase()&&"text"===e.type&&(null==(t=e.getAttribute("type"))||"text"===t.toLowerCase())},first:he(function(){return[0]}),last:he(function(e,t){return[t-1]}),eq:he(function(e,t,n){return[n<0?n+t:n]}),even:he(function(e,t){for(var n=0;n<t;n+=2)e.push(n);return e}),odd:he(function(e,t){for(var n=1;n<t;n+=2)e.push(n);return e}),lt:he(function(e,t,n){for(var r=n<0?n+t:n;--r>=0;)e.push(r);return e}),gt:he(function(e,t,n){for(var r=n<0?n+t:n;++r<t;)e.push(r);return e})}}).pseudos.nth=r.pseudos.eq;for(t in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})r.pseudos[t]=fe(t);for(t in{submit:!0,reset:!0})r.pseudos[t]=pe(t);function ye(){}ye.prototype=r.filters=r.pseudos,r.setFilters=new ye,a=oe.tokenize=function(e,t){var n,i,o,a,s,u,l,c=k[e+" "];if(c)return t?0:c.slice(0);s=e,u=[],l=r.preFilter;while(s){n&&!(i=F.exec(s))||(i&&(s=s.slice(i[0].length)||s),u.push(o=[])),n=!1,(i=_.exec(s))&&(n=i.shift(),o.push({value:n,type:i[0].replace(B," ")}),s=s.slice(n.length));for(a in r.filter)!(i=V[a].exec(s))||l[a]&&!(i=l[a](i))||(n=i.shift(),o.push({value:n,type:a,matches:i}),s=s.slice(n.length));if(!n)break}return t?s.length:s?oe.error(e):k(e,u).slice(0)};function ve(e){for(var t=0,n=e.length,r="";t<n;t++)r+=e[t].value;return r}function me(e,t,n){var r=t.dir,i=t.next,o=i||r,a=n&&"parentNode"===o,s=C++;return t.first?function(t,n,i){while(t=t[r])if(1===t.nodeType||a)return e(t,n,i);return!1}:function(t,n,u){var l,c,f,p=[T,s];if(u){while(t=t[r])if((1===t.nodeType||a)&&e(t,n,u))return!0}else while(t=t[r])if(1===t.nodeType||a)if(f=t[b]||(t[b]={}),c=f[t.uniqueID]||(f[t.uniqueID]={}),i&&i===t.nodeName.toLowerCase())t=t[r]||t;else{if((l=c[o])&&l[0]===T&&l[1]===s)return p[2]=l[2];if(c[o]=p,p[2]=e(t,n,u))return!0}return!1}}function xe(e){return e.length>1?function(t,n,r){var i=e.length;while(i--)if(!e[i](t,n,r))return!1;return!0}:e[0]}function be(e,t,n){for(var r=0,i=t.length;r<i;r++)oe(e,t[r],n);return n}function we(e,t,n,r,i){for(var o,a=[],s=0,u=e.length,l=null!=t;s<u;s++)(o=e[s])&&(n&&!n(o,r,i)||(a.push(o),l&&t.push(s)));return a}function Te(e,t,n,r,i,o){return r&&!r[b]&&(r=Te(r)),i&&!i[b]&&(i=Te(i,o)),se(function(o,a,s,u){var l,c,f,p=[],d=[],h=a.length,g=o||be(t||"*",s.nodeType?[s]:s,[]),y=!e||!o&&t?g:we(g,p,e,s,u),v=n?i||(o?e:h||r)?[]:a:y;if(n&&n(y,v,s,u),r){l=we(v,d),r(l,[],s,u),c=l.length;while(c--)(f=l[c])&&(v[d[c]]=!(y[d[c]]=f))}if(o){if(i||e){if(i){l=[],c=v.length;while(c--)(f=v[c])&&l.push(y[c]=f);i(null,v=[],l,u)}c=v.length;while(c--)(f=v[c])&&(l=i?O(o,f):p[c])>-1&&(o[l]=!(a[l]=f))}}else v=we(v===a?v.splice(h,v.length):v),i?i(null,a,v,u):L.apply(a,v)})}function Ce(e){for(var t,n,i,o=e.length,a=r.relative[e[0].type],s=a||r.relative[" "],u=a?1:0,c=me(function(e){return e===t},s,!0),f=me(function(e){return O(t,e)>-1},s,!0),p=[function(e,n,r){var i=!a&&(r||n!==l)||((t=n).nodeType?c(e,n,r):f(e,n,r));return t=null,i}];u<o;u++)if(n=r.relative[e[u].type])p=[me(xe(p),n)];else{if((n=r.filter[e[u].type].apply(null,e[u].matches))[b]){for(i=++u;i<o;i++)if(r.relative[e[i].type])break;return Te(u>1&&xe(p),u>1&&ve(e.slice(0,u-1).concat({value:" "===e[u-2].type?"*":""})).replace(B,"$1"),n,u<i&&Ce(e.slice(u,i)),i<o&&Ce(e=e.slice(i)),i<o&&ve(e))}p.push(n)}return xe(p)}function Ee(e,t){var n=t.length>0,i=e.length>0,o=function(o,a,s,u,c){var f,h,y,v=0,m="0",x=o&&[],b=[],w=l,C=o||i&&r.find.TAG("*",c),E=T+=null==w?1:Math.random()||.1,k=C.length;for(c&&(l=a===d||a||c);m!==k&&null!=(f=C[m]);m++){if(i&&f){h=0,a||f.ownerDocument===d||(p(f),s=!g);while(y=e[h++])if(y(f,a||d,s)){u.push(f);break}c&&(T=E)}n&&((f=!y&&f)&&v--,o&&x.push(f))}if(v+=m,n&&m!==v){h=0;while(y=t[h++])y(x,b,a,s);if(o){if(v>0)while(m--)x[m]||b[m]||(b[m]=j.call(u));b=we(b)}L.apply(u,b),c&&!o&&b.length>0&&v+t.length>1&&oe.uniqueSort(u)}return c&&(T=E,l=w),x};return n?se(o):o}return s=oe.compile=function(e,t){var n,r=[],i=[],o=S[e+" "];if(!o){t||(t=a(e)),n=t.length;while(n--)(o=Ce(t[n]))[b]?r.push(o):i.push(o);(o=S(e,Ee(i,r))).selector=e}return o},u=oe.select=function(e,t,n,i){var o,u,l,c,f,p="function"==typeof e&&e,d=!i&&a(e=p.selector||e);if(n=n||[],1===d.length){if((u=d[0]=d[0].slice(0)).length>2&&"ID"===(l=u[0]).type&&9===t.nodeType&&g&&r.relative[u[1].type]){if(!(t=(r.find.ID(l.matches[0].replace(Z,ee),t)||[])[0]))return n;p&&(t=t.parentNode),e=e.slice(u.shift().value.length)}o=V.needsContext.test(e)?0:u.length;while(o--){if(l=u[o],r.relative[c=l.type])break;if((f=r.find[c])&&(i=f(l.matches[0].replace(Z,ee),K.test(u[0].type)&&ge(t.parentNode)||t))){if(u.splice(o,1),!(e=i.length&&ve(u)))return L.apply(n,i),n;break}}}return(p||s(e,d))(i,t,!g,n,!t||K.test(e)&&ge(t.parentNode)||t),n},n.sortStable=b.split("").sort(D).join("")===b,n.detectDuplicates=!!f,p(),n.sortDetached=ue(function(e){return 1&e.compareDocumentPosition(d.createElement("fieldset"))}),ue(function(e){return e.innerHTML="<a href='#'></a>","#"===e.firstChild.getAttribute("href")})||le("type|href|height|width",function(e,t,n){if(!n)return e.getAttribute(t,"type"===t.toLowerCase()?1:2)}),n.attributes&&ue(function(e){return e.innerHTML="<input/>",e.firstChild.setAttribute("value",""),""===e.firstChild.getAttribute("value")})||le("value",function(e,t,n){if(!n&&"input"===e.nodeName.toLowerCase())return e.defaultValue}),ue(function(e){return null==e.getAttribute("disabled")})||le(P,function(e,t,n){var r;if(!n)return!0===e[t]?t.toLowerCase():(r=e.getAttributeNode(t))&&r.specified?r.value:null}),oe}(e);w.find=E,w.expr=E.selectors,w.expr[":"]=w.expr.pseudos,w.uniqueSort=w.unique=E.uniqueSort,w.text=E.getText,w.isXMLDoc=E.isXML,w.contains=E.contains,w.escapeSelector=E.escape;var k=function(e,t,n){var r=[],i=void 0!==n;while((e=e[t])&&9!==e.nodeType)if(1===e.nodeType){if(i&&w(e).is(n))break;r.push(e)}return r},S=function(e,t){for(var n=[];e;e=e.nextSibling)1===e.nodeType&&e!==t&&n.push(e);return n},D=w.expr.match.needsContext;function N(e,t){return e.nodeName&&e.nodeName.toLowerCase()===t.toLowerCase()}var A=/^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i;function j(e,t,n){return g(t)?w.grep(e,function(e,r){return!!t.call(e,r,e)!==n}):t.nodeType?w.grep(e,function(e){return e===t!==n}):"string"!=typeof t?w.grep(e,function(e){return u.call(t,e)>-1!==n}):w.filter(t,e,n)}w.filter=function(e,t,n){var r=t[0];return n&&(e=":not("+e+")"),1===t.length&&1===r.nodeType?w.find.matchesSelector(r,e)?[r]:[]:w.find.matches(e,w.grep(t,function(e){return 1===e.nodeType}))},w.fn.extend({find:function(e){var t,n,r=this.length,i=this;if("string"!=typeof e)return this.pushStack(w(e).filter(function(){for(t=0;t<r;t++)if(w.contains(i[t],this))return!0}));for(n=this.pushStack([]),t=0;t<r;t++)w.find(e,i[t],n);return r>1?w.uniqueSort(n):n},filter:function(e){return this.pushStack(j(this,e||[],!1))},not:function(e){return this.pushStack(j(this,e||[],!0))},is:function(e){return!!j(this,"string"==typeof e&&D.test(e)?w(e):e||[],!1).length}});var q,L=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/;(w.fn.init=function(e,t,n){var i,o;if(!e)return this;if(n=n||q,"string"==typeof e){if(!(i="<"===e[0]&&">"===e[e.length-1]&&e.length>=3?[null,e,null]:L.exec(e))||!i[1]&&t)return!t||t.jquery?(t||n).find(e):this.constructor(t).find(e);if(i[1]){if(t=t instanceof w?t[0]:t,w.merge(this,w.parseHTML(i[1],t&&t.nodeType?t.ownerDocument||t:r,!0)),A.test(i[1])&&w.isPlainObject(t))for(i in t)g(this[i])?this[i](t[i]):this.attr(i,t[i]);return this}return(o=r.getElementById(i[2]))&&(this[0]=o,this.length=1),this}return e.nodeType?(this[0]=e,this.length=1,this):g(e)?void 0!==n.ready?n.ready(e):e(w):w.makeArray(e,this)}).prototype=w.fn,q=w(r);var H=/^(?:parents|prev(?:Until|All))/,O={children:!0,contents:!0,next:!0,prev:!0};w.fn.extend({has:function(e){var t=w(e,this),n=t.length;return this.filter(function(){for(var e=0;e<n;e++)if(w.contains(this,t[e]))return!0})},closest:function(e,t){var n,r=0,i=this.length,o=[],a="string"!=typeof e&&w(e);if(!D.test(e))for(;r<i;r++)for(n=this[r];n&&n!==t;n=n.parentNode)if(n.nodeType<11&&(a?a.index(n)>-1:1===n.nodeType&&w.find.matchesSelector(n,e))){o.push(n);break}return this.pushStack(o.length>1?w.uniqueSort(o):o)},index:function(e){return e?"string"==typeof e?u.call(w(e),this[0]):u.call(this,e.jquery?e[0]:e):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(e,t){return this.pushStack(w.uniqueSort(w.merge(this.get(),w(e,t))))},addBack:function(e){return this.add(null==e?this.prevObject:this.prevObject.filter(e))}});function P(e,t){while((e=e[t])&&1!==e.nodeType);return e}w.each({parent:function(e){var t=e.parentNode;return t&&11!==t.nodeType?t:null},parents:function(e){return k(e,"parentNode")},parentsUntil:function(e,t,n){return k(e,"parentNode",n)},next:function(e){return P(e,"nextSibling")},prev:function(e){return P(e,"previousSibling")},nextAll:function(e){return k(e,"nextSibling")},prevAll:function(e){return k(e,"previousSibling")},nextUntil:function(e,t,n){return k(e,"nextSibling",n)},prevUntil:function(e,t,n){return k(e,"previousSibling",n)},siblings:function(e){return S((e.parentNode||{}).firstChild,e)},children:function(e){return S(e.firstChild)},contents:function(e){return N(e,"iframe")?e.contentDocument:(N(e,"template")&&(e=e.content||e),w.merge([],e.childNodes))}},function(e,t){w.fn[e]=function(n,r){var i=w.map(this,t,n);return"Until"!==e.slice(-5)&&(r=n),r&&"string"==typeof r&&(i=w.filter(r,i)),this.length>1&&(O[e]||w.uniqueSort(i),H.test(e)&&i.reverse()),this.pushStack(i)}});var M=/[^\x20\t\r\n\f]+/g;function R(e){var t={};return w.each(e.match(M)||[],function(e,n){t[n]=!0}),t}w.Callbacks=function(e){e="string"==typeof e?R(e):w.extend({},e);var t,n,r,i,o=[],a=[],s=-1,u=function(){for(i=i||e.once,r=t=!0;a.length;s=-1){n=a.shift();while(++s<o.length)!1===o[s].apply(n[0],n[1])&&e.stopOnFalse&&(s=o.length,n=!1)}e.memory||(n=!1),t=!1,i&&(o=n?[]:"")},l={add:function(){return o&&(n&&!t&&(s=o.length-1,a.push(n)),function t(n){w.each(n,function(n,r){g(r)?e.unique&&l.has(r)||o.push(r):r&&r.length&&"string"!==x(r)&&t(r)})}(arguments),n&&!t&&u()),this},remove:function(){return w.each(arguments,function(e,t){var n;while((n=w.inArray(t,o,n))>-1)o.splice(n,1),n<=s&&s--}),this},has:function(e){return e?w.inArray(e,o)>-1:o.length>0},empty:function(){return o&&(o=[]),this},disable:function(){return i=a=[],o=n="",this},disabled:function(){return!o},lock:function(){return i=a=[],n||t||(o=n=""),this},locked:function(){return!!i},fireWith:function(e,n){return i||(n=[e,(n=n||[]).slice?n.slice():n],a.push(n),t||u()),this},fire:function(){return l.fireWith(this,arguments),this},fired:function(){return!!r}};return l};function I(e){return e}function W(e){throw e}function $(e,t,n,r){var i;try{e&&g(i=e.promise)?i.call(e).done(t).fail(n):e&&g(i=e.then)?i.call(e,t,n):t.apply(void 0,[e].slice(r))}catch(e){n.apply(void 0,[e])}}w.extend({Deferred:function(t){var n=[["notify","progress",w.Callbacks("memory"),w.Callbacks("memory"),2],["resolve","done",w.Callbacks("once memory"),w.Callbacks("once memory"),0,"resolved"],["reject","fail",w.Callbacks("once memory"),w.Callbacks("once memory"),1,"rejected"]],r="pending",i={state:function(){return r},always:function(){return o.done(arguments).fail(arguments),this},"catch":function(e){return i.then(null,e)},pipe:function(){var e=arguments;return w.Deferred(function(t){w.each(n,function(n,r){var i=g(e[r[4]])&&e[r[4]];o[r[1]](function(){var e=i&&i.apply(this,arguments);e&&g(e.promise)?e.promise().progress(t.notify).done(t.resolve).fail(t.reject):t[r[0]+"With"](this,i?[e]:arguments)})}),e=null}).promise()},then:function(t,r,i){var o=0;function a(t,n,r,i){return function(){var s=this,u=arguments,l=function(){var e,l;if(!(t<o)){if((e=r.apply(s,u))===n.promise())throw new TypeError("Thenable self-resolution");l=e&&("object"==typeof e||"function"==typeof e)&&e.then,g(l)?i?l.call(e,a(o,n,I,i),a(o,n,W,i)):(o++,l.call(e,a(o,n,I,i),a(o,n,W,i),a(o,n,I,n.notifyWith))):(r!==I&&(s=void 0,u=[e]),(i||n.resolveWith)(s,u))}},c=i?l:function(){try{l()}catch(e){w.Deferred.exceptionHook&&w.Deferred.exceptionHook(e,c.stackTrace),t+1>=o&&(r!==W&&(s=void 0,u=[e]),n.rejectWith(s,u))}};t?c():(w.Deferred.getStackHook&&(c.stackTrace=w.Deferred.getStackHook()),e.setTimeout(c))}}return w.Deferred(function(e){n[0][3].add(a(0,e,g(i)?i:I,e.notifyWith)),n[1][3].add(a(0,e,g(t)?t:I)),n[2][3].add(a(0,e,g(r)?r:W))}).promise()},promise:function(e){return null!=e?w.extend(e,i):i}},o={};return w.each(n,function(e,t){var a=t[2],s=t[5];i[t[1]]=a.add,s&&a.add(function(){r=s},n[3-e][2].disable,n[3-e][3].disable,n[0][2].lock,n[0][3].lock),a.add(t[3].fire),o[t[0]]=function(){return o[t[0]+"With"](this===o?void 0:this,arguments),this},o[t[0]+"With"]=a.fireWith}),i.promise(o),t&&t.call(o,o),o},when:function(e){var t=arguments.length,n=t,r=Array(n),i=o.call(arguments),a=w.Deferred(),s=function(e){return function(n){r[e]=this,i[e]=arguments.length>1?o.call(arguments):n,--t||a.resolveWith(r,i)}};if(t<=1&&($(e,a.done(s(n)).resolve,a.reject,!t),"pending"===a.state()||g(i[n]&&i[n].then)))return a.then();while(n--)$(i[n],s(n),a.reject);return a.promise()}});var B=/^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;w.Deferred.exceptionHook=function(t,n){e.console&&e.console.warn&&t&&B.test(t.name)&&e.console.warn("jQuery.Deferred exception: "+t.message,t.stack,n)},w.readyException=function(t){e.setTimeout(function(){throw t})};var F=w.Deferred();w.fn.ready=function(e){return F.then(e)["catch"](function(e){w.readyException(e)}),this},w.extend({isReady:!1,readyWait:1,ready:function(e){(!0===e?--w.readyWait:w.isReady)||(w.isReady=!0,!0!==e&&--w.readyWait>0||F.resolveWith(r,[w]))}}),w.ready.then=F.then;function _(){r.removeEventListener("DOMContentLoaded",_),e.removeEventListener("load",_),w.ready()}"complete"===r.readyState||"loading"!==r.readyState&&!r.documentElement.doScroll?e.setTimeout(w.ready):(r.addEventListener("DOMContentLoaded",_),e.addEventListener("load",_));var z=function(e,t,n,r,i,o,a){var s=0,u=e.length,l=null==n;if("object"===x(n)){i=!0;for(s in n)z(e,t,s,n[s],!0,o,a)}else if(void 0!==r&&(i=!0,g(r)||(a=!0),l&&(a?(t.call(e,r),t=null):(l=t,t=function(e,t,n){return l.call(w(e),n)})),t))for(;s<u;s++)t(e[s],n,a?r:r.call(e[s],s,t(e[s],n)));return i?e:l?t.call(e):u?t(e[0],n):o},X=/^-ms-/,U=/-([a-z])/g;function V(e,t){return t.toUpperCase()}function G(e){return e.replace(X,"ms-").replace(U,V)}var Y=function(e){return 1===e.nodeType||9===e.nodeType||!+e.nodeType};function Q(){this.expando=w.expando+Q.uid++}Q.uid=1,Q.prototype={cache:function(e){var t=e[this.expando];return t||(t={},Y(e)&&(e.nodeType?e[this.expando]=t:Object.defineProperty(e,this.expando,{value:t,configurable:!0}))),t},set:function(e,t,n){var r,i=this.cache(e);if("string"==typeof t)i[G(t)]=n;else for(r in t)i[G(r)]=t[r];return i},get:function(e,t){return void 0===t?this.cache(e):e[this.expando]&&e[this.expando][G(t)]},access:function(e,t,n){return void 0===t||t&&"string"==typeof t&&void 0===n?this.get(e,t):(this.set(e,t,n),void 0!==n?n:t)},remove:function(e,t){var n,r=e[this.expando];if(void 0!==r){if(void 0!==t){n=(t=Array.isArray(t)?t.map(G):(t=G(t))in r?[t]:t.match(M)||[]).length;while(n--)delete r[t[n]]}(void 0===t||w.isEmptyObject(r))&&(e.nodeType?e[this.expando]=void 0:delete e[this.expando])}},hasData:function(e){var t=e[this.expando];return void 0!==t&&!w.isEmptyObject(t)}};var J=new Q,K=new Q,Z=/^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,ee=/[A-Z]/g;function te(e){return"true"===e||"false"!==e&&("null"===e?null:e===+e+""?+e:Z.test(e)?JSON.parse(e):e)}function ne(e,t,n){var r;if(void 0===n&&1===e.nodeType)if(r="data-"+t.replace(ee,"-$&").toLowerCase(),"string"==typeof(n=e.getAttribute(r))){try{n=te(n)}catch(e){}K.set(e,t,n)}else n=void 0;return n}w.extend({hasData:function(e){return K.hasData(e)||J.hasData(e)},data:function(e,t,n){return K.access(e,t,n)},removeData:function(e,t){K.remove(e,t)},_data:function(e,t,n){return J.access(e,t,n)},_removeData:function(e,t){J.remove(e,t)}}),w.fn.extend({data:function(e,t){var n,r,i,o=this[0],a=o&&o.attributes;if(void 0===e){if(this.length&&(i=K.get(o),1===o.nodeType&&!J.get(o,"hasDataAttrs"))){n=a.length;while(n--)a[n]&&0===(r=a[n].name).indexOf("data-")&&(r=G(r.slice(5)),ne(o,r,i[r]));J.set(o,"hasDataAttrs",!0)}return i}return"object"==typeof e?this.each(function(){K.set(this,e)}):z(this,function(t){var n;if(o&&void 0===t){if(void 0!==(n=K.get(o,e)))return n;if(void 0!==(n=ne(o,e)))return n}else this.each(function(){K.set(this,e,t)})},null,t,arguments.length>1,null,!0)},removeData:function(e){return this.each(function(){K.remove(this,e)})}}),w.extend({queue:function(e,t,n){var r;if(e)return t=(t||"fx")+"queue",r=J.get(e,t),n&&(!r||Array.isArray(n)?r=J.access(e,t,w.makeArray(n)):r.push(n)),r||[]},dequeue:function(e,t){t=t||"fx";var n=w.queue(e,t),r=n.length,i=n.shift(),o=w._queueHooks(e,t),a=function(){w.dequeue(e,t)};"inprogress"===i&&(i=n.shift(),r--),i&&("fx"===t&&n.unshift("inprogress"),delete o.stop,i.call(e,a,o)),!r&&o&&o.empty.fire()},_queueHooks:function(e,t){var n=t+"queueHooks";return J.get(e,n)||J.access(e,n,{empty:w.Callbacks("once memory").add(function(){J.remove(e,[t+"queue",n])})})}}),w.fn.extend({queue:function(e,t){var n=2;return"string"!=typeof e&&(t=e,e="fx",n--),arguments.length<n?w.queue(this[0],e):void 0===t?this:this.each(function(){var n=w.queue(this,e,t);w._queueHooks(this,e),"fx"===e&&"inprogress"!==n[0]&&w.dequeue(this,e)})},dequeue:function(e){return this.each(function(){w.dequeue(this,e)})},clearQueue:function(e){return this.queue(e||"fx",[])},promise:function(e,t){var n,r=1,i=w.Deferred(),o=this,a=this.length,s=function(){--r||i.resolveWith(o,[o])};"string"!=typeof e&&(t=e,e=void 0),e=e||"fx";while(a--)(n=J.get(o[a],e+"queueHooks"))&&n.empty&&(r++,n.empty.add(s));return s(),i.promise(t)}});var re=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,ie=new RegExp("^(?:([+-])=|)("+re+")([a-z%]*)$","i"),oe=["Top","Right","Bottom","Left"],ae=function(e,t){return"none"===(e=t||e).style.display||""===e.style.display&&w.contains(e.ownerDocument,e)&&"none"===w.css(e,"display")},se=function(e,t,n,r){var i,o,a={};for(o in t)a[o]=e.style[o],e.style[o]=t[o];i=n.apply(e,r||[]);for(o in t)e.style[o]=a[o];return i};function ue(e,t,n,r){var i,o,a=20,s=r?function(){return r.cur()}:function(){return w.css(e,t,"")},u=s(),l=n&&n[3]||(w.cssNumber[t]?"":"px"),c=(w.cssNumber[t]||"px"!==l&&+u)&&ie.exec(w.css(e,t));if(c&&c[3]!==l){u/=2,l=l||c[3],c=+u||1;while(a--)w.style(e,t,c+l),(1-o)*(1-(o=s()/u||.5))<=0&&(a=0),c/=o;c*=2,w.style(e,t,c+l),n=n||[]}return n&&(c=+c||+u||0,i=n[1]?c+(n[1]+1)*n[2]:+n[2],r&&(r.unit=l,r.start=c,r.end=i)),i}var le={};function ce(e){var t,n=e.ownerDocument,r=e.nodeName,i=le[r];return i||(t=n.body.appendChild(n.createElement(r)),i=w.css(t,"display"),t.parentNode.removeChild(t),"none"===i&&(i="block"),le[r]=i,i)}function fe(e,t){for(var n,r,i=[],o=0,a=e.length;o<a;o++)(r=e[o]).style&&(n=r.style.display,t?("none"===n&&(i[o]=J.get(r,"display")||null,i[o]||(r.style.display="")),""===r.style.display&&ae(r)&&(i[o]=ce(r))):"none"!==n&&(i[o]="none",J.set(r,"display",n)));for(o=0;o<a;o++)null!=i[o]&&(e[o].style.display=i[o]);return e}w.fn.extend({show:function(){return fe(this,!0)},hide:function(){return fe(this)},toggle:function(e){return"boolean"==typeof e?e?this.show():this.hide():this.each(function(){ae(this)?w(this).show():w(this).hide()})}});var pe=/^(?:checkbox|radio)$/i,de=/<([a-z][^\/\0>\x20\t\r\n\f]+)/i,he=/^$|^module$|\/(?:java|ecma)script/i,ge={option:[1,"<select multiple='multiple'>","</select>"],thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};ge.optgroup=ge.option,ge.tbody=ge.tfoot=ge.colgroup=ge.caption=ge.thead,ge.th=ge.td;function ye(e,t){var n;return n="undefined"!=typeof e.getElementsByTagName?e.getElementsByTagName(t||"*"):"undefined"!=typeof e.querySelectorAll?e.querySelectorAll(t||"*"):[],void 0===t||t&&N(e,t)?w.merge([e],n):n}function ve(e,t){for(var n=0,r=e.length;n<r;n++)J.set(e[n],"globalEval",!t||J.get(t[n],"globalEval"))}var me=/<|&#?\w+;/;function xe(e,t,n,r,i){for(var o,a,s,u,l,c,f=t.createDocumentFragment(),p=[],d=0,h=e.length;d<h;d++)if((o=e[d])||0===o)if("object"===x(o))w.merge(p,o.nodeType?[o]:o);else if(me.test(o)){a=a||f.appendChild(t.createElement("div")),s=(de.exec(o)||["",""])[1].toLowerCase(),u=ge[s]||ge._default,a.innerHTML=u[1]+w.htmlPrefilter(o)+u[2],c=u[0];while(c--)a=a.lastChild;w.merge(p,a.childNodes),(a=f.firstChild).textContent=""}else p.push(t.createTextNode(o));f.textContent="",d=0;while(o=p[d++])if(r&&w.inArray(o,r)>-1)i&&i.push(o);else if(l=w.contains(o.ownerDocument,o),a=ye(f.appendChild(o),"script"),l&&ve(a),n){c=0;while(o=a[c++])he.test(o.type||"")&&n.push(o)}return f}!function(){var e=r.createDocumentFragment().appendChild(r.createElement("div")),t=r.createElement("input");t.setAttribute("type","radio"),t.setAttribute("checked","checked"),t.setAttribute("name","t"),e.appendChild(t),h.checkClone=e.cloneNode(!0).cloneNode(!0).lastChild.checked,e.innerHTML="<textarea>x</textarea>",h.noCloneChecked=!!e.cloneNode(!0).lastChild.defaultValue}();var be=r.documentElement,we=/^key/,Te=/^(?:mouse|pointer|contextmenu|drag|drop)|click/,Ce=/^([^.]*)(?:\.(.+)|)/;function Ee(){return!0}function ke(){return!1}function Se(){try{return r.activeElement}catch(e){}}function De(e,t,n,r,i,o){var a,s;if("object"==typeof t){"string"!=typeof n&&(r=r||n,n=void 0);for(s in t)De(e,s,n,r,t[s],o);return e}if(null==r&&null==i?(i=n,r=n=void 0):null==i&&("string"==typeof n?(i=r,r=void 0):(i=r,r=n,n=void 0)),!1===i)i=ke;else if(!i)return e;return 1===o&&(a=i,(i=function(e){return w().off(e),a.apply(this,arguments)}).guid=a.guid||(a.guid=w.guid++)),e.each(function(){w.event.add(this,t,i,r,n)})}w.event={global:{},add:function(e,t,n,r,i){var o,a,s,u,l,c,f,p,d,h,g,y=J.get(e);if(y){n.handler&&(n=(o=n).handler,i=o.selector),i&&w.find.matchesSelector(be,i),n.guid||(n.guid=w.guid++),(u=y.events)||(u=y.events={}),(a=y.handle)||(a=y.handle=function(t){return"undefined"!=typeof w&&w.event.triggered!==t.type?w.event.dispatch.apply(e,arguments):void 0}),l=(t=(t||"").match(M)||[""]).length;while(l--)d=g=(s=Ce.exec(t[l])||[])[1],h=(s[2]||"").split(".").sort(),d&&(f=w.event.special[d]||{},d=(i?f.delegateType:f.bindType)||d,f=w.event.special[d]||{},c=w.extend({type:d,origType:g,data:r,handler:n,guid:n.guid,selector:i,needsContext:i&&w.expr.match.needsContext.test(i),namespace:h.join(".")},o),(p=u[d])||((p=u[d]=[]).delegateCount=0,f.setup&&!1!==f.setup.call(e,r,h,a)||e.addEventListener&&e.addEventListener(d,a)),f.add&&(f.add.call(e,c),c.handler.guid||(c.handler.guid=n.guid)),i?p.splice(p.delegateCount++,0,c):p.push(c),w.event.global[d]=!0)}},remove:function(e,t,n,r,i){var o,a,s,u,l,c,f,p,d,h,g,y=J.hasData(e)&&J.get(e);if(y&&(u=y.events)){l=(t=(t||"").match(M)||[""]).length;while(l--)if(s=Ce.exec(t[l])||[],d=g=s[1],h=(s[2]||"").split(".").sort(),d){f=w.event.special[d]||{},p=u[d=(r?f.delegateType:f.bindType)||d]||[],s=s[2]&&new RegExp("(^|\\.)"+h.join("\\.(?:.*\\.|)")+"(\\.|$)"),a=o=p.length;while(o--)c=p[o],!i&&g!==c.origType||n&&n.guid!==c.guid||s&&!s.test(c.namespace)||r&&r!==c.selector&&("**"!==r||!c.selector)||(p.splice(o,1),c.selector&&p.delegateCount--,f.remove&&f.remove.call(e,c));a&&!p.length&&(f.teardown&&!1!==f.teardown.call(e,h,y.handle)||w.removeEvent(e,d,y.handle),delete u[d])}else for(d in u)w.event.remove(e,d+t[l],n,r,!0);w.isEmptyObject(u)&&J.remove(e,"handle events")}},dispatch:function(e){var t=w.event.fix(e),n,r,i,o,a,s,u=new Array(arguments.length),l=(J.get(this,"events")||{})[t.type]||[],c=w.event.special[t.type]||{};for(u[0]=t,n=1;n<arguments.length;n++)u[n]=arguments[n];if(t.delegateTarget=this,!c.preDispatch||!1!==c.preDispatch.call(this,t)){s=w.event.handlers.call(this,t,l),n=0;while((o=s[n++])&&!t.isPropagationStopped()){t.currentTarget=o.elem,r=0;while((a=o.handlers[r++])&&!t.isImmediatePropagationStopped())t.rnamespace&&!t.rnamespace.test(a.namespace)||(t.handleObj=a,t.data=a.data,void 0!==(i=((w.event.special[a.origType]||{}).handle||a.handler).apply(o.elem,u))&&!1===(t.result=i)&&(t.preventDefault(),t.stopPropagation()))}return c.postDispatch&&c.postDispatch.call(this,t),t.result}},handlers:function(e,t){var n,r,i,o,a,s=[],u=t.delegateCount,l=e.target;if(u&&l.nodeType&&!("click"===e.type&&e.button>=1))for(;l!==this;l=l.parentNode||this)if(1===l.nodeType&&("click"!==e.type||!0!==l.disabled)){for(o=[],a={},n=0;n<u;n++)void 0===a[i=(r=t[n]).selector+" "]&&(a[i]=r.needsContext?w(i,this).index(l)>-1:w.find(i,this,null,[l]).length),a[i]&&o.push(r);o.length&&s.push({elem:l,handlers:o})}return l=this,u<t.length&&s.push({elem:l,handlers:t.slice(u)}),s},addProp:function(e,t){Object.defineProperty(w.Event.prototype,e,{enumerable:!0,configurable:!0,get:g(t)?function(){if(this.originalEvent)return t(this.originalEvent)}:function(){if(this.originalEvent)return this.originalEvent[e]},set:function(t){Object.defineProperty(this,e,{enumerable:!0,configurable:!0,writable:!0,value:t})}})},fix:function(e){return e[w.expando]?e:new w.Event(e)},special:{load:{noBubble:!0},focus:{trigger:function(){if(this!==Se()&&this.focus)return this.focus(),!1},delegateType:"focusin"},blur:{trigger:function(){if(this===Se()&&this.blur)return this.blur(),!1},delegateType:"focusout"},click:{trigger:function(){if("checkbox"===this.type&&this.click&&N(this,"input"))return this.click(),!1},_default:function(e){return N(e.target,"a")}},beforeunload:{postDispatch:function(e){void 0!==e.result&&e.originalEvent&&(e.originalEvent.returnValue=e.result)}}}},w.removeEvent=function(e,t,n){e.removeEventListener&&e.removeEventListener(t,n)},w.Event=function(e,t){if(!(this instanceof w.Event))return new w.Event(e,t);e&&e.type?(this.originalEvent=e,this.type=e.type,this.isDefaultPrevented=e.defaultPrevented||void 0===e.defaultPrevented&&!1===e.returnValue?Ee:ke,this.target=e.target&&3===e.target.nodeType?e.target.parentNode:e.target,this.currentTarget=e.currentTarget,this.relatedTarget=e.relatedTarget):this.type=e,t&&w.extend(this,t),this.timeStamp=e&&e.timeStamp||Date.now(),this[w.expando]=!0},w.Event.prototype={constructor:w.Event,isDefaultPrevented:ke,isPropagationStopped:ke,isImmediatePropagationStopped:ke,isSimulated:!1,preventDefault:function(){var e=this.originalEvent;this.isDefaultPrevented=Ee,e&&!this.isSimulated&&e.preventDefault()},stopPropagation:function(){var e=this.originalEvent;this.isPropagationStopped=Ee,e&&!this.isSimulated&&e.stopPropagation()},stopImmediatePropagation:function(){var e=this.originalEvent;this.isImmediatePropagationStopped=Ee,e&&!this.isSimulated&&e.stopImmediatePropagation(),this.stopPropagation()}},w.each({altKey:!0,bubbles:!0,cancelable:!0,changedTouches:!0,ctrlKey:!0,detail:!0,eventPhase:!0,metaKey:!0,pageX:!0,pageY:!0,shiftKey:!0,view:!0,"char":!0,charCode:!0,key:!0,keyCode:!0,button:!0,buttons:!0,clientX:!0,clientY:!0,offsetX:!0,offsetY:!0,pointerId:!0,pointerType:!0,screenX:!0,screenY:!0,targetTouches:!0,toElement:!0,touches:!0,which:function(e){var t=e.button;return null==e.which&&we.test(e.type)?null!=e.charCode?e.charCode:e.keyCode:!e.which&&void 0!==t&&Te.test(e.type)?1&t?1:2&t?3:4&t?2:0:e.which}},w.event.addProp),w.each({mouseenter:"mouseover",mouseleave:"mouseout",pointerenter:"pointerover",pointerleave:"pointerout"},function(e,t){w.event.special[e]={delegateType:t,bindType:t,handle:function(e){var n,r=this,i=e.relatedTarget,o=e.handleObj;return i&&(i===r||w.contains(r,i))||(e.type=o.origType,n=o.handler.apply(this,arguments),e.type=t),n}}}),w.fn.extend({on:function(e,t,n,r){return De(this,e,t,n,r)},one:function(e,t,n,r){return De(this,e,t,n,r,1)},off:function(e,t,n){var r,i;if(e&&e.preventDefault&&e.handleObj)return r=e.handleObj,w(e.delegateTarget).off(r.namespace?r.origType+"."+r.namespace:r.origType,r.selector,r.handler),this;if("object"==typeof e){for(i in e)this.off(i,t,e[i]);return this}return!1!==t&&"function"!=typeof t||(n=t,t=void 0),!1===n&&(n=ke),this.each(function(){w.event.remove(this,e,n,t)})}});var Ne=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,Ae=/<script|<style|<link/i,je=/checked\s*(?:[^=]|=\s*.checked.)/i,qe=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;function Le(e,t){return N(e,"table")&&N(11!==t.nodeType?t:t.firstChild,"tr")?w(e).children("tbody")[0]||e:e}function He(e){return e.type=(null!==e.getAttribute("type"))+"/"+e.type,e}function Oe(e){return"true/"===(e.type||"").slice(0,5)?e.type=e.type.slice(5):e.removeAttribute("type"),e}function Pe(e,t){var n,r,i,o,a,s,u,l;if(1===t.nodeType){if(J.hasData(e)&&(o=J.access(e),a=J.set(t,o),l=o.events)){delete a.handle,a.events={};for(i in l)for(n=0,r=l[i].length;n<r;n++)w.event.add(t,i,l[i][n])}K.hasData(e)&&(s=K.access(e),u=w.extend({},s),K.set(t,u))}}function Me(e,t){var n=t.nodeName.toLowerCase();"input"===n&&pe.test(e.type)?t.checked=e.checked:"input"!==n&&"textarea"!==n||(t.defaultValue=e.defaultValue)}function Re(e,t,n,r){t=a.apply([],t);var i,o,s,u,l,c,f=0,p=e.length,d=p-1,y=t[0],v=g(y);if(v||p>1&&"string"==typeof y&&!h.checkClone&&je.test(y))return e.each(function(i){var o=e.eq(i);v&&(t[0]=y.call(this,i,o.html())),Re(o,t,n,r)});if(p&&(i=xe(t,e[0].ownerDocument,!1,e,r),o=i.firstChild,1===i.childNodes.length&&(i=o),o||r)){for(u=(s=w.map(ye(i,"script"),He)).length;f<p;f++)l=i,f!==d&&(l=w.clone(l,!0,!0),u&&w.merge(s,ye(l,"script"))),n.call(e[f],l,f);if(u)for(c=s[s.length-1].ownerDocument,w.map(s,Oe),f=0;f<u;f++)l=s[f],he.test(l.type||"")&&!J.access(l,"globalEval")&&w.contains(c,l)&&(l.src&&"module"!==(l.type||"").toLowerCase()?w._evalUrl&&w._evalUrl(l.src):m(l.textContent.replace(qe,""),c,l))}return e}function Ie(e,t,n){for(var r,i=t?w.filter(t,e):e,o=0;null!=(r=i[o]);o++)n||1!==r.nodeType||w.cleanData(ye(r)),r.parentNode&&(n&&w.contains(r.ownerDocument,r)&&ve(ye(r,"script")),r.parentNode.removeChild(r));return e}w.extend({htmlPrefilter:function(e){return e.replace(Ne,"<$1></$2>")},clone:function(e,t,n){var r,i,o,a,s=e.cloneNode(!0),u=w.contains(e.ownerDocument,e);if(!(h.noCloneChecked||1!==e.nodeType&&11!==e.nodeType||w.isXMLDoc(e)))for(a=ye(s),r=0,i=(o=ye(e)).length;r<i;r++)Me(o[r],a[r]);if(t)if(n)for(o=o||ye(e),a=a||ye(s),r=0,i=o.length;r<i;r++)Pe(o[r],a[r]);else Pe(e,s);return(a=ye(s,"script")).length>0&&ve(a,!u&&ye(e,"script")),s},cleanData:function(e){for(var t,n,r,i=w.event.special,o=0;void 0!==(n=e[o]);o++)if(Y(n)){if(t=n[J.expando]){if(t.events)for(r in t.events)i[r]?w.event.remove(n,r):w.removeEvent(n,r,t.handle);n[J.expando]=void 0}n[K.expando]&&(n[K.expando]=void 0)}}}),w.fn.extend({detach:function(e){return Ie(this,e,!0)},remove:function(e){return Ie(this,e)},text:function(e){return z(this,function(e){return void 0===e?w.text(this):this.empty().each(function(){1!==this.nodeType&&11!==this.nodeType&&9!==this.nodeType||(this.textContent=e)})},null,e,arguments.length)},append:function(){return Re(this,arguments,function(e){1!==this.nodeType&&11!==this.nodeType&&9!==this.nodeType||Le(this,e).appendChild(e)})},prepend:function(){return Re(this,arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=Le(this,e);t.insertBefore(e,t.firstChild)}})},before:function(){return Re(this,arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this)})},after:function(){return Re(this,arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this.nextSibling)})},empty:function(){for(var e,t=0;null!=(e=this[t]);t++)1===e.nodeType&&(w.cleanData(ye(e,!1)),e.textContent="");return this},clone:function(e,t){return e=null!=e&&e,t=null==t?e:t,this.map(function(){return w.clone(this,e,t)})},html:function(e){return z(this,function(e){var t=this[0]||{},n=0,r=this.length;if(void 0===e&&1===t.nodeType)return t.innerHTML;if("string"==typeof e&&!Ae.test(e)&&!ge[(de.exec(e)||["",""])[1].toLowerCase()]){e=w.htmlPrefilter(e);try{for(;n<r;n++)1===(t=this[n]||{}).nodeType&&(w.cleanData(ye(t,!1)),t.innerHTML=e);t=0}catch(e){}}t&&this.empty().append(e)},null,e,arguments.length)},replaceWith:function(){var e=[];return Re(this,arguments,function(t){var n=this.parentNode;w.inArray(this,e)<0&&(w.cleanData(ye(this)),n&&n.replaceChild(t,this))},e)}}),w.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(e,t){w.fn[e]=function(e){for(var n,r=[],i=w(e),o=i.length-1,a=0;a<=o;a++)n=a===o?this:this.clone(!0),w(i[a])[t](n),s.apply(r,n.get());return this.pushStack(r)}});var We=new RegExp("^("+re+")(?!px)[a-z%]+$","i"),$e=function(t){var n=t.ownerDocument.defaultView;return n&&n.opener||(n=e),n.getComputedStyle(t)},Be=new RegExp(oe.join("|"),"i");!function(){function t(){if(c){l.style.cssText="position:absolute;left:-11111px;width:60px;margin-top:1px;padding:0;border:0",c.style.cssText="position:relative;display:block;box-sizing:border-box;overflow:scroll;margin:auto;border:1px;padding:1px;width:60%;top:1%",be.appendChild(l).appendChild(c);var t=e.getComputedStyle(c);i="1%"!==t.top,u=12===n(t.marginLeft),c.style.right="60%",s=36===n(t.right),o=36===n(t.width),c.style.position="absolute",a=36===c.offsetWidth||"absolute",be.removeChild(l),c=null}}function n(e){return Math.round(parseFloat(e))}var i,o,a,s,u,l=r.createElement("div"),c=r.createElement("div");c.style&&(c.style.backgroundClip="content-box",c.cloneNode(!0).style.backgroundClip="",h.clearCloneStyle="content-box"===c.style.backgroundClip,w.extend(h,{boxSizingReliable:function(){return t(),o},pixelBoxStyles:function(){return t(),s},pixelPosition:function(){return t(),i},reliableMarginLeft:function(){return t(),u},scrollboxSize:function(){return t(),a}}))}();function Fe(e,t,n){var r,i,o,a,s=e.style;return(n=n||$e(e))&&(""!==(a=n.getPropertyValue(t)||n[t])||w.contains(e.ownerDocument,e)||(a=w.style(e,t)),!h.pixelBoxStyles()&&We.test(a)&&Be.test(t)&&(r=s.width,i=s.minWidth,o=s.maxWidth,s.minWidth=s.maxWidth=s.width=a,a=n.width,s.width=r,s.minWidth=i,s.maxWidth=o)),void 0!==a?a+"":a}function _e(e,t){return{get:function(){if(!e())return(this.get=t).apply(this,arguments);delete this.get}}}var ze=/^(none|table(?!-c[ea]).+)/,Xe=/^--/,Ue={position:"absolute",visibility:"hidden",display:"block"},Ve={letterSpacing:"0",fontWeight:"400"},Ge=["Webkit","Moz","ms"],Ye=r.createElement("div").style;function Qe(e){if(e in Ye)return e;var t=e[0].toUpperCase()+e.slice(1),n=Ge.length;while(n--)if((e=Ge[n]+t)in Ye)return e}function Je(e){var t=w.cssProps[e];return t||(t=w.cssProps[e]=Qe(e)||e),t}function Ke(e,t,n){var r=ie.exec(t);return r?Math.max(0,r[2]-(n||0))+(r[3]||"px"):t}function Ze(e,t,n,r,i,o){var a="width"===t?1:0,s=0,u=0;if(n===(r?"border":"content"))return 0;for(;a<4;a+=2)"margin"===n&&(u+=w.css(e,n+oe[a],!0,i)),r?("content"===n&&(u-=w.css(e,"padding"+oe[a],!0,i)),"margin"!==n&&(u-=w.css(e,"border"+oe[a]+"Width",!0,i))):(u+=w.css(e,"padding"+oe[a],!0,i),"padding"!==n?u+=w.css(e,"border"+oe[a]+"Width",!0,i):s+=w.css(e,"border"+oe[a]+"Width",!0,i));return!r&&o>=0&&(u+=Math.max(0,Math.ceil(e["offset"+t[0].toUpperCase()+t.slice(1)]-o-u-s-.5))),u}function et(e,t,n){var r=$e(e),i=Fe(e,t,r),o="border-box"===w.css(e,"boxSizing",!1,r),a=o;if(We.test(i)){if(!n)return i;i="auto"}return a=a&&(h.boxSizingReliable()||i===e.style[t]),("auto"===i||!parseFloat(i)&&"inline"===w.css(e,"display",!1,r))&&(i=e["offset"+t[0].toUpperCase()+t.slice(1)],a=!0),(i=parseFloat(i)||0)+Ze(e,t,n||(o?"border":"content"),a,r,i)+"px"}w.extend({cssHooks:{opacity:{get:function(e,t){if(t){var n=Fe(e,"opacity");return""===n?"1":n}}}},cssNumber:{animationIterationCount:!0,columnCount:!0,fillOpacity:!0,flexGrow:!0,flexShrink:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{},style:function(e,t,n,r){if(e&&3!==e.nodeType&&8!==e.nodeType&&e.style){var i,o,a,s=G(t),u=Xe.test(t),l=e.style;if(u||(t=Je(s)),a=w.cssHooks[t]||w.cssHooks[s],void 0===n)return a&&"get"in a&&void 0!==(i=a.get(e,!1,r))?i:l[t];"string"==(o=typeof n)&&(i=ie.exec(n))&&i[1]&&(n=ue(e,t,i),o="number"),null!=n&&n===n&&("number"===o&&(n+=i&&i[3]||(w.cssNumber[s]?"":"px")),h.clearCloneStyle||""!==n||0!==t.indexOf("background")||(l[t]="inherit"),a&&"set"in a&&void 0===(n=a.set(e,n,r))||(u?l.setProperty(t,n):l[t]=n))}},css:function(e,t,n,r){var i,o,a,s=G(t);return Xe.test(t)||(t=Je(s)),(a=w.cssHooks[t]||w.cssHooks[s])&&"get"in a&&(i=a.get(e,!0,n)),void 0===i&&(i=Fe(e,t,r)),"normal"===i&&t in Ve&&(i=Ve[t]),""===n||n?(o=parseFloat(i),!0===n||isFinite(o)?o||0:i):i}}),w.each(["height","width"],function(e,t){w.cssHooks[t]={get:function(e,n,r){if(n)return!ze.test(w.css(e,"display"))||e.getClientRects().length&&e.getBoundingClientRect().width?et(e,t,r):se(e,Ue,function(){return et(e,t,r)})},set:function(e,n,r){var i,o=$e(e),a="border-box"===w.css(e,"boxSizing",!1,o),s=r&&Ze(e,t,r,a,o);return a&&h.scrollboxSize()===o.position&&(s-=Math.ceil(e["offset"+t[0].toUpperCase()+t.slice(1)]-parseFloat(o[t])-Ze(e,t,"border",!1,o)-.5)),s&&(i=ie.exec(n))&&"px"!==(i[3]||"px")&&(e.style[t]=n,n=w.css(e,t)),Ke(e,n,s)}}}),w.cssHooks.marginLeft=_e(h.reliableMarginLeft,function(e,t){if(t)return(parseFloat(Fe(e,"marginLeft"))||e.getBoundingClientRect().left-se(e,{marginLeft:0},function(){return e.getBoundingClientRect().left}))+"px"}),w.each({margin:"",padding:"",border:"Width"},function(e,t){w.cssHooks[e+t]={expand:function(n){for(var r=0,i={},o="string"==typeof n?n.split(" "):[n];r<4;r++)i[e+oe[r]+t]=o[r]||o[r-2]||o[0];return i}},"margin"!==e&&(w.cssHooks[e+t].set=Ke)}),w.fn.extend({css:function(e,t){return z(this,function(e,t,n){var r,i,o={},a=0;if(Array.isArray(t)){for(r=$e(e),i=t.length;a<i;a++)o[t[a]]=w.css(e,t[a],!1,r);return o}return void 0!==n?w.style(e,t,n):w.css(e,t)},e,t,arguments.length>1)}});function tt(e,t,n,r,i){return new tt.prototype.init(e,t,n,r,i)}w.Tween=tt,tt.prototype={constructor:tt,init:function(e,t,n,r,i,o){this.elem=e,this.prop=n,this.easing=i||w.easing._default,this.options=t,this.start=this.now=this.cur(),this.end=r,this.unit=o||(w.cssNumber[n]?"":"px")},cur:function(){var e=tt.propHooks[this.prop];return e&&e.get?e.get(this):tt.propHooks._default.get(this)},run:function(e){var t,n=tt.propHooks[this.prop];return this.options.duration?this.pos=t=w.easing[this.easing](e,this.options.duration*e,0,1,this.options.duration):this.pos=t=e,this.now=(this.end-this.start)*t+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),n&&n.set?n.set(this):tt.propHooks._default.set(this),this}},tt.prototype.init.prototype=tt.prototype,tt.propHooks={_default:{get:function(e){var t;return 1!==e.elem.nodeType||null!=e.elem[e.prop]&&null==e.elem.style[e.prop]?e.elem[e.prop]:(t=w.css(e.elem,e.prop,""))&&"auto"!==t?t:0},set:function(e){w.fx.step[e.prop]?w.fx.step[e.prop](e):1!==e.elem.nodeType||null==e.elem.style[w.cssProps[e.prop]]&&!w.cssHooks[e.prop]?e.elem[e.prop]=e.now:w.style(e.elem,e.prop,e.now+e.unit)}}},tt.propHooks.scrollTop=tt.propHooks.scrollLeft={set:function(e){e.elem.nodeType&&e.elem.parentNode&&(e.elem[e.prop]=e.now)}},w.easing={linear:function(e){return e},swing:function(e){return.5-Math.cos(e*Math.PI)/2},_default:"swing"},w.fx=tt.prototype.init,w.fx.step={};var nt,rt,it=/^(?:toggle|show|hide)$/,ot=/queueHooks$/;function at(){rt&&(!1===r.hidden&&e.requestAnimationFrame?e.requestAnimationFrame(at):e.setTimeout(at,w.fx.interval),w.fx.tick())}function st(){return e.setTimeout(function(){nt=void 0}),nt=Date.now()}function ut(e,t){var n,r=0,i={height:e};for(t=t?1:0;r<4;r+=2-t)i["margin"+(n=oe[r])]=i["padding"+n]=e;return t&&(i.opacity=i.width=e),i}function lt(e,t,n){for(var r,i=(pt.tweeners[t]||[]).concat(pt.tweeners["*"]),o=0,a=i.length;o<a;o++)if(r=i[o].call(n,t,e))return r}function ct(e,t,n){var r,i,o,a,s,u,l,c,f="width"in t||"height"in t,p=this,d={},h=e.style,g=e.nodeType&&ae(e),y=J.get(e,"fxshow");n.queue||(null==(a=w._queueHooks(e,"fx")).unqueued&&(a.unqueued=0,s=a.empty.fire,a.empty.fire=function(){a.unqueued||s()}),a.unqueued++,p.always(function(){p.always(function(){a.unqueued--,w.queue(e,"fx").length||a.empty.fire()})}));for(r in t)if(i=t[r],it.test(i)){if(delete t[r],o=o||"toggle"===i,i===(g?"hide":"show")){if("show"!==i||!y||void 0===y[r])continue;g=!0}d[r]=y&&y[r]||w.style(e,r)}if((u=!w.isEmptyObject(t))||!w.isEmptyObject(d)){f&&1===e.nodeType&&(n.overflow=[h.overflow,h.overflowX,h.overflowY],null==(l=y&&y.display)&&(l=J.get(e,"display")),"none"===(c=w.css(e,"display"))&&(l?c=l:(fe([e],!0),l=e.style.display||l,c=w.css(e,"display"),fe([e]))),("inline"===c||"inline-block"===c&&null!=l)&&"none"===w.css(e,"float")&&(u||(p.done(function(){h.display=l}),null==l&&(c=h.display,l="none"===c?"":c)),h.display="inline-block")),n.overflow&&(h.overflow="hidden",p.always(function(){h.overflow=n.overflow[0],h.overflowX=n.overflow[1],h.overflowY=n.overflow[2]})),u=!1;for(r in d)u||(y?"hidden"in y&&(g=y.hidden):y=J.access(e,"fxshow",{display:l}),o&&(y.hidden=!g),g&&fe([e],!0),p.done(function(){g||fe([e]),J.remove(e,"fxshow");for(r in d)w.style(e,r,d[r])})),u=lt(g?y[r]:0,r,p),r in y||(y[r]=u.start,g&&(u.end=u.start,u.start=0))}}function ft(e,t){var n,r,i,o,a;for(n in e)if(r=G(n),i=t[r],o=e[n],Array.isArray(o)&&(i=o[1],o=e[n]=o[0]),n!==r&&(e[r]=o,delete e[n]),(a=w.cssHooks[r])&&"expand"in a){o=a.expand(o),delete e[r];for(n in o)n in e||(e[n]=o[n],t[n]=i)}else t[r]=i}function pt(e,t,n){var r,i,o=0,a=pt.prefilters.length,s=w.Deferred().always(function(){delete u.elem}),u=function(){if(i)return!1;for(var t=nt||st(),n=Math.max(0,l.startTime+l.duration-t),r=1-(n/l.duration||0),o=0,a=l.tweens.length;o<a;o++)l.tweens[o].run(r);return s.notifyWith(e,[l,r,n]),r<1&&a?n:(a||s.notifyWith(e,[l,1,0]),s.resolveWith(e,[l]),!1)},l=s.promise({elem:e,props:w.extend({},t),opts:w.extend(!0,{specialEasing:{},easing:w.easing._default},n),originalProperties:t,originalOptions:n,startTime:nt||st(),duration:n.duration,tweens:[],createTween:function(t,n){var r=w.Tween(e,l.opts,t,n,l.opts.specialEasing[t]||l.opts.easing);return l.tweens.push(r),r},stop:function(t){var n=0,r=t?l.tweens.length:0;if(i)return this;for(i=!0;n<r;n++)l.tweens[n].run(1);return t?(s.notifyWith(e,[l,1,0]),s.resolveWith(e,[l,t])):s.rejectWith(e,[l,t]),this}}),c=l.props;for(ft(c,l.opts.specialEasing);o<a;o++)if(r=pt.prefilters[o].call(l,e,c,l.opts))return g(r.stop)&&(w._queueHooks(l.elem,l.opts.queue).stop=r.stop.bind(r)),r;return w.map(c,lt,l),g(l.opts.start)&&l.opts.start.call(e,l),l.progress(l.opts.progress).done(l.opts.done,l.opts.complete).fail(l.opts.fail).always(l.opts.always),w.fx.timer(w.extend(u,{elem:e,anim:l,queue:l.opts.queue})),l}w.Animation=w.extend(pt,{tweeners:{"*":[function(e,t){var n=this.createTween(e,t);return ue(n.elem,e,ie.exec(t),n),n}]},tweener:function(e,t){g(e)?(t=e,e=["*"]):e=e.match(M);for(var n,r=0,i=e.length;r<i;r++)n=e[r],pt.tweeners[n]=pt.tweeners[n]||[],pt.tweeners[n].unshift(t)},prefilters:[ct],prefilter:function(e,t){t?pt.prefilters.unshift(e):pt.prefilters.push(e)}}),w.speed=function(e,t,n){var r=e&&"object"==typeof e?w.extend({},e):{complete:n||!n&&t||g(e)&&e,duration:e,easing:n&&t||t&&!g(t)&&t};return w.fx.off?r.duration=0:"number"!=typeof r.duration&&(r.duration in w.fx.speeds?r.duration=w.fx.speeds[r.duration]:r.duration=w.fx.speeds._default),null!=r.queue&&!0!==r.queue||(r.queue="fx"),r.old=r.complete,r.complete=function(){g(r.old)&&r.old.call(this),r.queue&&w.dequeue(this,r.queue)},r},w.fn.extend({fadeTo:function(e,t,n,r){return this.filter(ae).css("opacity",0).show().end().animate({opacity:t},e,n,r)},animate:function(e,t,n,r){var i=w.isEmptyObject(e),o=w.speed(t,n,r),a=function(){var t=pt(this,w.extend({},e),o);(i||J.get(this,"finish"))&&t.stop(!0)};return a.finish=a,i||!1===o.queue?this.each(a):this.queue(o.queue,a)},stop:function(e,t,n){var r=function(e){var t=e.stop;delete e.stop,t(n)};return"string"!=typeof e&&(n=t,t=e,e=void 0),t&&!1!==e&&this.queue(e||"fx",[]),this.each(function(){var t=!0,i=null!=e&&e+"queueHooks",o=w.timers,a=J.get(this);if(i)a[i]&&a[i].stop&&r(a[i]);else for(i in a)a[i]&&a[i].stop&&ot.test(i)&&r(a[i]);for(i=o.length;i--;)o[i].elem!==this||null!=e&&o[i].queue!==e||(o[i].anim.stop(n),t=!1,o.splice(i,1));!t&&n||w.dequeue(this,e)})},finish:function(e){return!1!==e&&(e=e||"fx"),this.each(function(){var t,n=J.get(this),r=n[e+"queue"],i=n[e+"queueHooks"],o=w.timers,a=r?r.length:0;for(n.finish=!0,w.queue(this,e,[]),i&&i.stop&&i.stop.call(this,!0),t=o.length;t--;)o[t].elem===this&&o[t].queue===e&&(o[t].anim.stop(!0),o.splice(t,1));for(t=0;t<a;t++)r[t]&&r[t].finish&&r[t].finish.call(this);delete n.finish})}}),w.each(["toggle","show","hide"],function(e,t){var n=w.fn[t];w.fn[t]=function(e,r,i){return null==e||"boolean"==typeof e?n.apply(this,arguments):this.animate(ut(t,!0),e,r,i)}}),w.each({slideDown:ut("show"),slideUp:ut("hide"),slideToggle:ut("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(e,t){w.fn[e]=function(e,n,r){return this.animate(t,e,n,r)}}),w.timers=[],w.fx.tick=function(){var e,t=0,n=w.timers;for(nt=Date.now();t<n.length;t++)(e=n[t])()||n[t]!==e||n.splice(t--,1);n.length||w.fx.stop(),nt=void 0},w.fx.timer=function(e){w.timers.push(e),w.fx.start()},w.fx.interval=13,w.fx.start=function(){rt||(rt=!0,at())},w.fx.stop=function(){rt=null},w.fx.speeds={slow:600,fast:200,_default:400},w.fn.delay=function(t,n){return t=w.fx?w.fx.speeds[t]||t:t,n=n||"fx",this.queue(n,function(n,r){var i=e.setTimeout(n,t);r.stop=function(){e.clearTimeout(i)}})},function(){var e=r.createElement("input"),t=r.createElement("select").appendChild(r.createElement("option"));e.type="checkbox",h.checkOn=""!==e.value,h.optSelected=t.selected,(e=r.createElement("input")).value="t",e.type="radio",h.radioValue="t"===e.value}();var dt,ht=w.expr.attrHandle;w.fn.extend({attr:function(e,t){return z(this,w.attr,e,t,arguments.length>1)},removeAttr:function(e){return this.each(function(){w.removeAttr(this,e)})}}),w.extend({attr:function(e,t,n){var r,i,o=e.nodeType;if(3!==o&&8!==o&&2!==o)return"undefined"==typeof e.getAttribute?w.prop(e,t,n):(1===o&&w.isXMLDoc(e)||(i=w.attrHooks[t.toLowerCase()]||(w.expr.match.bool.test(t)?dt:void 0)),void 0!==n?null===n?void w.removeAttr(e,t):i&&"set"in i&&void 0!==(r=i.set(e,n,t))?r:(e.setAttribute(t,n+""),n):i&&"get"in i&&null!==(r=i.get(e,t))?r:null==(r=w.find.attr(e,t))?void 0:r)},attrHooks:{type:{set:function(e,t){if(!h.radioValue&&"radio"===t&&N(e,"input")){var n=e.value;return e.setAttribute("type",t),n&&(e.value=n),t}}}},removeAttr:function(e,t){var n,r=0,i=t&&t.match(M);if(i&&1===e.nodeType)while(n=i[r++])e.removeAttribute(n)}}),dt={set:function(e,t,n){return!1===t?w.removeAttr(e,n):e.setAttribute(n,n),n}},w.each(w.expr.match.bool.source.match(/\w+/g),function(e,t){var n=ht[t]||w.find.attr;ht[t]=function(e,t,r){var i,o,a=t.toLowerCase();return r||(o=ht[a],ht[a]=i,i=null!=n(e,t,r)?a:null,ht[a]=o),i}});var gt=/^(?:input|select|textarea|button)$/i,yt=/^(?:a|area)$/i;w.fn.extend({prop:function(e,t){return z(this,w.prop,e,t,arguments.length>1)},removeProp:function(e){return this.each(function(){delete this[w.propFix[e]||e]})}}),w.extend({prop:function(e,t,n){var r,i,o=e.nodeType;if(3!==o&&8!==o&&2!==o)return 1===o&&w.isXMLDoc(e)||(t=w.propFix[t]||t,i=w.propHooks[t]),void 0!==n?i&&"set"in i&&void 0!==(r=i.set(e,n,t))?r:e[t]=n:i&&"get"in i&&null!==(r=i.get(e,t))?r:e[t]},propHooks:{tabIndex:{get:function(e){var t=w.find.attr(e,"tabindex");return t?parseInt(t,10):gt.test(e.nodeName)||yt.test(e.nodeName)&&e.href?0:-1}}},propFix:{"for":"htmlFor","class":"className"}}),h.optSelected||(w.propHooks.selected={get:function(e){var t=e.parentNode;return t&&t.parentNode&&t.parentNode.selectedIndex,null},set:function(e){var t=e.parentNode;t&&(t.selectedIndex,t.parentNode&&t.parentNode.selectedIndex)}}),w.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){w.propFix[this.toLowerCase()]=this});function vt(e){return(e.match(M)||[]).join(" ")}function mt(e){return e.getAttribute&&e.getAttribute("class")||""}function xt(e){return Array.isArray(e)?e:"string"==typeof e?e.match(M)||[]:[]}w.fn.extend({addClass:function(e){var t,n,r,i,o,a,s,u=0;if(g(e))return this.each(function(t){w(this).addClass(e.call(this,t,mt(this)))});if((t=xt(e)).length)while(n=this[u++])if(i=mt(n),r=1===n.nodeType&&" "+vt(i)+" "){a=0;while(o=t[a++])r.indexOf(" "+o+" ")<0&&(r+=o+" ");i!==(s=vt(r))&&n.setAttribute("class",s)}return this},removeClass:function(e){var t,n,r,i,o,a,s,u=0;if(g(e))return this.each(function(t){w(this).removeClass(e.call(this,t,mt(this)))});if(!arguments.length)return this.attr("class","");if((t=xt(e)).length)while(n=this[u++])if(i=mt(n),r=1===n.nodeType&&" "+vt(i)+" "){a=0;while(o=t[a++])while(r.indexOf(" "+o+" ")>-1)r=r.replace(" "+o+" "," ");i!==(s=vt(r))&&n.setAttribute("class",s)}return this},toggleClass:function(e,t){var n=typeof e,r="string"===n||Array.isArray(e);return"boolean"==typeof t&&r?t?this.addClass(e):this.removeClass(e):g(e)?this.each(function(n){w(this).toggleClass(e.call(this,n,mt(this),t),t)}):this.each(function(){var t,i,o,a;if(r){i=0,o=w(this),a=xt(e);while(t=a[i++])o.hasClass(t)?o.removeClass(t):o.addClass(t)}else void 0!==e&&"boolean"!==n||((t=mt(this))&&J.set(this,"__className__",t),this.setAttribute&&this.setAttribute("class",t||!1===e?"":J.get(this,"__className__")||""))})},hasClass:function(e){var t,n,r=0;t=" "+e+" ";while(n=this[r++])if(1===n.nodeType&&(" "+vt(mt(n))+" ").indexOf(t)>-1)return!0;return!1}});var bt=/\r/g;w.fn.extend({val:function(e){var t,n,r,i=this[0];{if(arguments.length)return r=g(e),this.each(function(n){var i;1===this.nodeType&&(null==(i=r?e.call(this,n,w(this).val()):e)?i="":"number"==typeof i?i+="":Array.isArray(i)&&(i=w.map(i,function(e){return null==e?"":e+""})),(t=w.valHooks[this.type]||w.valHooks[this.nodeName.toLowerCase()])&&"set"in t&&void 0!==t.set(this,i,"value")||(this.value=i))});if(i)return(t=w.valHooks[i.type]||w.valHooks[i.nodeName.toLowerCase()])&&"get"in t&&void 0!==(n=t.get(i,"value"))?n:"string"==typeof(n=i.value)?n.replace(bt,""):null==n?"":n}}}),w.extend({valHooks:{option:{get:function(e){var t=w.find.attr(e,"value");return null!=t?t:vt(w.text(e))}},select:{get:function(e){var t,n,r,i=e.options,o=e.selectedIndex,a="select-one"===e.type,s=a?null:[],u=a?o+1:i.length;for(r=o<0?u:a?o:0;r<u;r++)if(((n=i[r]).selected||r===o)&&!n.disabled&&(!n.parentNode.disabled||!N(n.parentNode,"optgroup"))){if(t=w(n).val(),a)return t;s.push(t)}return s},set:function(e,t){var n,r,i=e.options,o=w.makeArray(t),a=i.length;while(a--)((r=i[a]).selected=w.inArray(w.valHooks.option.get(r),o)>-1)&&(n=!0);return n||(e.selectedIndex=-1),o}}}}),w.each(["radio","checkbox"],function(){w.valHooks[this]={set:function(e,t){if(Array.isArray(t))return e.checked=w.inArray(w(e).val(),t)>-1}},h.checkOn||(w.valHooks[this].get=function(e){return null===e.getAttribute("value")?"on":e.value})}),h.focusin="onfocusin"in e;var wt=/^(?:focusinfocus|focusoutblur)$/,Tt=function(e){e.stopPropagation()};w.extend(w.event,{trigger:function(t,n,i,o){var a,s,u,l,c,p,d,h,v=[i||r],m=f.call(t,"type")?t.type:t,x=f.call(t,"namespace")?t.namespace.split("."):[];if(s=h=u=i=i||r,3!==i.nodeType&&8!==i.nodeType&&!wt.test(m+w.event.triggered)&&(m.indexOf(".")>-1&&(m=(x=m.split(".")).shift(),x.sort()),c=m.indexOf(":")<0&&"on"+m,t=t[w.expando]?t:new w.Event(m,"object"==typeof t&&t),t.isTrigger=o?2:3,t.namespace=x.join("."),t.rnamespace=t.namespace?new RegExp("(^|\\.)"+x.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,t.result=void 0,t.target||(t.target=i),n=null==n?[t]:w.makeArray(n,[t]),d=w.event.special[m]||{},o||!d.trigger||!1!==d.trigger.apply(i,n))){if(!o&&!d.noBubble&&!y(i)){for(l=d.delegateType||m,wt.test(l+m)||(s=s.parentNode);s;s=s.parentNode)v.push(s),u=s;u===(i.ownerDocument||r)&&v.push(u.defaultView||u.parentWindow||e)}a=0;while((s=v[a++])&&!t.isPropagationStopped())h=s,t.type=a>1?l:d.bindType||m,(p=(J.get(s,"events")||{})[t.type]&&J.get(s,"handle"))&&p.apply(s,n),(p=c&&s[c])&&p.apply&&Y(s)&&(t.result=p.apply(s,n),!1===t.result&&t.preventDefault());return t.type=m,o||t.isDefaultPrevented()||d._default&&!1!==d._default.apply(v.pop(),n)||!Y(i)||c&&g(i[m])&&!y(i)&&((u=i[c])&&(i[c]=null),w.event.triggered=m,t.isPropagationStopped()&&h.addEventListener(m,Tt),i[m](),t.isPropagationStopped()&&h.removeEventListener(m,Tt),w.event.triggered=void 0,u&&(i[c]=u)),t.result}},simulate:function(e,t,n){var r=w.extend(new w.Event,n,{type:e,isSimulated:!0});w.event.trigger(r,null,t)}}),w.fn.extend({trigger:function(e,t){return this.each(function(){w.event.trigger(e,t,this)})},triggerHandler:function(e,t){var n=this[0];if(n)return w.event.trigger(e,t,n,!0)}}),h.focusin||w.each({focus:"focusin",blur:"focusout"},function(e,t){var n=function(e){w.event.simulate(t,e.target,w.event.fix(e))};w.event.special[t]={setup:function(){var r=this.ownerDocument||this,i=J.access(r,t);i||r.addEventListener(e,n,!0),J.access(r,t,(i||0)+1)},teardown:function(){var r=this.ownerDocument||this,i=J.access(r,t)-1;i?J.access(r,t,i):(r.removeEventListener(e,n,!0),J.remove(r,t))}}});var Ct=e.location,Et=Date.now(),kt=/\?/;w.parseXML=function(t){var n;if(!t||"string"!=typeof t)return null;try{n=(new e.DOMParser).parseFromString(t,"text/xml")}catch(e){n=void 0}return n&&!n.getElementsByTagName("parsererror").length||w.error("Invalid XML: "+t),n};var St=/\[\]$/,Dt=/\r?\n/g,Nt=/^(?:submit|button|image|reset|file)$/i,At=/^(?:input|select|textarea|keygen)/i;function jt(e,t,n,r){var i;if(Array.isArray(t))w.each(t,function(t,i){n||St.test(e)?r(e,i):jt(e+"["+("object"==typeof i&&null!=i?t:"")+"]",i,n,r)});else if(n||"object"!==x(t))r(e,t);else for(i in t)jt(e+"["+i+"]",t[i],n,r)}w.param=function(e,t){var n,r=[],i=function(e,t){var n=g(t)?t():t;r[r.length]=encodeURIComponent(e)+"="+encodeURIComponent(null==n?"":n)};if(Array.isArray(e)||e.jquery&&!w.isPlainObject(e))w.each(e,function(){i(this.name,this.value)});else for(n in e)jt(n,e[n],t,i);return r.join("&")},w.fn.extend({serialize:function(){return w.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var e=w.prop(this,"elements");return e?w.makeArray(e):this}).filter(function(){var e=this.type;return this.name&&!w(this).is(":disabled")&&At.test(this.nodeName)&&!Nt.test(e)&&(this.checked||!pe.test(e))}).map(function(e,t){var n=w(this).val();return null==n?null:Array.isArray(n)?w.map(n,function(e){return{name:t.name,value:e.replace(Dt,"\r\n")}}):{name:t.name,value:n.replace(Dt,"\r\n")}}).get()}});var qt=/%20/g,Lt=/#.*$/,Ht=/([?&])_=[^&]*/,Ot=/^(.*?):[ \t]*([^\r\n]*)$/gm,Pt=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,Mt=/^(?:GET|HEAD)$/,Rt=/^\/\//,It={},Wt={},$t="*/".concat("*"),Bt=r.createElement("a");Bt.href=Ct.href;function Ft(e){return function(t,n){"string"!=typeof t&&(n=t,t="*");var r,i=0,o=t.toLowerCase().match(M)||[];if(g(n))while(r=o[i++])"+"===r[0]?(r=r.slice(1)||"*",(e[r]=e[r]||[]).unshift(n)):(e[r]=e[r]||[]).push(n)}}function _t(e,t,n,r){var i={},o=e===Wt;function a(s){var u;return i[s]=!0,w.each(e[s]||[],function(e,s){var l=s(t,n,r);return"string"!=typeof l||o||i[l]?o?!(u=l):void 0:(t.dataTypes.unshift(l),a(l),!1)}),u}return a(t.dataTypes[0])||!i["*"]&&a("*")}function zt(e,t){var n,r,i=w.ajaxSettings.flatOptions||{};for(n in t)void 0!==t[n]&&((i[n]?e:r||(r={}))[n]=t[n]);return r&&w.extend(!0,e,r),e}function Xt(e,t,n){var r,i,o,a,s=e.contents,u=e.dataTypes;while("*"===u[0])u.shift(),void 0===r&&(r=e.mimeType||t.getResponseHeader("Content-Type"));if(r)for(i in s)if(s[i]&&s[i].test(r)){u.unshift(i);break}if(u[0]in n)o=u[0];else{for(i in n){if(!u[0]||e.converters[i+" "+u[0]]){o=i;break}a||(a=i)}o=o||a}if(o)return o!==u[0]&&u.unshift(o),n[o]}function Ut(e,t,n,r){var i,o,a,s,u,l={},c=e.dataTypes.slice();if(c[1])for(a in e.converters)l[a.toLowerCase()]=e.converters[a];o=c.shift();while(o)if(e.responseFields[o]&&(n[e.responseFields[o]]=t),!u&&r&&e.dataFilter&&(t=e.dataFilter(t,e.dataType)),u=o,o=c.shift())if("*"===o)o=u;else if("*"!==u&&u!==o){if(!(a=l[u+" "+o]||l["* "+o]))for(i in l)if((s=i.split(" "))[1]===o&&(a=l[u+" "+s[0]]||l["* "+s[0]])){!0===a?a=l[i]:!0!==l[i]&&(o=s[0],c.unshift(s[1]));break}if(!0!==a)if(a&&e["throws"])t=a(t);else try{t=a(t)}catch(e){return{state:"parsererror",error:a?e:"No conversion from "+u+" to "+o}}}return{state:"success",data:t}}w.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:Ct.href,type:"GET",isLocal:Pt.test(Ct.protocol),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":$t,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/\bxml\b/,html:/\bhtml/,json:/\bjson\b/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":JSON.parse,"text xml":w.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(e,t){return t?zt(zt(e,w.ajaxSettings),t):zt(w.ajaxSettings,e)},ajaxPrefilter:Ft(It),ajaxTransport:Ft(Wt),ajax:function(t,n){"object"==typeof t&&(n=t,t=void 0),n=n||{};var i,o,a,s,u,l,c,f,p,d,h=w.ajaxSetup({},n),g=h.context||h,y=h.context&&(g.nodeType||g.jquery)?w(g):w.event,v=w.Deferred(),m=w.Callbacks("once memory"),x=h.statusCode||{},b={},T={},C="canceled",E={readyState:0,getResponseHeader:function(e){var t;if(c){if(!s){s={};while(t=Ot.exec(a))s[t[1].toLowerCase()]=t[2]}t=s[e.toLowerCase()]}return null==t?null:t},getAllResponseHeaders:function(){return c?a:null},setRequestHeader:function(e,t){return null==c&&(e=T[e.toLowerCase()]=T[e.toLowerCase()]||e,b[e]=t),this},overrideMimeType:function(e){return null==c&&(h.mimeType=e),this},statusCode:function(e){var t;if(e)if(c)E.always(e[E.status]);else for(t in e)x[t]=[x[t],e[t]];return this},abort:function(e){var t=e||C;return i&&i.abort(t),k(0,t),this}};if(v.promise(E),h.url=((t||h.url||Ct.href)+"").replace(Rt,Ct.protocol+"//"),h.type=n.method||n.type||h.method||h.type,h.dataTypes=(h.dataType||"*").toLowerCase().match(M)||[""],null==h.crossDomain){l=r.createElement("a");try{l.href=h.url,l.href=l.href,h.crossDomain=Bt.protocol+"//"+Bt.host!=l.protocol+"//"+l.host}catch(e){h.crossDomain=!0}}if(h.data&&h.processData&&"string"!=typeof h.data&&(h.data=w.param(h.data,h.traditional)),_t(It,h,n,E),c)return E;(f=w.event&&h.global)&&0==w.active++&&w.event.trigger("ajaxStart"),h.type=h.type.toUpperCase(),h.hasContent=!Mt.test(h.type),o=h.url.replace(Lt,""),h.hasContent?h.data&&h.processData&&0===(h.contentType||"").indexOf("application/x-www-form-urlencoded")&&(h.data=h.data.replace(qt,"+")):(d=h.url.slice(o.length),h.data&&(h.processData||"string"==typeof h.data)&&(o+=(kt.test(o)?"&":"?")+h.data,delete h.data),!1===h.cache&&(o=o.replace(Ht,"$1"),d=(kt.test(o)?"&":"?")+"_="+Et+++d),h.url=o+d),h.ifModified&&(w.lastModified[o]&&E.setRequestHeader("If-Modified-Since",w.lastModified[o]),w.etag[o]&&E.setRequestHeader("If-None-Match",w.etag[o])),(h.data&&h.hasContent&&!1!==h.contentType||n.contentType)&&E.setRequestHeader("Content-Type",h.contentType),E.setRequestHeader("Accept",h.dataTypes[0]&&h.accepts[h.dataTypes[0]]?h.accepts[h.dataTypes[0]]+("*"!==h.dataTypes[0]?", "+$t+"; q=0.01":""):h.accepts["*"]);for(p in h.headers)E.setRequestHeader(p,h.headers[p]);if(h.beforeSend&&(!1===h.beforeSend.call(g,E,h)||c))return E.abort();if(C="abort",m.add(h.complete),E.done(h.success),E.fail(h.error),i=_t(Wt,h,n,E)){if(E.readyState=1,f&&y.trigger("ajaxSend",[E,h]),c)return E;h.async&&h.timeout>0&&(u=e.setTimeout(function(){E.abort("timeout")},h.timeout));try{c=!1,i.send(b,k)}catch(e){if(c)throw e;k(-1,e)}}else k(-1,"No Transport");function k(t,n,r,s){var l,p,d,b,T,C=n;c||(c=!0,u&&e.clearTimeout(u),i=void 0,a=s||"",E.readyState=t>0?4:0,l=t>=200&&t<300||304===t,r&&(b=Xt(h,E,r)),b=Ut(h,b,E,l),l?(h.ifModified&&((T=E.getResponseHeader("Last-Modified"))&&(w.lastModified[o]=T),(T=E.getResponseHeader("etag"))&&(w.etag[o]=T)),204===t||"HEAD"===h.type?C="nocontent":304===t?C="notmodified":(C=b.state,p=b.data,l=!(d=b.error))):(d=C,!t&&C||(C="error",t<0&&(t=0))),E.status=t,E.statusText=(n||C)+"",l?v.resolveWith(g,[p,C,E]):v.rejectWith(g,[E,C,d]),E.statusCode(x),x=void 0,f&&y.trigger(l?"ajaxSuccess":"ajaxError",[E,h,l?p:d]),m.fireWith(g,[E,C]),f&&(y.trigger("ajaxComplete",[E,h]),--w.active||w.event.trigger("ajaxStop")))}return E},getJSON:function(e,t,n){return w.get(e,t,n,"json")},getScript:function(e,t){return w.get(e,void 0,t,"script")}}),w.each(["get","post"],function(e,t){w[t]=function(e,n,r,i){return g(n)&&(i=i||r,r=n,n=void 0),w.ajax(w.extend({url:e,type:t,dataType:i,data:n,success:r},w.isPlainObject(e)&&e))}}),w._evalUrl=function(e){return w.ajax({url:e,type:"GET",dataType:"script",cache:!0,async:!1,global:!1,"throws":!0})},w.fn.extend({wrapAll:function(e){var t;return this[0]&&(g(e)&&(e=e.call(this[0])),t=w(e,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&t.insertBefore(this[0]),t.map(function(){var e=this;while(e.firstElementChild)e=e.firstElementChild;return e}).append(this)),this},wrapInner:function(e){return g(e)?this.each(function(t){w(this).wrapInner(e.call(this,t))}):this.each(function(){var t=w(this),n=t.contents();n.length?n.wrapAll(e):t.append(e)})},wrap:function(e){var t=g(e);return this.each(function(n){w(this).wrapAll(t?e.call(this,n):e)})},unwrap:function(e){return this.parent(e).not("body").each(function(){w(this).replaceWith(this.childNodes)}),this}}),w.expr.pseudos.hidden=function(e){return!w.expr.pseudos.visible(e)},w.expr.pseudos.visible=function(e){return!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length)},w.ajaxSettings.xhr=function(){try{return new e.XMLHttpRequest}catch(e){}};var Vt={0:200,1223:204},Gt=w.ajaxSettings.xhr();h.cors=!!Gt&&"withCredentials"in Gt,h.ajax=Gt=!!Gt,w.ajaxTransport(function(t){var n,r;if(h.cors||Gt&&!t.crossDomain)return{send:function(i,o){var a,s=t.xhr();if(s.open(t.type,t.url,t.async,t.username,t.password),t.xhrFields)for(a in t.xhrFields)s[a]=t.xhrFields[a];t.mimeType&&s.overrideMimeType&&s.overrideMimeType(t.mimeType),t.crossDomain||i["X-Requested-With"]||(i["X-Requested-With"]="XMLHttpRequest");for(a in i)s.setRequestHeader(a,i[a]);n=function(e){return function(){n&&(n=r=s.onload=s.onerror=s.onabort=s.ontimeout=s.onreadystatechange=null,"abort"===e?s.abort():"error"===e?"number"!=typeof s.status?o(0,"error"):o(s.status,s.statusText):o(Vt[s.status]||s.status,s.statusText,"text"!==(s.responseType||"text")||"string"!=typeof s.responseText?{binary:s.response}:{text:s.responseText},s.getAllResponseHeaders()))}},s.onload=n(),r=s.onerror=s.ontimeout=n("error"),void 0!==s.onabort?s.onabort=r:s.onreadystatechange=function(){4===s.readyState&&e.setTimeout(function(){n&&r()})},n=n("abort");try{s.send(t.hasContent&&t.data||null)}catch(e){if(n)throw e}},abort:function(){n&&n()}}}),w.ajaxPrefilter(function(e){e.crossDomain&&(e.contents.script=!1)}),w.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/\b(?:java|ecma)script\b/},converters:{"text script":function(e){return w.globalEval(e),e}}}),w.ajaxPrefilter("script",function(e){void 0===e.cache&&(e.cache=!1),e.crossDomain&&(e.type="GET")}),w.ajaxTransport("script",function(e){if(e.crossDomain){var t,n;return{send:function(i,o){t=w("<script>").prop({charset:e.scriptCharset,src:e.url}).on("load error",n=function(e){t.remove(),n=null,e&&o("error"===e.type?404:200,e.type)}),r.head.appendChild(t[0])},abort:function(){n&&n()}}}});var Yt=[],Qt=/(=)\?(?=&|$)|\?\?/;w.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var e=Yt.pop()||w.expando+"_"+Et++;return this[e]=!0,e}}),w.ajaxPrefilter("json jsonp",function(t,n,r){var i,o,a,s=!1!==t.jsonp&&(Qt.test(t.url)?"url":"string"==typeof t.data&&0===(t.contentType||"").indexOf("application/x-www-form-urlencoded")&&Qt.test(t.data)&&"data");if(s||"jsonp"===t.dataTypes[0])return i=t.jsonpCallback=g(t.jsonpCallback)?t.jsonpCallback():t.jsonpCallback,s?t[s]=t[s].replace(Qt,"$1"+i):!1!==t.jsonp&&(t.url+=(kt.test(t.url)?"&":"?")+t.jsonp+"="+i),t.converters["script json"]=function(){return a||w.error(i+" was not called"),a[0]},t.dataTypes[0]="json",o=e[i],e[i]=function(){a=arguments},r.always(function(){void 0===o?w(e).removeProp(i):e[i]=o,t[i]&&(t.jsonpCallback=n.jsonpCallback,Yt.push(i)),a&&g(o)&&o(a[0]),a=o=void 0}),"script"}),h.createHTMLDocument=function(){var e=r.implementation.createHTMLDocument("").body;return e.innerHTML="<form></form><form></form>",2===e.childNodes.length}(),w.parseHTML=function(e,t,n){if("string"!=typeof e)return[];"boolean"==typeof t&&(n=t,t=!1);var i,o,a;return t||(h.createHTMLDocument?((i=(t=r.implementation.createHTMLDocument("")).createElement("base")).href=r.location.href,t.head.appendChild(i)):t=r),o=A.exec(e),a=!n&&[],o?[t.createElement(o[1])]:(o=xe([e],t,a),a&&a.length&&w(a).remove(),w.merge([],o.childNodes))},w.fn.load=function(e,t,n){var r,i,o,a=this,s=e.indexOf(" ");return s>-1&&(r=vt(e.slice(s)),e=e.slice(0,s)),g(t)?(n=t,t=void 0):t&&"object"==typeof t&&(i="POST"),a.length>0&&w.ajax({url:e,type:i||"GET",dataType:"html",data:t}).done(function(e){o=arguments,a.html(r?w("<div>").append(w.parseHTML(e)).find(r):e)}).always(n&&function(e,t){a.each(function(){n.apply(this,o||[e.responseText,t,e])})}),this},w.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(e,t){w.fn[t]=function(e){return this.on(t,e)}}),w.expr.pseudos.animated=function(e){return w.grep(w.timers,function(t){return e===t.elem}).length},w.offset={setOffset:function(e,t,n){var r,i,o,a,s,u,l,c=w.css(e,"position"),f=w(e),p={};"static"===c&&(e.style.position="relative"),s=f.offset(),o=w.css(e,"top"),u=w.css(e,"left"),(l=("absolute"===c||"fixed"===c)&&(o+u).indexOf("auto")>-1)?(a=(r=f.position()).top,i=r.left):(a=parseFloat(o)||0,i=parseFloat(u)||0),g(t)&&(t=t.call(e,n,w.extend({},s))),null!=t.top&&(p.top=t.top-s.top+a),null!=t.left&&(p.left=t.left-s.left+i),"using"in t?t.using.call(e,p):f.css(p)}},w.fn.extend({offset:function(e){if(arguments.length)return void 0===e?this:this.each(function(t){w.offset.setOffset(this,e,t)});var t,n,r=this[0];if(r)return r.getClientRects().length?(t=r.getBoundingClientRect(),n=r.ownerDocument.defaultView,{top:t.top+n.pageYOffset,left:t.left+n.pageXOffset}):{top:0,left:0}},position:function(){if(this[0]){var e,t,n,r=this[0],i={top:0,left:0};if("fixed"===w.css(r,"position"))t=r.getBoundingClientRect();else{t=this.offset(),n=r.ownerDocument,e=r.offsetParent||n.documentElement;while(e&&(e===n.body||e===n.documentElement)&&"static"===w.css(e,"position"))e=e.parentNode;e&&e!==r&&1===e.nodeType&&((i=w(e).offset()).top+=w.css(e,"borderTopWidth",!0),i.left+=w.css(e,"borderLeftWidth",!0))}return{top:t.top-i.top-w.css(r,"marginTop",!0),left:t.left-i.left-w.css(r,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){var e=this.offsetParent;while(e&&"static"===w.css(e,"position"))e=e.offsetParent;return e||be})}}),w.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(e,t){var n="pageYOffset"===t;w.fn[e]=function(r){return z(this,function(e,r,i){var o;if(y(e)?o=e:9===e.nodeType&&(o=e.defaultView),void 0===i)return o?o[t]:e[r];o?o.scrollTo(n?o.pageXOffset:i,n?i:o.pageYOffset):e[r]=i},e,r,arguments.length)}}),w.each(["top","left"],function(e,t){w.cssHooks[t]=_e(h.pixelPosition,function(e,n){if(n)return n=Fe(e,t),We.test(n)?w(e).position()[t]+"px":n})}),w.each({Height:"height",Width:"width"},function(e,t){w.each({padding:"inner"+e,content:t,"":"outer"+e},function(n,r){w.fn[r]=function(i,o){var a=arguments.length&&(n||"boolean"!=typeof i),s=n||(!0===i||!0===o?"margin":"border");return z(this,function(t,n,i){var o;return y(t)?0===r.indexOf("outer")?t["inner"+e]:t.document.documentElement["client"+e]:9===t.nodeType?(o=t.documentElement,Math.max(t.body["scroll"+e],o["scroll"+e],t.body["offset"+e],o["offset"+e],o["client"+e])):void 0===i?w.css(t,n,s):w.style(t,n,i,s)},t,a?i:void 0,a)}})}),w.each("blur focus focusin focusout resize scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup contextmenu".split(" "),function(e,t){w.fn[t]=function(e,n){return arguments.length>0?this.on(t,null,e,n):this.trigger(t)}}),w.fn.extend({hover:function(e,t){return this.mouseenter(e).mouseleave(t||e)}}),w.fn.extend({bind:function(e,t,n){return this.on(e,null,t,n)},unbind:function(e,t){return this.off(e,null,t)},delegate:function(e,t,n,r){return this.on(t,e,n,r)},undelegate:function(e,t,n){return 1===arguments.length?this.off(e,"**"):this.off(t,e||"**",n)}}),w.proxy=function(e,t){var n,r,i;if("string"==typeof t&&(n=e[t],t=e,e=n),g(e))return r=o.call(arguments,2),i=function(){return e.apply(t||this,r.concat(o.call(arguments)))},i.guid=e.guid=e.guid||w.guid++,i},w.holdReady=function(e){e?w.readyWait++:w.ready(!0)},w.isArray=Array.isArray,w.parseJSON=JSON.parse,w.nodeName=N,w.isFunction=g,w.isWindow=y,w.camelCase=G,w.type=x,w.now=Date.now,w.isNumeric=function(e){var t=w.type(e);return("number"===t||"string"===t)&&!isNaN(e-parseFloat(e))},"function"==typeof define&&define.amd&&define("jquery",[],function(){return w});var Jt=e.jQuery,Kt=e.$;return w.noConflict=function(t){return e.$===w&&(e.$=Kt),t&&e.jQuery===w&&(e.jQuery=Jt),w},t||(e.jQuery=e.$=w),w});
;
!function(n,r){"object"==typeof exports&&"undefined"!=typeof module?module.exports=r():"function"==typeof define&&define.amd?define("underscore",r):(n="undefined"!=typeof globalThis?globalThis:n||self,function(){var t=n._,e=n._=r();e.noConflict=function(){return n._=t,e}}())}(this,(function(){
//     Underscore.js 1.13.1
//     https://underscorejs.org
//     (c) 2009-2021 Jeremy Ashkenas, Julian Gonggrijp, and DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.
var n="1.13.1",r="object"==typeof self&&self.self===self&&self||"object"==typeof global&&global.global===global&&global||Function("return this")()||{},t=Array.prototype,e=Object.prototype,u="undefined"!=typeof Symbol?Symbol.prototype:null,o=t.push,i=t.slice,a=e.toString,f=e.hasOwnProperty,c="undefined"!=typeof ArrayBuffer,l="undefined"!=typeof DataView,s=Array.isArray,p=Object.keys,v=Object.create,h=c&&ArrayBuffer.isView,y=isNaN,d=isFinite,g=!{toString:null}.propertyIsEnumerable("toString"),b=["valueOf","isPrototypeOf","toString","propertyIsEnumerable","hasOwnProperty","toLocaleString"],m=Math.pow(2,53)-1;function j(n,r){return r=null==r?n.length-1:+r,function(){for(var t=Math.max(arguments.length-r,0),e=Array(t),u=0;u<t;u++)e[u]=arguments[u+r];switch(r){case 0:return n.call(this,e);case 1:return n.call(this,arguments[0],e);case 2:return n.call(this,arguments[0],arguments[1],e)}var o=Array(r+1);for(u=0;u<r;u++)o[u]=arguments[u];return o[r]=e,n.apply(this,o)}}function _(n){var r=typeof n;return"function"===r||"object"===r&&!!n}function w(n){return void 0===n}function A(n){return!0===n||!1===n||"[object Boolean]"===a.call(n)}function x(n){var r="[object "+n+"]";return function(n){return a.call(n)===r}}var S=x("String"),O=x("Number"),M=x("Date"),E=x("RegExp"),B=x("Error"),N=x("Symbol"),I=x("ArrayBuffer"),T=x("Function"),k=r.document&&r.document.childNodes;"function"!=typeof/./&&"object"!=typeof Int8Array&&"function"!=typeof k&&(T=function(n){return"function"==typeof n||!1});var D=T,R=x("Object"),F=l&&R(new DataView(new ArrayBuffer(8))),V="undefined"!=typeof Map&&R(new Map),P=x("DataView");var q=F?function(n){return null!=n&&D(n.getInt8)&&I(n.buffer)}:P,U=s||x("Array");function W(n,r){return null!=n&&f.call(n,r)}var z=x("Arguments");!function(){z(arguments)||(z=function(n){return W(n,"callee")})}();var L=z;function $(n){return O(n)&&y(n)}function C(n){return function(){return n}}function K(n){return function(r){var t=n(r);return"number"==typeof t&&t>=0&&t<=m}}function J(n){return function(r){return null==r?void 0:r[n]}}var G=J("byteLength"),H=K(G),Q=/\[object ((I|Ui)nt(8|16|32)|Float(32|64)|Uint8Clamped|Big(I|Ui)nt64)Array\]/;var X=c?function(n){return h?h(n)&&!q(n):H(n)&&Q.test(a.call(n))}:C(!1),Y=J("length");function Z(n,r){r=function(n){for(var r={},t=n.length,e=0;e<t;++e)r[n[e]]=!0;return{contains:function(n){return r[n]},push:function(t){return r[t]=!0,n.push(t)}}}(r);var t=b.length,u=n.constructor,o=D(u)&&u.prototype||e,i="constructor";for(W(n,i)&&!r.contains(i)&&r.push(i);t--;)(i=b[t])in n&&n[i]!==o[i]&&!r.contains(i)&&r.push(i)}function nn(n){if(!_(n))return[];if(p)return p(n);var r=[];for(var t in n)W(n,t)&&r.push(t);return g&&Z(n,r),r}function rn(n,r){var t=nn(r),e=t.length;if(null==n)return!e;for(var u=Object(n),o=0;o<e;o++){var i=t[o];if(r[i]!==u[i]||!(i in u))return!1}return!0}function tn(n){return n instanceof tn?n:this instanceof tn?void(this._wrapped=n):new tn(n)}function en(n){return new Uint8Array(n.buffer||n,n.byteOffset||0,G(n))}tn.VERSION=n,tn.prototype.value=function(){return this._wrapped},tn.prototype.valueOf=tn.prototype.toJSON=tn.prototype.value,tn.prototype.toString=function(){return String(this._wrapped)};var un="[object DataView]";function on(n,r,t,e){if(n===r)return 0!==n||1/n==1/r;if(null==n||null==r)return!1;if(n!=n)return r!=r;var o=typeof n;return("function"===o||"object"===o||"object"==typeof r)&&function n(r,t,e,o){r instanceof tn&&(r=r._wrapped);t instanceof tn&&(t=t._wrapped);var i=a.call(r);if(i!==a.call(t))return!1;if(F&&"[object Object]"==i&&q(r)){if(!q(t))return!1;i=un}switch(i){case"[object RegExp]":case"[object String]":return""+r==""+t;case"[object Number]":return+r!=+r?+t!=+t:0==+r?1/+r==1/t:+r==+t;case"[object Date]":case"[object Boolean]":return+r==+t;case"[object Symbol]":return u.valueOf.call(r)===u.valueOf.call(t);case"[object ArrayBuffer]":case un:return n(en(r),en(t),e,o)}var f="[object Array]"===i;if(!f&&X(r)){if(G(r)!==G(t))return!1;if(r.buffer===t.buffer&&r.byteOffset===t.byteOffset)return!0;f=!0}if(!f){if("object"!=typeof r||"object"!=typeof t)return!1;var c=r.constructor,l=t.constructor;if(c!==l&&!(D(c)&&c instanceof c&&D(l)&&l instanceof l)&&"constructor"in r&&"constructor"in t)return!1}o=o||[];var s=(e=e||[]).length;for(;s--;)if(e[s]===r)return o[s]===t;if(e.push(r),o.push(t),f){if((s=r.length)!==t.length)return!1;for(;s--;)if(!on(r[s],t[s],e,o))return!1}else{var p,v=nn(r);if(s=v.length,nn(t).length!==s)return!1;for(;s--;)if(p=v[s],!W(t,p)||!on(r[p],t[p],e,o))return!1}return e.pop(),o.pop(),!0}(n,r,t,e)}function an(n){if(!_(n))return[];var r=[];for(var t in n)r.push(t);return g&&Z(n,r),r}function fn(n){var r=Y(n);return function(t){if(null==t)return!1;var e=an(t);if(Y(e))return!1;for(var u=0;u<r;u++)if(!D(t[n[u]]))return!1;return n!==hn||!D(t[cn])}}var cn="forEach",ln="has",sn=["clear","delete"],pn=["get",ln,"set"],vn=sn.concat(cn,pn),hn=sn.concat(pn),yn=["add"].concat(sn,cn,ln),dn=V?fn(vn):x("Map"),gn=V?fn(hn):x("WeakMap"),bn=V?fn(yn):x("Set"),mn=x("WeakSet");function jn(n){for(var r=nn(n),t=r.length,e=Array(t),u=0;u<t;u++)e[u]=n[r[u]];return e}function _n(n){for(var r={},t=nn(n),e=0,u=t.length;e<u;e++)r[n[t[e]]]=t[e];return r}function wn(n){var r=[];for(var t in n)D(n[t])&&r.push(t);return r.sort()}function An(n,r){return function(t){var e=arguments.length;if(r&&(t=Object(t)),e<2||null==t)return t;for(var u=1;u<e;u++)for(var o=arguments[u],i=n(o),a=i.length,f=0;f<a;f++){var c=i[f];r&&void 0!==t[c]||(t[c]=o[c])}return t}}var xn=An(an),Sn=An(nn),On=An(an,!0);function Mn(n){if(!_(n))return{};if(v)return v(n);var r=function(){};r.prototype=n;var t=new r;return r.prototype=null,t}function En(n){return _(n)?U(n)?n.slice():xn({},n):n}function Bn(n){return U(n)?n:[n]}function Nn(n){return tn.toPath(n)}function In(n,r){for(var t=r.length,e=0;e<t;e++){if(null==n)return;n=n[r[e]]}return t?n:void 0}function Tn(n,r,t){var e=In(n,Nn(r));return w(e)?t:e}function kn(n){return n}function Dn(n){return n=Sn({},n),function(r){return rn(r,n)}}function Rn(n){return n=Nn(n),function(r){return In(r,n)}}function Fn(n,r,t){if(void 0===r)return n;switch(null==t?3:t){case 1:return function(t){return n.call(r,t)};case 3:return function(t,e,u){return n.call(r,t,e,u)};case 4:return function(t,e,u,o){return n.call(r,t,e,u,o)}}return function(){return n.apply(r,arguments)}}function Vn(n,r,t){return null==n?kn:D(n)?Fn(n,r,t):_(n)&&!U(n)?Dn(n):Rn(n)}function Pn(n,r){return Vn(n,r,1/0)}function qn(n,r,t){return tn.iteratee!==Pn?tn.iteratee(n,r):Vn(n,r,t)}function Un(){}function Wn(n,r){return null==r&&(r=n,n=0),n+Math.floor(Math.random()*(r-n+1))}tn.toPath=Bn,tn.iteratee=Pn;var zn=Date.now||function(){return(new Date).getTime()};function Ln(n){var r=function(r){return n[r]},t="(?:"+nn(n).join("|")+")",e=RegExp(t),u=RegExp(t,"g");return function(n){return n=null==n?"":""+n,e.test(n)?n.replace(u,r):n}}var $n={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;"},Cn=Ln($n),Kn=Ln(_n($n)),Jn=tn.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,escape:/<%-([\s\S]+?)%>/g},Gn=/(.)^/,Hn={"'":"'","\\":"\\","\r":"r","\n":"n","\u2028":"u2028","\u2029":"u2029"},Qn=/\\|'|\r|\n|\u2028|\u2029/g;function Xn(n){return"\\"+Hn[n]}var Yn=/^\s*(\w|\$)+\s*$/;var Zn=0;function nr(n,r,t,e,u){if(!(e instanceof r))return n.apply(t,u);var o=Mn(n.prototype),i=n.apply(o,u);return _(i)?i:o}var rr=j((function(n,r){var t=rr.placeholder,e=function(){for(var u=0,o=r.length,i=Array(o),a=0;a<o;a++)i[a]=r[a]===t?arguments[u++]:r[a];for(;u<arguments.length;)i.push(arguments[u++]);return nr(n,e,this,this,i)};return e}));rr.placeholder=tn;var tr=j((function(n,r,t){if(!D(n))throw new TypeError("Bind must be called on a function");var e=j((function(u){return nr(n,e,r,this,t.concat(u))}));return e})),er=K(Y);function ur(n,r,t,e){if(e=e||[],r||0===r){if(r<=0)return e.concat(n)}else r=1/0;for(var u=e.length,o=0,i=Y(n);o<i;o++){var a=n[o];if(er(a)&&(U(a)||L(a)))if(r>1)ur(a,r-1,t,e),u=e.length;else for(var f=0,c=a.length;f<c;)e[u++]=a[f++];else t||(e[u++]=a)}return e}var or=j((function(n,r){var t=(r=ur(r,!1,!1)).length;if(t<1)throw new Error("bindAll must be passed function names");for(;t--;){var e=r[t];n[e]=tr(n[e],n)}return n}));var ir=j((function(n,r,t){return setTimeout((function(){return n.apply(null,t)}),r)})),ar=rr(ir,tn,1);function fr(n){return function(){return!n.apply(this,arguments)}}function cr(n,r){var t;return function(){return--n>0&&(t=r.apply(this,arguments)),n<=1&&(r=null),t}}var lr=rr(cr,2);function sr(n,r,t){r=qn(r,t);for(var e,u=nn(n),o=0,i=u.length;o<i;o++)if(r(n[e=u[o]],e,n))return e}function pr(n){return function(r,t,e){t=qn(t,e);for(var u=Y(r),o=n>0?0:u-1;o>=0&&o<u;o+=n)if(t(r[o],o,r))return o;return-1}}var vr=pr(1),hr=pr(-1);function yr(n,r,t,e){for(var u=(t=qn(t,e,1))(r),o=0,i=Y(n);o<i;){var a=Math.floor((o+i)/2);t(n[a])<u?o=a+1:i=a}return o}function dr(n,r,t){return function(e,u,o){var a=0,f=Y(e);if("number"==typeof o)n>0?a=o>=0?o:Math.max(o+f,a):f=o>=0?Math.min(o+1,f):o+f+1;else if(t&&o&&f)return e[o=t(e,u)]===u?o:-1;if(u!=u)return(o=r(i.call(e,a,f),$))>=0?o+a:-1;for(o=n>0?a:f-1;o>=0&&o<f;o+=n)if(e[o]===u)return o;return-1}}var gr=dr(1,vr,yr),br=dr(-1,hr);function mr(n,r,t){var e=(er(n)?vr:sr)(n,r,t);if(void 0!==e&&-1!==e)return n[e]}function jr(n,r,t){var e,u;if(r=Fn(r,t),er(n))for(e=0,u=n.length;e<u;e++)r(n[e],e,n);else{var o=nn(n);for(e=0,u=o.length;e<u;e++)r(n[o[e]],o[e],n)}return n}function _r(n,r,t){r=qn(r,t);for(var e=!er(n)&&nn(n),u=(e||n).length,o=Array(u),i=0;i<u;i++){var a=e?e[i]:i;o[i]=r(n[a],a,n)}return o}function wr(n){var r=function(r,t,e,u){var o=!er(r)&&nn(r),i=(o||r).length,a=n>0?0:i-1;for(u||(e=r[o?o[a]:a],a+=n);a>=0&&a<i;a+=n){var f=o?o[a]:a;e=t(e,r[f],f,r)}return e};return function(n,t,e,u){var o=arguments.length>=3;return r(n,Fn(t,u,4),e,o)}}var Ar=wr(1),xr=wr(-1);function Sr(n,r,t){var e=[];return r=qn(r,t),jr(n,(function(n,t,u){r(n,t,u)&&e.push(n)})),e}function Or(n,r,t){r=qn(r,t);for(var e=!er(n)&&nn(n),u=(e||n).length,o=0;o<u;o++){var i=e?e[o]:o;if(!r(n[i],i,n))return!1}return!0}function Mr(n,r,t){r=qn(r,t);for(var e=!er(n)&&nn(n),u=(e||n).length,o=0;o<u;o++){var i=e?e[o]:o;if(r(n[i],i,n))return!0}return!1}function Er(n,r,t,e){return er(n)||(n=jn(n)),("number"!=typeof t||e)&&(t=0),gr(n,r,t)>=0}var Br=j((function(n,r,t){var e,u;return D(r)?u=r:(r=Nn(r),e=r.slice(0,-1),r=r[r.length-1]),_r(n,(function(n){var o=u;if(!o){if(e&&e.length&&(n=In(n,e)),null==n)return;o=n[r]}return null==o?o:o.apply(n,t)}))}));function Nr(n,r){return _r(n,Rn(r))}function Ir(n,r,t){var e,u,o=-1/0,i=-1/0;if(null==r||"number"==typeof r&&"object"!=typeof n[0]&&null!=n)for(var a=0,f=(n=er(n)?n:jn(n)).length;a<f;a++)null!=(e=n[a])&&e>o&&(o=e);else r=qn(r,t),jr(n,(function(n,t,e){((u=r(n,t,e))>i||u===-1/0&&o===-1/0)&&(o=n,i=u)}));return o}function Tr(n,r,t){if(null==r||t)return er(n)||(n=jn(n)),n[Wn(n.length-1)];var e=er(n)?En(n):jn(n),u=Y(e);r=Math.max(Math.min(r,u),0);for(var o=u-1,i=0;i<r;i++){var a=Wn(i,o),f=e[i];e[i]=e[a],e[a]=f}return e.slice(0,r)}function kr(n,r){return function(t,e,u){var o=r?[[],[]]:{};return e=qn(e,u),jr(t,(function(r,u){var i=e(r,u,t);n(o,r,i)})),o}}var Dr=kr((function(n,r,t){W(n,t)?n[t].push(r):n[t]=[r]})),Rr=kr((function(n,r,t){n[t]=r})),Fr=kr((function(n,r,t){W(n,t)?n[t]++:n[t]=1})),Vr=kr((function(n,r,t){n[t?0:1].push(r)}),!0),Pr=/[^\ud800-\udfff]|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g;function qr(n,r,t){return r in t}var Ur=j((function(n,r){var t={},e=r[0];if(null==n)return t;D(e)?(r.length>1&&(e=Fn(e,r[1])),r=an(n)):(e=qr,r=ur(r,!1,!1),n=Object(n));for(var u=0,o=r.length;u<o;u++){var i=r[u],a=n[i];e(a,i,n)&&(t[i]=a)}return t})),Wr=j((function(n,r){var t,e=r[0];return D(e)?(e=fr(e),r.length>1&&(t=r[1])):(r=_r(ur(r,!1,!1),String),e=function(n,t){return!Er(r,t)}),Ur(n,e,t)}));function zr(n,r,t){return i.call(n,0,Math.max(0,n.length-(null==r||t?1:r)))}function Lr(n,r,t){return null==n||n.length<1?null==r||t?void 0:[]:null==r||t?n[0]:zr(n,n.length-r)}function $r(n,r,t){return i.call(n,null==r||t?1:r)}var Cr=j((function(n,r){return r=ur(r,!0,!0),Sr(n,(function(n){return!Er(r,n)}))})),Kr=j((function(n,r){return Cr(n,r)}));function Jr(n,r,t,e){A(r)||(e=t,t=r,r=!1),null!=t&&(t=qn(t,e));for(var u=[],o=[],i=0,a=Y(n);i<a;i++){var f=n[i],c=t?t(f,i,n):f;r&&!t?(i&&o===c||u.push(f),o=c):t?Er(o,c)||(o.push(c),u.push(f)):Er(u,f)||u.push(f)}return u}var Gr=j((function(n){return Jr(ur(n,!0,!0))}));function Hr(n){for(var r=n&&Ir(n,Y).length||0,t=Array(r),e=0;e<r;e++)t[e]=Nr(n,e);return t}var Qr=j(Hr);function Xr(n,r){return n._chain?tn(r).chain():r}function Yr(n){return jr(wn(n),(function(r){var t=tn[r]=n[r];tn.prototype[r]=function(){var n=[this._wrapped];return o.apply(n,arguments),Xr(this,t.apply(tn,n))}})),tn}jr(["pop","push","reverse","shift","sort","splice","unshift"],(function(n){var r=t[n];tn.prototype[n]=function(){var t=this._wrapped;return null!=t&&(r.apply(t,arguments),"shift"!==n&&"splice"!==n||0!==t.length||delete t[0]),Xr(this,t)}})),jr(["concat","join","slice"],(function(n){var r=t[n];tn.prototype[n]=function(){var n=this._wrapped;return null!=n&&(n=r.apply(n,arguments)),Xr(this,n)}}));var Zr=Yr({__proto__:null,VERSION:n,restArguments:j,isObject:_,isNull:function(n){return null===n},isUndefined:w,isBoolean:A,isElement:function(n){return!(!n||1!==n.nodeType)},isString:S,isNumber:O,isDate:M,isRegExp:E,isError:B,isSymbol:N,isArrayBuffer:I,isDataView:q,isArray:U,isFunction:D,isArguments:L,isFinite:function(n){return!N(n)&&d(n)&&!isNaN(parseFloat(n))},isNaN:$,isTypedArray:X,isEmpty:function(n){if(null==n)return!0;var r=Y(n);return"number"==typeof r&&(U(n)||S(n)||L(n))?0===r:0===Y(nn(n))},isMatch:rn,isEqual:function(n,r){return on(n,r)},isMap:dn,isWeakMap:gn,isSet:bn,isWeakSet:mn,keys:nn,allKeys:an,values:jn,pairs:function(n){for(var r=nn(n),t=r.length,e=Array(t),u=0;u<t;u++)e[u]=[r[u],n[r[u]]];return e},invert:_n,functions:wn,methods:wn,extend:xn,extendOwn:Sn,assign:Sn,defaults:On,create:function(n,r){var t=Mn(n);return r&&Sn(t,r),t},clone:En,tap:function(n,r){return r(n),n},get:Tn,has:function(n,r){for(var t=(r=Nn(r)).length,e=0;e<t;e++){var u=r[e];if(!W(n,u))return!1;n=n[u]}return!!t},mapObject:function(n,r,t){r=qn(r,t);for(var e=nn(n),u=e.length,o={},i=0;i<u;i++){var a=e[i];o[a]=r(n[a],a,n)}return o},identity:kn,constant:C,noop:Un,toPath:Bn,property:Rn,propertyOf:function(n){return null==n?Un:function(r){return Tn(n,r)}},matcher:Dn,matches:Dn,times:function(n,r,t){var e=Array(Math.max(0,n));r=Fn(r,t,1);for(var u=0;u<n;u++)e[u]=r(u);return e},random:Wn,now:zn,escape:Cn,unescape:Kn,templateSettings:Jn,template:function(n,r,t){!r&&t&&(r=t),r=On({},r,tn.templateSettings);var e=RegExp([(r.escape||Gn).source,(r.interpolate||Gn).source,(r.evaluate||Gn).source].join("|")+"|$","g"),u=0,o="__p+='";n.replace(e,(function(r,t,e,i,a){return o+=n.slice(u,a).replace(Qn,Xn),u=a+r.length,t?o+="'+\n((__t=("+t+"))==null?'':_.escape(__t))+\n'":e?o+="'+\n((__t=("+e+"))==null?'':__t)+\n'":i&&(o+="';\n"+i+"\n__p+='"),r})),o+="';\n";var i,a=r.variable;if(a){if(!Yn.test(a))throw new Error("variable is not a bare identifier: "+a)}else o="with(obj||{}){\n"+o+"}\n",a="obj";o="var __t,__p='',__j=Array.prototype.join,"+"print=function(){__p+=__j.call(arguments,'');};\n"+o+"return __p;\n";try{i=new Function(a,"_",o)}catch(n){throw n.source=o,n}var f=function(n){return i.call(this,n,tn)};return f.source="function("+a+"){\n"+o+"}",f},result:function(n,r,t){var e=(r=Nn(r)).length;if(!e)return D(t)?t.call(n):t;for(var u=0;u<e;u++){var o=null==n?void 0:n[r[u]];void 0===o&&(o=t,u=e),n=D(o)?o.call(n):o}return n},uniqueId:function(n){var r=++Zn+"";return n?n+r:r},chain:function(n){var r=tn(n);return r._chain=!0,r},iteratee:Pn,partial:rr,bind:tr,bindAll:or,memoize:function(n,r){var t=function(e){var u=t.cache,o=""+(r?r.apply(this,arguments):e);return W(u,o)||(u[o]=n.apply(this,arguments)),u[o]};return t.cache={},t},delay:ir,defer:ar,throttle:function(n,r,t){var e,u,o,i,a=0;t||(t={});var f=function(){a=!1===t.leading?0:zn(),e=null,i=n.apply(u,o),e||(u=o=null)},c=function(){var c=zn();a||!1!==t.leading||(a=c);var l=r-(c-a);return u=this,o=arguments,l<=0||l>r?(e&&(clearTimeout(e),e=null),a=c,i=n.apply(u,o),e||(u=o=null)):e||!1===t.trailing||(e=setTimeout(f,l)),i};return c.cancel=function(){clearTimeout(e),a=0,e=u=o=null},c},debounce:function(n,r,t){var e,u,o,i,a,f=function(){var c=zn()-u;r>c?e=setTimeout(f,r-c):(e=null,t||(i=n.apply(a,o)),e||(o=a=null))},c=j((function(c){return a=this,o=c,u=zn(),e||(e=setTimeout(f,r),t&&(i=n.apply(a,o))),i}));return c.cancel=function(){clearTimeout(e),e=o=a=null},c},wrap:function(n,r){return rr(r,n)},negate:fr,compose:function(){var n=arguments,r=n.length-1;return function(){for(var t=r,e=n[r].apply(this,arguments);t--;)e=n[t].call(this,e);return e}},after:function(n,r){return function(){if(--n<1)return r.apply(this,arguments)}},before:cr,once:lr,findKey:sr,findIndex:vr,findLastIndex:hr,sortedIndex:yr,indexOf:gr,lastIndexOf:br,find:mr,detect:mr,findWhere:function(n,r){return mr(n,Dn(r))},each:jr,forEach:jr,map:_r,collect:_r,reduce:Ar,foldl:Ar,inject:Ar,reduceRight:xr,foldr:xr,filter:Sr,select:Sr,reject:function(n,r,t){return Sr(n,fr(qn(r)),t)},every:Or,all:Or,some:Mr,any:Mr,contains:Er,includes:Er,include:Er,invoke:Br,pluck:Nr,where:function(n,r){return Sr(n,Dn(r))},max:Ir,min:function(n,r,t){var e,u,o=1/0,i=1/0;if(null==r||"number"==typeof r&&"object"!=typeof n[0]&&null!=n)for(var a=0,f=(n=er(n)?n:jn(n)).length;a<f;a++)null!=(e=n[a])&&e<o&&(o=e);else r=qn(r,t),jr(n,(function(n,t,e){((u=r(n,t,e))<i||u===1/0&&o===1/0)&&(o=n,i=u)}));return o},shuffle:function(n){return Tr(n,1/0)},sample:Tr,sortBy:function(n,r,t){var e=0;return r=qn(r,t),Nr(_r(n,(function(n,t,u){return{value:n,index:e++,criteria:r(n,t,u)}})).sort((function(n,r){var t=n.criteria,e=r.criteria;if(t!==e){if(t>e||void 0===t)return 1;if(t<e||void 0===e)return-1}return n.index-r.index})),"value")},groupBy:Dr,indexBy:Rr,countBy:Fr,partition:Vr,toArray:function(n){return n?U(n)?i.call(n):S(n)?n.match(Pr):er(n)?_r(n,kn):jn(n):[]},size:function(n){return null==n?0:er(n)?n.length:nn(n).length},pick:Ur,omit:Wr,first:Lr,head:Lr,take:Lr,initial:zr,last:function(n,r,t){return null==n||n.length<1?null==r||t?void 0:[]:null==r||t?n[n.length-1]:$r(n,Math.max(0,n.length-r))},rest:$r,tail:$r,drop:$r,compact:function(n){return Sr(n,Boolean)},flatten:function(n,r){return ur(n,r,!1)},without:Kr,uniq:Jr,unique:Jr,union:Gr,intersection:function(n){for(var r=[],t=arguments.length,e=0,u=Y(n);e<u;e++){var o=n[e];if(!Er(r,o)){var i;for(i=1;i<t&&Er(arguments[i],o);i++);i===t&&r.push(o)}}return r},difference:Cr,unzip:Hr,transpose:Hr,zip:Qr,object:function(n,r){for(var t={},e=0,u=Y(n);e<u;e++)r?t[n[e]]=r[e]:t[n[e][0]]=n[e][1];return t},range:function(n,r,t){null==r&&(r=n||0,n=0),t||(t=r<n?-1:1);for(var e=Math.max(Math.ceil((r-n)/t),0),u=Array(e),o=0;o<e;o++,n+=t)u[o]=n;return u},chunk:function(n,r){if(null==r||r<1)return[];for(var t=[],e=0,u=n.length;e<u;)t.push(i.call(n,e,e+=r));return t},mixin:Yr,default:tn});return Zr._=Zr,Zr}));;
/*!
 * jQuery Once v2.2.3 - http://github.com/robloach/jquery-once
 * @license MIT, GPL-2.0
 *   http://opensource.org/licenses/MIT
 *   http://opensource.org/licenses/GPL-2.0
 */
(function(e){"use strict";if(typeof exports==="object"&&typeof exports.nodeName!=="string"){e(require("jquery"))}else if(typeof define==="function"&&define.amd){define(["jquery"],e)}else{e(jQuery)}})(function(t){"use strict";var r=function(e){e=e||"once";if(typeof e!=="string"){throw new TypeError("The jQuery Once id parameter must be a string")}return e};t.fn.once=function(e){var n="jquery-once-"+r(e);return this.filter(function(){return t(this).data(n)!==true}).data(n,true)};t.fn.removeOnce=function(e){return this.findOnce(e).removeData("jquery-once-"+r(e))};t.fn.findOnce=function(e){var n="jquery-once-"+r(e);return this.filter(function(){return t(this).data(n)===true})}});

/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(function () {
  var settingsElement = document.querySelector('head > script[type="application/json"][data-drupal-selector="drupal-settings-json"], body > script[type="application/json"][data-drupal-selector="drupal-settings-json"]');

  window.drupalSettings = {};

  if (settingsElement !== null) {
    window.drupalSettings = JSON.parse(settingsElement.textContent);
  }
})();;
window.drupalTranslations = {"strings":{"":{"Error message":"\u9519\u8bef\u4fe1\u606f","An AJAX HTTP error occurred.":"\u53d1\u751f\u4e00\u4e2aAJAX HTTP\u9519\u8bef\u3002","HTTP Result Code: !status":"HTTP\u8fd4\u56de\u4ee3\u7801\uff1a!status","An AJAX HTTP request terminated abnormally.":"\u4e00\u4e2aAJAX HTTP\u8bf7\u6c42\u5f02\u5e38\u7ec8\u6b62\u3002","Debugging information follows.":"\u8c03\u8bd5\u4fe1\u606f\u5982\u4e0b\u3002","Path: !uri":"\u8def\u5f84\uff1a!uri","StatusText: !statusText":"\u72b6\u6001\u6587\u672c: !statusText","ResponseText: !responseText":"\u54cd\u5e94\u6587\u672c\uff1a !responseText","ReadyState: !readyState":"\u51c6\u5907\u72b6\u6001\uff1a !readyState","CustomMessage: !customMessage":"\u5b9a\u5236\u4fe1\u606f\uff1a !customMessage","Please wait...":"\u8bf7\u7a0d\u7b49...","The response failed verification so will not be processed.":"\u672a\u901a\u8fc7\u9a8c\u8bc1\u7684\u54cd\u5e94\u4e0d\u4f1a\u88ab\u5904\u7406\u3002","The callback URL is not local and not trusted: !url":"\u975e\u672c\u5730\u7684\u56de\u8c03\u5730\u5740\u4e0d\u4f1a\u88ab\u4fe1\u4efb\uff1a !url","Changed":"\u5df2\u66f4\u6539","Open":"\u5f00\u653e","Close":"\u5173\u95ed","@action @title configuration options":"@action @title \u914d\u7f6e\u9009\u9879","List additional actions":"\u5217\u51fa\u989d\u5916\u7684\u52a8\u4f5c","Select all rows in this table":"\u9009\u62e9\u6b64\u8868\u4e2d\u7684\u6240\u6709\u884c","Deselect all rows in this table":"\u53d6\u6d88\u5168\u9009\u6b64\u8868\u4e2d\u7684\u6240\u6709\u884c","Extend":"\u6269\u5c55","Collapse":"\u6298\u53e0","@label":"@label","Horizontal orientation":"\u6a2a\u5411","Vertical orientation":"\u7eb5\u5411","The toolbar cannot be set to a horizontal orientation when it is locked.":"\u5de5\u5177\u680f\u9501\u5b9a\u65f6\u65e0\u6cd5\u8bbe\u7f6e\u4e3a\u6a2a\u5411\u663e\u793a\u3002","Tray orientation changed to @orientation.":"\u6258\u76d8\u65b9\u5411\u5df2\u66f4\u6539\u4e3a @orientation\u3002","closed":"\u5173\u95ed","opened":"\u5df2\u6253\u5f00","Tray \u0022@tray\u0022 @action.":"\u6258\u76d8\u201c@tray\u201d@action\u3002","Tray @action.":"\u6258\u76d8 @action\u3002","!tour_item of !total":"!tour_item \/ !total","End tour":"\u7ed3\u675f\u5bfc\u89c8","Tabbing is no longer constrained by the Contextual module.":"Tab \u952e\u5207\u6362\u4e0d\u518d\u53d7\u201c\u4e0a\u4e0b\u6587\u201d\u6a21\u5757\u7684\u7ea6\u675f\u3002","Tabbing is constrained to a set of @contextualsCount and the edit mode toggle.":"Tab \u952e\u5207\u6362\u4ec5\u9650\u4e8e\u4e00\u7ec4 @contextualsCount \u548c\u7f16\u8f91\u65b9\u5f0f\u5207\u6362\u3002","Show all columns":"\u663e\u793a\u6240\u6709\u5217","Press the esc key to exit.":"\u6309ESC\u952e\u9000\u51fa\u3002","Hide lower priority columns":"\u9690\u85cf\u8f83\u4f4e\u4f18\u5148\u7ea7\u7684\u5217","@count contextual link\u0003@count contextual links":"@count \u4e0a\u4e0b\u6587\u94fe\u63a5\u0003@count \u4e0a\u4e0b\u6587\u94fe\u63a5","Show table cells that were hidden to make the table fit within a small screen.":"\u663e\u793a\u4e3a\u4e86\u9002\u5e94\u5c0f\u5c4f\u5e55\u800c\u9690\u85cf\u7684\u8868\u683c\u5355\u5143","Re-order rows by numerical weight instead of dragging.":"\u4e0d\u7528\u62d6\u653e\u64cd\u4f5c\uff0c\u800c\u7528\u6570\u5b57\u6743\u91cd\u65b9\u5f0f\u91cd\u65b0\u5bf9\u884c\u6392\u5e8f\u3002","Home":"\u9996\u9875","Show row weights":"\u663e\u793a\u884c\u7684\u6743\u91cd","Hide row weights":"\u9690\u85cf\u884c\u7684\u6743\u91cd","Drag to re-order":"\u62d6\u653e\u91cd\u65b0\u6392\u5e8f","You have unsaved changes.":"\u4f60\u6709\u672a\u4fdd\u5b58\u7684\u66f4\u6539\u3002","Delete":"\u5220\u9664","Edit":"\u7f16\u8f91","Disabled":"\u7981\u7528","Enabled":"\u542f\u7528","1 hour\u0003@count hours":"1 \u5c0f\u65f6\u0003@count \u5c0f\u65f6","1 day\u0003@count days":"1 \u5929\u0003@count \u5929","1 year\u0003@count years":"1 \u5e74\u0003@count \u5e74","1 week\u0003@count weeks":"1 \u5468\u0003@count \u5468","1 min\u0003@count min":"1 \u5206\u949f\u0003@count \u5206\u949f","1 sec\u0003@count sec":"1 \u79d2\u0003@count \u79d2","1 month\u0003@count months":"\u4e00\u4e2a\u6708\u0003@count \u4e2a\u6708","0 sec":"0 \u79d2","Next":"\u4e0b\u4e00\u9875","Status":"\u72b6\u6001","Register":"\u7acb\u5373\u62a5\u540d","Username":"\u7528\u6237\u540d","Cancel":"\u53d6\u6d88","Description":"\u8be6\u7ec6\u63cf\u8ff0","Disable":"\u7981\u7528","Action":"\u53ef\u7528\u64cd\u4f5c","new":"\u65b0","Download":"\u4e0b\u8f7d","File":"\u6587\u4ef6","Date":"\u65e5\u671f","Size":"\u5927\u5c0f","None":"\u65e0","Country":"\u56fd\u5bb6","Link":"\u94fe\u63a5","Image":"\u56fe\u50cf","root":"\u6839","Name":"\u540d\u5b57","Save":"\u4fdd\u5b58","Sunday":"\u661f\u671f\u65e5","Monday":"\u661f\u671f\u4e00","Tuesday":"\u661f\u671f\u4e8c","Wednesday":"\u661f\u671f\u4e09","Thursday":"\u661f\u671f\u56db","Friday":"\u661f\u671f\u4e94","Saturday":"\u661f\u671f\u516d","Add":"\u6dfb\u52a0","View":"\u67e5\u770b","Refresh":"\u5237\u65b0","Upload":"\u4e0a\u4f20","Continue":"\u7ee7\u7eed","Create":"\u521b\u5efa","Done":"\u5b8c\u6210","To":"\u7ed3\u675f\u65f6\u95f4 ","From":"\u5f00\u59cb\u65f6\u95f4 ","N\/A":"N\/A","OK":"OK","Width":"\u5bbd\u5ea6","Height":"\u9ad8\u5ea6","Prev":"\u524d","Day":"\u65e5","Mon":"\u5468\u4e00","Tue":"\u5468\u4e8c","Wed":"\u5468\u4e09","Thu":"\u5468\u56db","Fri":"\u5468\u4e94","Sat":"\u5468\u516d","Sun":"\u5468\u65e5","May":"5\u6708","Other":"\u5176\u5b83","Select all":"\u5168\u9009","Add group":"\u6dfb\u52a0\u7ec4","Show":"\u663e\u793a","1 item\u0003@count items":"1 \u9879\u0003@count \u9879","Deleted":"\u5df2\u5220\u9664","Today":"\u4eca\u5929","Jan":"1\u6708","Feb":"2\u6708","Mar":"3\u6708","Apr":"4\u6708","Jun":"6\u6708","Jul":"7\u6708","Aug":"8\u6708","Sep":"9\u6708","Oct":"10\u6708","Nov":"11\u6708","Dec":"12\u6708","Su":"\u5468\u65e5","Mo":"\u5468\u4e00","Tu":"\u5468\u4e8c","We":"\u5468\u4e09","Th":"\u5468\u56db","Fr":"\u5468\u4e94","Sa":"\u5468\u516d","Seconds":"\u79d2","Not published":"\u672a\u53d1\u8868","New":"\u65b0","\u2039 Previous":"\u2039 \u4e0a\u4e00\u9875","Next \u203a":"\u4e0b\u4e00\u9875 \u203a","Loading...":"\u6b63\u5728\u52a0\u8f7d...","Apply":"\u5e94\u7528","Select":"\u9009\u62e9","Copy":"\u590d\u5236","Hide":"\u9690\u85cf","1 new comment\u0003@count new comments":"1 \u5219\u65b0\u8bc4\u8bba\u0003@count \u5219\u65b0\u8bc4\u8bba","Unlink":"\u53d6\u6d88\u94fe\u63a5","Resize":"\u6539\u53d8\u5c3a\u5bf8","Not promoted":"\u672a\u63a8\u8350","mm\/dd\/yy":"mm\/dd\/yy","Quick edit":"\u5feb\u901f\u7f16\u8f91","button":"\u6309\u94ae","Only files with the following extensions are allowed: %files-allowed.":"\u53ea\u5141\u8bb8\u4ee5\u4e0b\u6269\u5c55\u540d\u6587\u4ef6\uff1a%files-allowed\u3002","Edit Link":"\u7f16\u8f91\u94fe\u63a5","Remove group":"\u5220\u9664\u7ec4","By @name on @date":"\u7531 @name \u5728 @date \u53d1\u5e03","By @name":"\u7531 @name \u53d1\u5e03","Not in menu":"\u4e0d\u5728\u83dc\u5355\u4e2d","Alias: @alias":"\u522b\u540d\uff1a@alias","No alias":"\u65e0\u522b\u540d","New revision":"\u65b0\u7684\u4fee\u8ba2\u7248\u672c","Changes made in this table will not be saved until the form is submitted.":"\u5728\u6b64\u8868\u683c\u4e2d\u7684\u4fee\u6539\u53ea\u6709\u5728\u6574\u4e2a\u8868\u5355\u63d0\u4ea4\u540e\u624d\u4f1a\u88ab\u4fdd\u5b58\u3002","1 byte\u0003@count bytes":"1 \u5b57\u8282\u0003@count \u5b57\u8282","@size KB":"@size KB","@size MB":"@size MB","\u00ab First":"\u00ab \u9996\u9875","Last \u00bb":"\u672b\u9875 \u00bb","Discard changes":"\u4e22\u5f03\u66f4\u6539","Show description":"\u663e\u793a\u63cf\u8ff0","New group":"\u65b0\u7ec4","Breadcrumbs":"\u5bfc\u822a\u8def\u5f84","Saving":"\u6b63\u5728\u4fdd\u5b58","This permission is inherited from the authenticated user role.":"\u6b64\u6743\u9650\u7ee7\u627f\u81ea\u6ce8\u518c\u7528\u6237\u89d2\u8272\u3002","No revision":"\u6ca1\u6709\u4fee\u8ba2\u7248\u672c","Requires a title":"\u9700\u8981\u4e00\u4e2a\u6807\u9898","Not restricted":"\u672a\u53d7\u9650\u5236","(active tab)":"\uff08\u6d3b\u52a8\u6807\u7b7e\uff09","Status message":"\u72b6\u6001\u6d88\u606f","Restricted to certain pages":"\u9650\u5236\u5230\u7279\u5b9a\u7684\u533a\u5757","The block cannot be placed in this region.":"\u6b64\u533a\u5757\u4e0d\u80fd\u653e\u7f6e\u5728\u6b64\u533a\u57df\u4e2d","Hide summary":"\u9690\u85cf\u6458\u8981","Edit summary":"\u7f16\u8f91\u6458\u8981","Don\u0027t display post information":"\u4e0d\u8981\u663e\u793a\u53d1\u5e03\u4fe1\u606f\u3002","The selected file %filename cannot be uploaded. Only files with the following extensions are allowed: %extensions.":"\u9009\u62e9\u7684\u6587\u4ef6%filename\u65e0\u6cd5\u4e0a\u4f20\u3002\u53ea\u6709\u4ee5\u4e0b\u7c7b\u578b\u7684\u6587\u4ef6\u88ab\u5141\u8bb8\uff1a%extensions\u3002","Apply (all displays)":"\u5e94\u7528\uff08\u6240\u6709\u663e\u793a\uff09","Apply (this display)":"\u5e94\u7528\uff08\u5f53\u524d\u663e\u793a\uff09","Revert to default":"\u6062\u590d\u81f3\u9ed8\u8ba4","Hide description":"\u9690\u85cf\u63cf\u8ff0","You have unsaved changes":"\u60a8\u6709\u672a\u4fdd\u5b58\u7684\u66f4\u6539","Needs to be updated":"\u9700\u8981\u88ab\u66f4\u65b0","Does not need to be updated":"\u4e0d\u9700\u8981\u88ab\u66f4\u65b0","Flag other translations as outdated":"\u628a\u5176\u4ed6\u7ffb\u8bd1\u6807\u793a\u4e3a\u5df2\u8fc7\u671f","Do not flag other translations as outdated":"\u4e0d\u628a\u5176\u4ed6\u7ffb\u8bd1\u6807\u793a\u4e3a\u5df2\u8fc7\u671f","No styles configured":"\u672a\u914d\u7f6e\u6837\u5f0f","@count styles configured":"\u5df2\u914d\u7f6e@count\u79cd\u6837\u5f0f","Uploads disabled":"\u5df2\u53d6\u6d88\u4e0a\u4f20","Uploads enabled, max size: @size @dimensions":"\u4e0a\u4f20\u5df2\u542f\u7528\uff0c\u6700\u5927\u5c3a\u5bf8\uff1a @size @dimensions","Hide group names":"\u9690\u85cf\u7ec4\u540d","Show group names":"\u663e\u793a\u7ec4\u540d","@groupName button group in position @position of @positionCount in row @row of @rowCount.":"@groupName \u6309\u94ae\u7ec4\u5728 @positionCount \u4e2d\u7684\u4f4d\u7f6e @position \u5728 @rowCount \u4e2d @row \u884c\u3002","Press the down arrow key to create a new row.":"\u6309\u5411\u4e0b\u7bad\u5934\u952e\u6765\u521b\u5efa\u4e00\u4e2a\u65b0\u884c\u3002","@name @type.":"@name @type\u3002","Press the down arrow key to activate.":"\u6309\u5411\u4e0b\u7bad\u5934\u952e\u6765\u6fc0\u6d3b\u3002","This is the last group. Move the button forward to create a new group.":"\u8fd9\u662f\u6700\u540e\u4e00\u4e2a\u7ec4\u3002\u79fb\u52a8\u6309\u94ae\u521b\u5efa\u4e00\u4e2a\u65b0\u7ec4\u3002","Use the keyboard arrow keys to change the position of this button.":"\u4f7f\u7528\u952e\u76d8\u65b9\u5411\u952e\u6765\u66f4\u6539\u8fd9\u4e2a\u6309\u94ae\u7684\u4f4d\u7f6e\u3002","Press the up arrow key on the top row to disable the button.":"\u6309\u5411\u4e0a\u7bad\u5934\u952e\u5728\u6700\u4e0a\u9762\u4e00\u884c\u7981\u7528\u6309\u94ae\u3002","Use the down arrow key to move this button into the active toolbar.":"\u4f7f\u7528\u5411\u4e0b\u7bad\u5934\u952e\u79fb\u52a8\u8fd9\u4e2a\u6309\u94ae\u5230\u6d3b\u8dc3\u7684\u5de5\u5177\u680f\u3002","Use the keyboard arrow keys to change the position of this separator.":"\u4f7f\u7528\u952e\u76d8\u65b9\u5411\u952e\u6765\u66f4\u6539\u8fd9\u4e2a\u5206\u9694\u7b26\u7684\u4f4d\u7f6e\u3002","Use the down arrow key to move this separator into the active toolbar.":"\u4f7f\u7528\u5411\u4e0b\u7bad\u5934\u952e\u79fb\u52a8\u8fd9\u4e2a\u5206\u79bb\u5668\u5230\u6d3b\u8dc3\u7684\u5de5\u5177\u680f\u3002","You may add multiple separators to each button group.":"\u4f60\u53ef\u4ee5\u6dfb\u52a0\u591a\u4e2a\u5206\u79bb\u5668\u6309\u94ae\u7ec4\u3002","Editing the name of the new button group in a dialog.":"\u7f16\u8f91\u65b0\u6309\u94ae\u7ec4\u7684\u540d\u5b57\u663e\u793a\u5728\u4e00\u4e2a\u5bf9\u8bdd\u6846\u91cc\u3002","Editing the name of the \u0022@groupName\u0022 button group in a dialog.":"\u7f16\u8f91 \u0022@groupName\u0022 \u6309\u94ae\u7ec4\u7684\u540d\u5b57\u663e\u793a\u5728\u4e00\u4e2a\u5bf9\u8bdd\u6846\u91cc\u3002","Add a CKEditor button group to the end of this row.":"\u5728\u8fd9\u4e00\u884c\u7684\u672b\u5c3e\u6dfb\u52a0\u4e00\u4e2a CKEditor \u6309\u94ae\u7ec4\u3002","Rich Text Editor, !label field":"\u5bcc\u6587\u672c\u7f16\u8f91\u5668\uff0c!label \u5b57\u6bb5","Network problem!":"\u7f51\u7edc\u95ee\u9898\uff01","Added":"\u5df2\u6dfb\u52a0","Deselect all":"\u53d6\u6d88\u5168\u9009","Downloads":"\u4e0b\u8f7d","Not customizable":"\u4e0d\u53ef\u81ea\u5b9a\u4e49\u7684","Colorbox":"\u5f69\u76d2","One domain with multiple subdomains":"\u4e00\u4e2a\u57df\u540d\u4ee5\u53ca\u5b83\u7684\u591a\u4e2a\u5b50\u57df\u540d","Multiple top-level domains":"\u591a\u4e2a\u9876\u7ea7\u57df\u540d","No privacy":"\u65e0\u9690\u79c1","New folder":"\u65b0\u6587\u4ef6\u5939","Add file":"\u6dfb\u52a0\u6587\u4ef6","Please select a file.":"\u8bf7\u9009\u62e91\u4e2a\u6587\u4ef6\u3002","Priority":"\u4f18\u5148","Completed":"\u5df2\u5b8c\u6210","Enter username":"\u8f93\u5165\u7528\u6237\u540d","Automatic alias":"\u81ea\u52a8\u522b\u540d","Insert this token into your form":"\u628a\u8fd9\u4e2aToken\uff08\u4ee4\u724c\uff09\u63d2\u5165\u5230\u8868\u5355","Tooltips":"\u5de5\u5177\u63d0\u793a","Responsive Images":"\u54cd\u5e94\u5f0f\u56fe\u50cf","Responsive Tables":"\u54cd\u5e94\u5f0f\u8868\u683c","Inverse":"\u53cd\u8f6c","@size Buttons":"@size \u6309\u94ae","@shape Images":"@shape \u56fe\u50cf","Insert images using Imce File Manager":"\u4f7f\u7528IMCE\u6587\u4ef6\u7ba1\u7406\u5668\u63d2\u5165\u56fe\u50cf","Insert file links using Imce File Manager":"\u4f7f\u7528IMCE\u6587\u4ef6\u7ba1\u7406\u5668\u63d2\u5165\u6587\u4ef6\u94fe\u63a5","Changing the text format to %text_format will permanently remove content that is not allowed in that text format.\u003Cbr\u003E\u003Cbr\u003ESave your changes before switching the text format to avoid losing data.":"\u66f4\u6539\u6587\u672c\u683c\u5f0f\u81f3 %text_format \u5c06\u6c38\u4e45\u5220\u9664\u8be5\u6587\u672c\u683c\u5f0f\u4e0d\u5141\u8bb8\u7684\u5185\u5bb9\u3002\u003Cbr\u003E\u003Cbr\u003E\u8bf7\u5728\u5207\u6362\u6587\u672c\u683c\u5f0f\u524d\u4fdd\u5b58\u60a8\u7684\u66f4\u6539\uff0c\u4ee5\u907f\u514d\u4e22\u5931\u6570\u636e\u3002","Change text format?":"\u4fee\u6539\u6587\u5b57\u683c\u5f0f\uff1f","Create a copy":"\u521b\u5efa\u4e00\u4e2a\u62f7\u8d1d","Could not load the form for \u003Cq\u003E@field-label\u003C\/q\u003E, either due to a website problem or a network connection problem.\u003Cbr\u003EPlease try again.":"\u7531\u4e8e Web \u7ad9\u70b9\u95ee\u9898\u6216\u7f51\u7edc\u8fde\u63a5\u95ee\u9898\uff0c\u6240\u4ee5\u65e0\u6cd5\u88c5\u5165\u201c@field-label\u201d\u7684\u8868\u5355\u3002\u003Cbr\u003E\u8bf7\u91cd\u8bd5\u3002","Your changes to \u003Cq\u003E@entity-title\u003C\/q\u003E could not be saved, either due to a website problem or a network connection problem.\u003Cbr\u003EPlease try again.":"\u7531\u4e8e Web \u7ad9\u70b9\u95ee\u9898\u6216\u7f51\u7edc\u8fde\u63a5\u95ee\u9898\uff0c\u6240\u4ee5\u65e0\u6cd5\u4fdd\u5b58\u60a8\u5bf9\u201c@entity-title\u201d\u6240\u505a\u7684\u66f4\u6539\u3002\u003Cbr\u003E\u8bf7\u91cd\u8bd5\u3002","Discard changes?":"\u8981\u653e\u5f03\u66f4\u6539\u5417\uff1f","Login":"\u767b\u5f55","Authored on @date":"\u8ba4\u8bc1\u65e5\u671f\uff1a@date","Use the selected file.":"\u4f7f\u7528\u9009\u4e2d\u7684\u6587\u4ef6\u3002","%name is not an image.":"%name \u4e0d\u662f\u56fe\u50cf\u3002","!items (!size)":"!items (!size)","Folder name":"\u6587\u4ef6\u76ee\u5f55\u7684\u540d\u79f0","%filename already exists.":"%filename \u5df2\u7ecf\u5b58\u5728\u3002","!percent%":"!percent%","Delete !filename?\u0003Delete the selected @count items?":"\u5220\u9664 !filename\uff1f\u0003\u5220\u9664\u9009\u4e2d\u7684 @count \u9879\uff1f","First click a text field to insert your tokens into.":"\u5148\u70b9\u51fb\u60a8\u9700\u8981\u63d2\u5165\u66ff\u6362\u7b26\u7684\u6587\u5b57\u5b57\u6bb5\u3002","Collection":"\u6a21\u8003\u9898\u5e93","Leave preview?":"\u9000\u51fa\u9884\u89c8\uff1f","Leave preview":"\u9000\u51fa\u9884\u89c8","Leaving the preview will cause unsaved changes to be lost. Are you sure you want to leave the preview?":"\u9000\u51fa\u9884\u89c8\u5c06\u5bfc\u81f4\u672a\u4fdd\u5b58\u7684\u66f4\u6539\u4e22\u5931\uff0c\u60a8\u786e\u5b9a\u8981\u9000\u51fa\uff1f","CTRL+Left click will prevent this dialog from showing and proceed to the clicked link.":"\u6309CTRL\u952e\u7684\u540c\u65f6\u5355\u51fb\u5de6\u952e\uff0c\u5c06\u963b\u6b62\u6b64\u5bf9\u8bdd\u6846\u7684\u663e\u793a\uff0c\u5e76\u5c06\u7ee7\u7eed\u8df3\u8f6c\u81f3\u5df2\u70b9\u51fb\u7684\u94fe\u63a5\u3002","Password:":"\u5bc6\u7801:","Solution":"\u8003\u5377\u7b54\u6848","Show Test Info":"\u663e\u793a\u8003\u5377\u8be6\u60c5","Instructions":"\u8003\u8bd5\u8bf4\u660e","!modules modules are available in the modified list.":"!modules \u6a21\u5757\u5728\u5df2\u4fee\u6539\u5217\u8868\u4e2d\u53ef\u7528\u3002","Based on the text editor configuration, these tags have automatically been added: \u003Cstrong\u003E@tag-list\u003C\/strong\u003E.":"\u6839\u636e\u6587\u672c\u7f16\u8f91\u5668\u914d\u7f6e\uff0c\u5df2\u81ea\u52a8\u6dfb\u52a0\u4ee5\u4e0b\u6807\u8bb0\uff1a\u003Cstrong\u003E@tag-list\u003C\/strong\u003E\u3002","Please provide a name for the button group.":"\u8bf7\u7ed9\u6309\u94ae\u7ec4\u63d0\u4f9b\u4e00\u4e2a\u540d\u79f0\u3002","Button group name":"\u6309\u94ae\u7ec4\u7684\u540d\u79f0","Place a button to create a new button group.":"\u653e\u5165\u4e00\u4e2a\u6309\u94ae\u6765\u521b\u5efa\u4e00\u4e2a\u65b0\u7684\u6309\u94ae\u7ec4\u3002","@name @type in position @position of @positionCount in @groupName button group in row @row of @rowCount.":"@name @type\uff0c\u4f4d\u4e8e @groupName \u6309\u94ae\u7ec4\u7b2c @row \u884c\uff08\u5171 @rowCount \u884c\uff09\u7b2c @position \u4e2a\uff08\u5171 @positionCount \u4e2a\uff09\u4f4d\u7f6e\u3002","Press the down arrow key to create a new button group in a new row.":"\u6309\u5411\u4e0b\u7bad\u5934\u952e\u6765\u521b\u5efa\u4e00\u4e2a\u65b0\u6309\u94ae\u7ec4\u5728\u65b0\u7684\u4e00\u884c\u3002","The \u0022@name\u0022 button is currently enabled.":"\u0022@name\u0022 \u6309\u94ae\u5f53\u524d\u5df2\u542f\u7528\u3002","The \u0022@name\u0022 button is currently disabled.":"\u0022@name\u0022 \u6309\u94ae\u5f53\u524d\u5df2\u88ab\u7981\u7528\u3002","This @name is currently enabled.":"\u8fd9\u4e2a @name \u5f53\u524d\u5df2\u542f\u7528\u3002","Separators are used to visually split individual buttons.":"\u5206\u5272\u7ebf\u53ef\u4ee5\u5c06\u4e0d\u540c\u6309\u94ae\u9694\u5f00\u3002","This @name is currently disabled.":"@name \u5df2\u88ab\u7981\u7528\u3002","1 block is available in the modified list.\u0003@count blocks are available in the modified list.":"1\u4e2a\u533a\u5757\u5728\u4fee\u6539\u540e\u7684\u5217\u8868\u4e2d\u53ef\u7528\u3002\u0003@count \u4e2a\u533a\u5757\u5728\u4fee\u6539\u540e\u7684\u5217\u8868\u4e2d\u53ef\u7528\u3002","Change frequency":"\u66f4\u6539\u9891\u7387","Please play the audio to start the test":"\u8bf7\u70b9\u51fb\u64ad\u653e\u542c\u529b\u97f3\u9891","Password is required.":"\u5fc5\u987b\u586b\u5165\u5bc6\u7801\u3002","Username is required.":"\u5fc5\u987b\u586b\u5165\u59d3\u540d\u3002","Email is required.":"\u5fc5\u987b\u586b\u5165\u90ae\u7bb1\u3002","Confirm Password is required.":"\u5fc5\u987b\u586b\u5165\u5bc6\u7801\u3002","Please choose an option to continue.":"\u8bf7\u5b8c\u6210\u5fc5\u9009\u9879","Address":"\u5730\u5740","Drag files here or click to upload":"\u62d6\u653e\u6587\u4ef6\u6216\u70b9\u51fb\u4e0a\u4f20","Restricted":"\u53d7\u9650\u5236\u7684","Amount":"\u603b\u989d","Select payment method":" \u9009\u62e9\u4ed8\u6b3e\u65b9\u5f0f","Complete":"\u5b8c\u6210","Detail":"\u8be6\u60c5","Week":"\u5468","Sample Essay":"\u8303\u6587","BUY NOW":"\u7acb\u5373\u8d2d\u4e70","View Details":"\u67e5\u770b\u8be6\u60c5","Payment Information":"\u652f\u4ed8\u4fe1\u606f","Transaction":"\u4ea4\u6613\u53f7\u7801","Balance":"\u4f59\u989d","Purchased Date":"\u4ea4\u6613\u65f6\u95f4","Billing Address":"\u6536\u6b3e\u5730\u5740","Postcode":"\u90ae\u653f\u7f16\u7801","Hide Test Info":"\u9690\u85cf\u8003\u5377\u8be6\u60c5","Please":"\u8bf7\u70b9\u51fb","play":"\u64ad\u653e","the audio to start the test":"\u542c\u529b\u97f3\u9891","Others":"\u5176\u4ed6"," minutes":" \u5206\u949f","Join now":"\u4e0a\u8bfe\u4e2d - \u9a6c\u4e0a\u52a0\u5165\uff01","Register Here":"\u9a6c\u4e0a\u62a5\u540d","Registration is no longer available since this is a past event.":"\u672c\u6b21\u8bfe\u7a0b\u5df2\u7ed3\u675f\uff0c\u56de\u653e\u8bf7\u5173\u6ce8\u793e\u5a92\u516c\u544a\u3002","Your webinar can only be accessed 15 minutes prior to the scheduled time.":"\u8bf7\u5728\u8bfe\u65f6\u524d15\u5206\u949f\u65f6\u8fdb\u5165\u8bfe\u7a0b\u3002","The webinar will be available to rewatched soon.":"\u56de\u653e\u89c6\u9891\u7b49\u5f85\u4e0a\u4f20","Join Now":"\u4e0a\u8bfe\u4e2d - \u9a6c\u4e0a\u52a0\u5165\uff01","Starting in ":"\u4ec5\u5269"," days":"\u5929"," hours":"\u5c0f\u65f6","Rewatch Here":"\u89c2\u770b\u56de\u653e","Starting in @hours hours":"\u4ec5\u5269 @hours\u5c0f\u65f6","Starting in @day day":"\u4ec5\u5269 @day\u5929","Starting in @minutes minutes":"\u4ec5\u5269 @minutes\u5206\u949f","Starting in @day days":"\u4ec5\u5269 @day\u5929","Join":"\u9a6c\u4e0a\u62a5\u540d","Please specify a valid phone number":"\u8bf7\u8f93\u5165\u6709\u6548\u7684\u624b\u673a\u53f7","Please enter your username":"\u8bf7\u8f93\u5165\u7528\u6237\u540d\/\u90ae\u7bb1","Please enter your phone number":"\u8bf7\u8f93\u5165\u624b\u673a\u53f7","Your phone number too short":"\u624b\u673a\u53f7\u7801\u4e0d\u6b63\u786e","Please enter your password":"\u8bf7\u8f93\u5165\u5bc6\u7801","We need an email address to contact you":"\u8bf7\u8f93\u5165\u60a8\u7684\u90ae\u7bb1","Your email address is not valid":"\u90ae\u4ef6\u65e0\u6548","Please provide a password":"\u8bf7\u8f93\u5165\u5bc6\u7801","Your password must be at least 8 characters long":"\u5bc6\u7801\u5fc5\u987b\u81f3\u5c11\u5305\u542b8\u4e2a\u5b57\u7b26\u3002","Please confirm password":"\u8bf7\u786e\u8ba4\u5bc6\u7801","Please enter the same password as above":"\u5bc6\u7801\u548c\u786e\u8ba4\u5bc6\u7801\u4e0d\u4e00\u81f4","Please enter SMS verification code":"\u8bf7\u8f93\u5165\u9a8c\u8bc1\u7801","Use again (@countdown s)":"\u91cd\u65b0\u53d1\u9001(@countdown s)","Buy Now":"\u7acb\u5373\u8d2d\u4e70","Join Free":"\u514d\u8d39\u52a0\u5165","Custom lesson package":"\u5b9a\u5236\u8bfe\u7a0b\u5957\u88c5","Report mistake\/bug":"\u9519\u8bef\u62a5\u544a","Payment problem":"\u652f\u4ed8\u95ee\u9898","Suggestion":"\u610f\u89c1\u53cd\u9988","Looking for freelance work":"\u5bfb\u627eFreelance\u5de5\u4f5c","Provide Content":"\u5185\u5bb9\u63d0\u4f9b","Build your confidence in all IELTS skills and prepare for studying abroad with our daily live lessons":"\u540d\u5e08\u76f4\u64ad\u6388\u8bfe\uff0c\u52a9\u529b\u8f7b\u677e\u7559\u5b66","In progress":"\u8fdb\u884c\u4e2d","Commission":"\u6536\u76ca\u8bb0\u5f55","Payment Settings":"\u652f\u4ed8\u8bbe\u7f6e","Account name":"\u8d26\u6237\u540d","Bank name":"\u94f6\u884c\u540d\u79f0","Account number":"\u8d26\u53f7","SWIFT code":"SWIFT \u53f7\u7801","View all":"\u67e5\u770b\u5168\u90e8","Order #":"\u8ba2\u5355","No.":"\u7f16\u53f7","Pending commission":"\u5f85\u5b9a\u4f63\u91d1","Invoice":"\u8d26\u5355\u53f7","Submit Test":"\u63d0\u4ea4","Not scheduled":"\u6ca1\u6709\u5b9a\u65f6","Show more":"\u5c55\u793a\u66f4\u591a","Show less":"\u6536\u8d77\u5c55\u793a","Time to Think @time":"\u51c6\u5907\u65f6\u95f4 @time","It\u2019s the end of Part @part":"\u7b2c@part\u90e8\u5206\u5df2\u7ed3\u675f\u3002","You have @time minutes to speak\u2026":"You have @time minutes to speak\u2026","Average time spent per question of all Listening \u0026 Reading tests taken.":"\u6240\u6709\u542c\u529b\u548c\u9605\u8bfb\u6d4b\u8bd5\u4e2d\u6bcf\u4e2a\u95ee\u9898\u4f7f\u7528\u7684\u5e73\u5747\u65f6\u95f4\u3002","Average accuracy percentage of all Listening \u0026 Reading tests taken.":"\u6240\u6709\u542c\u529b\u548c\u9605\u8bfb\u6d4b\u8bd5\u5e73\u5747\u51c6\u786e\u7387\u767e\u5206\u6bd4\u3002","Average score of all Listening \u0026 Reading tests taken.":"\u6240\u6709\u542c\u529b\u548c\u9605\u8bfb\u6d4b\u8bd5\u7684\u5e73\u5747\u5206\u3002","Take test":"\u53c2\u52a0\u6d4b\u8bd5","item":"\u9879\u76ee","items":"\u9879\u76ee","Confirmation":"\u786e\u8ba4","Hours":"\u5c0f\u65f6","Minutes":"\u5206\u949f","Order No":"\u8ba2\u5355\u53f7","Paypal account":"Paypal \u8d26\u6237","View Previous Test Details":"\u5386\u53f2\u6d4b\u8bd5\u8be6\u60c5","Search live lesson":"\u8bf7\u8f93\u5165\u516c\u5f00\u8bfe\u540d\u79f0","Study Abroad":"\u51fa\u56fd\u7559\u5b66\u8bc4\u4f30","sold":"\u5df2\u552e","Pending":"\u5f85\u5904\u7406","Use again (@countdowns)":"\u91cd\u65b0\u53d1\u9001(@countdown s)","Please select answer!":"\u8bf7\u9009\u62e9\u7b54\u6848\uff01","Please enter your username.":"\u8bf7\u8f93\u5165\u7528\u6237\u540d","Please enter your phone number.":"\u8bf7\u8f93\u5165\u624b\u673a\u53f7","The phone number is invalid.":"\u624b\u673a\u53f7\u65e0\u6548","Your phone number too short.":"\u624b\u673a\u53f7\u7801\u4e0d\u6b63\u786e","Please enter your password.":"\u8bf7\u8f93\u5165\u5bc6\u7801","Your password must be at least 8 characters long.":"\u5bc6\u7801\u5fc5\u987b\u81f3\u5c11\u5305\u542b8\u4e2a\u5b57\u7b26\u3002","We need an email address to contact you.":"\u8bf7\u8f93\u5165\u60a8\u7684\u90ae\u7bb1","Your email address is not valid.":"\u90ae\u4ef6\u65e0\u6548","Your password must not contain spaces.":"\u60a8\u7684\u5bc6\u7801\u4e0d\u80fd\u5305\u542b\u7a7a\u683c","Please confirm password.":"\u8bf7\u786e\u8ba4\u5bc6\u7801","Please enter the same password as above.":"\u5bc6\u7801\u548c\u786e\u8ba4\u5bc6\u7801\u4e0d\u4e00\u81f4","Please enter SMS verification code.":"\u8bf7\u8f93\u5165\u9a8c\u8bc1\u7801","Please provide a password.":"\u8bf7\u8f93\u5165\u5bc6\u7801","Evaluation by certified examiners":"\u7531\u8ba4\u8bc1\u96c5\u601d\u8003\u5b98\u8bc4\u4f30","Click the \u0027TAKE TEST NOW\u0027 button to select a practice test. Once you complete the test, confirm to use available credits for evaluation.":"\u70b9\u9646\u201d\u5f00\u59cb\u505a\u9898\u201c\u540e\u8bf7\u9009\u62e9\u60a8\u60f3\u505a\u7684\u9898\u3002\u63d0\u4ea4\u540e\uff0c\u60a8\u53ef\u4ee5\u786e\u8ba4\u4f7f\u7528\u53ef\u7528\u70b9\u6570\u4e8e\u8003\u5b98\u8bc4\u4f30\u7684\u670d\u52a1\u3002","credits":"\u70b9\u6570","Valid period":"\u6709\u6548\u671f","Start Now":"\u5f00\u59cb\u8003\u8bd5","Select Country":"\u9009\u62e9\u56fd\u5bb6","has just bought":"\u5df2\u8d2d\u4e70\u6210\u529f","has just bought it!":"\u5df2\u8d2d\u4e70\u6210\u529f\uff01","You have already received a free demo class":"\u60a8\u5df2\u7ecf\u83b7\u53d6\u514d\u8d39\u8bfe","Coming soon ...":"\u5373\u5c06\u5230\u6765","Coming soon! A comprehensive, four-skill test awaits!":"\u5373\u5c06\u6765\u4e34\uff01\u4e00\u9879\u5168\u9762\u7684\u56db\u9879\u6280\u80fd\u6d4b\u8bd5\u5728\u7b49\u5f85\u60a8\uff01","%d character(s) entered":"\u5df2\u8f93\u5165%d \u4e2a\u5b57\u7b26","%d word(s) remaining":"\u8fd8\u5269 %d \u5b57","%d character(s) remaining":"\u5269\u4f59%d \u4e2a\u5b57\u7b26","Click \u0027USE NOW\u0027 to use the service on a speaking test in Practice Test History Or you can take a new speaking test. After finishing the test, confirm to use the credit to get evaluated.":"\u70b9\u51fb\u201c\u73b0\u5728\u4f7f\u7528\u201d\u5728\u201c\u6a21\u8003\u8bb0\u5f55\u201d\u4e2d\u4f7f\u7528\u5199\u4f5c\u6279\u6539\u670d\u52a1\uff1b\u4e5f\u53ef\u4ee5\u5b8c\u6210\u4e00\u4e2a\u65b0\u7684\u5199\u4f5c\u6d4b\u8bd5\u518d\u4f7f\u7528\u5199\u4f5c\u6279\u6539\u670d\u52a1\u3002\r\n","Available credit":"\u53ef\u7528 IOT \u70b9\u6570","credit":"\u70b9\u6570","Submission date":"\u63d0\u4ea4\u65e5\u671f","Click \u0027USE NOW\u0027 to use the service on a speaking test in Practice Test History \u003Cspan class=\u0027break\u0027\u003E Or you can take a new speaking test. After finishing the test, confirm to use the credit to get evaluated.":"\u70b9\u51fb\u201c\u73b0\u5728\u4f7f\u7528\u201d\u5728\u201c\u6a21\u8003\u8bb0\u5f55\u201d\u4e2d\u4f7f\u7528\u5199\u4f5c\u6279\u6539\u670d\u52a1\uff1b\u4e5f\u53ef\u4ee5\u5b8c\u6210\u4e00\u4e2a\u65b0\u7684\u5199\u4f5c\u6d4b\u8bd5\u518d\u4f7f\u7528\u5199\u4f5c\u6279\u6539\u670d\u52a1\u3002\r\n","Use now":"\u4f7f\u7528","Get more credit":"\u83b7\u5f97\u66f4\u591a\u70b9\u6570","Discovery more":"\u67e5\u770b\u8be6\u60c5","No evaluation service available!":"\u4f60\u8fd8\u672a\u8d2d\u4e70\u96c5\u601d\u8bc4\u4f30\u670d\u52a1\uff01","More than 15.000 students around the globe used our services to find out their band scores and how to improve them !":"\u5168\u7403\u6709\u8d85\u8fc7 15,000 \u540d\u5b66\u751f\u4f7f\u7528\u6211\u4eec\u7684\u96c5\u601d\u670d\u52a1\uff0c\u5b66\u4e60\u5982\u4f55\u5feb\u901f\u63d0\u9ad8\u96c5\u601d\u5206\u6570\uff01","No test evaluating!":"\u4f60\u8fd8\u672a\u8d2d\u4e70\u96c5\u601d\u8bc4\u4f30\u670d\u52a1","View result":"\u8bc4\u4f30\u8be6\u60c5","Order date":"\u8ba2\u5355\u65e5\u671f","Order value":"\u8ba2\u5355\u91d1\u989d","You haven\u2019t bought any IELTS Preparation Materials yet!":"\u4f60\u8fd8\u672a\u8d2d\u4e70\u96c5\u601d\u5907\u8003\u8d44\u6599\uff01","Supercharge your IELTS preparation with our explained videos, sample essays, PDF packs, and more!":"\u901a\u8fc7\u6211\u4eec\u7684\u771f\u9898\u89c6\u9891\u89e3\u6790\u3001\u6587\u7ae0\u6837\u672c\u3001PDF\u771f\u9898\u5305\u7b49\uff0c\u8ba9\u4f60\u96c5\u601d\u5907\u8003\u66f4\u52a0\u9ad8\u6548\uff01","Our most popular IELTS Preparation Materials":"\u6700\u53d7\u6b22\u8fce\u7684\u96c5\u601d\u5907\u8003\u8d44\u6599","Our most popular IELTS Evaluation Services":"\u6700\u53d7\u6b22\u8fce\u7684\u96c5\u601d\u5907\u8003\u670d\u52a1","\u003Cspan\u003EEvaluation\u003C\/span\u003E Services":"\u8bc4\u4f30\u670d\u52a1","\u003Cspan\u003EIELTS\u003C\/span\u003E Preparation Materials":"\u96c5\u601d\u5907\u8003\u8d44\u6599","Ready to use":"\u672a\u4f7f\u7528","In Progress":"\u8fdb\u884c\u4e2d","students":"\u5b66\u751f","teaching hours":"\u6559\u5b66\u5c0f\u65f6","live classes":"\u5802\u76f4\u64ad\u8bfe","Specialties":"\u64c5\u957f\u9886\u57df\uff1a","Price\/Hour":"\u4ef7\u683c\/\u5c0f\u65f6","Consultant Now":"\u54a8\u8be2\u4f18\u60e0","IELTS teachers available for selection.":"\u540d\u96c5\u601d\u6559\u5e08\u53ef\u4f9b\u9009\u62e9","Commission Detail":"\u4f63\u91d1\u8be6\u60c5","Share the referral link":"\u5206\u4eab\u63a8\u8350\u94fe\u63a5","Share the link below with your friends now to earn commission":"\u7acb\u5373\u5c06\u4e0b\u65b9\u7684\u94fe\u63a5\u5206\u4eab\u7ed9\u60a8\u7684\u670b\u53cb\u4ee5\u8d5a\u53d6\u4f63\u91d1\u3002","Copy link":"\u590d\u5236","List of your commissions this month. Your invoice will be generated and sent to you when eligible.":"\u672c\u6708\u60a8\u7684\u4f63\u91d1\u660e\u7ec6\u3002\u7b26\u5408\u6761\u4ef6\u65f6\uff0c\u7cfb\u7edf\u5c06\u81ea\u52a8\u751f\u6210\u8d26\u5355\u5e76\u53d1\u9001\u7ed9\u60a8\u3002","You have no pending invoice":"\u60a8\u6682\u65e0\u5f85\u7ed3\u7b97\u8d26\u5355","Total commission":"\u603b\u4f63\u91d1\u91d1\u989d","You will be able to receive your payment as soon as your balance reaches the minimum required amount of @minimum_amount":"\u5f53\u60a8\u7684\u8d26\u6237\u4f59\u989d\u8fbe\u5230\u6700\u4f4e\u652f\u4ed8\u8981\u6c42\uff08@minimum_amount\uff09\u65f6\uff0c\u5373\u53ef\u7533\u8bf7\u63d0\u73b0\u3002","You still need \u003Cstrong\u003E@remaining_amount\u003C\/strong\u003E for the new payment":"\u60a8\u8fd8\u9700\u8981\u003Cstrong\u003E@remaining_amount\u003C\/strong\u003E\u5373\u53ef\u53d1\u8d77\u65b0\u7684\u4ed8\u6b3e","Invoices will be generated on the first of the next month":"\u8d26\u5355\u5c06\u4e8e\u6b21\u67081\u65e5\u81ea\u52a8\u751f\u6210","SWIFT code should be 8 - 11 digit number.":"SWIFT\u4ee3\u7801\u5e94\u4e3a8-11\u4f4d\u5b57\u7b26","My payment":"\u6211\u7684\u4ed8\u6b3e\u8bb0\u5f55","SWIFT code is invalid":"SWIFT\u4ee3\u7801\u65e0\u6548","SWIFT code is required":"SWIFT\u4ee3\u7801\u4e3a\u5fc5\u586b\u9879","Account number should be 6 - 35 digit number.":"\u8d26\u53f7\u5e94\u4e3a6\u523035\u4f4d\u6570\u5b57","Billing date":"\u8d26\u5355\u65e5\u671f","Account number is invalid":"\u8d26\u53f7\u65e0\u6548","Account number is required":"\u8d26\u53f7\u4e3a\u5fc5\u586b","Account name is required":"\u8d26\u53f7\u59d3\u540d\u5fc5\u586b","Paypal account is not a valid email":"PayPal\u8d26\u6237\u90ae\u7bb1\u683c\u5f0f\u65e0\u6548","Paypal account is required":"PayPal\u8d26\u6237\u4e3a\u5fc5\u586b\u9879","Bank name is required":"\u94f6\u884c\u540d\u79f0\u4e3a\u5fc5\u586b\u9879","Customer details":"\u5ba2\u6237\u4fe1\u606f","You have no payments":"\u60a8\u6682\u65e0\u652f\u4ed8\u8bb0\u5f55","Choose your payment method from the options above and enter your details to get your commissions.":"\u8bf7\u4ece\u4e0a\u65b9\u9009\u9879\u4e2d\u9009\u62e9\u60a8\u7684\u4ed8\u6b3e\u65b9\u5f0f\u5e76\u586b\u5199\u8be6\u7ec6\u4fe1\u606f\u4ee5\u6536\u53d6\u4f63\u91d1\u3002","Invoice detail":"\u8d26\u5355\u8be6\u60c5","Enter your account name":"\u8bf7\u8f93\u5165\u60a8\u7684\u8d26\u6237\u59d3\u540d","Invoice number":"\u8d26\u5355\u53f7","Enter your bank name":"\u8bf7\u8f93\u5165\u60a8\u7684\u94f6\u884c\u540d\u79f0","Enter your account number":"\u8bf7\u8f93\u5165\u60a8\u7684\u94f6\u884c\u8d26\u53f7","Commission will be auto displayed in the table below within @visibility_time after your referral friend purchases for products successfully.":"\u63a8\u8350\u597d\u53cb\u6210\u529f\u8d2d\u4e70\u5546\u54c1\u540e\uff0c\u76f8\u5173\u4f63\u91d1\u5c06\u5728@visibility_time \u5185\u81ea\u52a8\u663e\u793a\u5728\u4e0b\u65b9\u7684\u8868\u683c\u4e2d\u3002","Paid":"\u5df2\u652f\u4ed8","Rejected":"\u5df2\u62d2\u7edd","\u2039 Prev":"\u2039 \u4e0a\u4e00\u9875","\u2039\u2039 First":"\u2039\u2039 \u9996\u9875","Last \u203a\u203a":"\u672b\u9875 \u203a\u203a","No commission information available.":"\u6682\u65e0\u4f63\u91d1\u4fe1\u606f","Please log in, scan the code, and add our WeChat to unlock the test.":"\u4e3a\u4e86\u4fdd\u969c\u60a8\u7684\u5b66\u4e60\u6743\u76ca\uff0c\u8bf7\u5148\u767b\u5f55\uff0c\u626b\u63cf\u4e8c\u7ef4\u7801\u5e76\u6dfb\u52a0\u6211\u4eec\u7684\u5fae\u4fe1\uff0c\u4ee5\u89e3\u9501\u9898\u76ee","Please add our wechat to active this option":"\u8bf7\u70b9\u51fb\u6309\u94ae\u5e76\u6dfb\u52a0\u6211\u4eec\u7684\u5fae\u4fe1\u4ee5\u89e3\u9501\u9898\u5e93","Click to copy the exam code and start the test":"\u70b9\u51fb\u590d\u5236\u8003\u8bd5\u7801\u4ee5\u53ca\u5f00\u59cb\u505a\u9898","Click the \u0027TAKE TEST\u0027 button to check your exam code and start the test when you are ready":"\u70b9\u51fb\u201c\u53c2\u52a0\u6d4b\u8bd5\u201d\u6309\u94ae\u67e5\u770b\u60a8\u7684\u8003\u8bd5\u7801\uff0c\u5e76\u5728\u51c6\u5907\u597d\u540e\u5f00\u59cb\u6d4b\u8bd5\u3002","Copied":"\u5df2\u590d\u5236","Exam code detail":"\u8003\u8bd5\u5bc6\u94a5\u5217\u8868\u8be6\u60c5","Copy a test code from the list below, then use it to access the test via the IELTS AI Test link":"\u4ece\u4e0b\u9762\u7684\u5217\u8868\u4e2d\u590d\u5236\u4e00\u4e2a\u6d4b\u8bd5\u4ee3\u7801\uff0c\u7136\u540e\u901a\u8fc7 IELTS AI Test \u94fe\u63a5\u4f7f\u7528\u8be5\u4ee3\u7801\u8fdb\u5165\u6d4b\u8bd5\uff1a","Enjoy the experience!":"\u795d\u60a8\u4f53\u9a8c\u6109\u5feb\uff01","Exam code":"\u8003\u8bd5\u5bc6\u94a5"},"Long month name":{"January":"\u4e00\u6708","February":"\u4e8c\u6708","March":"\u4e09\u6708","April":"\u56db\u6708","May":"\u4e94\u6708","June":"\u516d\u6708","July":"\u4e03\u6708","August":"\u516b\u6708","September":"\u4e5d\u6708","October":"\u5341\u6708","November":"\u5341\u4e00\u6708","December":"\u5341\u4e8c\u6708"},"ForgotPassword":{"Please enter correct phone number.":"\u8bf7\u8f93\u5165\u6b63\u786e\u624b\u673a\u53f7"}},"pluralFormula":{"1":0,"default":1}};;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

window.Drupal = { behaviors: {}, locale: {} };

(function (Drupal, drupalSettings, drupalTranslations, console, Proxy, Reflect) {
  Drupal.throwError = function (error) {
    setTimeout(function () {
      throw error;
    }, 0);
  };

  Drupal.attachBehaviors = function (context, settings) {
    context = context || document;
    settings = settings || drupalSettings;
    var behaviors = Drupal.behaviors;

    Object.keys(behaviors || {}).forEach(function (i) {
      if (typeof behaviors[i].attach === 'function') {
        try {
          behaviors[i].attach(context, settings);
        } catch (e) {
          Drupal.throwError(e);
        }
      }
    });
  };

  Drupal.detachBehaviors = function (context, settings, trigger) {
    context = context || document;
    settings = settings || drupalSettings;
    trigger = trigger || 'unload';
    var behaviors = Drupal.behaviors;

    Object.keys(behaviors || {}).forEach(function (i) {
      if (typeof behaviors[i].detach === 'function') {
        try {
          behaviors[i].detach(context, settings, trigger);
        } catch (e) {
          Drupal.throwError(e);
        }
      }
    });
  };

  Drupal.checkPlain = function (str) {
    str = str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    return str;
  };

  Drupal.formatString = function (str, args) {
    var processedArgs = {};

    Object.keys(args || {}).forEach(function (key) {
      switch (key.charAt(0)) {
        case '@':
          processedArgs[key] = Drupal.checkPlain(args[key]);
          break;

        case '!':
          processedArgs[key] = args[key];
          break;

        default:
          processedArgs[key] = Drupal.theme('placeholder', args[key]);
          break;
      }
    });

    return Drupal.stringReplace(str, processedArgs, null);
  };

  Drupal.stringReplace = function (str, args, keys) {
    if (str.length === 0) {
      return str;
    }

    if (!Array.isArray(keys)) {
      keys = Object.keys(args || {});

      keys.sort(function (a, b) {
        return a.length - b.length;
      });
    }

    if (keys.length === 0) {
      return str;
    }

    var key = keys.pop();
    var fragments = str.split(key);

    if (keys.length) {
      for (var i = 0; i < fragments.length; i++) {
        fragments[i] = Drupal.stringReplace(fragments[i], args, keys.slice(0));
      }
    }

    return fragments.join(args[key]);
  };

  Drupal.t = function (str, args, options) {
    options = options || {};
    options.context = options.context || '';

    if (typeof drupalTranslations !== 'undefined' && drupalTranslations.strings && drupalTranslations.strings[options.context] && drupalTranslations.strings[options.context][str]) {
      str = drupalTranslations.strings[options.context][str];
    }

    if (args) {
      str = Drupal.formatString(str, args);
    }
    return str;
  };

  Drupal.url = function (path) {
    return drupalSettings.path.baseUrl + drupalSettings.path.pathPrefix + path;
  };

  Drupal.url.toAbsolute = function (url) {
    var urlParsingNode = document.createElement('a');

    try {
      url = decodeURIComponent(url);
    } catch (e) {}

    urlParsingNode.setAttribute('href', url);

    return urlParsingNode.cloneNode(false).href;
  };

  Drupal.url.isLocal = function (url) {
    var absoluteUrl = Drupal.url.toAbsolute(url);
    var protocol = window.location.protocol;

    if (protocol === 'http:' && absoluteUrl.indexOf('https:') === 0) {
      protocol = 'https:';
    }
    var baseUrl = protocol + '//' + window.location.host + drupalSettings.path.baseUrl.slice(0, -1);

    try {
      absoluteUrl = decodeURIComponent(absoluteUrl);
    } catch (e) {}
    try {
      baseUrl = decodeURIComponent(baseUrl);
    } catch (e) {}

    return absoluteUrl === baseUrl || absoluteUrl.indexOf(baseUrl + '/') === 0;
  };

  Drupal.formatPlural = function (count, singular, plural, args, options) {
    args = args || {};
    args['@count'] = count;

    var pluralDelimiter = drupalSettings.pluralDelimiter;
    var translations = Drupal.t(singular + pluralDelimiter + plural, args, options).split(pluralDelimiter);
    var index = 0;

    if (typeof drupalTranslations !== 'undefined' && drupalTranslations.pluralFormula) {
      index = count in drupalTranslations.pluralFormula ? drupalTranslations.pluralFormula[count] : drupalTranslations.pluralFormula.default;
    } else if (args['@count'] !== 1) {
      index = 1;
    }

    return translations[index];
  };

  Drupal.encodePath = function (item) {
    return window.encodeURIComponent(item).replace(/%2F/g, '/');
  };

  Drupal.deprecationError = function (_ref) {
    var message = _ref.message;

    if (drupalSettings.suppressDeprecationErrors === false && typeof console !== 'undefined' && console.warn) {
      console.warn('[Deprecation] ' + message);
    }
  };

  Drupal.deprecatedProperty = function (_ref2) {
    var target = _ref2.target,
        deprecatedProperty = _ref2.deprecatedProperty,
        message = _ref2.message;

    if (!Proxy || !Reflect) {
      return target;
    }

    return new Proxy(target, {
      get: function get(target, key) {
        for (var _len = arguments.length, rest = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          rest[_key - 2] = arguments[_key];
        }

        if (key === deprecatedProperty) {
          Drupal.deprecationError({ message: message });
        }
        return Reflect.get.apply(Reflect, [target, key].concat(rest));
      }
    });
  };

  Drupal.theme = function (func) {
    if (func in Drupal.theme) {
      var _Drupal$theme;

      for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      return (_Drupal$theme = Drupal.theme)[func].apply(_Drupal$theme, args);
    }
  };

  Drupal.theme.placeholder = function (str) {
    return '<em class="placeholder">' + Drupal.checkPlain(str) + '</em>';
  };
})(Drupal, window.drupalSettings, window.drupalTranslations, window.console, window.Proxy, window.Reflect);;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

if (window.jQuery) {
  jQuery.noConflict();
}

document.documentElement.className += ' js';

(function (Drupal, drupalSettings) {
  var domReady = function domReady(callback) {
    if (document.readyState !== 'loading') {
      callback();
    } else {
      var listener = function listener() {
        callback();
        document.removeEventListener('DOMContentLoaded', listener);
      };
      document.addEventListener('DOMContentLoaded', listener);
    }
  };

  domReady(function () {
    Drupal.attachBehaviors(document, drupalSettings);
  });
})(Drupal, window.drupalSettings);;
(function ($, Drupal, drupalSettings) {
  'use strict';

  // Remove unread status.
  function removeUnreadStatus() {
    $('.order-item').click(function (event) {
      $(this).removeClass('unread');
    });
  }

  function openNotificationPopup() {
    $('.icon-notification-mb').click(function (event) {
      $('body').addClass('open-notification');
    });
  }

  // Show and hide mobile notification detail.
  function showHideNotificationItem() {
    //close header notification popup
    $('#notification-closebt').click(function (event) {
      $('body').removeClass('open-notification');
      $('#notification-tabs').show();
      $('.notifi-popup-mobile .tab-content').find('.tab-pane').removeClass('active in');
    });
    //show notification detail
    $('.notifi-popup-mobile .order-item').click(function (event) {
      $(this).parent().hide();
      $('.notifi-popup-mobile .title').addClass('active');
    });
    //hide notification detail
    $('.notifi-popup-mobile .title').click(function (event) {
      $('#notification-tabs').show();
      $(this).removeClass('active');
      $(this).siblings('.tab-content').find('.tab-pane').removeClass('active in');
    });
  }

  /* ----------------------------------------------- */
  /* ------------- FrontEnd Functions -------------- */
  /* ----------------------------------------------- */
  /**
   * START - ONLOAD - JS
   */
  Drupal.behaviors.iotHomepage = {
    attach: function (context, settings) {
      removeUnreadStatus();
      openNotificationPopup();
      showHideNotificationItem();
    },
  };
})(jQuery, Drupal, drupalSettings);
;
/**
 * @file
 * The Lazy-load behavior.
 */

(function (Drupal) {

  'use strict';

  Drupal.behaviors.lazy = {
    attach: function (context, settings) {
      var utils = {
        extend: function (obj, src) {
          Object.keys(src).forEach(function (key) {
            obj[key] = src[key];
          });
          return obj;
        },
        once: function (selector, context) {
          return (context || document).querySelector(selector);
        },
        loadScript: function (url) {
          if (document.querySelectorAll('script[src="' + url + '"]').length == 0) {
            var script = document.createElement('script'),
              scripts = document.getElementsByTagName('script')[0];
            script.src = url;
            script.async = true;
            scripts.parentNode.insertBefore(script, scripts);
          }
        }
      };

      if (utils.once('body', context)) {
        var lazysizes = settings.lazy.lazysizes || {};

        if (!settings.lazy.preferNative) {
          // 1. Lazysizes configuration.
          window.lazySizesConfig = window.lazySizesConfig || {};
          window.lazySizesConfig = utils.extend(window.lazySizesConfig, lazysizes);
          // 2. Load all selected lazysizes plugins.
          if (!Object.entries) {
            Object.entries = function (obj) {
              var ownProps = Object.keys(obj),
                i = ownProps.length,
                resArray = new Array(i);
              while (i--) {
                resArray[i] = [ownProps[i], obj[ownProps[i]]];
              }
              return resArray;
            };
          }
          var min = settings.lazy.minified ? '.min' : '';
          Object.entries(lazysizes.plugins).forEach(function (path) {
            utils.loadScript(settings.lazy.libraryPath + '/plugins/' + path[1] + min + '.js');
          });
          // 3. Load the lazysizes library.
          utils.loadScript(settings.lazy.libraryPath + '/lazysizes' + min + '.js');
        }
      }
    }
  };

})(Drupal);
;
/**
 * @file
 * Drupal Bootstrap object.
 */

/**
 * All Drupal Bootstrap JavaScript APIs are contained in this namespace.
 *
 * @param {underscore} _
 * @param {jQuery} $
 * @param {Drupal} Drupal
 * @param {drupalSettings} drupalSettings
 */
(function (_, $, Drupal, drupalSettings) {
  'use strict';

  /**
   * @typedef Drupal.bootstrap
   */
  var Bootstrap = {
    processedOnce: {},
    settings: drupalSettings.bootstrap || {}
  };

  /**
   * Wraps Drupal.checkPlain() to ensure value passed isn't empty.
   *
   * Encodes special characters in a plain-text string for display as HTML.
   *
   * @param {string} str
   *   The string to be encoded.
   *
   * @return {string}
   *   The encoded string.
   *
   * @ingroup sanitization
   */
  Bootstrap.checkPlain = function (str) {
    return str && Drupal.checkPlain(str) || '';
  };

  /**
   * Creates a jQuery plugin.
   *
   * @param {String} id
   *   A jQuery plugin identifier located in $.fn.
   * @param {Function} plugin
   *   A constructor function used to initialize the for the jQuery plugin.
   * @param {Boolean} [noConflict]
   *   Flag indicating whether or not to create a ".noConflict()" helper method
   *   for the plugin.
   */
  Bootstrap.createPlugin = function (id, plugin, noConflict) {
    // Immediately return if plugin doesn't exist.
    if ($.fn[id] !== void 0) {
      return this.fatal('Specified jQuery plugin identifier already exists: @id. Use Drupal.bootstrap.replacePlugin() instead.', {'@id': id});
    }

    // Immediately return if plugin isn't a function.
    if (typeof plugin !== 'function') {
      return this.fatal('You must provide a constructor function to create a jQuery plugin "@id": @plugin', {'@id': id, '@plugin':  plugin});
    }

    // Add a ".noConflict()" helper method.
    this.pluginNoConflict(id, plugin, noConflict);

    $.fn[id] = plugin;
  };

  /**
   * Diff object properties.
   *
   * @param {...Object} objects
   *   Two or more objects. The first object will be used to return properties
   *   values.
   *
   * @return {Object}
   *   Returns the properties of the first passed object that are not present
   *   in all other passed objects.
   */
  Bootstrap.diffObjects = function (objects) {
    var args = Array.prototype.slice.call(arguments);
    return _.pick(args[0], _.difference.apply(_, _.map(args, function (obj) {
      return Object.keys(obj);
    })));
  };

  /**
   * Map of supported events by regular expression.
   *
   * @type {Object<Event|MouseEvent|KeyboardEvent|TouchEvent,RegExp>}
   */
  Bootstrap.eventMap = {
    Event: /^(?:load|unload|abort|error|select|change|submit|reset|focus|blur|resize|scroll)$/,
    MouseEvent: /^(?:click|dblclick|mouse(?:down|enter|leave|up|over|move|out))$/,
    KeyboardEvent: /^(?:key(?:down|press|up))$/,
    TouchEvent: /^(?:touch(?:start|end|move|cancel))$/
  };

  /**
   * Extends a jQuery Plugin.
   *
   * @param {String} id
   *   A jQuery plugin identifier located in $.fn.
   * @param {Function} callback
   *   A constructor function used to initialize the for the jQuery plugin.
   *
   * @return {Function|Boolean}
   *   The jQuery plugin constructor or FALSE if the plugin does not exist.
   */
  Bootstrap.extendPlugin = function (id, callback) {
    // Immediately return if plugin doesn't exist.
    if (typeof $.fn[id] !== 'function') {
      return this.fatal('Specified jQuery plugin identifier does not exist: @id', {'@id':  id});
    }

    // Immediately return if callback isn't a function.
    if (typeof callback !== 'function') {
      return this.fatal('You must provide a callback function to extend the jQuery plugin "@id": @callback', {'@id': id, '@callback':  callback});
    }

    // Determine existing plugin constructor.
    var constructor = $.fn[id] && $.fn[id].Constructor || $.fn[id];
    var plugin = callback.apply(constructor, [this.settings]);
    if (!$.isPlainObject(plugin)) {
      return this.fatal('Returned value from callback is not a plain object that can be used to extend the jQuery plugin "@id": @obj', {'@obj':  plugin});
    }

    this.wrapPluginConstructor(constructor, plugin, true);

    return $.fn[id];
  };

  Bootstrap.superWrapper = function (parent, fn) {
    return function () {
      var previousSuper = this.super;
      this.super = parent;
      var ret = fn.apply(this, arguments);
      if (previousSuper) {
        this.super = previousSuper;
      }
      else {
        delete this.super;
      }
      return ret;
    };
  };

  /**
   * Provide a helper method for displaying when something is went wrong.
   *
   * @param {String} message
   *   The message to display.
   * @param {Object} [args]
   *   An arguments to use in message.
   *
   * @return {Boolean}
   *   Always returns FALSE.
   */
  Bootstrap.fatal = function (message, args) {
    if (this.settings.dev && console.warn) {
      for (var name in args) {
        if (args.hasOwnProperty(name) && typeof args[name] === 'object') {
          args[name] = JSON.stringify(args[name]);
        }
      }
      Drupal.throwError(new Error(Drupal.formatString(message, args)));
    }
    return false;
  };

  /**
   * Intersects object properties.
   *
   * @param {...Object} objects
   *   Two or more objects. The first object will be used to return properties
   *   values.
   *
   * @return {Object}
   *   Returns the properties of first passed object that intersects with all
   *   other passed objects.
   */
  Bootstrap.intersectObjects = function (objects) {
    var args = Array.prototype.slice.call(arguments);
    return _.pick(args[0], _.intersection.apply(_, _.map(args, function (obj) {
      return Object.keys(obj);
    })));
  };

  /**
   * Normalizes an object's values.
   *
   * @param {Object} obj
   *   The object to normalize.
   *
   * @return {Object}
   *   The normalized object.
   */
  Bootstrap.normalizeObject = function (obj) {
    if (!$.isPlainObject(obj)) {
      return obj;
    }

    for (var k in obj) {
      if (typeof obj[k] === 'string') {
        if (obj[k] === 'true') {
          obj[k] = true;
        }
        else if (obj[k] === 'false') {
          obj[k] = false;
        }
        else if (obj[k].match(/^[\d-.]$/)) {
          obj[k] = parseFloat(obj[k]);
        }
      }
      else if ($.isPlainObject(obj[k])) {
        obj[k] = Bootstrap.normalizeObject(obj[k]);
      }
    }

    return obj;
  };

  /**
   * An object based once plugin (similar to jquery.once, but without the DOM).
   *
   * @param {String} id
   *   A unique identifier.
   * @param {Function} callback
   *   The callback to invoke if the identifier has not yet been seen.
   *
   * @return {Bootstrap}
   */
  Bootstrap.once = function (id, callback) {
    // Immediately return if identifier has already been processed.
    if (this.processedOnce[id]) {
      return this;
    }
    callback.call(this, this.settings);
    this.processedOnce[id] = true;
    return this;
  };

  /**
   * Provide jQuery UI like ability to get/set options for Bootstrap plugins.
   *
   * @param {string|object} key
   *   A string value of the option to set, can be dot like to a nested key.
   *   An object of key/value pairs.
   * @param {*} [value]
   *   (optional) A value to set for key.
   *
   * @returns {*}
   *   - Returns nothing if key is an object or both key and value parameters
   *   were provided to set an option.
   *   - Returns the a value for a specific setting if key was provided.
   *   - Returns an object of key/value pairs of all the options if no key or
   *   value parameter was provided.
   *
   * @see https://github.com/jquery/jquery-ui/blob/master/ui/widget.js
   */
  Bootstrap.option = function (key, value) {
    var options = $.isPlainObject(key) ? $.extend({}, key) : {};

    // Get all options (clone so it doesn't reference the internal object).
    if (arguments.length === 0) {
      return $.extend({}, this.options);
    }

    // Get/set single option.
    if (typeof key === "string") {
      // Handle nested keys in dot notation.
      // e.g., "foo.bar" => { foo: { bar: true } }
      var parts = key.split('.');
      key = parts.shift();
      var obj = options;
      if (parts.length) {
        for (var i = 0; i < parts.length - 1; i++) {
          obj[parts[i]] = obj[parts[i]] || {};
          obj = obj[parts[i]];
        }
        key = parts.pop();
      }

      // Get.
      if (arguments.length === 1) {
        return obj[key] === void 0 ? null : obj[key];
      }

      // Set.
      obj[key] = value;
    }

    // Set multiple options.
    $.extend(true, this.options, options);
  };

  /**
   * Adds a ".noConflict()" helper method if needed.
   *
   * @param {String} id
   *   A jQuery plugin identifier located in $.fn.
   * @param {Function} plugin
   * @param {Function} plugin
   *   A constructor function used to initialize the for the jQuery plugin.
   * @param {Boolean} [noConflict]
   *   Flag indicating whether or not to create a ".noConflict()" helper method
   *   for the plugin.
   */
  Bootstrap.pluginNoConflict = function (id, plugin, noConflict) {
    if (plugin.noConflict === void 0 && (noConflict === void 0 || noConflict)) {
      var old = $.fn[id];
      plugin.noConflict = function () {
        $.fn[id] = old;
        return this;
      };
    }
  };

  /**
   * Creates a handler that relays to another event name.
   *
   * @param {HTMLElement|jQuery} target
   *   A target element.
   * @param {String} name
   *   The name of the event to trigger.
   * @param {Boolean} [stopPropagation=true]
   *   Flag indicating whether to stop the propagation of the event, defaults
   *   to true.
   *
   * @return {Function}
   *   An even handler callback function.
   */
  Bootstrap.relayEvent = function (target, name, stopPropagation) {
    return function (e) {
      if (stopPropagation === void 0 || stopPropagation) {
        e.stopPropagation();
      }
      var $target = $(target);
      var parts = name.split('.').filter(Boolean);
      var type = parts.shift();
      e.target = $target[0];
      e.currentTarget = $target[0];
      e.namespace = parts.join('.');
      e.type = type;
      $target.trigger(e);
    };
  };

  /**
   * Replaces a Bootstrap jQuery plugin definition.
   *
   * @param {String} id
   *   A jQuery plugin identifier located in $.fn.
   * @param {Function} callback
   *   A callback function that is immediately invoked and must return a
   *   function that will be used as the plugin constructor.
   * @param {Boolean} [noConflict]
   *   Flag indicating whether or not to create a ".noConflict()" helper method
   *   for the plugin.
   */
  Bootstrap.replacePlugin = function (id, callback, noConflict) {
    // Immediately return if plugin doesn't exist.
    if (typeof $.fn[id] !== 'function') {
      return this.fatal('Specified jQuery plugin identifier does not exist: @id', {'@id':  id});
    }

    // Immediately return if callback isn't a function.
    if (typeof callback !== 'function') {
      return this.fatal('You must provide a valid callback function to replace a jQuery plugin: @callback', {'@callback': callback});
    }

    // Determine existing plugin constructor.
    var constructor = $.fn[id] && $.fn[id].Constructor || $.fn[id];
    var plugin = callback.apply(constructor, [this.settings]);

    // Immediately return if plugin isn't a function.
    if (typeof plugin !== 'function') {
      return this.fatal('Returned value from callback is not a usable function to replace a jQuery plugin "@id": @plugin', {'@id': id, '@plugin': plugin});
    }

    this.wrapPluginConstructor(constructor, plugin);

    // Add a ".noConflict()" helper method.
    this.pluginNoConflict(id, plugin, noConflict);

    $.fn[id] = plugin;
  };

  /**
   * Simulates a native event on an element in the browser.
   *
   * Note: This is a fairly complete modern implementation. If things aren't
   * working quite the way you intend (in older browsers), you may wish to use
   * the jQuery.simulate plugin. If it's available, this method will defer to
   * that plugin.
   *
   * @see https://github.com/jquery/jquery-simulate
   *
   * @param {HTMLElement|jQuery} element
   *   A DOM element to dispatch event on. Note: this may be a jQuery object,
   *   however be aware that this will trigger the same event for each element
   *   inside the jQuery collection; use with caution.
   * @param {String|String[]} type
   *   The type(s) of event to simulate.
   * @param {Object} [options]
   *   An object of options to pass to the event constructor. Typically, if
   *   an event is being proxied, you should just pass the original event
   *   object here. This allows, if the browser supports it, to be a truly
   *   simulated event.
   *
   * @return {Boolean}
   *   The return value is false if event is cancelable and at least one of the
   *   event handlers which handled this event called Event.preventDefault().
   *   Otherwise it returns true.
   */
  Bootstrap.simulate = function (element, type, options) {
    // Handle jQuery object wrappers so it triggers on each element.
    var ret = true;
    if (element instanceof $) {
      element.each(function () {
        if (!Bootstrap.simulate(this, type, options)) {
          ret = false;
        }
      });
      return ret;
    }

    if (!(element instanceof HTMLElement)) {
      this.fatal('Passed element must be an instance of HTMLElement, got "@type" instead.', {
        '@type': typeof element,
      });
    }

    // Defer to the jQuery.simulate plugin, if it's available.
    if (typeof $.simulate === 'function') {
      new $.simulate(element, type, options);
      return true;
    }

    var event;
    var ctor;
    var types = [].concat(type);
    for (var i = 0, l = types.length; i < l; i++) {
      type = types[i];
      for (var name in this.eventMap) {
        if (this.eventMap[name].test(type)) {
          ctor = name;
          break;
        }
      }
      if (!ctor) {
        throw new SyntaxError('Only rudimentary HTMLEvents, KeyboardEvents and MouseEvents are supported: ' + type);
      }
      var opts = {bubbles: true, cancelable: true};
      if (ctor === 'KeyboardEvent' || ctor === 'MouseEvent') {
        $.extend(opts, {ctrlKey: !1, altKey: !1, shiftKey: !1, metaKey: !1});
      }
      if (ctor === 'MouseEvent') {
        $.extend(opts, {button: 0, pointerX: 0, pointerY: 0, view: window});
      }
      if (options) {
        $.extend(opts, options);
      }
      if (typeof window[ctor] === 'function') {
        event = new window[ctor](type, opts);
        if (!element.dispatchEvent(event)) {
          ret = false;
        }
      }
      else if (document.createEvent) {
        event = document.createEvent(ctor);
        event.initEvent(type, opts.bubbles, opts.cancelable);
        if (!element.dispatchEvent(event)) {
          ret = false;
        }
      }
      else if (typeof element.fireEvent === 'function') {
        event = $.extend(document.createEventObject(), opts);
        if (!element.fireEvent('on' + type, event)) {
          ret = false;
        }
      }
      else if (typeof element[type]) {
        element[type]();
      }
    }
    return ret;
  };

  /**
   * Strips HTML and returns just text.
   *
   * @param {String|Element|jQuery} html
   *   A string of HTML content, an Element DOM object or a jQuery object.
   *
   * @return {String}
   *   The text without HTML tags.
   *
   * @todo Replace with http://locutus.io/php/strings/strip_tags/
   */
  Bootstrap.stripHtml = function (html) {
    if (html instanceof $) {
      html = html.html();
    }
    else if (html instanceof Element) {
      html = html.innerHTML;
    }
    var tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').replace(/^[\s\n\t]*|[\s\n\t]*$/, '');
  };

  /**
   * Provide a helper method for displaying when something is unsupported.
   *
   * @param {String} type
   *   The type of unsupported object, e.g. method or option.
   * @param {String} name
   *   The name of the unsupported object.
   * @param {*} [value]
   *   The value of the unsupported object.
   */
  Bootstrap.unsupported = function (type, name, value) {
    Bootstrap.warn('Unsupported by Drupal Bootstrap: (@type) @name -> @value', {
      '@type': type,
      '@name': name,
      '@value': typeof value === 'object' ? JSON.stringify(value) : value
    });
  };

  /**
   * Provide a helper method to display a warning.
   *
   * @param {String} message
   *   The message to display.
   * @param {Object} [args]
   *   Arguments to use as replacements in Drupal.formatString.
   */
  Bootstrap.warn = function (message, args) {
    if (this.settings.dev && console.warn) {
      console.warn(Drupal.formatString(message, args));
    }
  };

  /**
   * Wraps a plugin with common functionality.
   *
   * @param {Function} constructor
   *   A plugin constructor being wrapped.
   * @param {Object|Function} plugin
   *   The plugin being wrapped.
   * @param {Boolean} [extend = false]
   *   Whether to add super extensibility.
   */
  Bootstrap.wrapPluginConstructor = function (constructor, plugin, extend) {
    var proto = constructor.prototype;

    // Add a jQuery UI like option getter/setter method.
    var option = this.option;
    if (proto.option === void(0)) {
      proto.option = function () {
        return option.apply(this, arguments);
      };
    }

    if (extend) {
      // Handle prototype properties separately.
      if (plugin.prototype !== void 0) {
        for (var key in plugin.prototype) {
          if (!plugin.prototype.hasOwnProperty(key)) continue;
          var value = plugin.prototype[key];
          if (typeof value === 'function') {
            proto[key] = this.superWrapper(proto[key] || function () {}, value);
          }
          else {
            proto[key] = $.isPlainObject(value) ? $.extend(true, {}, proto[key], value) : value;
          }
        }
      }
      delete plugin.prototype;

      // Handle static properties.
      for (key in plugin) {
        if (!plugin.hasOwnProperty(key)) continue;
        value = plugin[key];
        if (typeof value === 'function') {
          constructor[key] = this.superWrapper(constructor[key] || function () {}, value);
        }
        else {
          constructor[key] = $.isPlainObject(value) ? $.extend(true, {}, constructor[key], value) : value;
        }
      }
    }
  };

  // Add Bootstrap to the global Drupal object.
  Drupal.bootstrap = Drupal.bootstrap || Bootstrap;

})(window._, window.jQuery, window.Drupal, window.drupalSettings);
;
(function ($, _) {

  /**
   * @class Attributes
   *
   * Modifies attributes.
   *
   * @param {Object|Attributes} attributes
   *   An object to initialize attributes with.
   */
  var Attributes = function (attributes) {
    this.data = {};
    this.data['class'] = [];
    this.merge(attributes);
  };

  /**
   * Renders the attributes object as a string to inject into an HTML element.
   *
   * @return {String}
   *   A rendered string suitable for inclusion in HTML markup.
   */
  Attributes.prototype.toString = function () {
    var output = '';
    var name, value;
    var checkPlain = function (str) {
      return str && str.toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') || '';
    };
    var data = this.getData();
    for (name in data) {
      if (!data.hasOwnProperty(name)) continue;
      value = data[name];
      if (_.isFunction(value)) value = value();
      if (_.isObject(value)) value = _.values(value);
      if (_.isArray(value)) value = value.join(' ');
      output += ' ' + checkPlain(name) + '="' + checkPlain(value) + '"';
    }
    return output;
  };

  /**
   * Renders the Attributes object as a plain object.
   *
   * @return {Object}
   *   A plain object suitable for inclusion in DOM elements.
   */
  Attributes.prototype.toPlainObject = function () {
    var object = {};
    var name, value;
    var data = this.getData();
    for (name in data) {
      if (!data.hasOwnProperty(name)) continue;
      value = data[name];
      if (_.isFunction(value)) value = value();
      if (_.isObject(value)) value = _.values(value);
      if (_.isArray(value)) value = value.join(' ');
      object[name] = value;
    }
    return object;
  };

  /**
   * Add class(es) to the array.
   *
   * @param {string|Array} value
   *   An individual class or an array of classes to add.
   *
   * @return {Attributes}
   *
   * @chainable
   */
  Attributes.prototype.addClass = function (value) {
    var args = Array.prototype.slice.call(arguments);
    this.data['class'] = this.sanitizeClasses(this.data['class'].concat(args));
    return this;
  };

  /**
   * Returns whether the requested attribute exists.
   *
   * @param {string} name
   *   An attribute name to check.
   *
   * @return {boolean}
   *   TRUE or FALSE
   */
  Attributes.prototype.exists = function (name) {
    return this.data[name] !== void(0) && this.data[name] !== null;
  };

  /**
   * Retrieve a specific attribute from the array.
   *
   * @param {string} name
   *   The specific attribute to retrieve.
   * @param {*} defaultValue
   *   (optional) The default value to set if the attribute does not exist.
   *
   * @return {*}
   *   A specific attribute value, passed by reference.
   */
  Attributes.prototype.get = function (name, defaultValue) {
    if (!this.exists(name)) this.data[name] = defaultValue;
    return this.data[name];
  };

  /**
   * Retrieves a cloned copy of the internal attributes data object.
   *
   * @return {Object}
   */
  Attributes.prototype.getData = function () {
    return _.extend({}, this.data);
  };

  /**
   * Retrieves classes from the array.
   *
   * @return {Array}
   *   The classes array.
   */
  Attributes.prototype.getClasses = function () {
    return this.get('class', []);
  };

  /**
   * Indicates whether a class is present in the array.
   *
   * @param {string|Array} className
   *   The class(es) to search for.
   *
   * @return {boolean}
   *   TRUE or FALSE
   */
  Attributes.prototype.hasClass = function (className) {
    className = this.sanitizeClasses(Array.prototype.slice.call(arguments));
    var classes = this.getClasses();
    for (var i = 0, l = className.length; i < l; i++) {
      // If one of the classes fails, immediately return false.
      if (_.indexOf(classes, className[i]) === -1) {
        return false;
      }
    }
    return true;
  };

  /**
   * Merges multiple values into the array.
   *
   * @param {Attributes|Node|jQuery|Object} object
   *   An Attributes object with existing data, a Node DOM element, a jQuery
   *   instance or a plain object where the key is the attribute name and the
   *   value is the attribute value.
   * @param {boolean} [recursive]
   *   Flag determining whether or not to recursively merge key/value pairs.
   *
   * @return {Attributes}
   *
   * @chainable
   */
  Attributes.prototype.merge = function (object, recursive) {
    // Immediately return if there is nothing to merge.
    if (!object) {
      return this;
    }

    // Get attributes from a jQuery element.
    if (object instanceof $) {
      object = object[0];
    }

    // Get attributes from a DOM element.
    if (object instanceof Node) {
      object = Array.prototype.slice.call(object.attributes).reduce(function (attributes, attribute) {
        attributes[attribute.name] = attribute.value;
        return attributes;
      }, {});
    }
    // Get attributes from an Attributes instance.
    else if (object instanceof Attributes) {
      object = object.getData();
    }
    // Otherwise, clone the object.
    else {
      object = _.extend({}, object);
    }

    // By this point, there should be a valid plain object.
    if (!$.isPlainObject(object)) {
      setTimeout(function () {
        throw new Error('Passed object is not supported: ' + object);
      });
      return this;
    }

    // Handle classes separately.
    if (object && object['class'] !== void 0) {
      this.addClass(object['class']);
      delete object['class'];
    }

    if (recursive === void 0 || recursive) {
      this.data = $.extend(true, {}, this.data, object);
    }
    else {
      this.data = $.extend({}, this.data, object);
    }

    return this;
  };

  /**
   * Removes an attribute from the array.
   *
   * @param {string} name
   *   The name of the attribute to remove.
   *
   * @return {Attributes}
   *
   * @chainable
   */
  Attributes.prototype.remove = function (name) {
    if (this.exists(name)) delete this.data[name];
    return this;
  };

  /**
   * Removes a class from the attributes array.
   *
   * @param {...string|Array} className
   *   An individual class or an array of classes to remove.
   *
   * @return {Attributes}
   *
   * @chainable
   */
  Attributes.prototype.removeClass = function (className) {
    var remove = this.sanitizeClasses(Array.prototype.slice.apply(arguments));
    this.data['class'] = _.without(this.getClasses(), remove);
    return this;
  };

  /**
   * Replaces a class in the attributes array.
   *
   * @param {string} oldValue
   *   The old class to remove.
   * @param {string} newValue
   *   The new class. It will not be added if the old class does not exist.
   *
   * @return {Attributes}
   *
   * @chainable
   */
  Attributes.prototype.replaceClass = function (oldValue, newValue) {
    var classes = this.getClasses();
    var i = _.indexOf(this.sanitizeClasses(oldValue), classes);
    if (i >= 0) {
      classes[i] = newValue;
      this.set('class', classes);
    }
    return this;
  };

  /**
   * Ensures classes are flattened into a single is an array and sanitized.
   *
   * @param {...String|Array} classes
   *   The class or classes to sanitize.
   *
   * @return {Array}
   *   A sanitized array of classes.
   */
  Attributes.prototype.sanitizeClasses = function (classes) {
    return _.chain(Array.prototype.slice.call(arguments))
      // Flatten in case there's a mix of strings and arrays.
      .flatten()

      // Split classes that may have been added with a space as a separator.
      .map(function (string) {
        return string.split(' ');
      })

      // Flatten again since it was just split into arrays.
      .flatten()

      // Filter out empty items.
      .filter()

      // Clean the class to ensure it's a valid class name.
      .map(function (value) {
        return Attributes.cleanClass(value);
      })

      // Ensure classes are unique.
      .uniq()

      // Retrieve the final value.
      .value();
  };

  /**
   * Sets an attribute on the array.
   *
   * @param {string} name
   *   The name of the attribute to set.
   * @param {*} value
   *   The value of the attribute to set.
   *
   * @return {Attributes}
   *
   * @chainable
   */
  Attributes.prototype.set = function (name, value) {
    var obj = $.isPlainObject(name) ? name : {};
    if (typeof name === 'string') {
      obj[name] = value;
    }
    return this.merge(obj);
  };

  /**
   * Prepares a string for use as a CSS identifier (element, class, or ID name).
   *
   * Note: this is essentially a direct copy from
   * \Drupal\Component\Utility\Html::cleanCssIdentifier
   *
   * @param {string} identifier
   *   The identifier to clean.
   * @param {Object} [filter]
   *   An object of string replacements to use on the identifier.
   *
   * @return {string}
   *   The cleaned identifier.
   */
  Attributes.cleanClass = function (identifier, filter) {
    filter = filter || {
      ' ': '-',
      '_': '-',
      '/': '-',
      '[': '-',
      ']': ''
    };

    identifier = identifier.toLowerCase();

    if (filter['__'] === void 0) {
      identifier = identifier.replace('__', '#DOUBLE_UNDERSCORE#');
    }

    identifier = identifier.replace(Object.keys(filter), Object.keys(filter).map(function(key) { return filter[key]; }));

    if (filter['__'] === void 0) {
      identifier = identifier.replace('#DOUBLE_UNDERSCORE#', '__');
    }

    identifier = identifier.replace(/[^\u002D\u0030-\u0039\u0041-\u005A\u005F\u0061-\u007A\u00A1-\uFFFF]/g, '');
    identifier = identifier.replace(['/^[0-9]/', '/^(-[0-9])|^(--)/'], ['_', '__']);

    return identifier;
  };

  /**
   * Creates an Attributes instance.
   *
   * @param {object|Attributes} [attributes]
   *   An object to initialize attributes with.
   *
   * @return {Attributes}
   *   An Attributes instance.
   *
   * @constructor
   */
  Attributes.create = function (attributes) {
    return new Attributes(attributes);
  };

  window.Attributes = Attributes;

})(window.jQuery, window._);
;
/**
 * @file
 * Theme hooks for the Drupal Bootstrap base theme.
 */
(function ($, Drupal, Bootstrap, Attributes) {

  /**
   * Fallback for theming an icon if the Icon API module is not installed.
   */
  if (!Drupal.icon) Drupal.icon = { bundles: {} };
  if (!Drupal.theme.icon || Drupal.theme.prototype.icon) {
    $.extend(Drupal.theme, /** @lends Drupal.theme */ {
      /**
       * Renders an icon.
       *
       * @param {string} bundle
       *   The bundle which the icon belongs to.
       * @param {string} icon
       *   The name of the icon to render.
       * @param {object|Attributes} [attributes]
       *   An object of attributes to also apply to the icon.
       *
       * @returns {string}
       */
      icon: function (bundle, icon, attributes) {
        if (!Drupal.icon.bundles[bundle]) return '';
        attributes = Attributes.create(attributes).addClass('icon').set('aria-hidden', 'true');
        icon = Drupal.icon.bundles[bundle](icon, attributes);
        return '<span' + attributes + '></span>';
      }
    });
  }

  /**
   * Callback for modifying an icon in the "bootstrap" icon bundle.
   *
   * @param {string} icon
   *   The icon being rendered.
   * @param {Attributes} attributes
   *   Attributes object for the icon.
   */
  Drupal.icon.bundles.bootstrap = function (icon, attributes) {
    attributes.addClass(['glyphicon', 'glyphicon-' + icon]);
  };

  /**
   * Add necessary theming hooks.
   */
  $.extend(Drupal.theme, /** @lends Drupal.theme */ {

    /**
     * Renders a Bootstrap AJAX glyphicon throbber.
     *
     * @returns {string}
     */
    ajaxThrobber: function () {
      return Drupal.theme('bootstrapIcon', 'refresh', {'class': ['ajax-throbber', 'glyphicon-spin'] });
    },

    /**
     * Renders a button element.
     *
     * @param {object|Attributes} attributes
     *   An object of attributes to apply to the button. If it contains one of:
     *   - value: The label of the button.
     *   - context: The context type of Bootstrap button, can be one of:
     *     - default
     *     - primary
     *     - success
     *     - info
     *     - warning
     *     - danger
     *     - link
     *
     * @returns {string}
     */
    button: function (attributes) {
      attributes = Attributes.create(attributes).addClass('btn');
      var context = attributes.get('context', 'default');
      var label = attributes.get('value', '');
      attributes.remove('context').remove('value');
      if (!attributes.hasClass(['btn-default', 'btn-primary', 'btn-success', 'btn-info', 'btn-warning', 'btn-danger', 'btn-link'])) {
        attributes.addClass('btn-' + Bootstrap.checkPlain(context));
      }

      // Attempt to, intelligently, provide a default button "type".
      if (!attributes.exists('type')) {
        attributes.set('type', attributes.hasClass('form-submit') ? 'submit' : 'button');
      }

      return '<button' + attributes + '>' + label + '</button>';
    },

    /**
     * Alias for "button" theme hook.
     *
     * @param {object|Attributes} attributes
     *   An object of attributes to apply to the button.
     *
     * @see Drupal.theme.button()
     *
     * @returns {string}
     */
    btn: function (attributes) {
      return Drupal.theme('button', attributes);
    },

    /**
     * Renders a button block element.
     *
     * @param {object|Attributes} attributes
     *   An object of attributes to apply to the button.
     *
     * @see Drupal.theme.button()
     *
     * @returns {string}
     */
    'btn-block': function (attributes) {
      return Drupal.theme('button', Attributes.create(attributes).addClass('btn-block'));
    },

    /**
     * Renders a large button element.
     *
     * @param {object|Attributes} attributes
     *   An object of attributes to apply to the button.
     *
     * @see Drupal.theme.button()
     *
     * @returns {string}
     */
    'btn-lg': function (attributes) {
      return Drupal.theme('button', Attributes.create(attributes).addClass('btn-lg'));
    },

    /**
     * Renders a small button element.
     *
     * @param {object|Attributes} attributes
     *   An object of attributes to apply to the button.
     *
     * @see Drupal.theme.button()
     *
     * @returns {string}
     */
    'btn-sm': function (attributes) {
      return Drupal.theme('button', Attributes.create(attributes).addClass('btn-sm'));
    },

    /**
     * Renders an extra small button element.
     *
     * @param {object|Attributes} attributes
     *   An object of attributes to apply to the button.
     *
     * @see Drupal.theme.button()
     *
     * @returns {string}
     */
    'btn-xs': function (attributes) {
      return Drupal.theme('button', Attributes.create(attributes).addClass('btn-xs'));
    },

    /**
     * Renders a glyphicon.
     *
     * @param {string} name
     *   The name of the glyphicon.
     * @param {object|Attributes} [attributes]
     *   An object of attributes to apply to the icon.
     *
     * @returns {string}
     */
    bootstrapIcon: function (name, attributes) {
      return Drupal.theme('icon', 'bootstrap', name, attributes);
    }

  });

})(window.jQuery, window.Drupal, window.Drupal.bootstrap, window.Attributes);
;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(function ($, Drupal) {
  Drupal.theme.progressBar = function (id) {
    return '<div id="' + id + '" class="progress" aria-live="polite">' + '<div class="progress__label">&nbsp;</div>' + '<div class="progress__track"><div class="progress__bar"></div></div>' + '<div class="progress__percentage"></div>' + '<div class="progress__description">&nbsp;</div>' + '</div>';
  };

  Drupal.ProgressBar = function (id, updateCallback, method, errorCallback) {
    this.id = id;
    this.method = method || 'GET';
    this.updateCallback = updateCallback;
    this.errorCallback = errorCallback;

    this.element = $(Drupal.theme('progressBar', id));
  };

  $.extend(Drupal.ProgressBar.prototype, {
    setProgress: function setProgress(percentage, message, label) {
      if (percentage >= 0 && percentage <= 100) {
        $(this.element).find('div.progress__bar').css('width', percentage + '%');
        $(this.element).find('div.progress__percentage').html(percentage + '%');
      }
      $('div.progress__description', this.element).html(message);
      $('div.progress__label', this.element).html(label);
      if (this.updateCallback) {
        this.updateCallback(percentage, message, this);
      }
    },
    startMonitoring: function startMonitoring(uri, delay) {
      this.delay = delay;
      this.uri = uri;
      this.sendPing();
    },
    stopMonitoring: function stopMonitoring() {
      clearTimeout(this.timer);

      this.uri = null;
    },
    sendPing: function sendPing() {
      if (this.timer) {
        clearTimeout(this.timer);
      }
      if (this.uri) {
        var pb = this;

        var uri = this.uri;
        if (uri.indexOf('?') === -1) {
          uri += '?';
        } else {
          uri += '&';
        }
        uri += '_format=json';
        $.ajax({
          type: this.method,
          url: uri,
          data: '',
          dataType: 'json',
          success: function success(progress) {
            if (progress.status === 0) {
              pb.displayError(progress.data);
              return;
            }

            pb.setProgress(progress.percentage, progress.message, progress.label);

            pb.timer = setTimeout(function () {
              pb.sendPing();
            }, pb.delay);
          },
          error: function error(xmlhttp) {
            var e = new Drupal.AjaxError(xmlhttp, pb.uri);
            pb.displayError('<pre>' + e.message + '</pre>');
          }
        });
      }
    },
    displayError: function displayError(string) {
      var error = $('<div class="messages messages--error"></div>').html(string);
      $(this.element).before(error).hide();

      if (this.errorCallback) {
        this.errorCallback(this);
      }
    }
  });
})(jQuery, Drupal);;
/**
 * @file
 * Extends methods from core/misc/progress.js.
 */

(function ($, Drupal) {

  'use strict';

  /**
   * Theme function for the progress bar.
   *
   * @param {string} id
   *
   * @return {string}
   *   The HTML for the progress bar.
   */
  Drupal.theme.progressBar = function (id) {
    return '<div class="progress-wrapper" aria-live="polite">' +
             '<div class="message"></div>'+
             '<div id ="' + id + '" class="progress progress-striped active">' +
               '<div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
                 '<span class="percentage"></span>' +
               '</div>' +
             '</div>' +
             '<div class="progress-label"></div>' +
           '</div>';
  };

  $.extend(Drupal.ProgressBar.prototype, /** @lends Drupal.ProgressBar */{

    /**
     * Set the percentage and status message for the progressbar.
     *
     * @param {number} percentage
     * @param {string} message
     * @param {string} label
     */
    setProgress: function (percentage, message, label) {
      if (percentage >= 0 && percentage <= 100) {
        $(this.element).find('.progress-bar').css('width', percentage + '%').attr('aria-valuenow', percentage);
        $(this.element).find('.percentage').html(percentage + '%');
      }
      if (message) {
        // Remove the unnecessary whitespace at the end of the message.
        message = message.replace(/<br\/>&nbsp;|\s*$/, '');

        $('.message', this.element).html(message);
      }
      if (label) {
        $('.progress-label', this.element).html(label);
      }
      if (this.updateCallback) {
        this.updateCallback(percentage, message, this);
      }
    },

    /**
     * Display errors on the page.
     *
     * @param {string} string
     */
    displayError: function (string) {
      var error = $('<div class="alert alert-block alert-error"><button class="close" data-dismiss="alert">&times;</button><h4>' + Drupal.t('Error message') + '</h4></div>').append(string);
      $(this.element).before(error).hide();

      if (this.errorCallback) {
        this.errorCallback(this);
      }
    }
  });

})(jQuery, Drupal);
;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(function (Drupal) {
  Drupal.behaviors.responsiveImageAJAX = {
    attach: function attach() {
      if (window.picturefill) {
        window.picturefill();
      }
    }
  };
})(Drupal);;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/
function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

(function ($, window, Drupal, drupalSettings) {
  Drupal.behaviors.AJAX = {
    attach: function attach(context, settings) {
      function loadAjaxBehavior(base) {
        var elementSettings = settings.ajax[base];
        if (typeof elementSettings.selector === 'undefined') {
          elementSettings.selector = '#' + base;
        }
        $(elementSettings.selector).once('drupal-ajax').each(function () {
          elementSettings.element = this;
          elementSettings.base = base;
          Drupal.ajax(elementSettings);
        });
      }

      Object.keys(settings.ajax || {}).forEach(function (base) {
        return loadAjaxBehavior(base);
      });

      Drupal.ajax.bindAjaxLinks(document.body);

      $('.use-ajax-submit').once('ajax').each(function () {
        var elementSettings = {};

        elementSettings.url = $(this.form).attr('action');

        elementSettings.setClick = true;

        elementSettings.event = 'click';

        elementSettings.progress = { type: 'throbber' };
        elementSettings.base = $(this).attr('id');
        elementSettings.element = this;

        Drupal.ajax(elementSettings);
      });
    },
    detach: function detach(context, settings, trigger) {
      if (trigger === 'unload') {
        Drupal.ajax.expired().forEach(function (instance) {
          Drupal.ajax.instances[instance.instanceIndex] = null;
        });
      }
    }
  };

  Drupal.AjaxError = function (xmlhttp, uri, customMessage) {
    var statusCode = void 0;
    var statusText = void 0;
    var responseText = void 0;
    if (xmlhttp.status) {
      statusCode = '\n' + Drupal.t('An AJAX HTTP error occurred.') + '\n' + Drupal.t('HTTP Result Code: !status', {
        '!status': xmlhttp.status
      });
    } else {
      statusCode = '\n' + Drupal.t('An AJAX HTTP request terminated abnormally.');
    }
    statusCode += '\n' + Drupal.t('Debugging information follows.');
    var pathText = '\n' + Drupal.t('Path: !uri', { '!uri': uri });
    statusText = '';

    try {
      statusText = '\n' + Drupal.t('StatusText: !statusText', {
        '!statusText': $.trim(xmlhttp.statusText)
      });
    } catch (e) {}

    responseText = '';

    try {
      responseText = '\n' + Drupal.t('ResponseText: !responseText', {
        '!responseText': $.trim(xmlhttp.responseText)
      });
    } catch (e) {}

    responseText = responseText.replace(/<("[^"]*"|'[^']*'|[^'">])*>/gi, '');
    responseText = responseText.replace(/[\n]+\s+/g, '\n');

    var readyStateText = xmlhttp.status === 0 ? '\n' + Drupal.t('ReadyState: !readyState', {
      '!readyState': xmlhttp.readyState
    }) : '';

    customMessage = customMessage ? '\n' + Drupal.t('CustomMessage: !customMessage', {
      '!customMessage': customMessage
    }) : '';

    this.message = statusCode + pathText + statusText + customMessage + responseText + readyStateText;

    this.name = 'AjaxError';
  };

  Drupal.AjaxError.prototype = new Error();
  Drupal.AjaxError.prototype.constructor = Drupal.AjaxError;

  Drupal.ajax = function (settings) {
    if (arguments.length !== 1) {
      throw new Error('Drupal.ajax() function must be called with one configuration object only');
    }

    var base = settings.base || false;
    var element = settings.element || false;
    delete settings.base;
    delete settings.element;

    if (!settings.progress && !element) {
      settings.progress = false;
    }

    var ajax = new Drupal.Ajax(base, element, settings);
    ajax.instanceIndex = Drupal.ajax.instances.length;
    Drupal.ajax.instances.push(ajax);

    return ajax;
  };

  Drupal.ajax.instances = [];

  Drupal.ajax.expired = function () {
    return Drupal.ajax.instances.filter(function (instance) {
      return instance && instance.element !== false && !document.body.contains(instance.element);
    });
  };

  Drupal.ajax.bindAjaxLinks = function (element) {
    $(element).find('.use-ajax').once('ajax').each(function (i, ajaxLink) {
      var $linkElement = $(ajaxLink);

      var elementSettings = {
        progress: { type: 'throbber' },
        dialogType: $linkElement.data('dialog-type'),
        dialog: $linkElement.data('dialog-options'),
        dialogRenderer: $linkElement.data('dialog-renderer'),
        base: $linkElement.attr('id'),
        element: ajaxLink
      };
      var href = $linkElement.attr('href');

      if (href) {
        elementSettings.url = href;
        elementSettings.event = 'click';
      }
      Drupal.ajax(elementSettings);
    });
  };

  Drupal.Ajax = function (base, element, elementSettings) {
    var defaults = {
      event: element ? 'mousedown' : null,
      keypress: true,
      selector: base ? '#' + base : null,
      effect: 'none',
      speed: 'none',
      method: 'replaceWith',
      progress: {
        type: 'throbber',
        message: Drupal.t('Please wait...')
      },
      submit: {
        js: true
      }
    };

    $.extend(this, defaults, elementSettings);

    this.commands = new Drupal.AjaxCommands();

    this.instanceIndex = false;

    if (this.wrapper) {
      this.wrapper = '#' + this.wrapper;
    }

    this.element = element;

    this.element_settings = elementSettings;

    this.elementSettings = elementSettings;

    if (this.element && this.element.form) {
      this.$form = $(this.element.form);
    }

    if (!this.url) {
      var $element = $(this.element);
      if ($element.is('a')) {
        this.url = $element.attr('href');
      } else if (this.element && element.form) {
        this.url = this.$form.attr('action');
      }
    }

    var originalUrl = this.url;

    this.url = this.url.replace(/\/nojs(\/|$|\?|#)/, '/ajax$1');

    if (drupalSettings.ajaxTrustedUrl[originalUrl]) {
      drupalSettings.ajaxTrustedUrl[this.url] = true;
    }

    var ajax = this;

    ajax.options = {
      url: ajax.url,
      data: ajax.submit,
      beforeSerialize: function beforeSerialize(elementSettings, options) {
        return ajax.beforeSerialize(elementSettings, options);
      },
      beforeSubmit: function beforeSubmit(formValues, elementSettings, options) {
        ajax.ajaxing = true;
        return ajax.beforeSubmit(formValues, elementSettings, options);
      },
      beforeSend: function beforeSend(xmlhttprequest, options) {
        ajax.ajaxing = true;
        return ajax.beforeSend(xmlhttprequest, options);
      },
      success: function success(response, status, xmlhttprequest) {
        if (typeof response === 'string') {
          response = $.parseJSON(response);
        }

        if (response !== null && !drupalSettings.ajaxTrustedUrl[ajax.url]) {
          if (xmlhttprequest.getResponseHeader('X-Drupal-Ajax-Token') !== '1') {
            var customMessage = Drupal.t('The response failed verification so will not be processed.');
            return ajax.error(xmlhttprequest, ajax.url, customMessage);
          }
        }

        return ajax.success(response, status);
      },
      complete: function complete(xmlhttprequest, status) {
        ajax.ajaxing = false;
        if (status === 'error' || status === 'parsererror') {
          return ajax.error(xmlhttprequest, ajax.url);
        }
      },

      dataType: 'json',
      jsonp: false,
      type: 'POST'
    };

    if (elementSettings.dialog) {
      ajax.options.data.dialogOptions = elementSettings.dialog;
    }

    if (ajax.options.url.indexOf('?') === -1) {
      ajax.options.url += '?';
    } else {
      ajax.options.url += '&';
    }

    var wrapper = 'drupal_' + (elementSettings.dialogType || 'ajax');
    if (elementSettings.dialogRenderer) {
      wrapper += '.' + elementSettings.dialogRenderer;
    }
    ajax.options.url += Drupal.ajax.WRAPPER_FORMAT + '=' + wrapper;

    $(ajax.element).on(elementSettings.event, function (event) {
      if (!drupalSettings.ajaxTrustedUrl[ajax.url] && !Drupal.url.isLocal(ajax.url)) {
        throw new Error(Drupal.t('The callback URL is not local and not trusted: !url', {
          '!url': ajax.url
        }));
      }
      return ajax.eventResponse(this, event);
    });

    if (elementSettings.keypress) {
      $(ajax.element).on('keypress', function (event) {
        return ajax.keypressResponse(this, event);
      });
    }

    if (elementSettings.prevent) {
      $(ajax.element).on(elementSettings.prevent, false);
    }
  };

  Drupal.ajax.WRAPPER_FORMAT = '_wrapper_format';

  Drupal.Ajax.AJAX_REQUEST_PARAMETER = '_drupal_ajax';

  Drupal.Ajax.prototype.execute = function () {
    if (this.ajaxing) {
      return;
    }

    try {
      this.beforeSerialize(this.element, this.options);

      return $.ajax(this.options);
    } catch (e) {
      this.ajaxing = false;
      window.alert('An error occurred while attempting to process ' + this.options.url + ': ' + e.message);

      return $.Deferred().reject();
    }
  };

  Drupal.Ajax.prototype.keypressResponse = function (element, event) {
    var ajax = this;

    if (event.which === 13 || event.which === 32 && element.type !== 'text' && element.type !== 'textarea' && element.type !== 'tel' && element.type !== 'number') {
      event.preventDefault();
      event.stopPropagation();
      $(element).trigger(ajax.elementSettings.event);
    }
  };

  Drupal.Ajax.prototype.eventResponse = function (element, event) {
    event.preventDefault();
    event.stopPropagation();

    var ajax = this;

    if (ajax.ajaxing) {
      return;
    }

    try {
      if (ajax.$form) {
        if (ajax.setClick) {
          element.form.clk = element;
        }

        ajax.$form.ajaxSubmit(ajax.options);
      } else {
        ajax.beforeSerialize(ajax.element, ajax.options);
        $.ajax(ajax.options);
      }
    } catch (e) {
      ajax.ajaxing = false;
      window.alert('An error occurred while attempting to process ' + ajax.options.url + ': ' + e.message);
    }
  };

  Drupal.Ajax.prototype.beforeSerialize = function (element, options) {
    if (this.$form && document.body.contains(this.$form.get(0))) {
      var settings = this.settings || drupalSettings;
      Drupal.detachBehaviors(this.$form.get(0), settings, 'serialize');
    }

    options.data[Drupal.Ajax.AJAX_REQUEST_PARAMETER] = 1;

    var pageState = drupalSettings.ajaxPageState;
    options.data['ajax_page_state[theme]'] = pageState.theme;
    options.data['ajax_page_state[theme_token]'] = pageState.theme_token;
    options.data['ajax_page_state[libraries]'] = pageState.libraries;
  };

  Drupal.Ajax.prototype.beforeSubmit = function (formValues, element, options) {};

  Drupal.Ajax.prototype.beforeSend = function (xmlhttprequest, options) {
    if (this.$form) {
      options.extraData = options.extraData || {};

      options.extraData.ajax_iframe_upload = '1';

      var v = $.fieldValue(this.element);
      if (v !== null) {
        options.extraData[this.element.name] = v;
      }
    }

    $(this.element).prop('disabled', true);

    if (!this.progress || !this.progress.type) {
      return;
    }

    var progressIndicatorMethod = 'setProgressIndicator' + this.progress.type.slice(0, 1).toUpperCase() + this.progress.type.slice(1).toLowerCase();
    if (progressIndicatorMethod in this && typeof this[progressIndicatorMethod] === 'function') {
      this[progressIndicatorMethod].call(this);
    }
  };

  Drupal.theme.ajaxProgressThrobber = function (message) {
    var messageMarkup = typeof message === 'string' ? Drupal.theme('ajaxProgressMessage', message) : '';
    var throbber = '<div class="throbber">&nbsp;</div>';

    return '<div class="ajax-progress ajax-progress-throbber">' + throbber + messageMarkup + '</div>';
  };

  Drupal.theme.ajaxProgressIndicatorFullscreen = function () {
    return '<div class="ajax-progress ajax-progress-fullscreen">&nbsp;</div>';
  };

  Drupal.theme.ajaxProgressMessage = function (message) {
    return '<div class="message">' + message + '</div>';
  };

  Drupal.theme.ajaxProgressBar = function ($element) {
    return $('<div class="ajax-progress ajax-progress-bar"></div>').append($element);
  };

  Drupal.Ajax.prototype.setProgressIndicatorBar = function () {
    var progressBar = new Drupal.ProgressBar('ajax-progress-' + this.element.id, $.noop, this.progress.method, $.noop);
    if (this.progress.message) {
      progressBar.setProgress(-1, this.progress.message);
    }
    if (this.progress.url) {
      progressBar.startMonitoring(this.progress.url, this.progress.interval || 1500);
    }
    this.progress.element = $(Drupal.theme('ajaxProgressBar', progressBar.element));
    this.progress.object = progressBar;
    $(this.element).after(this.progress.element);
  };

  Drupal.Ajax.prototype.setProgressIndicatorThrobber = function () {
    this.progress.element = $(Drupal.theme('ajaxProgressThrobber', this.progress.message));
    $(this.element).after(this.progress.element);
  };

  Drupal.Ajax.prototype.setProgressIndicatorFullscreen = function () {
    this.progress.element = $(Drupal.theme('ajaxProgressIndicatorFullscreen'));
    $('body').append(this.progress.element);
  };

  Drupal.Ajax.prototype.success = function (response, status) {
    var _this = this;

    if (this.progress.element) {
      $(this.progress.element).remove();
    }
    if (this.progress.object) {
      this.progress.object.stopMonitoring();
    }
    $(this.element).prop('disabled', false);

    var elementParents = $(this.element).parents('[data-drupal-selector]').addBack().toArray();

    var focusChanged = false;
    Object.keys(response || {}).forEach(function (i) {
      if (response[i].command && _this.commands[response[i].command]) {
        _this.commands[response[i].command](_this, response[i], status);
        if (response[i].command === 'invoke' && response[i].method === 'focus') {
          focusChanged = true;
        }
      }
    });

    if (!focusChanged && this.element && !$(this.element).data('disable-refocus')) {
      var target = false;

      for (var n = elementParents.length - 1; !target && n >= 0; n--) {
        target = document.querySelector('[data-drupal-selector="' + elementParents[n].getAttribute('data-drupal-selector') + '"]');
      }

      if (target) {
        $(target).trigger('focus');
      }
    }

    if (this.$form && document.body.contains(this.$form.get(0))) {
      var settings = this.settings || drupalSettings;
      Drupal.attachBehaviors(this.$form.get(0), settings);
    }

    this.settings = null;
  };

  Drupal.Ajax.prototype.getEffect = function (response) {
    var type = response.effect || this.effect;
    var speed = response.speed || this.speed;

    var effect = {};
    if (type === 'none') {
      effect.showEffect = 'show';
      effect.hideEffect = 'hide';
      effect.showSpeed = '';
    } else if (type === 'fade') {
      effect.showEffect = 'fadeIn';
      effect.hideEffect = 'fadeOut';
      effect.showSpeed = speed;
    } else {
      effect.showEffect = type + 'Toggle';
      effect.hideEffect = type + 'Toggle';
      effect.showSpeed = speed;
    }

    return effect;
  };

  Drupal.Ajax.prototype.error = function (xmlhttprequest, uri, customMessage) {
    if (this.progress.element) {
      $(this.progress.element).remove();
    }
    if (this.progress.object) {
      this.progress.object.stopMonitoring();
    }

    $(this.wrapper).show();

    $(this.element).prop('disabled', false);

    if (this.$form && document.body.contains(this.$form.get(0))) {
      var settings = this.settings || drupalSettings;
      Drupal.attachBehaviors(this.$form.get(0), settings);
    }
    throw new Drupal.AjaxError(xmlhttprequest, uri, customMessage);
  };

  Drupal.theme.ajaxWrapperNewContent = function ($newContent, ajax, response) {
    return (response.effect || ajax.effect) !== 'none' && $newContent.filter(function (i) {
      return !($newContent[i].nodeName === '#comment' || $newContent[i].nodeName === '#text' && /^(\s|\n|\r)*$/.test($newContent[i].textContent));
    }).length > 1 ? Drupal.theme('ajaxWrapperMultipleRootElements', $newContent) : $newContent;
  };

  Drupal.theme.ajaxWrapperMultipleRootElements = function ($elements) {
    return $('<div></div>').append($elements);
  };

  Drupal.AjaxCommands = function () {};
  Drupal.AjaxCommands.prototype = {
    insert: function insert(ajax, response) {
      var $wrapper = response.selector ? $(response.selector) : $(ajax.wrapper);
      var method = response.method || ajax.method;
      var effect = ajax.getEffect(response);

      var settings = response.settings || ajax.settings || drupalSettings;

      var $newContent = $($.parseHTML(response.data, document, true));

      $newContent = Drupal.theme('ajaxWrapperNewContent', $newContent, ajax, response);

      switch (method) {
        case 'html':
        case 'replaceWith':
        case 'replaceAll':
        case 'empty':
        case 'remove':
          Drupal.detachBehaviors($wrapper.get(0), settings);
          break;
        default:
          break;
      }

      $wrapper[method]($newContent);

      if (effect.showEffect !== 'show') {
        $newContent.hide();
      }

      var $ajaxNewContent = $newContent.find('.ajax-new-content');
      if ($ajaxNewContent.length) {
        $ajaxNewContent.hide();
        $newContent.show();
        $ajaxNewContent[effect.showEffect](effect.showSpeed);
      } else if (effect.showEffect !== 'show') {
        $newContent[effect.showEffect](effect.showSpeed);
      }

      if ($newContent.parents('html').length) {
        $newContent.each(function (index, element) {
          if (element.nodeType === Node.ELEMENT_NODE) {
            Drupal.attachBehaviors(element, settings);
          }
        });
      }
    },
    remove: function remove(ajax, response, status) {
      var settings = response.settings || ajax.settings || drupalSettings;
      $(response.selector).each(function () {
        Drupal.detachBehaviors(this, settings);
      }).remove();
    },
    changed: function changed(ajax, response, status) {
      var $element = $(response.selector);
      if (!$element.hasClass('ajax-changed')) {
        $element.addClass('ajax-changed');
        if (response.asterisk) {
          $element.find(response.asterisk).append(' <abbr class="ajax-changed" title="' + Drupal.t('Changed') + '">*</abbr> ');
        }
      }
    },
    alert: function alert(ajax, response, status) {
      window.alert(response.text, response.title);
    },
    announce: function announce(ajax, response) {
      if (response.priority) {
        Drupal.announce(response.text, response.priority);
      } else {
        Drupal.announce(response.text);
      }
    },
    redirect: function redirect(ajax, response, status) {
      window.location = response.url;
    },
    css: function css(ajax, response, status) {
      $(response.selector).css(response.argument);
    },
    settings: function settings(ajax, response, status) {
      var ajaxSettings = drupalSettings.ajax;

      if (ajaxSettings) {
        Drupal.ajax.expired().forEach(function (instance) {

          if (instance.selector) {
            var selector = instance.selector.replace('#', '');
            if (selector in ajaxSettings) {
              delete ajaxSettings[selector];
            }
          }
        });
      }

      if (response.merge) {
        $.extend(true, drupalSettings, response.settings);
      } else {
        ajax.settings = response.settings;
      }
    },
    data: function data(ajax, response, status) {
      $(response.selector).data(response.name, response.value);
    },
    invoke: function invoke(ajax, response, status) {
      var $element = $(response.selector);
      $element[response.method].apply($element, _toConsumableArray(response.args));
    },
    restripe: function restripe(ajax, response, status) {
      $(response.selector).find('> tbody > tr:visible, > tr:visible').removeClass('odd even').filter(':even').addClass('odd').end().filter(':odd').addClass('even');
    },
    update_build_id: function update_build_id(ajax, response, status) {
      $('input[name="form_build_id"][value="' + response.old + '"]').val(response.new);
    },
    add_css: function add_css(ajax, response, status) {
      $('head').prepend(response.data);
    },
    message: function message(ajax, response) {
      var messages = new Drupal.Message(document.querySelector(response.messageWrapperQuerySelector));
      if (response.clearPrevious) {
        messages.clear();
      }
      messages.add(response.message, response.messageOptions);
    }
  };
})(jQuery, window, Drupal, drupalSettings);;
/**
 * @file
 * Extends methods from core/misc/ajax.js.
 */

(function ($, window, Drupal, drupalSettings) {

  /**
   * Attempts to find the closest glyphicon progress indicator.
   *
   * @param {jQuery|Element} element
   *   A DOM element.
   *
   * @returns {jQuery}
   *   A jQuery object.
   */
  Drupal.Ajax.prototype.findGlyphicon = function (element) {
    return $(element).closest('.form-item').find('.ajax-progress.glyphicon')
  };

  /**
   * Starts the spinning of the glyphicon progress indicator.
   *
   * @param {jQuery|Element} element
   *   A DOM element.
   * @param {string} [message]
   *   An optional message to display (tooltip) for the progress.
   *
   * @returns {jQuery}
   *   A jQuery object.
   */
  Drupal.Ajax.prototype.glyphiconStart = function (element, message) {
    var $glyphicon = this.findGlyphicon(element);
    if ($glyphicon[0]) {
      $glyphicon.addClass('glyphicon-spin');

      // Add any message as a tooltip to the glyphicon.
      if ($.fn.tooltip && drupalSettings.bootstrap.tooltip_enabled) {
        $glyphicon
          .removeAttr('data-toggle')
          .removeAttr('data-original-title')
          .removeAttr('title')
          .tooltip('destroy')
        ;

        if (message) {
          $glyphicon.attr('data-toggle', 'tooltip').attr('title', message).tooltip();
        }
      }

      // Append a message for screen readers.
      if (message) {
        $glyphicon.parent().append('<div class="sr-only message">' + message + '</div>');
      }
    }
    return $glyphicon;
  };

  /**
   * Stop the spinning of a glyphicon progress indicator.
   *
   * @param {jQuery|Element} element
   *   A DOM element.
   */
  Drupal.Ajax.prototype.glyphiconStop = function (element) {
    var $glyphicon = this.findGlyphicon(element);
    if ($glyphicon[0]) {
      $glyphicon.removeClass('glyphicon-spin');
      if ($.fn.tooltip && drupalSettings.bootstrap.tooltip_enabled) {
        $glyphicon
          .removeAttr('data-toggle')
          .removeAttr('data-original-title')
          .removeAttr('title')
          .tooltip('destroy')
        ;
      }
    }
  };

  /**
   * Sets the throbber progress indicator.
   */
  Drupal.Ajax.prototype.setProgressIndicatorThrobber = function () {
    var $element = $(this.element);

    // Find an existing glyphicon progress indicator.
    var $glyphicon = this.glyphiconStart($element, this.progress.message);
    if ($glyphicon[0]) {
      this.progress.element = $glyphicon.parent();
      this.progress.glyphicon = true;
      return;
    }

    // Otherwise, add a glyphicon throbber after the element.
    if (!this.progress.element) {
      this.progress.element = $(Drupal.theme('ajaxThrobber'));
    }
    if (this.progress.message) {
      this.progress.element.after('<div class="message">' + this.progress.message + '</div>');
    }

    // If element is an input DOM element type (not :input), append after.
    if ($element.is('input')) {
      $element.after(this.progress.element);
    }
    // Otherwise append the throbber inside the element.
    else {
      $element.append(this.progress.element);
    }
  };


  /**
   * Handler for the form redirection completion.
   *
   * @param {Array.<Drupal.AjaxCommands~commandDefinition>} response
   * @param {number} status
   */
  var success = Drupal.Ajax.prototype.success;
  Drupal.Ajax.prototype.success = function (response, status) {
    if (this.progress.element) {

      // Stop a glyphicon throbber.
      if (this.progress.glyphicon) {
        this.glyphiconStop(this.progress.element);
      }
      // Remove the progress element.
      else {
        this.progress.element.remove();
      }

      // Remove any message set.
      this.progress.element.parent().find('.message').remove();
    }

    // Invoke the original success handler.
    return success.apply(this, [response, status]);
  };

})(jQuery, this, Drupal, drupalSettings);
;
/*!
 * Bootstrap v3.4.1 (https://getbootstrap.com/)
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under the MIT license
 */
if("undefined"==typeof jQuery)throw new Error("Bootstrap's JavaScript requires jQuery");!function(t){"use strict";var e=jQuery.fn.jquery.split(" ")[0].split(".");if(e[0]<2&&e[1]<9||1==e[0]&&9==e[1]&&e[2]<1||3<e[0])throw new Error("Bootstrap's JavaScript requires jQuery version 1.9.1 or higher, but lower than version 4")}(),function(n){"use strict";n.fn.emulateTransitionEnd=function(t){var e=!1,i=this;n(this).one("bsTransitionEnd",function(){e=!0});return setTimeout(function(){e||n(i).trigger(n.support.transition.end)},t),this},n(function(){n.support.transition=function o(){var t=document.createElement("bootstrap"),e={WebkitTransition:"webkitTransitionEnd",MozTransition:"transitionend",OTransition:"oTransitionEnd otransitionend",transition:"transitionend"};for(var i in e)if(t.style[i]!==undefined)return{end:e[i]};return!1}(),n.support.transition&&(n.event.special.bsTransitionEnd={bindType:n.support.transition.end,delegateType:n.support.transition.end,handle:function(t){if(n(t.target).is(this))return t.handleObj.handler.apply(this,arguments)}})})}(jQuery),function(s){"use strict";var e='[data-dismiss="alert"]',a=function(t){s(t).on("click",e,this.close)};a.VERSION="3.4.1",a.TRANSITION_DURATION=150,a.prototype.close=function(t){var e=s(this),i=e.attr("data-target");i||(i=(i=e.attr("href"))&&i.replace(/.*(?=#[^\s]*$)/,"")),i="#"===i?[]:i;var o=s(document).find(i);function n(){o.detach().trigger("closed.bs.alert").remove()}t&&t.preventDefault(),o.length||(o=e.closest(".alert")),o.trigger(t=s.Event("close.bs.alert")),t.isDefaultPrevented()||(o.removeClass("in"),s.support.transition&&o.hasClass("fade")?o.one("bsTransitionEnd",n).emulateTransitionEnd(a.TRANSITION_DURATION):n())};var t=s.fn.alert;s.fn.alert=function o(i){return this.each(function(){var t=s(this),e=t.data("bs.alert");e||t.data("bs.alert",e=new a(this)),"string"==typeof i&&e[i].call(t)})},s.fn.alert.Constructor=a,s.fn.alert.noConflict=function(){return s.fn.alert=t,this},s(document).on("click.bs.alert.data-api",e,a.prototype.close)}(jQuery),function(s){"use strict";var n=function(t,e){this.$element=s(t),this.options=s.extend({},n.DEFAULTS,e),this.isLoading=!1};function i(o){return this.each(function(){var t=s(this),e=t.data("bs.button"),i="object"==typeof o&&o;e||t.data("bs.button",e=new n(this,i)),"toggle"==o?e.toggle():o&&e.setState(o)})}n.VERSION="3.4.1",n.DEFAULTS={loadingText:"loading..."},n.prototype.setState=function(t){var e="disabled",i=this.$element,o=i.is("input")?"val":"html",n=i.data();t+="Text",null==n.resetText&&i.data("resetText",i[o]()),setTimeout(s.proxy(function(){i[o](null==n[t]?this.options[t]:n[t]),"loadingText"==t?(this.isLoading=!0,i.addClass(e).attr(e,e).prop(e,!0)):this.isLoading&&(this.isLoading=!1,i.removeClass(e).removeAttr(e).prop(e,!1))},this),0)},n.prototype.toggle=function(){var t=!0,e=this.$element.closest('[data-toggle="buttons"]');if(e.length){var i=this.$element.find("input");"radio"==i.prop("type")?(i.prop("checked")&&(t=!1),e.find(".active").removeClass("active"),this.$element.addClass("active")):"checkbox"==i.prop("type")&&(i.prop("checked")!==this.$element.hasClass("active")&&(t=!1),this.$element.toggleClass("active")),i.prop("checked",this.$element.hasClass("active")),t&&i.trigger("change")}else this.$element.attr("aria-pressed",!this.$element.hasClass("active")),this.$element.toggleClass("active")};var t=s.fn.button;s.fn.button=i,s.fn.button.Constructor=n,s.fn.button.noConflict=function(){return s.fn.button=t,this},s(document).on("click.bs.button.data-api",'[data-toggle^="button"]',function(t){var e=s(t.target).closest(".btn");i.call(e,"toggle"),s(t.target).is('input[type="radio"], input[type="checkbox"]')||(t.preventDefault(),e.is("input,button")?e.trigger("focus"):e.find("input:visible,button:visible").first().trigger("focus"))}).on("focus.bs.button.data-api blur.bs.button.data-api",'[data-toggle^="button"]',function(t){s(t.target).closest(".btn").toggleClass("focus",/^focus(in)?$/.test(t.type))})}(jQuery),function(p){"use strict";var c=function(t,e){this.$element=p(t),this.$indicators=this.$element.find(".carousel-indicators"),this.options=e,this.paused=null,this.sliding=null,this.interval=null,this.$active=null,this.$items=null,this.options.keyboard&&this.$element.on("keydown.bs.carousel",p.proxy(this.keydown,this)),"hover"==this.options.pause&&!("ontouchstart"in document.documentElement)&&this.$element.on("mouseenter.bs.carousel",p.proxy(this.pause,this)).on("mouseleave.bs.carousel",p.proxy(this.cycle,this))};function r(n){return this.each(function(){var t=p(this),e=t.data("bs.carousel"),i=p.extend({},c.DEFAULTS,t.data(),"object"==typeof n&&n),o="string"==typeof n?n:i.slide;e||t.data("bs.carousel",e=new c(this,i)),"number"==typeof n?e.to(n):o?e[o]():i.interval&&e.pause().cycle()})}c.VERSION="3.4.1",c.TRANSITION_DURATION=600,c.DEFAULTS={interval:5e3,pause:"hover",wrap:!0,keyboard:!0},c.prototype.keydown=function(t){if(!/input|textarea/i.test(t.target.tagName)){switch(t.which){case 37:this.prev();break;case 39:this.next();break;default:return}t.preventDefault()}},c.prototype.cycle=function(t){return t||(this.paused=!1),this.interval&&clearInterval(this.interval),this.options.interval&&!this.paused&&(this.interval=setInterval(p.proxy(this.next,this),this.options.interval)),this},c.prototype.getItemIndex=function(t){return this.$items=t.parent().children(".item"),this.$items.index(t||this.$active)},c.prototype.getItemForDirection=function(t,e){var i=this.getItemIndex(e);if(("prev"==t&&0===i||"next"==t&&i==this.$items.length-1)&&!this.options.wrap)return e;var o=(i+("prev"==t?-1:1))%this.$items.length;return this.$items.eq(o)},c.prototype.to=function(t){var e=this,i=this.getItemIndex(this.$active=this.$element.find(".item.active"));if(!(t>this.$items.length-1||t<0))return this.sliding?this.$element.one("slid.bs.carousel",function(){e.to(t)}):i==t?this.pause().cycle():this.slide(i<t?"next":"prev",this.$items.eq(t))},c.prototype.pause=function(t){return t||(this.paused=!0),this.$element.find(".next, .prev").length&&p.support.transition&&(this.$element.trigger(p.support.transition.end),this.cycle(!0)),this.interval=clearInterval(this.interval),this},c.prototype.next=function(){if(!this.sliding)return this.slide("next")},c.prototype.prev=function(){if(!this.sliding)return this.slide("prev")},c.prototype.slide=function(t,e){var i=this.$element.find(".item.active"),o=e||this.getItemForDirection(t,i),n=this.interval,s="next"==t?"left":"right",a=this;if(o.hasClass("active"))return this.sliding=!1;var r=o[0],l=p.Event("slide.bs.carousel",{relatedTarget:r,direction:s});if(this.$element.trigger(l),!l.isDefaultPrevented()){if(this.sliding=!0,n&&this.pause(),this.$indicators.length){this.$indicators.find(".active").removeClass("active");var h=p(this.$indicators.children()[this.getItemIndex(o)]);h&&h.addClass("active")}var d=p.Event("slid.bs.carousel",{relatedTarget:r,direction:s});return p.support.transition&&this.$element.hasClass("slide")?(o.addClass(t),"object"==typeof o&&o.length&&o[0].offsetWidth,i.addClass(s),o.addClass(s),i.one("bsTransitionEnd",function(){o.removeClass([t,s].join(" ")).addClass("active"),i.removeClass(["active",s].join(" ")),a.sliding=!1,setTimeout(function(){a.$element.trigger(d)},0)}).emulateTransitionEnd(c.TRANSITION_DURATION)):(i.removeClass("active"),o.addClass("active"),this.sliding=!1,this.$element.trigger(d)),n&&this.cycle(),this}};var t=p.fn.carousel;p.fn.carousel=r,p.fn.carousel.Constructor=c,p.fn.carousel.noConflict=function(){return p.fn.carousel=t,this};var e=function(t){var e=p(this),i=e.attr("href");i&&(i=i.replace(/.*(?=#[^\s]+$)/,""));var o=e.attr("data-target")||i,n=p(document).find(o);if(n.hasClass("carousel")){var s=p.extend({},n.data(),e.data()),a=e.attr("data-slide-to");a&&(s.interval=!1),r.call(n,s),a&&n.data("bs.carousel").to(a),t.preventDefault()}};p(document).on("click.bs.carousel.data-api","[data-slide]",e).on("click.bs.carousel.data-api","[data-slide-to]",e),p(window).on("load",function(){p('[data-ride="carousel"]').each(function(){var t=p(this);r.call(t,t.data())})})}(jQuery),function(a){"use strict";var r=function(t,e){this.$element=a(t),this.options=a.extend({},r.DEFAULTS,e),this.$trigger=a('[data-toggle="collapse"][href="#'+t.id+'"],[data-toggle="collapse"][data-target="#'+t.id+'"]'),this.transitioning=null,this.options.parent?this.$parent=this.getParent():this.addAriaAndCollapsedClass(this.$element,this.$trigger),this.options.toggle&&this.toggle()};function n(t){var e,i=t.attr("data-target")||(e=t.attr("href"))&&e.replace(/.*(?=#[^\s]+$)/,"");return a(document).find(i)}function l(o){return this.each(function(){var t=a(this),e=t.data("bs.collapse"),i=a.extend({},r.DEFAULTS,t.data(),"object"==typeof o&&o);!e&&i.toggle&&/show|hide/.test(o)&&(i.toggle=!1),e||t.data("bs.collapse",e=new r(this,i)),"string"==typeof o&&e[o]()})}r.VERSION="3.4.1",r.TRANSITION_DURATION=350,r.DEFAULTS={toggle:!0},r.prototype.dimension=function(){return this.$element.hasClass("width")?"width":"height"},r.prototype.show=function(){if(!this.transitioning&&!this.$element.hasClass("in")){var t,e=this.$parent&&this.$parent.children(".panel").children(".in, .collapsing");if(!(e&&e.length&&(t=e.data("bs.collapse"))&&t.transitioning)){var i=a.Event("show.bs.collapse");if(this.$element.trigger(i),!i.isDefaultPrevented()){e&&e.length&&(l.call(e,"hide"),t||e.data("bs.collapse",null));var o=this.dimension();this.$element.removeClass("collapse").addClass("collapsing")[o](0).attr("aria-expanded",!0),this.$trigger.removeClass("collapsed").attr("aria-expanded",!0),this.transitioning=1;var n=function(){this.$element.removeClass("collapsing").addClass("collapse in")[o](""),this.transitioning=0,this.$element.trigger("shown.bs.collapse")};if(!a.support.transition)return n.call(this);var s=a.camelCase(["scroll",o].join("-"));this.$element.one("bsTransitionEnd",a.proxy(n,this)).emulateTransitionEnd(r.TRANSITION_DURATION)[o](this.$element[0][s])}}}},r.prototype.hide=function(){if(!this.transitioning&&this.$element.hasClass("in")){var t=a.Event("hide.bs.collapse");if(this.$element.trigger(t),!t.isDefaultPrevented()){var e=this.dimension();this.$element[e](this.$element[e]())[0].offsetHeight,this.$element.addClass("collapsing").removeClass("collapse in").attr("aria-expanded",!1),this.$trigger.addClass("collapsed").attr("aria-expanded",!1),this.transitioning=1;var i=function(){this.transitioning=0,this.$element.removeClass("collapsing").addClass("collapse").trigger("hidden.bs.collapse")};if(!a.support.transition)return i.call(this);this.$element[e](0).one("bsTransitionEnd",a.proxy(i,this)).emulateTransitionEnd(r.TRANSITION_DURATION)}}},r.prototype.toggle=function(){this[this.$element.hasClass("in")?"hide":"show"]()},r.prototype.getParent=function(){return a(document).find(this.options.parent).find('[data-toggle="collapse"][data-parent="'+this.options.parent+'"]').each(a.proxy(function(t,e){var i=a(e);this.addAriaAndCollapsedClass(n(i),i)},this)).end()},r.prototype.addAriaAndCollapsedClass=function(t,e){var i=t.hasClass("in");t.attr("aria-expanded",i),e.toggleClass("collapsed",!i).attr("aria-expanded",i)};var t=a.fn.collapse;a.fn.collapse=l,a.fn.collapse.Constructor=r,a.fn.collapse.noConflict=function(){return a.fn.collapse=t,this},a(document).on("click.bs.collapse.data-api",'[data-toggle="collapse"]',function(t){var e=a(this);e.attr("data-target")||t.preventDefault();var i=n(e),o=i.data("bs.collapse")?"toggle":e.data();l.call(i,o)})}(jQuery),function(a){"use strict";var r='[data-toggle="dropdown"]',o=function(t){a(t).on("click.bs.dropdown",this.toggle)};function l(t){var e=t.attr("data-target");e||(e=(e=t.attr("href"))&&/#[A-Za-z]/.test(e)&&e.replace(/.*(?=#[^\s]*$)/,""));var i="#"!==e?a(document).find(e):null;return i&&i.length?i:t.parent()}function s(o){o&&3===o.which||(a(".dropdown-backdrop").remove(),a(r).each(function(){var t=a(this),e=l(t),i={relatedTarget:this};e.hasClass("open")&&(o&&"click"==o.type&&/input|textarea/i.test(o.target.tagName)&&a.contains(e[0],o.target)||(e.trigger(o=a.Event("hide.bs.dropdown",i)),o.isDefaultPrevented()||(t.attr("aria-expanded","false"),e.removeClass("open").trigger(a.Event("hidden.bs.dropdown",i)))))}))}o.VERSION="3.4.1",o.prototype.toggle=function(t){var e=a(this);if(!e.is(".disabled, :disabled")){var i=l(e),o=i.hasClass("open");if(s(),!o){"ontouchstart"in document.documentElement&&!i.closest(".navbar-nav").length&&a(document.createElement("div")).addClass("dropdown-backdrop").insertAfter(a(this)).on("click",s);var n={relatedTarget:this};if(i.trigger(t=a.Event("show.bs.dropdown",n)),t.isDefaultPrevented())return;e.trigger("focus").attr("aria-expanded","true"),i.toggleClass("open").trigger(a.Event("shown.bs.dropdown",n))}return!1}},o.prototype.keydown=function(t){if(/(38|40|27|32)/.test(t.which)&&!/input|textarea/i.test(t.target.tagName)){var e=a(this);if(t.preventDefault(),t.stopPropagation(),!e.is(".disabled, :disabled")){var i=l(e),o=i.hasClass("open");if(!o&&27!=t.which||o&&27==t.which)return 27==t.which&&i.find(r).trigger("focus"),e.trigger("click");var n=i.find(".dropdown-menu li:not(.disabled):visible a");if(n.length){var s=n.index(t.target);38==t.which&&0<s&&s--,40==t.which&&s<n.length-1&&s++,~s||(s=0),n.eq(s).trigger("focus")}}}};var t=a.fn.dropdown;a.fn.dropdown=function e(i){return this.each(function(){var t=a(this),e=t.data("bs.dropdown");e||t.data("bs.dropdown",e=new o(this)),"string"==typeof i&&e[i].call(t)})},a.fn.dropdown.Constructor=o,a.fn.dropdown.noConflict=function(){return a.fn.dropdown=t,this},a(document).on("click.bs.dropdown.data-api",s).on("click.bs.dropdown.data-api",".dropdown form",function(t){t.stopPropagation()}).on("click.bs.dropdown.data-api",r,o.prototype.toggle).on("keydown.bs.dropdown.data-api",r,o.prototype.keydown).on("keydown.bs.dropdown.data-api",".dropdown-menu",o.prototype.keydown)}(jQuery),function(a){"use strict";var s=function(t,e){this.options=e,this.$body=a(document.body),this.$element=a(t),this.$dialog=this.$element.find(".modal-dialog"),this.$backdrop=null,this.isShown=null,this.originalBodyPad=null,this.scrollbarWidth=0,this.ignoreBackdropClick=!1,this.fixedContent=".navbar-fixed-top, .navbar-fixed-bottom",this.options.remote&&this.$element.find(".modal-content").load(this.options.remote,a.proxy(function(){this.$element.trigger("loaded.bs.modal")},this))};function r(o,n){return this.each(function(){var t=a(this),e=t.data("bs.modal"),i=a.extend({},s.DEFAULTS,t.data(),"object"==typeof o&&o);e||t.data("bs.modal",e=new s(this,i)),"string"==typeof o?e[o](n):i.show&&e.show(n)})}s.VERSION="3.4.1",s.TRANSITION_DURATION=300,s.BACKDROP_TRANSITION_DURATION=150,s.DEFAULTS={backdrop:!0,keyboard:!0,show:!0},s.prototype.toggle=function(t){return this.isShown?this.hide():this.show(t)},s.prototype.show=function(i){var o=this,t=a.Event("show.bs.modal",{relatedTarget:i});this.$element.trigger(t),this.isShown||t.isDefaultPrevented()||(this.isShown=!0,this.checkScrollbar(),this.setScrollbar(),this.$body.addClass("modal-open"),this.escape(),this.resize(),this.$element.on("click.dismiss.bs.modal",'[data-dismiss="modal"]',a.proxy(this.hide,this)),this.$dialog.on("mousedown.dismiss.bs.modal",function(){o.$element.one("mouseup.dismiss.bs.modal",function(t){a(t.target).is(o.$element)&&(o.ignoreBackdropClick=!0)})}),this.backdrop(function(){var t=a.support.transition&&o.$element.hasClass("fade");o.$element.parent().length||o.$element.appendTo(o.$body),o.$element.show().scrollTop(0),o.adjustDialog(),t&&o.$element[0].offsetWidth,o.$element.addClass("in"),o.enforceFocus();var e=a.Event("shown.bs.modal",{relatedTarget:i});t?o.$dialog.one("bsTransitionEnd",function(){o.$element.trigger("focus").trigger(e)}).emulateTransitionEnd(s.TRANSITION_DURATION):o.$element.trigger("focus").trigger(e)}))},s.prototype.hide=function(t){t&&t.preventDefault(),t=a.Event("hide.bs.modal"),this.$element.trigger(t),this.isShown&&!t.isDefaultPrevented()&&(this.isShown=!1,this.escape(),this.resize(),a(document).off("focusin.bs.modal"),this.$element.removeClass("in").off("click.dismiss.bs.modal").off("mouseup.dismiss.bs.modal"),this.$dialog.off("mousedown.dismiss.bs.modal"),a.support.transition&&this.$element.hasClass("fade")?this.$element.one("bsTransitionEnd",a.proxy(this.hideModal,this)).emulateTransitionEnd(s.TRANSITION_DURATION):this.hideModal())},s.prototype.enforceFocus=function(){a(document).off("focusin.bs.modal").on("focusin.bs.modal",a.proxy(function(t){document===t.target||this.$element[0]===t.target||this.$element.has(t.target).length||this.$element.trigger("focus")},this))},s.prototype.escape=function(){this.isShown&&this.options.keyboard?this.$element.on("keydown.dismiss.bs.modal",a.proxy(function(t){27==t.which&&this.hide()},this)):this.isShown||this.$element.off("keydown.dismiss.bs.modal")},s.prototype.resize=function(){this.isShown?a(window).on("resize.bs.modal",a.proxy(this.handleUpdate,this)):a(window).off("resize.bs.modal")},s.prototype.hideModal=function(){var t=this;this.$element.hide(),this.backdrop(function(){t.$body.removeClass("modal-open"),t.resetAdjustments(),t.resetScrollbar(),t.$element.trigger("hidden.bs.modal")})},s.prototype.removeBackdrop=function(){this.$backdrop&&this.$backdrop.remove(),this.$backdrop=null},s.prototype.backdrop=function(t){var e=this,i=this.$element.hasClass("fade")?"fade":"";if(this.isShown&&this.options.backdrop){var o=a.support.transition&&i;if(this.$backdrop=a(document.createElement("div")).addClass("modal-backdrop "+i).appendTo(this.$body),this.$element.on("click.dismiss.bs.modal",a.proxy(function(t){this.ignoreBackdropClick?this.ignoreBackdropClick=!1:t.target===t.currentTarget&&("static"==this.options.backdrop?this.$element[0].focus():this.hide())},this)),o&&this.$backdrop[0].offsetWidth,this.$backdrop.addClass("in"),!t)return;o?this.$backdrop.one("bsTransitionEnd",t).emulateTransitionEnd(s.BACKDROP_TRANSITION_DURATION):t()}else if(!this.isShown&&this.$backdrop){this.$backdrop.removeClass("in");var n=function(){e.removeBackdrop(),t&&t()};a.support.transition&&this.$element.hasClass("fade")?this.$backdrop.one("bsTransitionEnd",n).emulateTransitionEnd(s.BACKDROP_TRANSITION_DURATION):n()}else t&&t()},s.prototype.handleUpdate=function(){this.adjustDialog()},s.prototype.adjustDialog=function(){var t=this.$element[0].scrollHeight>document.documentElement.clientHeight;this.$element.css({paddingLeft:!this.bodyIsOverflowing&&t?this.scrollbarWidth:"",paddingRight:this.bodyIsOverflowing&&!t?this.scrollbarWidth:""})},s.prototype.resetAdjustments=function(){this.$element.css({paddingLeft:"",paddingRight:""})},s.prototype.checkScrollbar=function(){var t=window.innerWidth;if(!t){var e=document.documentElement.getBoundingClientRect();t=e.right-Math.abs(e.left)}this.bodyIsOverflowing=document.body.clientWidth<t,this.scrollbarWidth=this.measureScrollbar()},s.prototype.setScrollbar=function(){var t=parseInt(this.$body.css("padding-right")||0,10);this.originalBodyPad=document.body.style.paddingRight||"";var n=this.scrollbarWidth;this.bodyIsOverflowing&&(this.$body.css("padding-right",t+n),a(this.fixedContent).each(function(t,e){var i=e.style.paddingRight,o=a(e).css("padding-right");a(e).data("padding-right",i).css("padding-right",parseFloat(o)+n+"px")}))},s.prototype.resetScrollbar=function(){this.$body.css("padding-right",this.originalBodyPad),a(this.fixedContent).each(function(t,e){var i=a(e).data("padding-right");a(e).removeData("padding-right"),e.style.paddingRight=i||""})},s.prototype.measureScrollbar=function(){var t=document.createElement("div");t.className="modal-scrollbar-measure",this.$body.append(t);var e=t.offsetWidth-t.clientWidth;return this.$body[0].removeChild(t),e};var t=a.fn.modal;a.fn.modal=r,a.fn.modal.Constructor=s,a.fn.modal.noConflict=function(){return a.fn.modal=t,this},a(document).on("click.bs.modal.data-api",'[data-toggle="modal"]',function(t){var e=a(this),i=e.attr("href"),o=e.attr("data-target")||i&&i.replace(/.*(?=#[^\s]+$)/,""),n=a(document).find(o),s=n.data("bs.modal")?"toggle":a.extend({remote:!/#/.test(i)&&i},n.data(),e.data());e.is("a")&&t.preventDefault(),n.one("show.bs.modal",function(t){t.isDefaultPrevented()||n.one("hidden.bs.modal",function(){e.is(":visible")&&e.trigger("focus")})}),r.call(n,s,this)})}(jQuery),function(g){"use strict";var o=["sanitize","whiteList","sanitizeFn"],a=["background","cite","href","itemtype","longdesc","poster","src","xlink:href"],t={"*":["class","dir","id","lang","role",/^aria-[\w-]*$/i],a:["target","href","title","rel"],area:[],b:[],br:[],col:[],code:[],div:[],em:[],hr:[],h1:[],h2:[],h3:[],h4:[],h5:[],h6:[],i:[],img:["src","alt","title","width","height"],li:[],ol:[],p:[],pre:[],s:[],small:[],span:[],sub:[],sup:[],strong:[],u:[],ul:[]},r=/^(?:(?:https?|mailto|ftp|tel|file):|[^&:/?#]*(?:[/?#]|$))/gi,l=/^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[a-z0-9+/]+=*$/i;function u(t,e){var i=t.nodeName.toLowerCase();if(-1!==g.inArray(i,e))return-1===g.inArray(i,a)||Boolean(t.nodeValue.match(r)||t.nodeValue.match(l));for(var o=g(e).filter(function(t,e){return e instanceof RegExp}),n=0,s=o.length;n<s;n++)if(i.match(o[n]))return!0;return!1}function n(t,e,i){if(0===t.length)return t;if(i&&"function"==typeof i)return i(t);if(!document.implementation||!document.implementation.createHTMLDocument)return t;var o=document.implementation.createHTMLDocument("sanitization");o.body.innerHTML=t;for(var n=g.map(e,function(t,e){return e}),s=g(o.body).find("*"),a=0,r=s.length;a<r;a++){var l=s[a],h=l.nodeName.toLowerCase();if(-1!==g.inArray(h,n))for(var d=g.map(l.attributes,function(t){return t}),p=[].concat(e["*"]||[],e[h]||[]),c=0,f=d.length;c<f;c++)u(d[c],p)||l.removeAttribute(d[c].nodeName);else l.parentNode.removeChild(l)}return o.body.innerHTML}var m=function(t,e){this.type=null,this.options=null,this.enabled=null,this.timeout=null,this.hoverState=null,this.$element=null,this.inState=null,this.init("tooltip",t,e)};m.VERSION="3.4.1",m.TRANSITION_DURATION=150,m.DEFAULTS={animation:!0,placement:"top",selector:!1,template:'<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',trigger:"hover focus",title:"",delay:0,html:!1,container:!1,viewport:{selector:"body",padding:0},sanitize:!0,sanitizeFn:null,whiteList:t},m.prototype.init=function(t,e,i){if(this.enabled=!0,this.type=t,this.$element=g(e),this.options=this.getOptions(i),this.$viewport=this.options.viewport&&g(document).find(g.isFunction(this.options.viewport)?this.options.viewport.call(this,this.$element):this.options.viewport.selector||this.options.viewport),this.inState={click:!1,hover:!1,focus:!1},this.$element[0]instanceof document.constructor&&!this.options.selector)throw new Error("`selector` option must be specified when initializing "+this.type+" on the window.document object!");for(var o=this.options.trigger.split(" "),n=o.length;n--;){var s=o[n];if("click"==s)this.$element.on("click."+this.type,this.options.selector,g.proxy(this.toggle,this));else if("manual"!=s){var a="hover"==s?"mouseenter":"focusin",r="hover"==s?"mouseleave":"focusout";this.$element.on(a+"."+this.type,this.options.selector,g.proxy(this.enter,this)),this.$element.on(r+"."+this.type,this.options.selector,g.proxy(this.leave,this))}}this.options.selector?this._options=g.extend({},this.options,{trigger:"manual",selector:""}):this.fixTitle()},m.prototype.getDefaults=function(){return m.DEFAULTS},m.prototype.getOptions=function(t){var e=this.$element.data();for(var i in e)e.hasOwnProperty(i)&&-1!==g.inArray(i,o)&&delete e[i];return(t=g.extend({},this.getDefaults(),e,t)).delay&&"number"==typeof t.delay&&(t.delay={show:t.delay,hide:t.delay}),t.sanitize&&(t.template=n(t.template,t.whiteList,t.sanitizeFn)),t},m.prototype.getDelegateOptions=function(){var i={},o=this.getDefaults();return this._options&&g.each(this._options,function(t,e){o[t]!=e&&(i[t]=e)}),i},m.prototype.enter=function(t){var e=t instanceof this.constructor?t:g(t.currentTarget).data("bs."+this.type);if(e||(e=new this.constructor(t.currentTarget,this.getDelegateOptions()),g(t.currentTarget).data("bs."+this.type,e)),t instanceof g.Event&&(e.inState["focusin"==t.type?"focus":"hover"]=!0),e.tip().hasClass("in")||"in"==e.hoverState)e.hoverState="in";else{if(clearTimeout(e.timeout),e.hoverState="in",!e.options.delay||!e.options.delay.show)return e.show();e.timeout=setTimeout(function(){"in"==e.hoverState&&e.show()},e.options.delay.show)}},m.prototype.isInStateTrue=function(){for(var t in this.inState)if(this.inState[t])return!0;return!1},m.prototype.leave=function(t){var e=t instanceof this.constructor?t:g(t.currentTarget).data("bs."+this.type);if(e||(e=new this.constructor(t.currentTarget,this.getDelegateOptions()),g(t.currentTarget).data("bs."+this.type,e)),t instanceof g.Event&&(e.inState["focusout"==t.type?"focus":"hover"]=!1),!e.isInStateTrue()){if(clearTimeout(e.timeout),e.hoverState="out",!e.options.delay||!e.options.delay.hide)return e.hide();e.timeout=setTimeout(function(){"out"==e.hoverState&&e.hide()},e.options.delay.hide)}},m.prototype.show=function(){var t=g.Event("show.bs."+this.type);if(this.hasContent()&&this.enabled){this.$element.trigger(t);var e=g.contains(this.$element[0].ownerDocument.documentElement,this.$element[0]);if(t.isDefaultPrevented()||!e)return;var i=this,o=this.tip(),n=this.getUID(this.type);this.setContent(),o.attr("id",n),this.$element.attr("aria-describedby",n),this.options.animation&&o.addClass("fade");var s="function"==typeof this.options.placement?this.options.placement.call(this,o[0],this.$element[0]):this.options.placement,a=/\s?auto?\s?/i,r=a.test(s);r&&(s=s.replace(a,"")||"top"),o.detach().css({top:0,left:0,display:"block"}).addClass(s).data("bs."+this.type,this),this.options.container?o.appendTo(g(document).find(this.options.container)):o.insertAfter(this.$element),this.$element.trigger("inserted.bs."+this.type);var l=this.getPosition(),h=o[0].offsetWidth,d=o[0].offsetHeight;if(r){var p=s,c=this.getPosition(this.$viewport);s="bottom"==s&&l.bottom+d>c.bottom?"top":"top"==s&&l.top-d<c.top?"bottom":"right"==s&&l.right+h>c.width?"left":"left"==s&&l.left-h<c.left?"right":s,o.removeClass(p).addClass(s)}var f=this.getCalculatedOffset(s,l,h,d);this.applyPlacement(f,s);var u=function(){var t=i.hoverState;i.$element.trigger("shown.bs."+i.type),i.hoverState=null,"out"==t&&i.leave(i)};g.support.transition&&this.$tip.hasClass("fade")?o.one("bsTransitionEnd",u).emulateTransitionEnd(m.TRANSITION_DURATION):u()}},m.prototype.applyPlacement=function(t,e){var i=this.tip(),o=i[0].offsetWidth,n=i[0].offsetHeight,s=parseInt(i.css("margin-top"),10),a=parseInt(i.css("margin-left"),10);isNaN(s)&&(s=0),isNaN(a)&&(a=0),t.top+=s,t.left+=a,g.offset.setOffset(i[0],g.extend({using:function(t){i.css({top:Math.round(t.top),left:Math.round(t.left)})}},t),0),i.addClass("in");var r=i[0].offsetWidth,l=i[0].offsetHeight;"top"==e&&l!=n&&(t.top=t.top+n-l);var h=this.getViewportAdjustedDelta(e,t,r,l);h.left?t.left+=h.left:t.top+=h.top;var d=/top|bottom/.test(e),p=d?2*h.left-o+r:2*h.top-n+l,c=d?"offsetWidth":"offsetHeight";i.offset(t),this.replaceArrow(p,i[0][c],d)},m.prototype.replaceArrow=function(t,e,i){this.arrow().css(i?"left":"top",50*(1-t/e)+"%").css(i?"top":"left","")},m.prototype.setContent=function(){var t=this.tip(),e=this.getTitle();this.options.html?(this.options.sanitize&&(e=n(e,this.options.whiteList,this.options.sanitizeFn)),t.find(".tooltip-inner").html(e)):t.find(".tooltip-inner").text(e),t.removeClass("fade in top bottom left right")},m.prototype.hide=function(t){var e=this,i=g(this.$tip),o=g.Event("hide.bs."+this.type);function n(){"in"!=e.hoverState&&i.detach(),e.$element&&e.$element.removeAttr("aria-describedby").trigger("hidden.bs."+e.type),t&&t()}if(this.$element.trigger(o),!o.isDefaultPrevented())return i.removeClass("in"),g.support.transition&&i.hasClass("fade")?i.one("bsTransitionEnd",n).emulateTransitionEnd(m.TRANSITION_DURATION):n(),this.hoverState=null,this},m.prototype.fixTitle=function(){var t=this.$element;(t.attr("title")||"string"!=typeof t.attr("data-original-title"))&&t.attr("data-original-title",t.attr("title")||"").attr("title","")},m.prototype.hasContent=function(){return this.getTitle()},m.prototype.getPosition=function(t){var e=(t=t||this.$element)[0],i="BODY"==e.tagName,o=e.getBoundingClientRect();null==o.width&&(o=g.extend({},o,{width:o.right-o.left,height:o.bottom-o.top}));var n=window.SVGElement&&e instanceof window.SVGElement,s=i?{top:0,left:0}:n?null:t.offset(),a={scroll:i?document.documentElement.scrollTop||document.body.scrollTop:t.scrollTop()},r=i?{width:g(window).width(),height:g(window).height()}:null;return g.extend({},o,a,r,s)},m.prototype.getCalculatedOffset=function(t,e,i,o){return"bottom"==t?{top:e.top+e.height,left:e.left+e.width/2-i/2}:"top"==t?{top:e.top-o,left:e.left+e.width/2-i/2}:"left"==t?{top:e.top+e.height/2-o/2,left:e.left-i}:{top:e.top+e.height/2-o/2,left:e.left+e.width}},m.prototype.getViewportAdjustedDelta=function(t,e,i,o){var n={top:0,left:0};if(!this.$viewport)return n;var s=this.options.viewport&&this.options.viewport.padding||0,a=this.getPosition(this.$viewport);if(/right|left/.test(t)){var r=e.top-s-a.scroll,l=e.top+s-a.scroll+o;r<a.top?n.top=a.top-r:l>a.top+a.height&&(n.top=a.top+a.height-l)}else{var h=e.left-s,d=e.left+s+i;h<a.left?n.left=a.left-h:d>a.right&&(n.left=a.left+a.width-d)}return n},m.prototype.getTitle=function(){var t=this.$element,e=this.options;return t.attr("data-original-title")||("function"==typeof e.title?e.title.call(t[0]):e.title)},m.prototype.getUID=function(t){for(;t+=~~(1e6*Math.random()),document.getElementById(t););return t},m.prototype.tip=function(){if(!this.$tip&&(this.$tip=g(this.options.template),1!=this.$tip.length))throw new Error(this.type+" `template` option must consist of exactly 1 top-level element!");return this.$tip},m.prototype.arrow=function(){return this.$arrow=this.$arrow||this.tip().find(".tooltip-arrow")},m.prototype.enable=function(){this.enabled=!0},m.prototype.disable=function(){this.enabled=!1},m.prototype.toggleEnabled=function(){this.enabled=!this.enabled},m.prototype.toggle=function(t){var e=this;t&&((e=g(t.currentTarget).data("bs."+this.type))||(e=new this.constructor(t.currentTarget,this.getDelegateOptions()),g(t.currentTarget).data("bs."+this.type,e))),t?(e.inState.click=!e.inState.click,e.isInStateTrue()?e.enter(e):e.leave(e)):e.tip().hasClass("in")?e.leave(e):e.enter(e)},m.prototype.destroy=function(){var t=this;clearTimeout(this.timeout),this.hide(function(){t.$element.off("."+t.type).removeData("bs."+t.type),t.$tip&&t.$tip.detach(),t.$tip=null,t.$arrow=null,t.$viewport=null,t.$element=null})},m.prototype.sanitizeHtml=function(t){return n(t,this.options.whiteList,this.options.sanitizeFn)};var e=g.fn.tooltip;g.fn.tooltip=function i(o){return this.each(function(){var t=g(this),e=t.data("bs.tooltip"),i="object"==typeof o&&o;!e&&/destroy|hide/.test(o)||(e||t.data("bs.tooltip",e=new m(this,i)),"string"==typeof o&&e[o]())})},g.fn.tooltip.Constructor=m,g.fn.tooltip.noConflict=function(){return g.fn.tooltip=e,this}}(jQuery),function(n){"use strict";var s=function(t,e){this.init("popover",t,e)};if(!n.fn.tooltip)throw new Error("Popover requires tooltip.js");s.VERSION="3.4.1",s.DEFAULTS=n.extend({},n.fn.tooltip.Constructor.DEFAULTS,{placement:"right",trigger:"click",content:"",template:'<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'}),((s.prototype=n.extend({},n.fn.tooltip.Constructor.prototype)).constructor=s).prototype.getDefaults=function(){return s.DEFAULTS},s.prototype.setContent=function(){var t=this.tip(),e=this.getTitle(),i=this.getContent();if(this.options.html){var o=typeof i;this.options.sanitize&&(e=this.sanitizeHtml(e),"string"===o&&(i=this.sanitizeHtml(i))),t.find(".popover-title").html(e),t.find(".popover-content").children().detach().end()["string"===o?"html":"append"](i)}else t.find(".popover-title").text(e),t.find(".popover-content").children().detach().end().text(i);t.removeClass("fade top bottom left right in"),t.find(".popover-title").html()||t.find(".popover-title").hide()},s.prototype.hasContent=function(){return this.getTitle()||this.getContent()},s.prototype.getContent=function(){var t=this.$element,e=this.options;return t.attr("data-content")||("function"==typeof e.content?e.content.call(t[0]):e.content)},s.prototype.arrow=function(){return this.$arrow=this.$arrow||this.tip().find(".arrow")};var t=n.fn.popover;n.fn.popover=function e(o){return this.each(function(){var t=n(this),e=t.data("bs.popover"),i="object"==typeof o&&o;!e&&/destroy|hide/.test(o)||(e||t.data("bs.popover",e=new s(this,i)),"string"==typeof o&&e[o]())})},n.fn.popover.Constructor=s,n.fn.popover.noConflict=function(){return n.fn.popover=t,this}}(jQuery),function(s){"use strict";function n(t,e){this.$body=s(document.body),this.$scrollElement=s(t).is(document.body)?s(window):s(t),this.options=s.extend({},n.DEFAULTS,e),this.selector=(this.options.target||"")+" .nav li > a",this.offsets=[],this.targets=[],this.activeTarget=null,this.scrollHeight=0,this.$scrollElement.on("scroll.bs.scrollspy",s.proxy(this.process,this)),this.refresh(),this.process()}function e(o){return this.each(function(){var t=s(this),e=t.data("bs.scrollspy"),i="object"==typeof o&&o;e||t.data("bs.scrollspy",e=new n(this,i)),"string"==typeof o&&e[o]()})}n.VERSION="3.4.1",n.DEFAULTS={offset:10},n.prototype.getScrollHeight=function(){return this.$scrollElement[0].scrollHeight||Math.max(this.$body[0].scrollHeight,document.documentElement.scrollHeight)},n.prototype.refresh=function(){var t=this,o="offset",n=0;this.offsets=[],this.targets=[],this.scrollHeight=this.getScrollHeight(),s.isWindow(this.$scrollElement[0])||(o="position",n=this.$scrollElement.scrollTop()),this.$body.find(this.selector).map(function(){var t=s(this),e=t.data("target")||t.attr("href"),i=/^#./.test(e)&&s(e);return i&&i.length&&i.is(":visible")&&[[i[o]().top+n,e]]||null}).sort(function(t,e){return t[0]-e[0]}).each(function(){t.offsets.push(this[0]),t.targets.push(this[1])})},n.prototype.process=function(){var t,e=this.$scrollElement.scrollTop()+this.options.offset,i=this.getScrollHeight(),o=this.options.offset+i-this.$scrollElement.height(),n=this.offsets,s=this.targets,a=this.activeTarget;if(this.scrollHeight!=i&&this.refresh(),o<=e)return a!=(t=s[s.length-1])&&this.activate(t);if(a&&e<n[0])return this.activeTarget=null,this.clear();for(t=n.length;t--;)a!=s[t]&&e>=n[t]&&(n[t+1]===undefined||e<n[t+1])&&this.activate(s[t])},n.prototype.activate=function(t){this.activeTarget=t,this.clear();var e=this.selector+'[data-target="'+t+'"],'+this.selector+'[href="'+t+'"]',i=s(e).parents("li").addClass("active");i.parent(".dropdown-menu").length&&(i=i.closest("li.dropdown").addClass("active")),i.trigger("activate.bs.scrollspy")},n.prototype.clear=function(){s(this.selector).parentsUntil(this.options.target,".active").removeClass("active")};var t=s.fn.scrollspy;s.fn.scrollspy=e,s.fn.scrollspy.Constructor=n,s.fn.scrollspy.noConflict=function(){return s.fn.scrollspy=t,this},s(window).on("load.bs.scrollspy.data-api",function(){s('[data-spy="scroll"]').each(function(){var t=s(this);e.call(t,t.data())})})}(jQuery),function(r){"use strict";var a=function(t){this.element=r(t)};function e(i){return this.each(function(){var t=r(this),e=t.data("bs.tab");e||t.data("bs.tab",e=new a(this)),"string"==typeof i&&e[i]()})}a.VERSION="3.4.1",a.TRANSITION_DURATION=150,a.prototype.show=function(){var t=this.element,e=t.closest("ul:not(.dropdown-menu)"),i=t.data("target");if(i||(i=(i=t.attr("href"))&&i.replace(/.*(?=#[^\s]*$)/,"")),!t.parent("li").hasClass("active")){var o=e.find(".active:last a"),n=r.Event("hide.bs.tab",{relatedTarget:t[0]}),s=r.Event("show.bs.tab",{relatedTarget:o[0]});if(o.trigger(n),t.trigger(s),!s.isDefaultPrevented()&&!n.isDefaultPrevented()){var a=r(document).find(i);this.activate(t.closest("li"),e),this.activate(a,a.parent(),function(){o.trigger({type:"hidden.bs.tab",relatedTarget:t[0]}),t.trigger({type:"shown.bs.tab",relatedTarget:o[0]})})}}},a.prototype.activate=function(t,e,i){var o=e.find("> .active"),n=i&&r.support.transition&&(o.length&&o.hasClass("fade")||!!e.find("> .fade").length);function s(){o.removeClass("active").find("> .dropdown-menu > .active").removeClass("active").end().find('[data-toggle="tab"]').attr("aria-expanded",!1),t.addClass("active").find('[data-toggle="tab"]').attr("aria-expanded",!0),n?(t[0].offsetWidth,t.addClass("in")):t.removeClass("fade"),t.parent(".dropdown-menu").length&&t.closest("li.dropdown").addClass("active").end().find('[data-toggle="tab"]').attr("aria-expanded",!0),i&&i()}o.length&&n?o.one("bsTransitionEnd",s).emulateTransitionEnd(a.TRANSITION_DURATION):s(),o.removeClass("in")};var t=r.fn.tab;r.fn.tab=e,r.fn.tab.Constructor=a,r.fn.tab.noConflict=function(){return r.fn.tab=t,this};var i=function(t){t.preventDefault(),e.call(r(this),"show")};r(document).on("click.bs.tab.data-api",'[data-toggle="tab"]',i).on("click.bs.tab.data-api",'[data-toggle="pill"]',i)}(jQuery),function(l){"use strict";var h=function(t,e){this.options=l.extend({},h.DEFAULTS,e);var i=this.options.target===h.DEFAULTS.target?l(this.options.target):l(document).find(this.options.target);this.$target=i.on("scroll.bs.affix.data-api",l.proxy(this.checkPosition,this)).on("click.bs.affix.data-api",l.proxy(this.checkPositionWithEventLoop,this)),this.$element=l(t),this.affixed=null,this.unpin=null,this.pinnedOffset=null,this.checkPosition()};function i(o){return this.each(function(){var t=l(this),e=t.data("bs.affix"),i="object"==typeof o&&o;e||t.data("bs.affix",e=new h(this,i)),"string"==typeof o&&e[o]()})}h.VERSION="3.4.1",h.RESET="affix affix-top affix-bottom",h.DEFAULTS={offset:0,target:window},h.prototype.getState=function(t,e,i,o){var n=this.$target.scrollTop(),s=this.$element.offset(),a=this.$target.height();if(null!=i&&"top"==this.affixed)return n<i&&"top";if("bottom"==this.affixed)return null!=i?!(n+this.unpin<=s.top)&&"bottom":!(n+a<=t-o)&&"bottom";var r=null==this.affixed,l=r?n:s.top;return null!=i&&n<=i?"top":null!=o&&t-o<=l+(r?a:e)&&"bottom"},h.prototype.getPinnedOffset=function(){if(this.pinnedOffset)return this.pinnedOffset;this.$element.removeClass(h.RESET).addClass("affix");var t=this.$target.scrollTop(),e=this.$element.offset();return this.pinnedOffset=e.top-t},h.prototype.checkPositionWithEventLoop=function(){setTimeout(l.proxy(this.checkPosition,this),1)},h.prototype.checkPosition=function(){if(this.$element.is(":visible")){var t=this.$element.height(),e=this.options.offset,i=e.top,o=e.bottom,n=Math.max(l(document).height(),l(document.body).height());"object"!=typeof e&&(o=i=e),"function"==typeof i&&(i=e.top(this.$element)),"function"==typeof o&&(o=e.bottom(this.$element));var s=this.getState(n,t,i,o);if(this.affixed!=s){null!=this.unpin&&this.$element.css("top","");var a="affix"+(s?"-"+s:""),r=l.Event(a+".bs.affix");if(this.$element.trigger(r),r.isDefaultPrevented())return;this.affixed=s,this.unpin="bottom"==s?this.getPinnedOffset():null,this.$element.removeClass(h.RESET).addClass(a).trigger(a.replace("affix","affixed")+".bs.affix")}"bottom"==s&&this.$element.offset({top:n-t-o})}};var t=l.fn.affix;l.fn.affix=i,l.fn.affix.Constructor=h,l.fn.affix.noConflict=function(){return l.fn.affix=t,this},l(window).on("load",function(){l('[data-spy="affix"]').each(function(){var t=l(this),e=t.data();e.offset=e.offset||{},null!=e.offsetBottom&&(e.offset.bottom=e.offsetBottom),null!=e.offsetTop&&(e.offset.top=e.offsetTop),i.call(t,e)})})}(jQuery);;
/*!
 * Bootstrap-select v1.13.2 (https://developer.snapappointments.com/bootstrap-select)
 *
 * Copyright 2012-2018 SnapAppointments, LLC
 * Licensed under MIT (https://github.com/snapappointments/bootstrap-select/blob/master/LICENSE)
 */

!function(e,t){void 0===e&&void 0!==window&&(e=window),"function"==typeof define&&define.amd?define(["jquery"],function(e){return t(e)}):"object"==typeof module&&module.exports?module.exports=t(require("jquery")):t(e.jQuery)}(this,function(e){!function(F){"use strict";var e,a,t,i=document.createElement("_");if(i.classList.toggle("c3",!1),i.classList.contains("c3")){var s=DOMTokenList.prototype.toggle;DOMTokenList.prototype.toggle=function(e,t){return 1 in arguments&&!this.contains(e)==!t?t:s.call(this,e)}}function S(e){var t,i=[],s=e&&e.options;if(e.multiple)for(var n=0,o=s.length;n<o;n++)(t=s[n]).selected&&i.push(t.value||t.text);else i=e.value;return i}String.prototype.startsWith||(e=function(){try{var e={},t=Object.defineProperty,i=t(e,e,e)&&t}catch(e){}return i}(),a={}.toString,t=function(e){if(null==this)throw new TypeError;var t=String(this);if(e&&"[object RegExp]"==a.call(e))throw new TypeError;var i=t.length,s=String(e),n=s.length,o=1<arguments.length?arguments[1]:void 0,l=o?Number(o):0;l!=l&&(l=0);var r=Math.min(Math.max(l,0),i);if(i<n+r)return!1;for(var c=-1;++c<n;)if(t.charCodeAt(r+c)!=s.charCodeAt(c))return!1;return!0},e?e(String.prototype,"startsWith",{value:t,configurable:!0,writable:!0}):String.prototype.startsWith=t),Object.keys||(Object.keys=function(e,t,i){for(t in i=[],e)i.hasOwnProperty.call(e,t)&&i.push(t);return i});var n={useDefault:!1,_set:F.valHooks.select.set};F.valHooks.select.set=function(e,t){return t&&!n.useDefault&&F(e).data("selected",!0),n._set.apply(this,arguments)};var y=null,o=function(){try{return new Event("change"),!0}catch(e){return!1}}();function $(e,t,i,s){for(var n=["content","subtext","tokens"],o=!1,l=0;l<n.length;l++){var r=n[l],c=e[r];if(c&&(c=c.toString(),"content"===r&&(c=c.replace(/<[^>]+>/g,"")),s&&(c=d(c)),c=c.toUpperCase(),o="contains"===i?0<=c.indexOf(t):c.startsWith(t)))break}return o}function O(e){return parseInt(e,10)||0}function d(e){return F.each([{re:/[\xC0-\xC6]/g,ch:"A"},{re:/[\xE0-\xE6]/g,ch:"a"},{re:/[\xC8-\xCB]/g,ch:"E"},{re:/[\xE8-\xEB]/g,ch:"e"},{re:/[\xCC-\xCF]/g,ch:"I"},{re:/[\xEC-\xEF]/g,ch:"i"},{re:/[\xD2-\xD6]/g,ch:"O"},{re:/[\xF2-\xF6]/g,ch:"o"},{re:/[\xD9-\xDC]/g,ch:"U"},{re:/[\xF9-\xFC]/g,ch:"u"},{re:/[\xC7-\xE7]/g,ch:"c"},{re:/[\xD1]/g,ch:"N"},{re:/[\xF1]/g,ch:"n"}],function(){e=e?e.replace(this.re,this.ch):""}),e}F.fn.triggerNative=function(e){var t,i=this[0];i.dispatchEvent?(o?t=new Event(e,{bubbles:!0}):(t=document.createEvent("Event")).initEvent(e,!0,!1),i.dispatchEvent(t)):i.fireEvent?((t=document.createEventObject()).eventType=e,i.fireEvent("on"+e,t)):this.trigger(e)};var l=function(t){var i=function(e){return t[e]},e="(?:"+Object.keys(t).join("|")+")",s=RegExp(e),n=RegExp(e,"g");return function(e){return e=null==e?"":""+e,s.test(e)?e.replace(n,i):e}},G=l({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;"}),f=l({"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&#x27;":"'","&#x60;":"`"}),E={32:" ",48:"0",49:"1",50:"2",51:"3",52:"4",53:"5",54:"6",55:"7",56:"8",57:"9",59:";",65:"A",66:"B",67:"C",68:"D",69:"E",70:"F",71:"G",72:"H",73:"I",74:"J",75:"K",76:"L",77:"M",78:"N",79:"O",80:"P",81:"Q",82:"R",83:"S",84:"T",85:"U",86:"V",87:"W",88:"X",89:"Y",90:"Z",96:"0",97:"1",98:"2",99:"3",100:"4",101:"5",102:"6",103:"7",104:"8",105:"9"},C=27,z=13,T=32,D=9,H=38,L=40,_={success:!1,major:"3"};try{_.full=(F.fn.dropdown.Constructor.VERSION||"").split(" ")[0].split("."),_.major=_.full[0],_.success=!0}catch(e){console.warn("There was an issue retrieving Bootstrap's version. Ensure Bootstrap is being loaded before bootstrap-select and there is no namespace collision. If loading Bootstrap asynchronously, the version may need to be manually specified via $.fn.selectpicker.Constructor.BootstrapVersion.",e)}var q={DISABLED:"disabled",DIVIDER:"divider",SHOW:"open",DROPUP:"dropup",MENU:"dropdown-menu",MENURIGHT:"dropdown-menu-right",MENULEFT:"dropdown-menu-left",BUTTONCLASS:"btn-default",POPOVERHEADER:"popover-title"},N={MENU:"."+q.MENU};"4"===_.major&&(q.DIVIDER="dropdown-divider",q.SHOW="show",q.BUTTONCLASS="btn-light",q.POPOVERHEADER="popover-header");var A=new RegExp(H+"|"+L),P=new RegExp("^"+D+"$|"+C),c=(new RegExp(z+"|"+T),function(e,t){var i=this;n.useDefault||(F.valHooks.select.set=n._set,n.useDefault=!0),this.$element=F(e),this.$newElement=null,this.$button=null,this.$menu=null,this.options=t,this.selectpicker={main:{map:{newIndex:{},originalIndex:{}}},current:{map:{}},search:{map:{}},view:{},keydown:{keyHistory:"",resetKeyHistory:{start:function(){return setTimeout(function(){i.selectpicker.keydown.keyHistory=""},800)}}}},null===this.options.title&&(this.options.title=this.$element.attr("title"));var s=this.options.windowPadding;"number"==typeof s&&(this.options.windowPadding=[s,s,s,s]),this.val=c.prototype.val,this.render=c.prototype.render,this.refresh=c.prototype.refresh,this.setStyle=c.prototype.setStyle,this.selectAll=c.prototype.selectAll,this.deselectAll=c.prototype.deselectAll,this.destroy=c.prototype.destroy,this.remove=c.prototype.remove,this.show=c.prototype.show,this.hide=c.prototype.hide,this.init()});function r(e){var o,l=arguments,r=e;if([].shift.apply(l),!_.success){try{_.full=(F.fn.dropdown.Constructor.VERSION||"").split(" ")[0].split(".")}catch(e){_.full=c.BootstrapVersion.split(" ")[0].split(".")}_.major=_.full[0],_.success=!0,"4"===_.major&&(q.DIVIDER="dropdown-divider",q.SHOW="show",q.BUTTONCLASS="btn-light",c.DEFAULTS.style=q.BUTTONCLASS="btn-light",q.POPOVERHEADER="popover-header")}var t=this.each(function(){var e=F(this);if(e.is("select")){var t=e.data("selectpicker"),i="object"==typeof r&&r;if(t){if(i)for(var s in i)i.hasOwnProperty(s)&&(t.options[s]=i[s])}else{var n=F.extend({},c.DEFAULTS,F.fn.selectpicker.defaults||{},e.data(),i);n.template=F.extend({},c.DEFAULTS.template,F.fn.selectpicker.defaults?F.fn.selectpicker.defaults.template:{},e.data().template,i.template),e.data("selectpicker",t=new c(this,n))}"string"==typeof r&&(o=t[r]instanceof Function?t[r].apply(t,l):t.options[r])}});return void 0!==o?o:t}c.VERSION="1.13.2",c.BootstrapVersion=_.major,c.DEFAULTS={noneSelectedText:"Nothing selected",noneResultsText:"No results matched {0}",countSelectedText:function(e,t){return 1==e?"{0} item selected":"{0} items selected"},maxOptionsText:function(e,t){return[1==e?"Limit reached ({n} item max)":"Limit reached ({n} items max)",1==t?"Group limit reached ({n} item max)":"Group limit reached ({n} items max)"]},selectAllText:"Select All",deselectAllText:"Deselect All",doneButton:!1,doneButtonText:"Close",multipleSeparator:", ",styleBase:"btn",style:q.BUTTONCLASS,size:"auto",title:null,selectedTextFormat:"values",width:!1,container:!1,hideDisabled:!1,showSubtext:!1,showIcon:!0,showContent:!0,dropupAuto:!0,header:!1,liveSearch:!1,liveSearchPlaceholder:null,liveSearchNormalize:!1,liveSearchStyle:"contains",actionsBox:!1,iconBase:"glyphicon",tickIcon:"glyphicon-ok",showTick:!1,template:{caret:'<span class="caret"></span>'},maxOptions:!1,mobile:!1,selectOnTab:!1,dropdownAlignRight:!1,windowPadding:0,virtualScroll:600,display:!1},"4"===_.major&&(c.DEFAULTS.style="btn-light",c.DEFAULTS.iconBase="",c.DEFAULTS.tickIcon="bs-ok-default"),c.prototype={constructor:c,init:function(){var i=this,e=this.$element.attr("id");this.$element.addClass("bs-select-hidden"),this.multiple=this.$element.prop("multiple"),this.autofocus=this.$element.prop("autofocus"),this.$newElement=this.createDropdown(),this.createLi(),this.$element.after(this.$newElement).prependTo(this.$newElement),this.$button=this.$newElement.children("button"),this.$menu=this.$newElement.children(N.MENU),this.$menuInner=this.$menu.children(".inner"),this.$searchbox=this.$menu.find("input"),this.$element.removeClass("bs-select-hidden"),!0===this.options.dropdownAlignRight&&this.$menu.addClass(q.MENURIGHT),void 0!==e&&this.$button.attr("data-id",e),this.checkDisabled(),this.clickListener(),this.options.liveSearch&&this.liveSearchListener(),this.render(),this.setStyle(),this.setWidth(),this.options.container?this.selectPosition():this.$element.on("hide.bs.select",function(){if(i.isVirtual()){var e=i.$menuInner[0],t=e.firstChild.cloneNode(!1);e.replaceChild(t,e.firstChild),e.scrollTop=0}}),this.$menu.data("this",this),this.$newElement.data("this",this),this.options.mobile&&this.mobile(),this.$newElement.on({"hide.bs.dropdown":function(e){i.$menuInner.attr("aria-expanded",!1),i.$element.trigger("hide.bs.select",e)},"hidden.bs.dropdown":function(e){i.$element.trigger("hidden.bs.select",e)},"show.bs.dropdown":function(e){i.$menuInner.attr("aria-expanded",!0),i.$element.trigger("show.bs.select",e)},"shown.bs.dropdown":function(e){i.$element.trigger("shown.bs.select",e)}}),i.$element[0].hasAttribute("required")&&this.$element.on("invalid",function(){i.$button.addClass("bs-invalid"),i.$element.on({"shown.bs.select":function(){i.$element.val(i.$element.val()).off("shown.bs.select")},"rendered.bs.select":function(){this.validity.valid&&i.$button.removeClass("bs-invalid"),i.$element.off("rendered.bs.select")}}),i.$button.on("blur.bs.select",function(){i.$element.focus().blur(),i.$button.off("blur.bs.select")})}),setTimeout(function(){i.$element.trigger("loaded.bs.select")})},createDropdown:function(){var e=this.multiple||this.options.showTick?" show-tick":"",t=this.autofocus?" autofocus":"",i=this.options.header?'<div class="'+q.POPOVERHEADER+'"><button type="button" class="close" aria-hidden="true">&times;</button>'+this.options.header+"</div>":"",s=this.options.liveSearch?'<div class="bs-searchbox"><input type="text" class="form-control" autocomplete="off"'+(null===this.options.liveSearchPlaceholder?"":' placeholder="'+G(this.options.liveSearchPlaceholder)+'"')+' role="textbox" aria-label="Search"></div>':"",n=this.multiple&&this.options.actionsBox?'<div class="bs-actionsbox"><div class="btn-group btn-group-sm btn-block"><button type="button" class="actions-btn bs-select-all btn '+q.BUTTONCLASS+'">'+this.options.selectAllText+'</button><button type="button" class="actions-btn bs-deselect-all btn '+q.BUTTONCLASS+'">'+this.options.deselectAllText+"</button></div></div>":"",o=this.multiple&&this.options.doneButton?'<div class="bs-donebutton"><div class="btn-group btn-block"><button type="button" class="btn btn-sm '+q.BUTTONCLASS+'">'+this.options.doneButtonText+"</button></div></div>":"",l='<div class="dropdown bootstrap-select'+e+'"><button type="button" class="'+this.options.styleBase+' dropdown-toggle" '+("static"===this.options.display?'data-display="static"':"")+'data-toggle="dropdown"'+t+' role="button"><div class="filter-option"><div class="filter-option-inner"><div class="filter-option-inner-inner"></div></div> </div>'+("4"===_.major?"":'<span class="bs-caret">'+this.options.template.caret+"</span>")+'</button><div class="'+q.MENU+" "+("4"===_.major?"":q.SHOW)+'" role="combobox">'+i+s+n+'<div class="inner '+q.SHOW+'" role="listbox" aria-expanded="false" tabindex="-1"><ul class="'+q.MENU+" inner "+("4"===_.major?q.SHOW:"")+'"></ul></div>'+o+"</div></div>";return F(l)},setPositionData:function(){this.selectpicker.view.canHighlight=[];for(var e=0;e<this.selectpicker.current.data.length;e++){var t=this.selectpicker.current.data[e],i=!0;"divider"===t.type?(i=!1,t.height=this.sizeInfo.dividerHeight):"optgroup-label"===t.type?(i=!1,t.height=this.sizeInfo.dropdownHeaderHeight):t.height=this.sizeInfo.liHeight,t.disabled&&(i=!1),this.selectpicker.view.canHighlight.push(i),t.position=(0===e?0:this.selectpicker.current.data[e-1].position)+t.height}},isVirtual:function(){return!1!==this.options.virtualScroll&&this.selectpicker.main.elements.length>=this.options.virtualScroll||!0===this.options.virtualScroll},createView:function(C,e){e=e||0;var O=this;this.selectpicker.current=C?this.selectpicker.search:this.selectpicker.main;var z,T,D=[];function i(e,t){var i,s,n,o,l,r,c,a,d,h=O.selectpicker.current.elements.length,p=[],u=void 0,f=!0,m=O.isVirtual();O.selectpicker.view.scrollTop=e,!0===m&&O.sizeInfo.hasScrollBar&&O.$menu[0].offsetWidth>O.sizeInfo.totalMenuWidth&&(O.sizeInfo.menuWidth=O.$menu[0].offsetWidth,O.sizeInfo.totalMenuWidth=O.sizeInfo.menuWidth+O.sizeInfo.scrollBarWidth,O.$menu.css("min-width",O.sizeInfo.menuWidth)),i=Math.ceil(O.sizeInfo.menuInnerHeight/O.sizeInfo.liHeight*1.5),s=Math.round(h/i)||1;for(var v=0;v<s;v++){var g=(v+1)*i;if(v===s-1&&(g=h),p[v]=[v*i+(v?1:0),g],!h)break;void 0===u&&e<=O.selectpicker.current.data[g-1].position-O.sizeInfo.menuInnerHeight&&(u=v)}if(void 0===u&&(u=0),l=[O.selectpicker.view.position0,O.selectpicker.view.position1],n=Math.max(0,u-1),o=Math.min(s-1,u+1),O.selectpicker.view.position0=Math.max(0,p[n][0])||0,O.selectpicker.view.position1=Math.min(h,p[o][1])||0,r=l[0]!==O.selectpicker.view.position0||l[1]!==O.selectpicker.view.position1,void 0!==O.activeIndex&&(T=O.selectpicker.current.elements[O.selectpicker.current.map.newIndex[O.prevActiveIndex]],D=O.selectpicker.current.elements[O.selectpicker.current.map.newIndex[O.activeIndex]],z=O.selectpicker.current.elements[O.selectpicker.current.map.newIndex[O.selectedIndex]],t&&(O.activeIndex!==O.selectedIndex&&(D.classList.remove("active"),D.firstChild&&D.firstChild.classList.remove("active")),O.activeIndex=void 0),O.activeIndex&&O.activeIndex!==O.selectedIndex&&z&&z.length&&(z.classList.remove("active"),z.firstChild&&z.firstChild.classList.remove("active"))),void 0!==O.prevActiveIndex&&O.prevActiveIndex!==O.activeIndex&&O.prevActiveIndex!==O.selectedIndex&&T&&T.length&&(T.classList.remove("active"),T.firstChild&&T.firstChild.classList.remove("active")),(t||r)&&(c=O.selectpicker.view.visibleElements?O.selectpicker.view.visibleElements.slice():[],O.selectpicker.view.visibleElements=O.selectpicker.current.elements.slice(O.selectpicker.view.position0,O.selectpicker.view.position1),O.setOptionStatus(),(C||!1===m&&t)&&(a=c,d=O.selectpicker.view.visibleElements,f=!(a.length===d.length&&a.every(function(e,t){return e===d[t]}))),(t||!0===m)&&f)){var b,w,x=O.$menuInner[0],I=document.createDocumentFragment(),k=x.firstChild.cloneNode(!1),$=!0===m?O.selectpicker.view.visibleElements:O.selectpicker.current.elements;x.replaceChild(k,x.firstChild);v=0;for(var E=$.length;v<E;v++)I.appendChild($[v]);!0===m&&(b=0===O.selectpicker.view.position0?0:O.selectpicker.current.data[O.selectpicker.view.position0-1].position,w=O.selectpicker.view.position1>h-1?0:O.selectpicker.current.data[h-1].position-O.selectpicker.current.data[O.selectpicker.view.position1-1].position,x.firstChild.style.marginTop=b+"px",x.firstChild.style.marginBottom=w+"px"),x.firstChild.appendChild(I)}if(O.prevActiveIndex=O.activeIndex,O.options.liveSearch){if(C&&t){var S,y=0;O.selectpicker.view.canHighlight[y]||(y=1+O.selectpicker.view.canHighlight.slice(1).indexOf(!0)),S=O.selectpicker.view.visibleElements[y],O.selectpicker.view.currentActive&&(O.selectpicker.view.currentActive.classList.remove("active"),O.selectpicker.view.currentActive.firstChild&&O.selectpicker.view.currentActive.firstChild.classList.remove("active")),S&&(S.classList.add("active"),S.firstChild&&S.firstChild.classList.add("active")),O.activeIndex=O.selectpicker.current.map.originalIndex[y]}}else O.$menuInner.focus()}this.setPositionData(),i(e,!0),this.$menuInner.off("scroll.createView").on("scroll.createView",function(e,t){O.noScroll||i(this.scrollTop,t),O.noScroll=!1}),F(window).off("resize.createView").on("resize.createView",function(){i(O.$menuInner[0].scrollTop)})},createLi:function(){var z,T=this,D=[],H=0,L=0,N=[],A=0,P=0,R=-1;this.selectpicker.view.titleOption||(this.selectpicker.view.titleOption=document.createElement("option"));var W={span:document.createElement("span"),subtext:document.createElement("small"),a:document.createElement("a"),li:document.createElement("li"),whitespace:document.createTextNode(" ")},e=W.span.cloneNode(!1),B=document.createDocumentFragment();e.className=T.options.iconBase+" "+T.options.tickIcon+" check-mark",W.a.appendChild(e),W.a.setAttribute("role","option"),W.subtext.className="text-muted",W.text=W.span.cloneNode(!1),W.text.className="text";var M=function(e,t,i,s){var n=W.li.cloneNode(!1);return e&&(1===e.nodeType||11===e.nodeType?n.appendChild(e):n.innerHTML=e),void 0!==i&&""!==i&&(n.className=i),null!=s&&n.classList.add("optgroup-"+s),n},U=function(e,t,i){var s=W.a.cloneNode(!0);return e&&(11===e.nodeType?s.appendChild(e):s.insertAdjacentHTML("beforeend",e)),void 0!==t&""!==t&&(s.className=t),"4"===_.major&&s.classList.add("dropdown-item"),i&&s.setAttribute("style",i),s},V=function(e){var t,i,s=W.text.cloneNode(!1);if(e.optionContent)s.innerHTML=e.optionContent;else{if(s.textContent=e.text,e.optionIcon){var n=W.whitespace.cloneNode(!1);(i=W.span.cloneNode(!1)).className=T.options.iconBase+" "+e.optionIcon,B.appendChild(i),B.appendChild(n)}e.optionSubtext&&((t=W.subtext.cloneNode(!1)).innerHTML=e.optionSubtext,s.appendChild(t))}return B.appendChild(s),B};if(this.options.title&&!this.multiple){R--;var t=this.$element[0],i=!1,s=!this.selectpicker.view.titleOption.parentNode;if(s)this.selectpicker.view.titleOption.className="bs-title-option",this.selectpicker.view.titleOption.value="",i=void 0===F(t.options[t.selectedIndex]).attr("selected")&&void 0===this.$element.data("selected");(s||0!==this.selectpicker.view.titleOption.index)&&t.insertBefore(this.selectpicker.view.titleOption,t.firstChild),i&&(t.selectedIndex=0)}var j=this.$element.find("option");j.each(function(e){var t=F(this);if(R++,!t.hasClass("bs-title-option")){var i,s,n=t.data(),o=this.className||"",l=G(this.style.cssText),r=n.content,c=this.textContent,a=n.tokens,d=n.subtext,h=n.icon,p=t.parent(),u=p[0],f="OPTGROUP"===u.tagName,m=f&&u.disabled,v=this.disabled||m,g=this.previousElementSibling&&"OPTGROUP"===this.previousElementSibling.tagName,b=p.data();if(!0===n.hidden||T.options.hideDisabled&&(v&&!f||m)){i=n.prevHiddenIndex,t.next().data("prevHiddenIndex",void 0!==i?i:e),R--,g||void 0!==i&&(y=j[i].previousElementSibling)&&"OPTGROUP"===y.tagName&&!y.disabled&&(g=!0),g&&"divider"!==N[N.length-1].type&&(R++,D.push(M(!1,0,q.DIVIDER,A+"div")),N.push({type:"divider",optID:A}))}else{if(f&&!0!==n.divider){if(T.options.hideDisabled&&v){if(void 0===b.allOptionsDisabled){var w=p.children();p.data("allOptionsDisabled",w.filter(":disabled").length===w.length)}if(p.data("allOptionsDisabled"))return void R--}var x=" "+u.className||"";if(!this.previousElementSibling){A+=1;var I=u.label,k=G(I),$=b.subtext,E=b.icon;0!==e&&0<D.length&&(R++,D.push(M(!1,0,q.DIVIDER,A+"div")),N.push({type:"divider",optID:A})),R++;var S=function(e){var t,i,s=W.text.cloneNode(!1);if(s.innerHTML=e.labelEscaped,e.labelIcon){var n=W.whitespace.cloneNode(!1);(i=W.span.cloneNode(!1)).className=T.options.iconBase+" "+e.labelIcon,B.appendChild(i),B.appendChild(n)}return e.labelSubtext&&((t=W.subtext.cloneNode(!1)).textContent=e.labelSubtext,s.appendChild(t)),B.appendChild(s),B}({labelEscaped:k,labelSubtext:$,labelIcon:E});D.push(M(S,0,"dropdown-header"+x,A)),N.push({content:k,subtext:$,type:"optgroup-label",optID:A}),P=R-1}if(T.options.hideDisabled&&v||!0===n.hidden)return void R--;s=V({text:c,optionContent:r,optionSubtext:d,optionIcon:h}),D.push(M(U(s,"opt "+o+x,l),0,"",A)),N.push({content:r||c,subtext:d,tokens:a,type:"option",optID:A,headerIndex:P,lastIndex:P+u.childElementCount,originalIndex:e,data:n}),H++}else if(!0===n.divider)D.push(M(!1,0,q.DIVIDER)),N.push({type:"divider",originalIndex:e,data:n});else{var y;if(!g&&T.options.hideDisabled)if(void 0!==(i=n.prevHiddenIndex))(y=j[i].previousElementSibling)&&"OPTGROUP"===y.tagName&&!y.disabled&&(g=!0);g&&"divider"!==N[N.length-1].type&&(R++,D.push(M(!1,0,q.DIVIDER,A+"div")),N.push({type:"divider",optID:A})),s=V({text:c,optionContent:r,optionSubtext:d,optionIcon:h}),D.push(M(U(s,o,l))),N.push({content:r||c,subtext:d,tokens:a,type:"option",originalIndex:e,data:n}),H++}T.selectpicker.main.map.newIndex[e]=R,T.selectpicker.main.map.originalIndex[R]=e;var C=N[N.length-1];C.disabled=v;var O=0;C.content&&(O+=C.content.length),C.subtext&&(O+=C.subtext.length),h&&(O+=1),L<O&&(L=O,z=D[D.length-1])}}}),this.selectpicker.main.elements=D,this.selectpicker.main.data=N,this.selectpicker.current=this.selectpicker.main,this.selectpicker.view.widestOption=z,this.selectpicker.view.availableOptionsCount=H},findLis:function(){return this.$menuInner.find(".inner > li")},render:function(){var e=this,t=this.$element.find("option"),i=[],s=[];this.togglePlaceholder(),this.tabIndex();for(var n=0,o=this.selectpicker.main.elements.length;n<o;n++){var l=t[this.selectpicker.main.map.originalIndex[n]];if(l&&l.selected&&(i.push(l),s.length<100&&"count"!==e.options.selectedTextFormat||1===i.length)){if(e.options.hideDisabled&&(l.disabled||"OPTGROUP"===l.parentNode.tagName&&l.parentNode.disabled))return;var r,c,a=this.selectpicker.main.data[n].data,d=a.icon&&e.options.showIcon?'<i class="'+e.options.iconBase+" "+a.icon+'"></i> ':"";r=e.options.showSubtext&&a.subtext&&!e.multiple?' <small class="text-muted">'+a.subtext+"</small>":"",c=l.title?l.title:a.content&&e.options.showContent?a.content.toString():d+l.innerHTML.trim()+r,s.push(c)}}var h=this.multiple?s.join(this.options.multipleSeparator):s[0];if(50<i.length&&(h+="..."),this.multiple&&-1!==this.options.selectedTextFormat.indexOf("count")){var p=this.options.selectedTextFormat.split(">");if(1<p.length&&i.length>p[1]||1===p.length&&2<=i.length){var u=this.selectpicker.view.availableOptionsCount;h=("function"==typeof this.options.countSelectedText?this.options.countSelectedText(i.length,u):this.options.countSelectedText).replace("{0}",i.length.toString()).replace("{1}",u.toString())}}null==this.options.title&&(this.options.title=this.$element.attr("title")),"static"==this.options.selectedTextFormat&&(h=this.options.title),h||(h=void 0!==this.options.title?this.options.title:this.options.noneSelectedText),this.$button[0].title=f(h.replace(/<[^>]*>?/g,"").trim()),this.$button.find(".filter-option-inner-inner")[0].innerHTML=h,this.$element.trigger("rendered.bs.select")},setStyle:function(e,t){this.$element.attr("class")&&this.$newElement.addClass(this.$element.attr("class").replace(/selectpicker|mobile-device|bs-select-hidden|validate\[.*\]/gi,""));var i=e||this.options.style;"add"==t?this.$button.addClass(i):"remove"==t?this.$button.removeClass(i):(this.$button.removeClass(this.options.style),this.$button.addClass(i))},liHeight:function(e){if(e||!1!==this.options.size&&!this.sizeInfo){this.sizeInfo||(this.sizeInfo={});var t=document.createElement("div"),i=document.createElement("div"),s=document.createElement("div"),n=document.createElement("ul"),o=document.createElement("li"),l=document.createElement("li"),r=document.createElement("li"),c=document.createElement("a"),a=document.createElement("span"),d=this.options.header&&0<this.$menu.find("."+q.POPOVERHEADER).length?this.$menu.find("."+q.POPOVERHEADER)[0].cloneNode(!0):null,h=this.options.liveSearch?document.createElement("div"):null,p=this.options.actionsBox&&this.multiple&&0<this.$menu.find(".bs-actionsbox").length?this.$menu.find(".bs-actionsbox")[0].cloneNode(!0):null,u=this.options.doneButton&&this.multiple&&0<this.$menu.find(".bs-donebutton").length?this.$menu.find(".bs-donebutton")[0].cloneNode(!0):null;if(this.sizeInfo.selectWidth=this.$newElement[0].offsetWidth,a.className="text",c.className="dropdown-item "+this.$element.find("option")[0].className,t.className=this.$menu[0].parentNode.className+" "+q.SHOW,t.style.width=this.sizeInfo.selectWidth+"px","auto"===this.options.width&&(i.style.minWidth=0),i.className=q.MENU+" "+q.SHOW,s.className="inner "+q.SHOW,n.className=q.MENU+" inner "+("4"===_.major?q.SHOW:""),o.className=q.DIVIDER,l.className="dropdown-header",a.appendChild(document.createTextNode("Inner text")),c.appendChild(a),r.appendChild(c),l.appendChild(a.cloneNode(!0)),this.selectpicker.view.widestOption&&n.appendChild(this.selectpicker.view.widestOption.cloneNode(!0)),n.appendChild(r),n.appendChild(o),n.appendChild(l),d&&i.appendChild(d),h){var f=document.createElement("input");h.className="bs-searchbox",f.className="form-control",h.appendChild(f),i.appendChild(h)}p&&i.appendChild(p),s.appendChild(n),i.appendChild(s),u&&i.appendChild(u),t.appendChild(i),document.body.appendChild(t);var m,v=c.offsetHeight,g=l?l.offsetHeight:0,b=d?d.offsetHeight:0,w=h?h.offsetHeight:0,x=p?p.offsetHeight:0,I=u?u.offsetHeight:0,k=F(o).outerHeight(!0),$=!!window.getComputedStyle&&window.getComputedStyle(i),E=i.offsetWidth,S=$?null:F(i),y={vert:O($?$.paddingTop:S.css("paddingTop"))+O($?$.paddingBottom:S.css("paddingBottom"))+O($?$.borderTopWidth:S.css("borderTopWidth"))+O($?$.borderBottomWidth:S.css("borderBottomWidth")),horiz:O($?$.paddingLeft:S.css("paddingLeft"))+O($?$.paddingRight:S.css("paddingRight"))+O($?$.borderLeftWidth:S.css("borderLeftWidth"))+O($?$.borderRightWidth:S.css("borderRightWidth"))},C={vert:y.vert+O($?$.marginTop:S.css("marginTop"))+O($?$.marginBottom:S.css("marginBottom"))+2,horiz:y.horiz+O($?$.marginLeft:S.css("marginLeft"))+O($?$.marginRight:S.css("marginRight"))+2};s.style.overflowY="scroll",m=i.offsetWidth-E,document.body.removeChild(t),this.sizeInfo.liHeight=v,this.sizeInfo.dropdownHeaderHeight=g,this.sizeInfo.headerHeight=b,this.sizeInfo.searchHeight=w,this.sizeInfo.actionsHeight=x,this.sizeInfo.doneButtonHeight=I,this.sizeInfo.dividerHeight=k,this.sizeInfo.menuPadding=y,this.sizeInfo.menuExtras=C,this.sizeInfo.menuWidth=E,this.sizeInfo.totalMenuWidth=this.sizeInfo.menuWidth,this.sizeInfo.scrollBarWidth=m,this.sizeInfo.selectHeight=this.$newElement[0].offsetHeight,this.setPositionData()}},getSelectPosition:function(){var e,t=F(window),i=this.$newElement.offset(),s=F(this.options.container);this.options.container&&!s.is("body")?((e=s.offset()).top+=parseInt(s.css("borderTopWidth")),e.left+=parseInt(s.css("borderLeftWidth"))):e={top:0,left:0};var n=this.options.windowPadding;this.sizeInfo.selectOffsetTop=i.top-e.top-t.scrollTop(),this.sizeInfo.selectOffsetBot=t.height()-this.sizeInfo.selectOffsetTop-this.sizeInfo.selectHeight-e.top-n[2],this.sizeInfo.selectOffsetLeft=i.left-e.left-t.scrollLeft(),this.sizeInfo.selectOffsetRight=t.width()-this.sizeInfo.selectOffsetLeft-this.sizeInfo.selectWidth-e.left-n[1],this.sizeInfo.selectOffsetTop-=n[0],this.sizeInfo.selectOffsetLeft-=n[3]},setMenuSize:function(e){this.getSelectPosition();var t,i,s,n,o,l,r,c=this.sizeInfo.selectWidth,a=this.sizeInfo.liHeight,d=this.sizeInfo.headerHeight,h=this.sizeInfo.searchHeight,p=this.sizeInfo.actionsHeight,u=this.sizeInfo.doneButtonHeight,f=this.sizeInfo.dividerHeight,m=this.sizeInfo.menuPadding,v=0;if(this.options.dropupAuto&&(r=a*this.selectpicker.current.elements.length+m.vert,this.$newElement.toggleClass(q.DROPUP,this.sizeInfo.selectOffsetTop-this.sizeInfo.selectOffsetBot>this.sizeInfo.menuExtras.vert&&r+this.sizeInfo.menuExtras.vert+50>this.sizeInfo.selectOffsetBot)),"auto"===this.options.size)n=3<this.selectpicker.current.elements.length?3*this.sizeInfo.liHeight+this.sizeInfo.menuExtras.vert-2:0,i=this.sizeInfo.selectOffsetBot-this.sizeInfo.menuExtras.vert,s=n+d+h+p+u,l=Math.max(n-m.vert,0),this.$newElement.hasClass(q.DROPUP)&&(i=this.sizeInfo.selectOffsetTop-this.sizeInfo.menuExtras.vert),t=(o=i)-d-h-p-u-m.vert;else if(this.options.size&&"auto"!=this.options.size&&this.selectpicker.current.elements.length>this.options.size){for(var g=0;g<this.options.size;g++)"divider"===this.selectpicker.current.data[g].type&&v++;t=(i=a*this.options.size+v*f+m.vert)-m.vert,o=i+d+h+p+u,s=l=""}"auto"===this.options.dropdownAlignRight&&this.$menu.toggleClass(q.MENURIGHT,this.sizeInfo.selectOffsetLeft>this.sizeInfo.selectOffsetRight&&this.sizeInfo.selectOffsetRight<this.$menu[0].offsetWidth-c),this.$menu.css({"max-height":o+"px",overflow:"hidden","min-height":s+"px"}),this.$menuInner.css({"max-height":t+"px","overflow-y":"auto","min-height":l+"px"}),this.sizeInfo.menuInnerHeight=t,this.selectpicker.current.data.length&&this.selectpicker.current.data[this.selectpicker.current.data.length-1].position>this.sizeInfo.menuInnerHeight&&(this.sizeInfo.hasScrollBar=!0,this.sizeInfo.totalMenuWidth=this.sizeInfo.menuWidth+this.sizeInfo.scrollBarWidth,this.$menu.css("min-width",this.sizeInfo.totalMenuWidth)),this.dropdown&&this.dropdown._popper&&this.dropdown._popper.update()},setSize:function(e){if(this.liHeight(e),this.options.header&&this.$menu.css("padding-top",0),!1!==this.options.size){var t,i=this,s=F(window),n=0;this.setMenuSize(),"auto"===this.options.size?(this.$searchbox.off("input.setMenuSize propertychange.setMenuSize").on("input.setMenuSize propertychange.setMenuSize",function(){return i.setMenuSize()}),s.off("resize.setMenuSize scroll.setMenuSize").on("resize.setMenuSize scroll.setMenuSize",function(){return i.setMenuSize()})):this.options.size&&"auto"!=this.options.size&&this.selectpicker.current.elements.length>this.options.size&&(this.$searchbox.off("input.setMenuSize propertychange.setMenuSize"),s.off("resize.setMenuSize scroll.setMenuSize")),e?n=this.$menuInner[0].scrollTop:i.multiple||"number"==typeof(t=i.selectpicker.main.map.newIndex[i.$element[0].selectedIndex])&&!1!==i.options.size&&(n=(n=i.sizeInfo.liHeight*t)-i.sizeInfo.menuInnerHeight/2+i.sizeInfo.liHeight/2),i.createView(!1,n)}},setWidth:function(){var i=this;"auto"===this.options.width?requestAnimationFrame(function(){i.$menu.css("min-width","0"),i.liHeight(),i.setMenuSize();var e=i.$newElement.clone().appendTo("body"),t=e.css("width","auto").children("button").outerWidth();e.remove(),i.sizeInfo.selectWidth=Math.max(i.sizeInfo.totalMenuWidth,t),i.$newElement.css("width",i.sizeInfo.selectWidth+"px")}):"fit"===this.options.width?(this.$menu.css("min-width",""),this.$newElement.css("width","").addClass("fit-width")):this.options.width?(this.$menu.css("min-width",""),this.$newElement.css("width",this.options.width)):(this.$menu.css("min-width",""),this.$newElement.css("width","")),this.$newElement.hasClass("fit-width")&&"fit"!==this.options.width&&this.$newElement.removeClass("fit-width")},selectPosition:function(){this.$bsContainer=F('<div class="bs-container" />');var s,n,o,l=this,r=F(this.options.container),e=function(e){var t={},i=l.options.display||F.fn.dropdown.Constructor.Default.display;l.$bsContainer.addClass(e.attr("class").replace(/form-control|fit-width/gi,"")).toggleClass(q.DROPUP,e.hasClass(q.DROPUP)),s=e.offset(),r.is("body")?n={top:0,left:0}:((n=r.offset()).top+=parseInt(r.css("borderTopWidth"))-r.scrollTop(),n.left+=parseInt(r.css("borderLeftWidth"))-r.scrollLeft()),o=e.hasClass(q.DROPUP)?0:e[0].offsetHeight,(_.major<4||"static"===i)&&(t.top=s.top-n.top+o,t.left=s.left-n.left),t.width=e[0].offsetWidth,l.$bsContainer.css(t)};this.$button.on("click.bs.dropdown.data-api",function(){l.isDisabled()||(e(l.$newElement),l.$bsContainer.appendTo(l.options.container).toggleClass(q.SHOW,!l.$button.hasClass(q.SHOW)).append(l.$menu))}),F(window).on("resize scroll",function(){e(l.$newElement)}),this.$element.on("hide.bs.select",function(){l.$menu.data("height",l.$menu.height()),l.$bsContainer.detach()})},setOptionStatus:function(){var e=this,t=this.$element.find("option");if(e.noScroll=!1,e.selectpicker.view.visibleElements&&e.selectpicker.view.visibleElements.length)for(var i=0;i<e.selectpicker.view.visibleElements.length;i++){var s=e.selectpicker.current.map.originalIndex[i+e.selectpicker.view.position0],n=t[s];if(n){var o=this.selectpicker.main.map.newIndex[s],l=this.selectpicker.main.elements[o];e.setDisabled(s,n.disabled||"OPTGROUP"===n.parentNode.tagName&&n.parentNode.disabled,o,l),e.setSelected(s,n.selected,o,l)}}},setSelected:function(e,t,i,s){var n,o,l,r=void 0!==this.activeIndex,c=this.activeIndex===e||t&&!this.multiple&&!r;i||(i=this.selectpicker.main.map.newIndex[e]),s||(s=this.selectpicker.main.elements[i]),l=s.firstChild,t&&(this.selectedIndex=e),s.classList.toggle("selected",t),s.classList.toggle("active",c),c&&(this.selectpicker.view.currentActive=s,this.activeIndex=e),l&&(l.classList.toggle("selected",t),l.classList.toggle("active",c),l.setAttribute("aria-selected",t)),c||!r&&t&&void 0!==this.prevActiveIndex&&(n=this.selectpicker.main.map.newIndex[this.prevActiveIndex],(o=this.selectpicker.main.elements[n]).classList.toggle("selected",t),o.classList.remove("active"),o.firstChild&&(o.firstChild.classList.toggle("selected",t),o.firstChild.classList.remove("active")))},setDisabled:function(e,t,i,s){var n;i||(i=this.selectpicker.main.map.newIndex[e]),s||(s=this.selectpicker.main.elements[i]),n=s.firstChild,s.classList.toggle(q.DISABLED,t),n&&("4"===_.major&&n.classList.toggle(q.DISABLED,t),n.setAttribute("aria-disabled",t),t?n.setAttribute("tabindex",-1):n.setAttribute("tabindex",0))},isDisabled:function(){return this.$element[0].disabled},checkDisabled:function(){var e=this;this.isDisabled()?(this.$newElement.addClass(q.DISABLED),this.$button.addClass(q.DISABLED).attr("tabindex",-1).attr("aria-disabled",!0)):(this.$button.hasClass(q.DISABLED)&&(this.$newElement.removeClass(q.DISABLED),this.$button.removeClass(q.DISABLED).attr("aria-disabled",!1)),-1!=this.$button.attr("tabindex")||this.$element.data("tabindex")||this.$button.removeAttr("tabindex")),this.$button.click(function(){return!e.isDisabled()})},togglePlaceholder:function(){var e=this.$element[0],t=e.selectedIndex,i=-1===t;i||e.options[t].value||(i=!0),this.$button.toggleClass("bs-placeholder",i)},tabIndex:function(){this.$element.data("tabindex")!==this.$element.attr("tabindex")&&-98!==this.$element.attr("tabindex")&&"-98"!==this.$element.attr("tabindex")&&(this.$element.data("tabindex",this.$element.attr("tabindex")),this.$button.attr("tabindex",this.$element.data("tabindex"))),this.$element.attr("tabindex",-98)},clickListener:function(){var E=this,t=F(document);function e(){E.options.liveSearch?E.$searchbox.focus():E.$menuInner.focus()}function i(){E.dropdown&&E.dropdown._popper&&E.dropdown._popper.state.isCreated?e():requestAnimationFrame(i)}t.data("spaceSelect",!1),this.$button.on("keyup",function(e){/(32)/.test(e.keyCode.toString(10))&&t.data("spaceSelect")&&(e.preventDefault(),t.data("spaceSelect",!1))}),this.$newElement.on("show.bs.dropdown",function(){3<_.major&&!E.dropdown&&(E.dropdown=E.$button.data("bs.dropdown"),E.dropdown._menu=E.$menu[0])}),this.$button.on("click.bs.dropdown.data-api",function(){E.$newElement.hasClass(q.SHOW)||E.setSize()}),this.$element.on("shown.bs.select",function(){E.$menuInner[0].scrollTop!==E.selectpicker.view.scrollTop&&(E.$menuInner[0].scrollTop=E.selectpicker.view.scrollTop),3<_.major?requestAnimationFrame(i):e()}),this.$menuInner.on("click","li a",function(e,t){var i=F(this),s=E.isVirtual()?E.selectpicker.view.position0:0,n=E.selectpicker.current.map.originalIndex[i.parent().index()+s],o=S(E.$element[0]),l=E.$element.prop("selectedIndex"),r=!0;if(E.multiple&&1!==E.options.maxOptions&&e.stopPropagation(),e.preventDefault(),!E.isDisabled()&&!i.parent().hasClass(q.DISABLED)){var c=E.$element.find("option"),a=c.eq(n),d=a.prop("selected"),h=a.parent("optgroup"),p=h.find("option"),u=E.options.maxOptions,f=h.data("maxOptions")||!1;if(n===E.activeIndex&&(t=!0),t||(E.prevActiveIndex=E.activeIndex,E.activeIndex=void 0),E.multiple){if(a.prop("selected",!d),E.setSelected(n,!d),i.blur(),!1!==u||!1!==f){var m=u<c.filter(":selected").length,v=f<h.find("option:selected").length;if(u&&m||f&&v)if(u&&1==u){c.prop("selected",!1),a.prop("selected",!0);for(var g=0;g<c.length;g++)E.setSelected(g,!1);E.setSelected(n,!0)}else if(f&&1==f){h.find("option:selected").prop("selected",!1),a.prop("selected",!0);for(g=0;g<p.length;g++){var b=p[g];E.setSelected(c.index(b),!1)}E.setSelected(n,!0)}else{var w="string"==typeof E.options.maxOptionsText?[E.options.maxOptionsText,E.options.maxOptionsText]:E.options.maxOptionsText,x="function"==typeof w?w(u,f):w,I=x[0].replace("{n}",u),k=x[1].replace("{n}",f),$=F('<div class="notify"></div>');x[2]&&(I=I.replace("{var}",x[2][1<u?0:1]),k=k.replace("{var}",x[2][1<f?0:1])),a.prop("selected",!1),E.$menu.append($),u&&m&&($.append(F("<div>"+I+"</div>")),r=!1,E.$element.trigger("maxReached.bs.select")),f&&v&&($.append(F("<div>"+k+"</div>")),r=!1,E.$element.trigger("maxReachedGrp.bs.select")),setTimeout(function(){E.setSelected(n,!1)},10),$.delay(750).fadeOut(300,function(){F(this).remove()})}}}else c.prop("selected",!1),a.prop("selected",!0),E.setSelected(n,!0);!E.multiple||E.multiple&&1===E.options.maxOptions?E.$button.focus():E.options.liveSearch&&E.$searchbox.focus(),r&&(o!=S(E.$element[0])&&E.multiple||l!=E.$element.prop("selectedIndex")&&!E.multiple)&&(y=[n,a.prop("selected"),o],E.$element.triggerNative("change"))}}),this.$menu.on("click","li."+q.DISABLED+" a, ."+q.POPOVERHEADER+", ."+q.POPOVERHEADER+" :not(.close)",function(e){e.currentTarget==this&&(e.preventDefault(),e.stopPropagation(),E.options.liveSearch&&!F(e.target).hasClass("close")?E.$searchbox.focus():E.$button.focus())}),this.$menuInner.on("click",".divider, .dropdown-header",function(e){e.preventDefault(),e.stopPropagation(),E.options.liveSearch?E.$searchbox.focus():E.$button.focus()}),this.$menu.on("click","."+q.POPOVERHEADER+" .close",function(){E.$button.click()}),this.$searchbox.on("click",function(e){e.stopPropagation()}),this.$menu.on("click",".actions-btn",function(e){E.options.liveSearch?E.$searchbox.focus():E.$button.focus(),e.preventDefault(),e.stopPropagation(),F(this).hasClass("bs-select-all")?E.selectAll():E.deselectAll()}),this.$element.on({change:function(){E.render(),E.$element.trigger("changed.bs.select",y),y=null},focus:function(){E.$button.focus()}})},liveSearchListener:function(){var u=this,f=document.createElement("li");this.$button.on("click.bs.dropdown.data-api",function(){u.$searchbox.val()&&u.$searchbox.val("")}),this.$searchbox.on("click.bs.dropdown.data-api focus.bs.dropdown.data-api touchend.bs.dropdown.data-api",function(e){e.stopPropagation()}),this.$searchbox.on("input propertychange",function(){var e=u.$searchbox.val();if(u.selectpicker.search.map.newIndex={},u.selectpicker.search.map.originalIndex={},u.selectpicker.search.elements=[],u.selectpicker.search.data=[],e){var t=[],i=e.toUpperCase(),s={},n=[],o=u._searchStyle(),l=u.options.liveSearchNormalize;u._$lisSelected=u.$menuInner.find(".selected");for(var r=0;r<u.selectpicker.main.data.length;r++){var c=u.selectpicker.main.data[r];s[r]||(s[r]=$(c,i,o,l)),s[r]&&void 0!==c.headerIndex&&-1===n.indexOf(c.headerIndex)&&(0<c.headerIndex&&(s[c.headerIndex-1]=!0,n.push(c.headerIndex-1)),s[c.headerIndex]=!0,n.push(c.headerIndex),s[c.lastIndex+1]=!0),s[r]&&"optgroup-label"!==c.type&&n.push(r)}r=0;for(var a=n.length;r<a;r++){var d=n[r],h=n[r-1],p=(c=u.selectpicker.main.data[d],u.selectpicker.main.data[h]);("divider"!==c.type||"divider"===c.type&&p&&"divider"!==p.type&&a-1!==r)&&(u.selectpicker.search.data.push(c),t.push(u.selectpicker.main.elements[d]),c.hasOwnProperty("originalIndex")&&(u.selectpicker.search.map.newIndex[c.originalIndex]=t.length-1,u.selectpicker.search.map.originalIndex[t.length-1]=c.originalIndex))}u.activeIndex=void 0,u.noScroll=!0,u.$menuInner.scrollTop(0),u.selectpicker.search.elements=t,u.createView(!0),t.length||(f.className="no-results",f.innerHTML=u.options.noneResultsText.replace("{0}",'"'+G(e)+'"'),u.$menuInner[0].firstChild.appendChild(f))}else u.$menuInner.scrollTop(0),u.createView(!1)})},_searchStyle:function(){return this.options.liveSearchStyle||"contains"},val:function(e){return void 0!==e?(this.$element.val(e).triggerNative("change"),this.$element):this.$element.val()},changeAll:function(e){if(this.multiple){void 0===e&&(e=!0);var t=this.$element.find("option"),i=0,s=0,n=S(this.$element[0]);this.$element.addClass("bs-select-hidden");for(var o=0;o<this.selectpicker.current.elements.length;o++){var l=this.selectpicker.current.data[o],r=t[this.selectpicker.current.map.originalIndex[o]];r&&!r.disabled&&"divider"!==l.type&&(r.selected&&i++,r.selected=e,r.selected&&s++)}this.$element.removeClass("bs-select-hidden"),i!==s&&(this.setOptionStatus(),this.togglePlaceholder(),y=[null,null,n],this.$element.triggerNative("change"))}},selectAll:function(){return this.changeAll(!0)},deselectAll:function(){return this.changeAll(!1)},toggle:function(e){(e=e||window.event)&&e.stopPropagation(),this.$button.trigger("click.bs.dropdown.data-api")},keydown:function(e){var t,i,s,n,o,l=F(this),r=l.hasClass("dropdown-toggle"),c=(r?l.closest(".dropdown"):l.closest(N.MENU)).data("this"),a=c.findLis(),d=!1,h=e.which===D&&!r&&!c.options.selectOnTab,p=A.test(e.which)||h,u=c.$menuInner[0].scrollTop,f=c.isVirtual(),m=!0===f?c.selectpicker.view.position0:0;if(!(i=c.$newElement.hasClass(q.SHOW))&&(p||48<=e.which&&e.which<=57||96<=e.which&&e.which<=105||65<=e.which&&e.which<=90)&&c.$button.trigger("click.bs.dropdown.data-api"),e.which===C&&i&&(e.preventDefault(),c.$button.trigger("click.bs.dropdown.data-api").focus()),p){if(!a.length)return;void 0===(t=!0===f?a.index(a.filter(".active")):c.selectpicker.current.map.newIndex[c.activeIndex])&&(t=-1),-1!==t&&((s=c.selectpicker.current.elements[t+m]).classList.remove("active"),s.firstChild&&s.firstChild.classList.remove("active")),e.which===H?(-1!==t&&t--,t+m<0&&(t+=a.length),c.selectpicker.view.canHighlight[t+m]||-1===(t=c.selectpicker.view.canHighlight.slice(0,t+m).lastIndexOf(!0)-m)&&(t=a.length-1)):(e.which===L||h)&&(++t+m>=c.selectpicker.view.canHighlight.length&&(t=0),c.selectpicker.view.canHighlight[t+m]||(t=t+1+c.selectpicker.view.canHighlight.slice(t+m+1).indexOf(!0))),e.preventDefault();var v=m+t;e.which===H?0===m&&t===a.length-1?(c.$menuInner[0].scrollTop=c.$menuInner[0].scrollHeight,v=c.selectpicker.current.elements.length-1):d=(o=(n=c.selectpicker.current.data[v]).position-n.height)<u:(e.which===L||h)&&(0===t?v=c.$menuInner[0].scrollTop=0:d=u<(o=(n=c.selectpicker.current.data[v]).position-c.sizeInfo.menuInnerHeight)),(s=c.selectpicker.current.elements[v])&&(s.classList.add("active"),s.firstChild&&s.firstChild.classList.add("active")),c.activeIndex=c.selectpicker.current.map.originalIndex[v],c.selectpicker.view.currentActive=s,d&&(c.$menuInner[0].scrollTop=o),c.options.liveSearch?c.$searchbox.focus():l.focus()}else if(!l.is("input")&&!P.test(e.which)||e.which===T&&c.selectpicker.keydown.keyHistory){var g,b,w=[];e.preventDefault(),c.selectpicker.keydown.keyHistory+=E[e.which],c.selectpicker.keydown.resetKeyHistory.cancel&&clearTimeout(c.selectpicker.keydown.resetKeyHistory.cancel),c.selectpicker.keydown.resetKeyHistory.cancel=c.selectpicker.keydown.resetKeyHistory.start(),b=c.selectpicker.keydown.keyHistory,/^(.)\1+$/.test(b)&&(b=b.charAt(0));for(var x=0;x<c.selectpicker.current.data.length;x++){var I=c.selectpicker.current.data[x];$(I,b,"startsWith",!0)&&c.selectpicker.view.canHighlight[x]&&(I.index=x,w.push(I.originalIndex))}if(w.length){var k=0;a.removeClass("active").find("a").removeClass("active"),1===b.length&&(-1===(k=w.indexOf(c.activeIndex))||k===w.length-1?k=0:k++),g=c.selectpicker.current.map.newIndex[w[k]],0<u-(n=c.selectpicker.current.data[g]).position?(o=n.position-n.height,d=!0):(o=n.position-c.sizeInfo.menuInnerHeight,d=n.position>u+c.sizeInfo.menuInnerHeight),(s=c.selectpicker.current.elements[g]).classList.add("active"),s.firstChild&&s.firstChild.classList.add("active"),c.activeIndex=w[k],s.firstChild.focus(),d&&(c.$menuInner[0].scrollTop=o),l.focus()}}i&&(e.which===T&&!c.selectpicker.keydown.keyHistory||e.which===z||e.which===D&&c.options.selectOnTab)&&(e.which!==T&&e.preventDefault(),c.options.liveSearch&&e.which===T||(c.$menuInner.find(".active a").trigger("click",!0),l.focus(),c.options.liveSearch||(e.preventDefault(),F(document).data("spaceSelect",!0))))},mobile:function(){this.$element.addClass("mobile-device")},refresh:function(){var e=F.extend({},this.options,this.$element.data());this.options=e,this.selectpicker.main.map.newIndex={},this.selectpicker.main.map.originalIndex={},this.createLi(),this.checkDisabled(),this.render(),this.setStyle(),this.setWidth(),this.setSize(!0),this.$element.trigger("refreshed.bs.select")},hide:function(){this.$newElement.hide()},show:function(){this.$newElement.show()},remove:function(){this.$newElement.remove(),this.$element.remove()},destroy:function(){this.$newElement.before(this.$element).remove(),this.$bsContainer?this.$bsContainer.remove():this.$menu.remove(),this.$element.off(".bs.select").removeData("selectpicker").removeClass("bs-select-hidden selectpicker")}};var h=F.fn.selectpicker;F.fn.selectpicker=r,F.fn.selectpicker.Constructor=c,F.fn.selectpicker.noConflict=function(){return F.fn.selectpicker=h,this},F(document).off("keydown.bs.dropdown.data-api").on("keydown.bs.select",'.bootstrap-select [data-toggle="dropdown"], .bootstrap-select [role="listbox"], .bs-searchbox input',c.prototype.keydown).on("focusin.modal",'.bootstrap-select [data-toggle="dropdown"], .bootstrap-select [role="listbox"], .bs-searchbox input',function(e){e.stopPropagation()}),F(window).on("load.bs.select.data-api",function(){F(".selectpicker").each(function(){var e=F(this);r.call(e,e.data())})})}(e)});

(function ($, Drupal) {
  'use strict';
  /**
   * Initialize dropdown submenu for build profile.
   */
  function initDropdownSubmenu() {
    if (!$('.dropdown-submenu > a').length) {
      return;
    }

    $('.dropdown-submenu > a').once('toggle_account_menu').on('click', function (e) {
      $(this).parent().toggleClass('active');
      $(this).next('ul').stop().slideToggle();
      e.stopPropagation();
      e.preventDefault();
    });

    $('.user-info-wrap').mouseleave(function () {
      $(this).find('.dropdown-submenu').removeClass('active');
      $(this).find('.submenu-wp').finish().slideUp();
    });
  }
  /**
   * Initialize mobile menu functionality.
   *
   * Handles:
   * - Toggle overlay menu
   * - Toggle navigation icon
   * - Expand/collapse submenus
   */
  function initMobileMenu() {
    $('body').once('mobile-menu').each(function () {
      // Toggle mobile menu
      $('.nav-icon').on('click', function () {
        $('#overlay-menu').toggleClass('active');
        $(this).toggleClass('open');
        $('body').toggleClass("open-menu");
      });

      // Close overlay menu
      $('#overlay-menu').on('click', function () {
        $(this).removeClass('active');
        $('.nav-icon').removeClass('open');
        $('body').removeClass("open-menu");
      });

      // Toggle submenu by chevron icon
      $(document).on('click', '.menu-res li.has-child > a span.ioticon-chevrons-right', function (event) {
        event.preventDefault();
        event.stopPropagation();
        toggleSubmenu($(this));
        return false;
      });

      // Toggle submenu by menu item
      $(document).on('click', '.menu-res li.has-child > a', function (event) {
        event.preventDefault();
        event.stopPropagation();
        toggleSubmenu($(this), true);
        return false;
      });
    });
  }

  /**
   * Toggle submenu visibility.
   *
   * @param {jQuery} $trigger - The trigger element
   * @param {boolean} isMenuItem - Whether trigger is menu item
   */
  function toggleSubmenu($trigger, isMenuItem) {
    var $submenu = isMenuItem ? $trigger.next() : $trigger.parent().next();
    var $parentItem = $trigger.closest('.has-child');
    var $icon = isMenuItem ? $trigger : $trigger;

    if ($submenu.is(":visible")) {
      $submenu.slideUp();
      $parentItem.removeClass("open-submenu");
      $icon.removeClass("open-submenu-active");
    } else {
      $submenu.slideDown();
      $parentItem.addClass("open-submenu");
      $icon.addClass("open-submenu-active");
    }
  }

  Drupal.behaviors.mobileMenu = {
    attach: function (context, settings) {
      initDropdownSubmenu();
      initMobileMenu();
    }
  };

})(jQuery, Drupal);
;
!function(n,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(n=n||self).LazyLoad=t()}(this,(function(){"use strict";function n(){return(n=Object.assign||function(n){for(var t=1;t<arguments.length;t++){var e=arguments[t];for(var i in e)Object.prototype.hasOwnProperty.call(e,i)&&(n[i]=e[i])}return n}).apply(this,arguments)}var t="undefined"!=typeof window,e=t&&!("onscroll"in window)||"undefined"!=typeof navigator&&/(gle|ing|ro)bot|crawl|spider/i.test(navigator.userAgent),i=t&&"IntersectionObserver"in window,a=t&&"classList"in document.createElement("p"),o=t&&window.devicePixelRatio>1,r={elements_selector:".lazy",container:e||t?document:null,threshold:300,thresholds:null,data_src:"src",data_srcset:"srcset",data_sizes:"sizes",data_bg:"bg",data_bg_hidpi:"bg-hidpi",data_bg_multi:"bg-multi",data_bg_multi_hidpi:"bg-multi-hidpi",data_poster:"poster",class_applied:"applied",class_loading:"loading",class_loaded:"loaded",class_error:"error",unobserve_completed:!0,unobserve_entered:!1,cancel_on_exit:!0,callback_enter:null,callback_exit:null,callback_applied:null,callback_loading:null,callback_loaded:null,callback_error:null,callback_finish:null,callback_cancel:null,use_native:!1},c=function(t){return n({},r,t)},l=function(n,t){var e,i=new n(t);try{e=new CustomEvent("LazyLoad::Initialized",{detail:{instance:i}})}catch(n){(e=document.createEvent("CustomEvent")).initCustomEvent("LazyLoad::Initialized",!1,!1,{instance:i})}window.dispatchEvent(e)},s=function(n,t){return n.getAttribute("data-"+t)},u=function(n,t,e){var i="data-"+t;null!==e?n.setAttribute(i,e):n.removeAttribute(i)},d=function(n){return s(n,"ll-status")},f=function(n,t){return u(n,"ll-status",t)},_=function(n){return f(n,null)},g=function(n){return null===d(n)},v=function(n){return"native"===d(n)},p=["loading","loaded","applied","error"],b=function(n,t,e,i){n&&(void 0===i?void 0===e?n(t):n(t,e):n(t,e,i))},h=function(n,t){a?n.classList.add(t):n.className+=(n.className?" ":"")+t},m=function(n,t){a?n.classList.remove(t):n.className=n.className.replace(new RegExp("(^|\\s+)"+t+"(\\s+|$)")," ").replace(/^\s+/,"").replace(/\s+$/,"")},E=function(n){return n.llTempImage},I=function(n,t){if(t){var e=t._observer;e&&e.unobserve(n)}},y=function(n,t){n&&(n.loadingCount+=t)},A=function(n,t){n&&(n.toLoadCount=t)},L=function(n){for(var t,e=[],i=0;t=n.children[i];i+=1)"SOURCE"===t.tagName&&e.push(t);return e},w=function(n,t,e){e&&n.setAttribute(t,e)},z=function(n,t){n.removeAttribute(t)},k=function(n){return!!n.llOriginalAttrs},O=function(n){if(!k(n)){var t={};t.src=n.getAttribute("src"),t.srcset=n.getAttribute("srcset"),t.sizes=n.getAttribute("sizes"),n.llOriginalAttrs=t}},C=function(n){if(k(n)){var t=n.llOriginalAttrs;w(n,"src",t.src),w(n,"srcset",t.srcset),w(n,"sizes",t.sizes)}},N=function(n,t){w(n,"sizes",s(n,t.data_sizes)),w(n,"srcset",s(n,t.data_srcset)),w(n,"src",s(n,t.data_src))},x=function(n){z(n,"src"),z(n,"srcset"),z(n,"sizes")},M=function(n,t){var e=n.parentNode;e&&"PICTURE"===e.tagName&&L(e).forEach(t)},R=function(n,t){L(n).forEach(t)},G={IMG:function(n,t){M(n,(function(n){O(n),N(n,t)})),O(n),N(n,t)},IFRAME:function(n,t){w(n,"src",s(n,t.data_src))},VIDEO:function(n,t){R(n,(function(n){w(n,"src",s(n,t.data_src))})),w(n,"poster",s(n,t.data_poster)),w(n,"src",s(n,t.data_src)),n.load()}},T=function(n,t){var e=G[n.tagName];e&&e(n,t)},D=function(n,t,e){y(e,1),h(n,t.class_loading),f(n,"loading"),b(t.callback_loading,n,e)},F={IMG:function(n,t){u(n,t.data_src,null),u(n,t.data_srcset,null),u(n,t.data_sizes,null),M(n,(function(n){u(n,t.data_srcset,null),u(n,t.data_sizes,null)}))},IFRAME:function(n,t){u(n,t.data_src,null)},VIDEO:function(n,t){u(n,t.data_src,null),u(n,t.data_poster,null),R(n,(function(n){u(n,t.data_src,null)}))}},V=function(n,t){u(n,t.data_bg_multi,null),u(n,t.data_bg_multi_hidpi,null)},j=function(n,t){var e=F[n.tagName];e?e(n,t):function(n,t){u(n,t.data_bg,null),u(n,t.data_bg_hidpi,null)}(n,t)},P=["IMG","IFRAME","VIDEO"],S=function(n,t){!t||function(n){return n.loadingCount>0}(t)||function(n){return n.toLoadCount>0}(t)||b(n.callback_finish,t)},U=function(n,t,e){n.addEventListener(t,e),n.llEvLisnrs[t]=e},$=function(n,t,e){n.removeEventListener(t,e)},q=function(n){return!!n.llEvLisnrs},H=function(n){if(q(n)){var t=n.llEvLisnrs;for(var e in t){var i=t[e];$(n,e,i)}delete n.llEvLisnrs}},B=function(n,t,e){!function(n){delete n.llTempImage}(n),y(e,-1),function(n){n&&(n.toLoadCount-=1)}(e),m(n,t.class_loading),t.unobserve_completed&&I(n,e)},J=function(n,t,e){var i=E(n)||n;q(i)||function(n,t,e){q(n)||(n.llEvLisnrs={});var i="VIDEO"===n.tagName?"loadeddata":"load";U(n,i,t),U(n,"error",e)}(i,(function(a){!function(n,t,e,i){var a=v(t);B(t,e,i),h(t,e.class_loaded),f(t,"loaded"),j(t,e),b(e.callback_loaded,t,i),a||S(e,i)}(0,n,t,e),H(i)}),(function(a){!function(n,t,e,i){var a=v(t);B(t,e,i),h(t,e.class_error),f(t,"error"),b(e.callback_error,t,i),a||S(e,i)}(0,n,t,e),H(i)}))},K=function(n,t,e){!function(n){n.llTempImage=document.createElement("IMG")}(n),J(n,t,e),function(n,t,e){var i=s(n,t.data_bg),a=s(n,t.data_bg_hidpi),r=o&&a?a:i;r&&(n.style.backgroundImage='url("'.concat(r,'")'),E(n).setAttribute("src",r),D(n,t,e))}(n,t,e),function(n,t,e){var i=s(n,t.data_bg_multi),a=s(n,t.data_bg_multi_hidpi),r=o&&a?a:i;r&&(n.style.backgroundImage=r,function(n,t,e){h(n,t.class_applied),f(n,"applied"),V(n,t),t.unobserve_completed&&I(n,t),b(t.callback_applied,n,e)}(n,t,e))}(n,t,e)},Q=function(n,t,e){!function(n){return P.indexOf(n.tagName)>-1}(n)?K(n,t,e):function(n,t,e){J(n,t,e),T(n,t),D(n,t,e)}(n,t,e)},W=["IMG","IFRAME"],X=function(n){return n.use_native&&"loading"in HTMLImageElement.prototype},Y=function(n,t,e){n.forEach((function(n){return function(n){return n.isIntersecting||n.intersectionRatio>0}(n)?function(n,t,e,i){f(n,"entered"),function(n,t,e){t.unobserve_entered&&I(n,e)}(n,e,i),b(e.callback_enter,n,t,i),function(n){return p.indexOf(d(n))>=0}(n)||Q(n,e,i)}(n.target,n,t,e):function(n,t,e,i){g(n)||(function(n,t,e,i){e.cancel_on_exit&&function(n){return"loading"===d(n)}(n)&&"IMG"===n.tagName&&(H(n),function(n){M(n,(function(n){x(n)})),x(n)}(n),function(n){M(n,(function(n){C(n)})),C(n)}(n),m(n,e.class_loading),y(i,-1),_(n),b(e.callback_cancel,n,t,i))}(n,t,e,i),b(e.callback_exit,n,t,i))}(n.target,n,t,e)}))},Z=function(n){return Array.prototype.slice.call(n)},nn=function(n){return n.container.querySelectorAll(n.elements_selector)},tn=function(n){return function(n){return"error"===d(n)}(n)},en=function(n,t){return function(n){return Z(n).filter(g)}(n||nn(t))},an=function(n,e){var a=c(n);this._settings=a,this.loadingCount=0,function(n,t){i&&!X(n)&&(t._observer=new IntersectionObserver((function(e){Y(e,n,t)}),function(n){return{root:n.container===document?null:n.container,rootMargin:n.thresholds||n.threshold+"px"}}(n)))}(a,this),function(n,e){t&&window.addEventListener("online",(function(){!function(n,t){var e;(e=nn(n),Z(e).filter(tn)).forEach((function(t){m(t,n.class_error),_(t)})),t.update()}(n,e)}))}(a,this),this.update(e)};return an.prototype={update:function(n){var t,a,o=this._settings,r=en(n,o);A(this,r.length),!e&&i?X(o)?function(n,t,e){n.forEach((function(n){-1!==W.indexOf(n.tagName)&&(n.setAttribute("loading","lazy"),function(n,t,e){J(n,t,e),T(n,t),j(n,t),f(n,"native")}(n,t,e))})),A(e,0)}(r,o,this):(a=r,function(n){n.disconnect()}(t=this._observer),function(n,t){t.forEach((function(t){n.observe(t)}))}(t,a)):this.loadAll(r)},destroy:function(){this._observer&&this._observer.disconnect(),nn(this._settings).forEach((function(n){delete n.llOriginalAttrs})),delete this._observer,delete this._settings,delete this.loadingCount,delete this.toLoadCount},loadAll:function(n){var t=this,e=this._settings;en(n,e).forEach((function(n){I(n,t),Q(n,e,t)}))}},an.load=function(n,t){var e=c(t);Q(n,e)},an.resetStatus=function(n){_(n)},t&&function(n,t){if(t)if(t.length)for(var e,i=0;e=t[i];i+=1)l(n,e);else l(n,t)}(an,window.lazyLoadOptions),an}));
;
(function ($, Drupal, drupalSettings) {
  Drupal.behaviors.redirect = {
    attach: function (context, settings) {
      $(document).ready(function () {
        $('body #overlay-region').before($('section#block-redirectlanguage'));
        function setCookie(name, value, days) {
          var expires = "";
          if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
          }
          document.cookie = name + "=" + (value || "") + expires + "; path=/";
        }

        function getCookie(name) {
          var nameEQ = name + "=";
          var ca = document.cookie.split(';');
          for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') {
              c = c.substring(1, c.length);
            }
            if (c.indexOf(nameEQ) === 0) {
              return c.substring(nameEQ.length, c.length);
            }
          }
          return null;
        }

        if(typeof drupalSettings.info_country != 'undefined' && drupalSettings.info_country.length !== 0) {
          var queryString = window.location.search;
          var urlRedirect = '';
          var baseUrl = window.location.protocol + '//' + window.location.host;
          var nodeData = drupalSettings.info_country.node_data;
          var termData = drupalSettings.info_country.term_data;
          var webinarData = drupalSettings.info_country.webinar_data;
          var current_country_ip = drupalSettings.info_country.country_ip;
          var basePath = drupalSettings.info_country.current_url;
          // Remove existing language prefix from basePath to avoid duplication
          var cleanBasePath = basePath.replace(/^\/(en|vi|zh-hans)/, '') || '/';
          var arrCountryCN = ['TW','HK','MO','CN'];
          var arrCountry = ['TW','HK','MO','CN','VN'];
          var nodeExist = nodeData.entity === true && nodeData.node_alias === '';
          var termExist = termData.entity === true && termData.term_alias === '';
          var webinarExist = webinarData.entity === true && webinarData.webinar_alias === '';
          var langCode = '';

          if (current_country_ip === 'VN') {
            langCode = 'vi';
          }
          else if (arrCountryCN.includes(current_country_ip)) {
            langCode = 'zh-hans';
          }
          else {
            langCode = 'en';
          }

          // Helper function to build redirect URL - avoid code duplication
          var buildRedirectUrl = function(targetLangCode) {
            if (queryString !== '') {
              return baseUrl + '/' + targetLangCode + cleanBasePath + queryString;
            }
            else if (nodeData.node_alias && nodeData.node_alias !== '') {
              return baseUrl + '/' + targetLangCode + nodeData.node_alias;
            }
            else if (termData.term_alias && termData.term_alias !== '') {
              return baseUrl + '/' + targetLangCode + termData.term_alias;
            }
            else if (webinarData.webinar_alias && webinarData.webinar_alias !== '') {
              return baseUrl + '/' + targetLangCode + webinarData.webinar_alias;
            }
            else {
              return baseUrl + '/' + targetLangCode + cleanBasePath;
            }
          };

          // Check url redirect by country
          function urlRedirectByCountry() {
            var redirect = getCookie("redirect");
            var not_redirect = getCookie("not_redirect");
            var off_redirect = getCookie("off_redirect");
            if (redirect !== null || not_redirect !== null || off_redirect !== null) {
              $('#block-redirectlanguage').addClass('redirectlanguage-none');
              return;
            } else {
              $('#block-redirectlanguage').addClass('redirectlanguage-block');

              // Agree to redirect
              $(document).on('click','.redirect-goto-local', function(e) {
                e.preventDefault();
                $('#block-redirectlanguage').css("display", "none");
                $('body').css({"margin-top": "0", "transition": "0.2s"});
                setCookie("redirect", 'closed', 30);

                // Check if langcode is not synchronized then redirect
                if (langCode !== drupalSettings.info_country.language) {
                  if (!arrCountry.includes(current_country_ip)) {
                    return false;
                  }
                  else if(arrCountryCN.includes(current_country_ip) || current_country_ip === 'VN') {
                    // Check url search language CN
                    if (nodeExist || termExist || webinarExist) {
                      return false;
                    }
                    urlRedirect = buildRedirectUrl(langCode);
                  }
                  if (urlRedirect !== '') {
                    window.location.href = urlRedirect;
                  }
                }
              });

              // Disagree with redirects
              $(document).on('click','.redirect-say-here', function(e) {
                e.preventDefault();
                $('#block-redirectlanguage').css("display", "none");
                $('body').css({"margin-top": "0", "font-size": "0.2s"});
                setCookie("not_redirect", 'closed', 999);
              });

              // Turn off notifications for 7 days
              $(document).on('click','button.btn.top-notice__close', function(e) {
                e.preventDefault();
                $('#block-redirectlanguage').css("display", "none");
                $('body').css({"margin-top": "0", "font-size": "0.2s"});
                setCookie("off_redirect", 'closed', 7);
              });
            }
          }

          urlRedirectByCountry();

          // Check in cookie redirect
          if (getCookie("redirect") !== null) {
            // Check if langcode is not synchronized then redirect
            if (langCode !== drupalSettings.info_country.language) {
              if (!arrCountry.includes(current_country_ip)) {
                return false;
              }
              else if(arrCountryCN.includes(current_country_ip) || current_country_ip === 'VN') {
                // Check url search language
                if (nodeExist || termExist || webinarExist) {
                  return false;
                }
                urlRedirect = buildRedirectUrl(langCode);
              }
              if (urlRedirect !== '') {
                window.location.href = urlRedirect;
              }
            }

            // Check language switch and remove redirect
            $('#iot-language-switcher').on('changed.bs.select', function (e, clickedIndex, isSelected, previousValue) {
              document.cookie = "redirect=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              setCookie("use_language", 'closed', 30);
            });
          }

          if (getCookie("use_language") !== null) {
            $('section#block-redirectlanguage').css("display", "none");
          }
        }
        else {
          $('#block-redirectlanguage').css("display", "none");
        }
      });
    }
  };
})(jQuery, Drupal, drupalSettings);
;
(function ($, Drupal, drupalSettings) {
  // #3779: Handle cookies for tracking source, e.g. UTM parameters. Track the source of the order and live lesson
  'use strict';

  /**
   * Set Cookie.
   *
   * @param cname
   * @param cvalue
   * @param exdays
   */
  function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = 'expires=' + d.toUTCString();
    document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
  }

  function setTracking() {
    // Create a test URLSearchParams object
    var searchParams = new URLSearchParams(window.location.search);

    // Display the key/value pairs
    var obj_params = {};
    for (var param of searchParams.entries()) {
      obj_params[param[0]] = param[1];
    }
    var trackings = drupalSettings.tracking;
    if (!jQuery.isEmptyObject(obj_params) && trackings !== undefined) {
      var json_params = JSON.stringify(obj_params);
      for (var type in trackings) {
        setCookie('Drupal.visitor.tracking_' + type + '_' + trackings[type], json_params, 1);
      }
    }
  }

  Drupal.behaviors.trackingSource = {
    attach: function (context, settings) {
      setTracking();
    },
  };
})(jQuery, Drupal, drupalSettings);
;

// Define global variables;
var changeLanguage = false, load_notifications = false;
(function ($, Drupal, drupalSettings) {
  'use strict';
  // Document is ajaxStop.
  jQuery(document).ajaxStop(function () {
    if ($('.iot-opselect').length) {
      $('.iot-opselect').selectpicker();
    }
  });

  // ---------------------------------------------
  function getCountryCode(country_code) {
    // Display of menu names by country india.
    if (country_code == 'IN') {
      var length_menu = $('ul.header-nav__main-menu.main-menu > li').length;
      for (let i = 0; i <= length_menu; i++) {
        if ($('ul.header-nav__main-menu.main-menu > li:nth-child(' + i + ') > a > span:first').text().trim() ==
          'InterGreat Study Abroad') {
          $('ul.header-nav__main-menu.main-menu > li:nth-child(' + i + ') > a > span:first').text(Drupal.t('Study Abroad'));
        }
      }
    }

    $('li.menu-item--country').each(function () {
      var country_limit = $(this).attr('data-country');
      var country_negate = $(this).attr('data-country-negate');
      if (country_limit !== undefined) {
        if (country_limit.indexOf(country_code) !== -1) {
          if (parseInt(country_negate) === 1) {
            $(this).hide();
          } else {
            $(this).show();
          }
        } else {
          if (parseInt(country_negate) === 1) {
            $(this).show();
          } else {
            $(this).hide();
          }
        }
      }
    });
  }

  function hideICP(country_code) {
    if ($('.icp').length) {
      if (country_code === 'VN') {
        $('.icp').hide();
      }
    }
    if ($('.block-vn').length) {
      if (country_code === 'VN' || drupalSettings.language == 'vi') {
        $('.block-vn').show();
      }
    }
    if ($('.block-not-vn').length) {
      if (country_code === 'VN' || drupalSettings.language == 'vi') {
        $('.block-not-vn').hide();
      }
    }
  }

  function getCountryBlockCoupon(country_code) {
    if ($('.block-coupon-notification').length) {
      $('.block-coupon-notification').attr('data-country', country_code);
    }
  }

  function findGetParameter(parameterName) {
    var result = null,
      tmp = [];
    location.search.substr(1).split('&').forEach(function (item) {
      tmp = item.split('=');
      if (tmp[0] === parameterName) {
        result = decodeURIComponent(tmp[1]);
      }
    });

    return result;
  }

  /**
   * Initialize country-specific features after country code is loaded.
   *
   * @param {string} countryCode - The country code (e.g., 'US', 'VN', 'CN')
   */
  function initCountryFeatures(countryCode) {
    drupalSettings.country_code = countryCode;
    getCountryBlockCoupon(countryCode);
    getCountryCode(countryCode);
    hideICP(countryCode);
    initMenuMobile();
  }

  /**
   * Fetch country code from server via AJAX.
   *
   * @returns {Promise} jQuery AJAX promise
   */
  function fetchCountryCodeFromServer() {
    return $.ajax({
      type: 'GET',
      cache: true,
      dataType: 'text',
      url: 'https://ieg.li/ipcountry.php',
    }).then(function (countryCode) {
      countryCode = $.trim(countryCode || '');
      return countryCode;
    });
  }

  var countryCodeCacheTtlMs = 60 * 60 * 1000;

  function persistCountryCode(countryCode, timestampMs) {
    if (!countryCode) {
      return;
    }

    localStorage.setItem('country_code', countryCode);
    localStorage.setItem('country_code_ts', String(timestampMs || Date.now()));
  }

  function getStoredCountryCode() {
    var settingsCountryCode = (drupalSettings.country_code || '').trim();
    var cookieCountryCode = getCookie('Drupal_visitor_country');
    var cachedCountryCode = localStorage.getItem('country_code');
    var cachedCountryTimestamp = parseInt(localStorage.getItem('country_code_ts'), 10);
    var nowMs = Date.now();

    if (settingsCountryCode) {
      persistCountryCode(settingsCountryCode, nowMs);
      return settingsCountryCode;
    }

    if (cookieCountryCode) {
      persistCountryCode(cookieCountryCode, nowMs);
      return cookieCountryCode;
    }

    if (cachedCountryCode && cachedCountryTimestamp && (nowMs - cachedCountryTimestamp) < countryCodeCacheTtlMs) {
      return cachedCountryCode;
    }

    if (cachedCountryCode && !cachedCountryTimestamp) {
      persistCountryCode(cachedCountryCode, nowMs);
      return cachedCountryCode;
    }

    return '';
  }
  /**
   * Get country code from localStorage or fetch from server.
   *
   * @returns {Promise<string>} Promise that resolves with country code
   */
  function getOrFetchCountryCode() {
    var storedCountryCode = getStoredCountryCode();
    var nowMs = Date.now();

    if (storedCountryCode) {
      return Promise.resolve(storedCountryCode);
    }

    return fetchCountryCodeFromServer().then(function(countryCode) {
      persistCountryCode(countryCode, nowMs);
      return countryCode;
    });
  }

  function getCookie(name) {
    var cookieString = '; ' + document.cookie;
    var parts = cookieString.split('; ' + name + '=');
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return '';
  }

  function getCachedCountryCode() {
    return window.userCountry || getStoredCountryCode();
  }
  /**
   * Ensure a shared country-code promise for other scripts to await.
   *
   * @returns {Promise<string>} Promise that resolves with country code
   */
  function ensureUserCountryPromise() {
    if (window.userCountryPromise) {
      return window.userCountryPromise;
    }

    window.userCountryPromise = getOrFetchCountryCode()
      .then(function(countryCode) {
        window.userCountry = countryCode;
        return countryCode;
      })
      .catch(function(error) {
        console.error('Failed to load country code:', error);
        window.userCountry = '';
        return '';
      });

    return window.userCountryPromise;
  }

  // Expose helper for other scripts that need the shared promise.
  window.ensureUserCountryPromise = ensureUserCountryPromise;

  /**
   * Show modal if submit parameter is present in URL.
   */
  function handleSubmitModal() {
    if (findGetParameter('submit')) {
      $('#modal-submit').modal('show');
    }
  }

  /**
   * Initialize country code and related features on document ready.
   */
  $(document).ready(function () {
    ensureUserCountryPromise()
      .then(function(countryCode) {
        initCountryFeatures(countryCode);
      });

    handleSubmitModal();
  });
  // ---------------------------------------------
  // Hide page, reload document is completed then show page.
  function reloadPage() {
    if ($('body.preload').length) {
      if ($('#bind-phone-verify').length) {
        if ($('div[aria-label="Error message"]').length) {
          $('div[aria-label="Error message"]').hide();
        }
      }
    }
    $('body').removeClass('preload');
  }

  // Render current year in specific class.
  function updateYear() {
    if ($('.iot--year').length) {
      var year = new Date().getFullYear();
      $('.iot--year').html(year);
    }
  }

  // Automatic render month date have translate by specific format in class.
  function automaticMonthDate() {
    if ($('.month-date').length) {
      const d = new Date();
      var format_date = $('.month-date').attr('data-format');
      if (format_date != '' || format_date != null) {
        var locale = 'en-us';
        $('.month-date').html(Drupal.t(d.toLocaleString(locale, { month: format_date }), {}, { context: 'Long month name' }));
      }
    }
  }

  function setRefID() {
    var url = new URL(location.href);
    var refID = url.searchParams.get('refID');
    if (refID != null) {
      setCookie('refID', refID, 365);
    }
  }

  /**
   * Render menu items.
   */
  function renderMenuItem(items) {
    var output = '';
    for (var i in items) {
      var itemClass = '';
      var text = items[i].origin.innerHTML;
      if (items[i].below) {
        itemClass = 'has-child';
        items[i].origin.classList.add('has-child-link');
        text = '' + text + '';
      }

      items[i].origin.innerHTML = text;

      output += '<li class="' + itemClass + '">' + items[i].origin.outerHTML;

      if (items[i].below) {
        output += '<ul class="sub-menu">';
        output += renderMenuItem(items[i].below);
        output += '</ul>';
      }

      output += '</li>';
    }

    return output;
  }

  /**
   * Render main menu.
   */
  function initMenuMobile() {
    var menuMobile = $('#menu-mobile-area');
    var menuMobileHtml = '<div class="menu-res-inner"><ul>';
    var mainMenu = $('.header-nav__main-menu');
    var resolvedCountryCode = getCachedCountryCode();

    // Remove item menu.
    if (window.location.hostname === 'intergreat.vn') {
      if (mainMenu.find('.ieg-hidden').length) {
        mainMenu.find('.ieg-hidden').remove();
      }
    }

    // Get user info.
    var userInfo = mainMenu.find('[data-drupal-selector="user-info"]');
    if (userInfo.length) {
      menuMobileHtml += '<li class="user-account">';
      userInfo.each(function (i, elm) {
        menuMobileHtml += elm.outerHTML;
      });
      menuMobileHtml += '</li>';
      menuMobileHtml += '<li class="line-through"></li>';
    }

    // Get main menu items.
    function getMenuItems($elm) {
      var items = {};
      if ($elm.length) {
        $elm.each(function (index, item) {
          var parent_item = $(item).parent();
          if (parent_item.hasClass('menu-item--country')) {
            var country_code = resolvedCountryCode;
            if (country_code) {
              var country_limit = parent_item.attr('data-country');
              var country_negate = parent_item.attr('data-country-negate');
              if (country_limit !== undefined) {
                if (country_limit.indexOf(country_code) !== -1) {
                  if (parseInt(country_negate) === 1) {
                    return;
                  }
                } else {
                  if (parseInt(country_negate) !== 1) {
                    return;
                  }
                }
              }
            }
          }

          var temp = item.cloneNode(true);

          items[index] = { origin: temp };

          if ($(item).next('.sub-menu').length) {
            items[index].below = getMenuItems($(item).next('.sub-menu').children('div').children('ul').children('li').children('a'));
          }
        });
      }

      return items;
    }

    var mainMenuItems = getMenuItems(mainMenu.find('[data-drupal-selector="menu-item-main"]'));
    // Render main menu items.
    menuMobileHtml += renderMenuItem(mainMenuItems);

    // Get user wallet.
    var userWallet = mainMenu.find('[data-drupal-selector="menu-item-wallet"]');
    if (userWallet.length) {
      // Render user wallet
      menuMobileHtml += '<li class="line-through"></li>';
      menuMobileHtml += '<li class="top-up wallet">';
      userWallet.each(function (i, elm) {
        menuMobileHtml += elm.outerHTML;
      });
      menuMobileHtml += '</li>';
    }

    // Get user item.
    var userItems = mainMenu.find('[data-drupal-selector="menu-item-user"]');
    if (userItems.length) {
      // Render user item
      menuMobileHtml += '<li class="line-through"></li>';
      userItems.each(function (i, item) {
        menuMobileHtml += '<li>' + item.outerHTML + '</li>';
      });
    }

    menuMobileHtml += '</ul></div>';
    menuMobile.html(menuMobileHtml);
  }

  function hideSubMenuSameParent() {
    if ($('.header-nav__main-menu .main-menu__item').length) {
      $('.header-nav__main-menu .main-menu__item').each(function (index) {
        var main_menu_item = $(this).find('a[data-drupal-selector="menu-item-main"]');
        var main_menu_link = main_menu_item.attr('href');
        var main_menu_text = main_menu_item.text().trim();
        $(this).find('.sub-menu ul li').each(function () {
          var sub_menu_item = $(this).find('a[data-drupal-selector="menu-item-main-child"]');
          var sub_menu_link = sub_menu_item.attr('href');
          var sub_menu_text = sub_menu_item.text().trim();
          if (sub_menu_link === main_menu_link && sub_menu_text == main_menu_text) {
            sub_menu_item.parent().addClass('menu-same');
          }
        });
      });
    }
  }

  // Do something when user click login and register.
  function handleButtonLoginRegister() {
    $(document).on('click', '.link-popup-login', function () {
      //close register popup
      $('#modal-register-pop').modal('hide');
      //set submit
      var submit = $(this).attr('data-submittest');
      var destination = $('#user-login .destination').val();
      var arr_des = destination.split('?');
      if (arr_des.length > 1) {
        destination = arr_des[0];
      }
      $('.social-login-form').attr('action', '/account/login?destination=' + destination);
      if (typeof submit !== 'undefined') {
        if (submit == 'submit') {
          $('.submit-test').val('true');
        } else {
          $('.submit-test').val('');
        }
        $('#user-login .destination').val(destination + '?' + submit + '=true');
        $('.social-login-form input[name=destination]').val(destination + '?' + submit + '=true');
        $('.social-login-form').attr('action', '/account/login?destination=' + destination + '&' + submit + '=true');
      }
    });

    $(document).on('click', '.link-popup-register', function () {
      //close login popup
      $('#modal-login-pop').modal('hide');
      //set submit
      var submit = $('.link-popup-login').attr('data-submittest');
      if (typeof submit !== 'undefined') {
        var destination = $('#user-login .destination').val();
        $('#user-register .destination').val(destination);
      }
    });
  }

  // Get rid of the Facebook residue hash in the URI
  function removeFacebookResidueInURI() {
    // Must be done in JS cuz hash only exists client-side
    if (window.location.hash && window.location.hash === '#_=_') {
      // IE and Chrome version of the hack
      if (String(window.location.hash).substring(0, 1) == '#') {
        window.location.hash = '';
        window.location.href = window.location.origin;
      }
      // Firefox version of the hack
      if (String(location.hash).substring(0, 1) == '#') {
        location.hash = '';
        location.href = location.origin;
      }
    }
  }

  // Show back to top panel.
  function backToTop() {
    $(document).on('click', '.backto-top__btn', function (e) {
      e.preventDefault();
      $('html, body').animate({ scrollTop: 0 }, 800);
    });
  }

  // Click and copy to clipboard
  function copyShareLinkToClipboard() {
    if ($('.share-lesson__copy-btn').length) {
      $('.share-lesson__copy-btn').click(function (event) {
        var copyText = $(this).siblings('.share-lesson__refer-link');
        copyText.select();
        document.execCommand('copy');
        if ($('.share-lesson__copy-status').length <= 0) {
          $('.share-lesson__refer-wrap').append('<div class="share-lesson__copy-status">Copied!</div>');
          $('.share-lesson__copy-status').fadeOut(800, function () {
            $(this).remove();
          });
        }
      });
    }
  }

  // Click and copy to clipboard
  function copyToClipboardAdmin() {
    if ($('.referral__share__admin').length) {
      $('.btn-copy-admin').click(function (event) {
        var copyText = $(this).siblings('.share-link');
        copyText.select();
        document.execCommand('copy');
        if ($('.copy-status').length <= 0) {
          $('.referral__share__admin .share-box__copy-wrap').append('<div class="copy-status">Copied!</div>');
          $('.copy-status').fadeOut(800, function () {
            $(this).remove();
          });
        }
      });
    }
  }

  // Set cookie.
  function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = 'expires=' + d.toUTCString();
    document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
    console.log(cname, cvalue);
  }

  function updateLanguageSwitcher(settings) {
    if ($('#iot-language-switcher').length) {
      if (settings.language !== undefined) {
        if (settings.language != 'vi') {
          $('#iot-language-switcher').val(settings.language);
          // Set text language name again for div in button. - Fixed issue #4145.
          $('#iot-language-switcher').find('option').each(function () {
            var selectValue = $(this).val();
            var selectedOptionText = $('#iot-language-switcher').find('option[value=\'' + selectValue + '\']').text();
            if (selectValue === settings.language) {
              var buttonWithDataID = $('button').filter(function () {
                return $(this).data('id') === 'iot-language-switcher';
              });
              var fileItem = buttonWithDataID.find('.filter-option-inner-inner');
              fileItem.text(selectedOptionText);
            }
          });
        }
      }
      $('#iot-language-switcher').on('change', function (e) {
        e.preventDefault();
        if (!changeLanguage) {
          changeLanguage = true;
          setCookie('Drupal.visitor.iot_lang', this.value, 365);
          window.location.href = $('.iot-language-switcher-link').find('a[hreflang="' + this.value + '"]').attr('href');
        }
      });
    }
  }

  // Convert time by timezone.
  function time_by_timezone(offset) {
    var d = new Date();
    var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    var nd = new Date(utc + (1000 * offset));

    var h = '0' + nd.getHours();
    var m = '0' + nd.getMinutes();

    return h.slice(-2) + ':' + m.slice(-2);
  }

  // Update user time real.
  function updateUserTimezone() {
    if ($('.time-zone').length) {
      var timezoneElm = $('.time-zone');
      var timezone = timezoneElm.data('timezone');
      var timezone_offset = timezoneElm.data('timezone-offset');

      if (timezone != '' && timezone_offset != '') {
        timezoneElm.text(time_by_timezone(timezone_offset) + ' (' + timezone + ')');

        setInterval(function () {
          timezoneElm.text(time_by_timezone(timezone_offset) + ' (' + timezone + ')');
        }, 59000);
      }
    }
  }

  // Update current when user change current.
  function updateChangeCurrent() {
    //check currency change
    $('select.currency-selectpicker').once().on('change', function () {
      var curr = $(this).val();
      $.ajax({
        url: Drupal.url('update/currency/' + curr),
        success: function (result) {
          if (result === 'ok') {
            window.location.reload();
          }
        },
      });
    });
  }

  // Get render notifications
  function renderdNotifications() {
    if ($('.user-notification').length) {
      if (!load_notifications) {
        load_notifications = true;
        $.get(Drupal.url('account/notification-unread/' + drupalSettings.user.uid + '?_format=json')).done(function (data) {
          load_notifications = false;
          var notification_cnt = 0, unread_cnt = 0;
          var renderElm = $('ul.unread-notification');
          renderElm.empty();
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }
          for (var i in data) {
            var notify = data[i];
            var read_class = notify.unread === 0 ? 'not-seen' : '';
            if (read_class == 'not-seen') {
              notification_cnt++;
            }
            var tmp = '<li class="notify-item ' + read_class + '" data-notify="' + notify.id + '">\n' +
              ' <a href="' + Drupal.url('account/notification/' + notify.id) + '">' + notify.title +
              '</a><span class="date">' + notify.created + '</span></li>';
            renderElm.append(tmp);
            unread_cnt = notify.unread_cnt;
          }
          if ($('.user-notification .number').length) {
            if (unread_cnt > 0) {
              $('.user-notification .number').html(unread_cnt);
              if (unread_cnt > 99) {
                $('.user-notification .icon-notification').addClass('plus');
                $('.user-notification .number').html(99);
              }
            } else {
              $('.user-notification .number').html('');
              $('.user-notification .icon-notification').removeClass('plus');
            }
          }

          if ($('.user-notifications .icon-notification-mb .number').length &&
            $('.user-notification .icon-notification .number').length) {
            $('.user-notifications .icon-notification-mb .number').html($('.user-notification .icon-notification .number').html());
          }
        });
      }
    }
  }

  // Function Global.
  Drupal.behaviors.iotGlobal = {
    attach: function (context, settings) {
      // Hide page, reload document is completed then show page.
      reloadPage();

      // Render current year in specific class.
      updateYear();

      // Custom menu mobile.
      initMenuMobile();
      hideSubMenuSameParent();

      setRefID();

      removeFacebookResidueInURI();

      backToTop();

      handleButtonLoginRegister();

      copyShareLinkToClipboard();
      copyToClipboardAdmin();

      updateLanguageSwitcher(settings);

      updateUserTimezone();

      updateChangeCurrent();

      renderdNotifications();

      automaticMonthDate();
    },
  };

  // ---------------------------------------------
  // ---------------------------------------------
  // ---------------------------------------------
  // Define functions.

  function showToolTip() {
    $('.video-icon').tooltip({
      title: Drupal.t('IELTS Explain videos available !'),
      html: true,
      placement: 'top',
      container: '.book-img-wrap',
    });

    $('.video-icon-one').tooltip({
      title: Drupal.t('IELTS Explain videos available !'),
      html: true,
      placement: 'top',
      container: '.book-img-wrap-one',
    });

    $('.video-icon-two').tooltip({
      title: Drupal.t('IELTS Explain videos available !'),
      html: true,
      placement: 'top',
      container: '.book-img-wrap-two',
    });
    if ($('.user-action__tip').length) {
      $('.user-action__tip').each(function (index, elm) {
        var html = $(elm).data('original-title');
        $(elm).tooltip({
          title: '<div class="tooltip-inner">' + html + '</div>',
          html: true,
          animated: 'fade',
          placement: 'top',
          container: '.user-action__mess',
        });
      });
    }
  }

  /**
   * Prevent clicks on disabled product variation tabs.
   */
  function preventDisabledVariationClicks() {
    $('.product-variation .nav li.disabled a').click(function () {
      return false;
    });
  }

  /**
   * jQuery plugin to handle click outside functionality.
   *
   * @param {Function} callback - Function to call when clicked outside
   * @param {boolean} selfDestroy - Whether to destroy after first use
   */
  $.fn.clickOff = function (callback, selfDestroy) {
    var clicked = false;
    var parent = this;
    var destroy = selfDestroy !== undefined ? selfDestroy : true;

    parent.click(function () {
      clicked = true;
    });

    $(document).click(function (event) {
      if (!clicked) {
        callback(parent, event);
      }
      if (destroy) {
        // parent.off("click");
      }
      clicked = false;
    });
  };

  /**
   * Clear localStorage if older than 30 days.
   */
  function manageLocalStorageCache() {
    var timeKey = 'flag_timehistory';
    var secondsIn30Days = 2592000;
    var currentTime = Math.floor(Date.now() / 1000);

    if (localStorage.getItem(timeKey) == null) {
      localStorage.clear();
      localStorage.setItem(timeKey, currentTime);
    } else {
      var timeOld = localStorage.getItem(timeKey);

      if ((currentTime - timeOld) > secondsIn30Days) {
        localStorage.clear();
        localStorage.setItem(timeKey, currentTime);
      }
    }
  }

  /**
   * Handle refresh button for recent tips view.
   */
  function initRecentTipsRefresh() {
    $(document).on('click', '.view-recent-tips .box-caption .refresh', function (event) {
      var $refreshBtn = $(this);

      $refreshBtn.addClass('active');
      setTimeout(function () {
        $refreshBtn.removeClass('active');
      }, 1000);

      $refreshBtn.closest('.view-recent-tips').find('button.form-submit').trigger('click');
    });
  }

  // Function click register in page ielts course.
  function ielst_course_cookie() {
    $('.ieltscourse__register').on('click', function (e) {
      if (drupalSettings.user.uid == 0) {
        setCookie('Drupal.visitor.flag_ielts_course', 1, 365);
      }
    });
  }

  // Function get tracking source from url.
  function tracking_wechat_acca() {
    // get param 'tracking-source' == acca from url.
    var url = new URL(location.href);
    var tracking_source = url.searchParams.get('tracking-source');
    if (tracking_source != null && tracking_source != '' && tracking_source != undefined) {
      // convert tracking_source to lowercase.
      tracking_source = tracking_source.toLowerCase();
      if (tracking_source == 'wechat_acca') {
        setCookie('Drupal.visitor.flag_wechat_acca', 1, 365);
      }
    }
  }

  // Select language and currency.
  function selectCurrencyLanguage() {
    if ($('.language-selectpicker.bootstrap-select').is(':visible')) {
      return;
    }
    $('.language-selectpicker,.currency-selectpicker').selectpicker();
  }

  // Change qrcode for some pages.
  function changeQrCode() {
    var url_qrcode = '/themes/iot/images/qrcode-promotion-cn.png';
    if ($('.baidu-utm .baidu-change-qrcode').length) {
      $('.baidu-utm .baidu-change-qrcode').attr('src', url_qrcode);
    }
  }

  /**
   * Handle close alert functionality.
   */
  function handleCloseAlert() {
    if ($('.js-close-alert').length) {
      $('.js-close-alert').click(function () {
        $(this).parent().hide();
      });
    }
  }

  /**
   * Move breadcrumb to breadcrumb area for SOT test recordings review.
   */
  function moveBreadcrumbToArea() {
    if ($('#breadcrumb-area').length && $('.region-breadcrumb').length) {
      var element = $('.region-breadcrumb').detach();
      $('#breadcrumb-area').append(element);
    }
  }

  /**
   * Detect if browser is supported.
   *
   * @returns {boolean} True if browser is supported, false otherwise.
   */
  function isSupportedBrowser() {
    var agent = window.navigator.userAgent.toLowerCase();

    switch (true) {
      case agent.indexOf('edge') > -1:
        return true;
      case agent.indexOf('edg/') > -1:
        return true;
      case agent.indexOf('opr') > -1 && !!window.opr:
        return true;
      case agent.indexOf('chrome') > -1 && !!window.chrome:
        return true;
      case agent.indexOf('trident') > -1:
        return false;
      case agent.indexOf('firefox') > -1:
        return true;
      case agent.indexOf('safari') > -1:
        return true;
      default:
        return false;
    }
  }

  /**
   * Handle unsupported browser modal.
   */
  function handleUnsupportedBrowser() {
    if (!isSupportedBrowser()) {
      $('.js-check-ios').click(function (event) {
        event.preventDefault();
        $('#modal-no-support').modal('show');
      });
    }
  }

  /**
   * Initialize ViewerJS lazy loading for ODT files.
   */
  function initViewerJsLazyLoad() {
    if (!$('#fix-odt-file-load').length) {
      return;
    }

    var $viewer = $('#fix-odt-file-load');

    // Set initial src
    if (!$viewer.attr('src') && $viewer.data('src')) {
      $viewer.attr('src', $viewer.data('src'));
    }

    // Lazy load on scroll
    $(window).on('scroll', function () {
      if ($(this).scrollTop() >= ($viewer.parent().offset().top - $(window).height()) &&
        !$viewer.hasClass('loaded')) {
        $viewer.addClass('loaded');
      }
    });
  }

  /**
   * Handle page reload on significant screen resize.
   */
  function handleResponsiveReload() {
    if (!$('.top-selling').length && !$('.product-detail .pr-col-right').length) {
      return;
    }

    var windowWidth = $(window).width();

    $(window).resize(function () {
      var screenResizeWidth = Math.abs(windowWidth - $(window).width());
      if (screenResizeWidth >= 350) {
        location.reload();
        windowWidth = $(window).width();
      }
    });
  }

  /**
   * Handle star rating widget hover effects.
   */
  function initStarRatingHover() {
    $('.rate-widget-fivestar a').hover(function () {
      $(this).addClass('hover');
      $(this).prevAll().addClass('hover');
      $(this).prevAll().removeClass('hover-fa-star-o');
      $(this).nextAll().removeClass('hover');
      $(this).nextAll().addClass('hover-fa-star-o');
    });

    $('.rate-widget-fivestar').mouseleave(function () {
      $(this).find('.hover').removeClass('hover');
      $(this).find('.hover-fa-star-o').removeClass('hover-fa-star-o');
    });
  }

  /**
   * Initialize progress bar states based on data attributes.
   */
  function initProgressBars() {
    $('.progress-state').each(function () {
      var percentage = $(this).attr('data');
      $(this).css('width', percentage);
    });
  }

  /**
   * Hide page loader with fade effect.
   */
  function hidePageLoader() {
    $('#page-loader').delay(800).fadeOut(600, function () {
      $('body').fadeIn();
    });
  }

  /**
   * Handle share result copy to clipboard functionality.
   */
  function initShareResultCopy() {
    $('a.share-result').each(function () {
      $(this).click(function (e) {
        e.preventDefault();
        $('input.share-result').select();
        document.execCommand('Copy');

        if ($('.share-box__copy-status').length <= 0) {
          $('.share-box__copy-wrap').append('<div class="share-box__copy-status">Copied!</div>');
          $('.share-box__copy-status').fadeOut(800, function () {
            $(this).remove();
          });
        }
      });
    });
  }

  function initLazyLoad() {
    // Check if LazyLoad is defined
    if (typeof LazyLoad === 'undefined') {
      console.error('LazyLoad library is not loaded.');
      return;
    }
    //init image lazy load
    var lazyLoadInstance = new LazyLoad({
      // Your custom settings go here
    });
  }

  Drupal.behaviors.iot_theme = {
    attach: function (context, settings) {
      initLazyLoad();

      // Core functionality
      changeQrCode();
      ielst_course_cookie();
      tracking_wechat_acca();
      showToolTip();
      selectCurrencyLanguage();

      // UI Interactions
      handleCloseAlert();
      moveBreadcrumbToArea();
      handleUnsupportedBrowser();
      initViewerJsLazyLoad();
      handleResponsiveReload();

      // Newsletter and UI components
      initStarRatingHover();
      initProgressBars();
      hidePageLoader();
      initShareResultCopy();

      // Other functionalities
      preventDisabledVariationClicks();
      manageLocalStorageCache();
      initRecentTipsRefresh();
    },
  };

})(jQuery, Drupal, drupalSettings);
;
(function ($, Drupal, drupalSettings) {
  // mouse croll on the home page
  function arrowScrollDownIeltsCourse() {
    // Scroll Page.
    if ($('.landing_page__register').length) {
      $('.landing_page__register').on('click', function (e) {
        e.preventDefault()
        $('html, body').animate({ scrollTop: $('.block-webform-block').offset().top - 100 }, 1200)
      })
    }
    // Scroll Into View.
    if ($('.landing_page__register_scroll_to_view').length) {
      var block_webform = document.querySelector(".block-webform-block");
      $('.landing_page__register_scroll_to_view').on('click', function (e) {
        e.preventDefault()
        block_webform.scrollIntoView();
      })
    }
  }

  // remove placeholder on focus
  function removePlaceholder() {
    $('input:not(#js-search-lessons),textarea').focus(function () {
      $(this).data('placeholder', $(this).attr('placeholder'))
        .attr('placeholder', '');
    }).blur(function () {
      $(this).attr('placeholder', $(this).data('placeholder'));
    });
  }

  // Add attribute for form forgot password
  function addAttrForgotPass() {
    if ($('#user-pass #edit-submit').length > 0) {
      var user_pass_email = $("#user-pass input[name='name']").val();
      if(user_pass_email != '') {
        $('#user-pass #edit-submit').attr("onclick", "jQuery(this).addClass('disabled');jQuery(this).html('Processing');");
      }
    }
  }

  function handlerAdsBannerModile() {
    var ads_expired = localStorage.getItem('ads_expired');
    var now =  Math.floor(Date.now() / 1000);
    if (ads_expired != null) {
      if (ads_expired < now) {
        $('#block-banneradsserver').show();
      }
      else {
        $('#block-banneradsserver').hide();
      }
    }
    else {
      $('#block-banneradsserver').show();
    }
    const interval_modal_ads = setInterval(function () {
      if ($(document).find('.ads-mobile ins img').length && !$(document).find('.ads-mobile .close-modal').length) {
        $(document).find('.ads-mobile').append('<i class="ion-android-close close-modal ads-mobile-close" data-dismiss="modal" aria-label="Close"></i>');
        clearInterval(interval_modal_ads);
      }
    }, 1000);
    $(document).on('click', function (e) {
      if ($(e.target).hasClass('ads-mobile-close')) {
        const currentDate = new Date();
        const twohoursDate = new Date(currentDate.setHours(currentDate.getHours() + 2));
        const tomorrowDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
        const expired = Math.floor(twohoursDate.getTime() / 1000);
        window.localStorage.setItem('ads_expired', expired);
        $('#block-banneradsserver').hide();
      }
    })
  }
  function handlerBlockLiveStream() {
    var livestream_expired = localStorage.getItem('livestream_expired');
    var now =  Math.floor(Date.now() / 1000);
    if (livestream_expired != null) {
      if (livestream_expired < now) {
        $('.block-livestream-youtube').show();
      }
      else {
        $('.block-livestream-youtube').remove();
      }
    }
    else {
      $('.block-livestream-youtube').show();
    }
    const interval_modal_livestream = setInterval(function () {
      if ($(document).find('.block-livestream-youtube iframe').length && !$(document).find('.block-livestream-youtube .close-modal').length) {
        $(document).find('.block-livestream-youtube').append('<i class="ion-android-close close-modal livestream-close" data-dismiss="modal" aria-label="Close"></i>');
        clearInterval(interval_modal_livestream);
      }
    }, 1000);
    $(document).on('click', function (e) {
      if ($(e.target).hasClass('livestream-close')) {
        const currentDate = new Date();
        const twohoursDate = new Date(currentDate.setHours(currentDate.getHours() + 2));
        const tomorrowDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
        const expired = Math.floor(tomorrowDate.getTime() / 1000);
        window.localStorage.setItem('livestream_expired', expired);
        $('.block-livestream-youtube').remove();
      }
    })
  }

  function countdownRedirect() {
    var cancelBtn = $('[data-drupal-selector="cancel-redirect"]');
    if (cancelBtn.length) {
      cancelBtn.on('click', function(e) {
        $(this).addClass('clicked')
      })
    }

    var countDownElm = $('[data-drupal-selector="count-to-redirect"]');
    var redirectElm = $('[data-drupal-selector="redirect-target"]');
    if (countDownElm.length) {
      var inputTime = parseInt(countDownElm.data('time'))*1000;
      var testTime = new Date().getTime() + inputTime;
      countDownElm.countdown(testTime, function(event) {
        $(this).html(event.strftime('<span>%-Ss</span>'));
      }).on('finish.countdown', ()=> {
        if (cancelBtn.length && cancelBtn.hasClass('clicked')) {
          return;
        }

        if (redirectElm.length) {
          window.location.href = redirectElm.attr('href');
        }
      });
    }
  }

  function clickModalIELTSTutors() {
    if (!$('#modal-cnItem-consultation').length) {
      return;
    }

    $('#modal-cnItem-consultation').on('show.bs.modal', function (event) {
      var button = $(event.relatedTarget) // Button that triggered the modal
      console.log(button);
      var recipient = button.data('tutor') // Extract info from data-* attributes
      console.log(recipient);
      // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
      // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
      var modal = $(this)
      //modal.find('.modal-title').text('New message to ' + recipient)
      //modal.find('.modal-body input').val(recipient)
      var iframe = modal.find('iframe').attr('src');
      if (!iframe) {
        return;
      }
      // Check if iframe has query string , then remove query string
      if (iframe.indexOf('?') > -1) {
        iframe = iframe.split('?')[0];
      }
      var newIframe = iframe + '?yi_xiang_wai_jiao=' + recipient;
      modal.find('iframe').attr('src', newIframe);

    })
  }

  function moveCommunityFeedbackBoxToBottom() {
    if (window.innerWidth < 768 && $('.writing-essay-page .user-feedback').length) {
      $('.col-right.custom-rows-order').after($('.writing-essay-page .user-feedback'));
    }
  }

  function handleIATIntergration4516(retry = 100) {
    try {
      if (retry <= 0 || !drupalSettings.iat_integration) {
        return false;
      }

      var countryCode = drupalSettings.iat_integration.current_country;
      console.log('>> countryCode: ', countryCode);

      if (!countryCode) {
        return setTimeout(function () {
          handleIATIntergration4516(retry - 1);
        }, 1000);
      }

      countryCode = String(countryCode).toUpperCase();

      if (!drupalSettings.iat_integration.allowed_countries.includes(countryCode)) {
        return false;
      }

      // // Change support form to A2's webform.
      // var webformUrl = drupalSettings.iat_integration.ai_test_webform;
      // if ($('#modal-register-ex').length && !$('#a2-register-ex').length) {
      //   if ($('#modal-register-ex .webform-ajax-form-wrapper').length) {
      //     $('#modal-register-ex .webform-ajax-form-wrapper').html('<iframe id="a2-register-ex" height="330" src=' + webformUrl + '></iframe>');
      //   }
      //   else {
      //     $('#modal-register-ex').append('<iframe id="a2-register-ex" height="330" src=' + webformUrl + '></iframe>');
      //   }
      // }
      // // Footer form.
      // if ($('.register-box').length && !$('#a2-register-ex2').length) {
      //   $('.register-box').html('<iframe id="a2-register-ex2" height="330" src=' + webformUrl + '></iframe>');
      // }

      // Add button.
      if (!$('#custom-checkout-btn').length && $('.hero__btn').length) {
        var checkoutBtn = $(document.createElement('a'));
        checkoutBtn.attr('class', 'hero__btn iot-grbt -blue wow fadeInUp');
        checkoutBtn.attr('href', '#');
        checkoutBtn.text(Drupal.t('Start Now'));
        checkoutBtn.attr('id', 'custom-checkout-btn');
        $('.hero__btn').text(Drupal.t('Consultant Now'))
          .removeClass('wow fadeInUp')
          .wrap('<div style="display: flex;"></div>')
          .after(checkoutBtn);
      }
      $('.ielts-intro__btn, #custom-checkout-btn').each(function (index, elm) {
        if (!$(this).attr('onclick')) {
          $(this).attr('onclick', 'customIATCode(event)');
        }
      });

      $('.notify--product[data-pro-type="iat_code"]').each(function () {
        var product = $(this);
        // var wrapper = product.find('.best-item__wrapper');
        var button = product.find('.best-item__bt-buynow');

        /*if (wrapper.length) {
          wrapper.attr('href', drupalSettings.iat_integration.iat_code_checkout_url);
          wrapper.attr('onclick', 'customIATCode(event)');
        }*/

        if (button.length) {
          button.attr('onclick', 'customIATCode(event)');
        }
      });
    } catch (e) {
      console.log('something went wrong: ', e);
      return false;
    }
  }

  window.customIATCode = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if ($('#modal-exam-code-abc').length) {
      $('#modal-exam-code-abc').modal('show');
    }
    else {
      location.href = drupalSettings.iat_integration.iat_code_checkout_url;
    }
  }

  $(document).ready(function () {
    handlerAdsBannerModile();
    handlerBlockLiveStream();
    countdownRedirect();
    clickModalIELTSTutors();
    moveCommunityFeedbackBoxToBottom();
    /* OnLoad Window */
    var wowInit = function() {
      if (typeof WOW === 'undefined') {
        return;
      }

      new WOW().init();
    };
    window.addEventListener('load', function() {
      wowInit();
    });
  })



  Drupal.behaviors.iot_custom_theme = {
    attach: function (context, settings) {
      arrowScrollDownIeltsCourse();
      removePlaceholder();
      addAttrForgotPass();
      handleIATIntergration4516();
    }
  }
})(jQuery, Drupal, drupalSettings)
;
(function ($, Drupal) {
  "use strict";
  Drupal.behaviors.QRCodeManager = {
    attach: function (context, settings) {
      if (settings.corporatePartnerAccaQr && settings.corporatePartnerAccaQr.trim()) {
        $('[data-drupal-selector="corporate-partner-qr"]').each(function (index, elm) {
          elm.dataset.src = settings.corporatePartnerAccaQr.trim();
          elm.src = settings.corporatePartnerAccaQr.trim();
        })
      }
    }
  }
})(jQuery, Drupal)
;
/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(function (Drupal, drupalSettings) {
  Drupal.behaviors.activeLinks = {
    attach: function attach(context) {
      var path = drupalSettings.path;
      var queryString = JSON.stringify(path.currentQuery);
      var querySelector = path.currentQuery ? '[data-drupal-link-query=\'' + queryString + '\']' : ':not([data-drupal-link-query])';
      var originalSelectors = ['[data-drupal-link-system-path="' + path.currentPath + '"]'];
      var selectors = void 0;

      if (path.isFront) {
        originalSelectors.push('[data-drupal-link-system-path="<front>"]');
      }

      selectors = [].concat(originalSelectors.map(function (selector) {
        return selector + ':not([hreflang])';
      }), originalSelectors.map(function (selector) {
        return selector + '[hreflang="' + path.currentLanguage + '"]';
      }));

      selectors = selectors.map(function (current) {
        return current + querySelector;
      });

      var activeLinks = context.querySelectorAll(selectors.join(','));
      var il = activeLinks.length;
      for (var i = 0; i < il; i++) {
        activeLinks[i].classList.add('is-active');
      }
    },
    detach: function detach(context, settings, trigger) {
      if (trigger === 'unload') {
        var activeLinks = context.querySelectorAll('[data-drupal-link-system-path].is-active');
        var il = activeLinks.length;
        for (var i = 0; i < il; i++) {
          activeLinks[i].classList.remove('is-active');
        }
      }
    }
  };
})(Drupal, drupalSettings);;
/* Copyright (c) 2009 Brandon Aaron (http://brandonaaron.net)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 * Thanks to: http://adomas.org/javascript-mouse-wheel/ for some pointers.
 * Thanks to: Mathias Bank(http://www.mathias-bank.de) for a scope bug fix.
 *
 * Version: 3.0.2
 * 
 * Requires: 1.2.2+
 */
(function (c) {
    var a = ["DOMMouseScroll", "mousewheel"];
    c.event.special.mousewheel = {
        setup: function () {
            if (this.addEventListener) {
                for (var d = a.length; d;) {
                    this.addEventListener(a[--d], b, false)
                }
            } else {
                this.onmousewheel = b
            }
        }, teardown: function () {
            if (this.removeEventListener) {
                for (var d = a.length; d;) {
                    this.removeEventListener(a[--d], b, false)
                }
            } else {
                this.onmousewheel = null
            }
        }
    };
    c.fn.extend({
        mousewheel: function (d) {
            return d ? this.bind("mousewheel", d) : this.trigger("mousewheel")
        }, unmousewheel: function (d) {
            return this.unbind("mousewheel", d)
        }
    });

    function b(f) {
        var d = [].slice.call(arguments, 1), g = 0, e = true;
        f = c.event.fix(f || window.event);
        f.type = "mousewheel";
        if (f.wheelDelta) {
            g = f.wheelDelta / 120
        }
        if (f.detail) {
            g = -f.detail / 3
        }
        d.unshift(f, g);
        return c.event.handle.apply(this, d)
    }
})(jQuery);;
