(window.webpackJsonp=window.webpackJsonp||[]).push([[0],{16:function(e,n,t){e.exports=t(26)},22:function(e,n,t){},23:function(e,n){function t(e){var n=new Error("Cannot find module '"+e+"'");throw n.code="MODULE_NOT_FOUND",n}t.keys=function(){return[]},t.resolve=t,e.exports=t,t.id=23},25:function(e,n,t){},26:function(e,n,t){"use strict";t.r(n);var o=t(0),i=t.n(o),a=t(8),r=t.n(a),c=(t(22),t(1)),s=t(3),l=t(6),d=t(2),u=t(9),h=t.n(u),g=t(10),f=t(11),p=t(14),v=t(12),O=t(4),m=t(15),w=t(13),y=t.n(w),b=t(5),j=function(e){var n=e.offset,t=e.scaledPointer;return{x:n.x+t.x,y:n.y+t.y}},P=function(e){function n(e){var t;return Object(g.a)(this,n),(t=Object(p.a)(this,Object(v.a)(n).call(this,e))).dom=i.a.createRef(),t.onDrop=t.onDrop.bind(Object(O.a)(t)),t.onPointerWheel=t.onPointerWheel.bind(Object(O.a)(t)),t.onResize=t.onResize.bind(Object(O.a)(t)),t.origin={x:0,y:0},t.scale=1,t.photos={},t}return Object(m.a)(n,e),Object(f.a)(n,[{key:"componentDidMount",value:function(){var e=this.dom.current;this.loadPhotos(this.props),this.remotePointerImage=new Image,this.remotePointerImage.src="https://togetherjs.com/togetherjs/images/cursor.svg",e.addEventListener("dragover",n.onDragOver,!1),e.addEventListener("drop",this.onDrop,!1),window.addEventListener("resize",this.onResize,!1),this.touches=y()(window,{filtered:!0,preventSimulated:!1}).on("start",this.onPointerStart.bind(this)).on("move",this.onPointerMove.bind(this)).on("end",this.onPointerEnd.bind(this)),Object(b.addWheelListener)(window,this.onPointerWheel),this.onResize()}},{key:"componentWillReceiveProps",value:function(e){this.loadPhotos(e),this.draw(e)}},{key:"shouldComponentUpdate",value:function(){return!1}},{key:"componentWillUnmount",value:function(){var e=this.dom.current;this.touches.disable(),e.removeEventListener("dragover",n.onDragOver),e.removeEventListener("drop",this.onDrop),Object(b.removeWheelListener)(window,this.onPointerWheel),window.removeEventListener("resize",this.onResize)}},{key:"onDrop",value:function(e){var n=this.props.socket,t=e.clientX,o=e.clientY,i=Object(c.a)(e.dataTransfer.files,1)[0];if(e.preventDefault(),i){var a=this.getPointer([t,o]),r=new FileReader;r.onload=function(e){var t=new Image;t.src=e.target.result,t.onload=function(e){var o=document.createElement("canvas");o.width=t.width,o.height=t.height,o.getContext("2d").drawImage(t,0,0);var i=o.toDataURL("image/jpeg",.01);console.log("small",i.length),console.log("big",r.result.length);var c=Math.random().toString(36).substr(2,5);n.send(JSON.stringify({type:"ROOM/ADD_PHOTO",payload:{_id:c,origin:a,photo:i.substr(i.indexOf("base64")+7)}})),n.send(JSON.stringify({type:"ROOM/ADD_PHOTO",payload:{_oldid:c,_id:Math.random().toString(36).substr(2,5),origin:a,photo:r.result.substr(r.result.indexOf("base64")+7)}}))}},r.readAsDataURL(i)}}},{key:"onPointerStart",value:function(e,n){var t=this,o=this.props,i=o.photos,a=o.socket,r=e.button||0,c=this.getPointer(n),s=c.x,l=c.y,d=i.filter(function(e){var n=e._id,o=e.origin,i=t.photos[n];if(!i)return!1;var a=i.width,r=i.height;return!(s<o.x||s>o.x+a||l<o.y||l>o.y+r)});d.reverse();var u=d[0];0===r&&!u||2===r?this.dragging={canvas:n}:0===r&&u&&(e.shiftKey?a.send(JSON.stringify({type:"ROOM/REMOVE_PHOTO",payload:{photo:u._id}})):this.dragging={offset:{x:u.origin.x-s,y:u.origin.y-l},photo:u})}},{key:"onPointerMove",value:function(e,n){var t=this.dragging,o=this.origin,i=this.scale,a=this.props.peers,r=this.getPointer(n);a.forEach(function(e){var n=e.data;n&&n.open&&n.send(new Int32Array([r.x,r.y]))}),t&&(t.canvas&&(o.x+=(n[0]-t.canvas[0])/i,o.y+=(n[1]-t.canvas[1])/i,t.canvas=n),t.photo&&(t.scaledPointer=r),this.draw())}},{key:"onPointerEnd",value:function(){var e=this.dragging,n=this.props.socket;if(e&&(delete this.dragging,e.photo&&e.scaledPointer)){var t=e.photo._id;n.send(JSON.stringify({type:"ROOM/MOVE_PHOTO",payload:{origin:j(e),photo:t}}))}}},{key:"onPointerWheel",value:function(e){var n=e.deltaY,t=1+.075*Math.min(Math.max(-n,-1),1);this.scale*=t,this.scale=Math.min(Math.max(this.scale,.25),2),this.draw()}},{key:"onResize",value:function(){var e=this.dom.current;e.width=window.innerWidth,e.height=window.innerHeight,this.draw()}},{key:"getPointer",value:function(e){var n=Object(c.a)(e,2),t=n[0],o=n[1],i=this.dom.current,a=this.origin,r=this.scale;return{x:Math.round((t-.5*i.width)/r-a.x),y:Math.round((o-.5*i.height)/r-a.y)}}},{key:"loadPhotos",value:function(e){var n=this;e.photos.forEach(function(e){var t=e._id,o=e.photo;if(!n.photos[t]){var i=new Image;i.src="data:image/jpeg;base64,".concat(o),i.onload=function(){n.photos[t]=i,n.draw()}}})}},{key:"draw",value:function(e){var n=this,t=this.dom.current,o=this.origin,i=this.scale,a=e||this.props,r=a.peers,s=a.photos,l=t.getContext("2d");t.width=t.width,l.translate(.5*t.width,.5*t.height),l.scale(i,i),l.translate(o.x,o.y),s.forEach(function(e){var t=e._id,o=e.origin;if(n.photos[t]){var i=n.dragging,a=i&&i.photo&&i.photo._id===t?j(i):o,r=a.x,c=a.y;l.drawImage(n.photos[t],r,c)}}),r.forEach(function(e){var t=e.pointer;if(t){var o=Object(c.a)(t,2),i=o[0],a=o[1];l.drawImage(n.remotePointerImage,i,a),l.restore()}})}},{key:"render",value:function(){var e=this.dom;return i.a.createElement("canvas",{ref:e})}}],[{key:"onDragOver",value:function(e){e.preventDefault()}}]),n}(o.Component),E=(t(25),function(){return new URLSearchParams(window.location.search).get("h")}),k=function(e,n,t){return e.on("data",function(e){n(function(n){return Object(d.a)({},n,Object(s.a)({},t,Object(d.a)({},n[t],{pointer:Object(l.a)(new Int32Array(e))})))})})},x=function(e,n){return function(t){return Object(d.a)({},t,Object(s.a)({},n.peer,Object(d.a)({},t[n.peer]||{},Object(s.a)({},e,n))))}},D=function(){var e=Object(o.useState)([]),n=Object(c.a)(e,2),t=n[0],a=n[1],r=Object(o.useState)({state:"registering"}),s=Object(c.a)(r,2),u=s[0],g=s[1],f=Object(o.useState)({}),p=Object(c.a)(f,2),v=p[0],O=p[1];console.log("appState",u.state),console.log("peers",v);var m=function(e){"ROOM/ADD_PHOTO"===e.type&&(console.log("adding",e.payload),a(function(n){return[e.payload].concat(Object(l.a)(n.filter(function(n){return n._id!==e.payload._oldid})))})),"ROOM/REMOVE_PHOTO"===e.type&&(console.log("removing",e.payload),a(function(n){return n.filter(function(n){return n._id!==e.payload.photo})})),"ROOM/MOVE_PHOTO"===e.type&&(console.log("moving",e.payload),a(function(n){return n.map(function(n){return n._id===e.payload.photo?Object.assign({},n,{origin:e.payload.origin}):n})}))};return Object(o.useEffect)(function(){var e=new h.a(function(){var e=window.location.hash;if(e&&"string"===typeof e)return e.replace(/\W/g,"")}(),{debug:3});console.log({session:e}),e.on("open",function(n){console.log({id:n}),console.log("".concat(document.URL,"?h=").concat(n)),window.location.hash=n;var t=E();if(g({state:t?"connectingToHost":"waitingForClientConnections",id:n,session:e}),t||function(e,n,t){e.on("connection",function(e){"FILE"===e.label&&(console.log("incomming file connection"),e.on("open",function(n){console.log("incomming file connection open",e),e.on("data",function(e){console.log("fdata",{d:e}),t(e)})}),n(x("file",e))),"DATA"===e.label&&(console.log("incomming data connection"),e.on("open",function(){console.log("incomming data connection open",e),k(e,n,e.peer)}),n(x("data",e)))})}(e,O,m),t){console.log("need to connect to "+t);!function(n){!function t(){var o=e.connect(n,{label:"FILE",reliable:!0});O(x("file",o)),g(function(e){return Object(d.a)({},e,{state:"waitingForOpen"})}),o.on("open",function(e){console.log("file connection open",e),g(function(e){return Object(d.a)({},e,{state:"waitingForOpen"===e.state?"waitingForOpen2":"open"})}),o.on("data",function(e){console.log("fdata",{d:e}),m(e)})}),o.on("error",function(e){return console.log("file error",e)}),o.on("close",function(e){console.log("file reconnecting...",e),t()})}(),function t(){var o=e.connect(n,{label:"DATA"});O(x("data",o)),o.on("open",function(e){console.log("data connection open",e),g(function(e){return Object(d.a)({},e,{state:"waitingForOpen"===e.state?"waitingForOpen2":"open"})}),k(o,O,n)}),o.on("error",function(e){return console.log("data error",e)}),o.on("close",function(e){console.log("data reconnecting...",e),t()})}()}(t)}})},[]),i.a.createElement("div",null,i.a.createElement(P,{peers:Object.values(v),photos:t,socket:{send:function(e){e=JSON.parse(e),console.log({sent:e}),m(e),Object.values(v).forEach(function(n){var t=n.file;t.open&&t.send(e)})}}}))};var M=function(){return i.a.createElement("div",{className:"App"},i.a.createElement(D,null))};Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));r.a.render(i.a.createElement(M,null),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then(function(e){e.unregister()})}},[[16,1,2]]]);
//# sourceMappingURL=main.abc3877c.chunk.js.map