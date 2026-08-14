/**
 * SmokeyCursor-CGw5sNRU.js
 * Vanilla compatibility build for KNJAMASI.
 *
 * The original Gloria Codes component is a React/Vite module. This file
 * preserves its pointer-driven WebGL smoke behavior for this static site
 * without importing React or a second rendering framework.
 */
export const SMOKEY_CURSOR_DEFAULTS = Object.freeze({
  simulationResolution: 128,
  dyeResolution: 1440,
  densityDissipation: 3.5,
  velocityDissipation: 2,
  pressure: 0.1,
  pressureIterations: 20,
  curl: 3,
  splatRadius: 0.2,
  splatForce: 6000,
  shading: true,
  colorUpdateSpeed: 10,
  transparent: true,
  autoColors: true
});

export function initSmokeyCursor(){

  const hero=document.querySelector('.hero'), canvas=document.getElementById('fluid-canvas');
  if(!hero||!canvas||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:false});
  if(!gl)return;
  const vertex='attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const advect=`precision highp float; varying vec2 vUv; uniform sampler2D uTexture; uniform vec2 uPointer,uVelocity; uniform float uAspect,uTime,uActive,uClick;
    vec3 hue(float h){return .5+.5*cos(6.28318*(h+vec3(0.,.33,.67)));}
    void main(){vec2 p=vUv;vec2 d=p-uPointer;d.x*=uAspect;float dist=length(d);float wave=sin(p.y*7.0+uTime*.75+p.x*4.0)*.5+.5;vec2 tangent=vec2(-d.y,d.x)/(dist+.05);vec2 swirl=tangent*(.00135+uClick*.0022)*exp(-dist*dist*27.);vec2 push=uVelocity*.00092*exp(-dist*dist*68.);vec2 back=p-swirl-push;vec4 old=texture2D(uTexture,back);float fade=.943-uActive*.004-uClick*.002;float h=fract(.52+uTime*.018+p.x*.14+p.y*.11+wave*.12);vec3 colorA=hue(h);vec3 colorB=hue(h+.18);vec3 color=mix(colorA,colorB,smoothstep(.18,.82,wave));float splat=exp(-dist*dist*(245.-uClick*70.))*(uActive*.16+uClick*.38);float halo=exp(-dist*dist*118.)*(uActive*.026+uClick*.09);float ribbon=exp(-abs(d.y+sin(d.x*8.0+uTime*.7)*.025)*42.)*exp(-dist*dist*13.)*uActive*.014;vec3 dye=old.rgb*fade+color*(splat+halo+ribbon);gl_FragColor=vec4(clamp(dye,0.,1.),clamp(max(old.a*fade,splat+halo+ribbon),0.,1.));}`;
  const display='precision mediump float; varying vec2 vUv; uniform sampler2D uTexture; uniform float uOpacity; void main(){vec2 px=vec2(1.4/640.0,1.4/420.0); vec4 c=texture2D(uTexture,vUv)*.42; c+=texture2D(uTexture,vUv+vec2(px.x,0.))*0.145; c+=texture2D(uTexture,vUv-vec2(px.x,0.))*0.145; c+=texture2D(uTexture,vUv+vec2(0.,px.y))*0.145; c+=texture2D(uTexture,vUv-vec2(0.,px.y))*0.145; float m=max(max(c.r,c.g),c.b); float a=smoothstep(.004,.12,m)*uOpacity; gl_FragColor=vec4(c.rgb*a,a*.7);}';
  const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null};
  const makeProgram=(frag)=>{const p=gl.createProgram(),vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,frag);if(!vs||!fs)return null;gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);return gl.getProgramParameter(p,gl.LINK_STATUS)?p:null};
  const adv=makeProgram(advect),out=makeProgram(display);if(!adv||!out)return;
  const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const makeTarget=(w,h)=>{const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);return {tex,fbo};};
  let a,b,sw=0,simW=1,simH=1;
  const resize=()=>{const w=hero.clientWidth,h=hero.clientHeight,scale=Math.min(.55,640/Math.max(w,1));simW=Math.max(160,Math.floor(w*scale));simH=Math.max(96,Math.floor(h*scale));a=makeTarget(simW,simH);b=makeTarget(simW,simH);canvas.width=simW;canvas.height=simH;gl.viewport(0,0,simW,simH);gl.bindFramebuffer(gl.FRAMEBUFFER,a.fbo);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.bindFramebuffer(gl.FRAMEBUFFER,b.fbo);gl.clear(gl.COLOR_BUFFER_BIT);gl.bindFramebuffer(gl.FRAMEBUFFER,null);};
  resize();window.addEventListener('resize',resize,{passive:true});
  const pointer={x:.5,y:.5,vx:0,vy:0,active:0};let click=0,lastMove=0,last=performance.now(),raf=0,frame=0;
  const local=e=>{const r=hero.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};};
  hero.addEventListener('pointermove',e=>{const p=local(e),dx=p.x-pointer.x,dy=p.y-pointer.y;pointer.x=p.x;pointer.y=p.y;pointer.vx+=dx*1.8;pointer.vy+=dy*1.8;pointer.active=1;lastMove=performance.now();},{passive:true});
  hero.addEventListener('pointerdown',e=>{const p=local(e);pointer.x=p.x;pointer.y=p.y;pointer.active=1;click=1;lastMove=performance.now();},{passive:true});
  const bind=(p)=>{const loc=gl.getAttribLocation(p,'p');gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);};
  const draw=now=>{raf=requestAnimationFrame(draw);const dt=Math.min(40,now-last);last=now;frame++;const idle=now-lastMove>150;pointer.active=idle?Math.max(0,pointer.active-dt*.006):1;click=Math.max(0,click-dt*.0028);pointer.vx*=.84;pointer.vy*=.84;if(frame%2&&idle&&click<.02)return;
    const src=sw?a:b,dst=sw?b:a;gl.bindFramebuffer(gl.FRAMEBUFFER,dst.fbo);gl.viewport(0,0,simW,simH);gl.useProgram(adv);bind(adv);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,src.tex);gl.uniform1i(gl.getUniformLocation(adv,'uTexture'),0);gl.uniform2f(gl.getUniformLocation(adv,'uPointer'),pointer.x,1-pointer.y);gl.uniform2f(gl.getUniformLocation(adv,'uVelocity'),pointer.vx,-pointer.vy);gl.uniform1f(gl.getUniformLocation(adv,'uAspect'),simW/simH);gl.uniform1f(gl.getUniformLocation(adv,'uTime'),now*.001);gl.uniform1f(gl.getUniformLocation(adv,'uActive'),pointer.active);gl.uniform1f(gl.getUniformLocation(adv,'uClick'),click);gl.drawArrays(gl.TRIANGLES,0,6);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,simW,simH);gl.useProgram(out);bind(out);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,dst.tex);gl.uniform1i(gl.getUniformLocation(out,'uTexture'),0);gl.uniform1f(gl.getUniformLocation(out,'uOpacity'),1.08);gl.drawArrays(gl.TRIANGLES,0,6);sw=1-sw;
  };raf=requestAnimationFrame(draw);window.addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});

}
