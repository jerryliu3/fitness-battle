export interface EmberPose {
  x: number; y: number; halfWidth: number; halfHeight: number;
  yaw: number; roll: number; tip: number; limb: number;
}

/** OVTK header, vertex count, index count, interleaved vertex byte length. */
export function decodeMesh(buffer: ArrayBuffer) {
  if (buffer.byteLength < 16) throw new Error("Missing Ember mesh header");
  const header = new DataView(buffer);
  if (header.getUint32(0, true) !== 0x4b54564f) throw new Error("Invalid Ember mesh");
  const vertices = header.getUint32(4, true), indices = header.getUint32(8, true), bytes = header.getUint32(12, true);
  if (!vertices || vertices > 65535 || !indices || indices % 3 || bytes !== vertices * 20 || buffer.byteLength !== 16 + bytes + indices * 2) {
    throw new Error("Incomplete Ember mesh");
  }
  return { vertices: new Uint8Array(buffer, 16, bytes), indices: new Uint16Array(buffer, 16 + bytes, indices) };
}

const VERTEX = `
attribute vec3 aPosition; attribute vec2 aUv;
uniform vec2 uOffset, uHalf, uFlex; uniform float uYaw, uRoll;
varying vec2 vUv;
void main() {
  float cy=cos(uYaw),sy=sin(uYaw),cr=cos(uRoll),sr=sin(uRoll);
  vec3 p=vec3(cy*aPosition.x+sy*aPosition.z,aPosition.y,-sy*aPosition.x+cy*aPosition.z);
  float tip=smoothstep(.55,1.95,aPosition.y);
  float side=smoothstep(.72,1.38,abs(aPosition.x))*(1.0-smoothstep(.55,1.1,aPosition.y));
  float feet=(1.0-smoothstep(-1.15,-.60,aPosition.y))*.85;
  float limb=max(side,feet);
  p.x-=uFlex.x*tip+uFlex.y*limb;
  p.y-=abs(uFlex.x)*.12*tip;
  p.y+=uFlex.y*.14*limb*sign(aPosition.x);
  p.z+=uFlex.x*.08*tip;
  p.xy=vec2(cr*p.x-sr*p.y,sr*p.x+cr*p.y)+uOffset;
  gl_Position=vec4(p.x/uHalf.x,p.y/uHalf.y,-p.z*.08,1.0); vUv=aUv;
}`;
const FRAGMENT = `
precision mediump float; varying vec2 vUv; uniform sampler2D uTexture;
void main() {
  vec3 gold=mix(vec3(1.0,.60,.12),vec3(1.0,.85,.31),clamp(vUv.y,0.0,1.0));
  if(vUv.x<0.0) gl_FragColor=vec4(gold*.94,1.0);
  else { vec4 art=texture2D(uTexture,vUv);
    gl_FragColor=vec4(mix(gold,art.rgb,smoothstep(.15,.85,art.a)),1.0); }
}`;

function loadTexture(signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const cleanup = () => { image.onload = null; image.onerror = null; signal.removeEventListener("abort", abort); };
    const abort = () => { cleanup(); image.src = ""; reject(new DOMException("Aborted", "AbortError")); };
    image.onload = () => { cleanup(); resolve(image); };
    image.onerror = () => { cleanup(); reject(new Error("Ember artwork could not load")); };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    image.src = "/brand/mascots/star-ember.webp";
  });
}

export async function createEmberRenderer(canvas: HTMLCanvasElement, signal: AbortSignal, onLost: () => void) {
  const response = await fetch("/brand/overtaek/ember-mesh.bin", { signal });
  if (!response.ok) throw new Error("Ember mesh could not load");
  const mesh = decodeMesh(await response.arrayBuffer());
  const image = await loadTexture(signal);
  signal.throwIfAborted();
  const context = canvas.getContext("webgl", { alpha: true, antialias: false, stencil: false, preserveDrawingBuffer: false, powerPreference: "low-power" });
  if (!context) throw new Error("WebGL unavailable");
  const gl = context;
  const program = gl.createProgram(), vertexBuffer = gl.createBuffer(), indexBuffer = gl.createBuffer(), texture = gl.createTexture();
  const shaders: WebGLShader[] = [];
  let destroyed = false;
  const lost = (event: Event) => { event.preventDefault(); if (!destroyed) onLost(); };
  function destroy() {
    if (destroyed) return;
    destroyed = true; canvas.removeEventListener("webglcontextlost", lost);
    shaders.forEach(shader => gl.deleteShader(shader));
    gl.deleteBuffer(vertexBuffer); gl.deleteBuffer(indexBuffer); gl.deleteTexture(texture); gl.deleteProgram(program);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
  try {
    if (!program || !vertexBuffer || !indexBuffer || !texture) throw new Error("Graphics resources unavailable");
    for (const [type, text] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Shader unavailable");
      shaders.push(shader); gl.shaderSource(shader, text); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Ember shader could not compile");
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Ember shader could not link");
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "aPosition"), uv = gl.getAttribLocation(program, "aUv");
    gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.clearColor(0, 0, 0, 0); gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    const uniforms = Object.fromEntries(["uYaw", "uRoll", "uOffset", "uHalf", "uFlex"].map(name => [name, gl.getUniformLocation(program, name)]));
    canvas.addEventListener("webglcontextlost", lost);
    return {
      resize(width: number, height: number) {
        const ratio = Math.min(1, 640 / width, 360 / height);
        canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
        gl.viewport(0, 0, canvas.width, canvas.height);
      },
      draw(pose: EmberPose) {
        if (destroyed) return;
        gl.uniform1f(uniforms.uYaw, pose.yaw); gl.uniform1f(uniforms.uRoll, pose.roll);
        gl.uniform2f(uniforms.uOffset, pose.x, pose.y); gl.uniform2f(uniforms.uHalf, pose.halfWidth, pose.halfHeight); gl.uniform2f(uniforms.uFlex, pose.tip, pose.limb);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
      },
      destroy,
    };
  } catch (error) { destroy(); throw error; }
}

export type EmberRenderer = Awaited<ReturnType<typeof createEmberRenderer>>;
