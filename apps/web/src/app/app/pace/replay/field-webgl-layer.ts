import type mapboxgl from "mapbox-gl";

const VERTEX_SHADER = `#version 300 es
in vec2 a_offset;
uniform mat4 u_matrix;
uniform float u_pointSize;
void main() {
  gl_Position = u_matrix * vec4(a_offset, 0.0, 1.0);
  gl_PointSize = u_pointSize;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
uniform vec4 u_color;
uniform float u_aa;
out vec4 fragColor;
void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  float alpha = 1.0 - smoothstep(0.5 - u_aa, 0.5, dist);
  if (alpha <= 0.004) discard;
  float a = u_color.a * alpha;
  fragColor = vec4(u_color.rgb * a, a);
}
`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * High-throughput Mapbox CustomLayerInterface rendering 50,000+ moving runners in one gl.POINTS draw call.
 * Coordinates are relative to (originMx, originMy) in [0..1] Web Mercator to preserve sub-pixel Float32 precision.
 */
export class FieldWebGLLayer implements mapboxgl.CustomLayerInterface {
  readonly id = "runners-field-webgl";
  readonly type = "custom" as const;
  readonly slot = "top";
  readonly renderingMode = "2d" as const;

  private map: mapboxgl.Map | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private vbo: WebGLBuffer | null = null;
  private uMatrixLoc: WebGLUniformLocation | null = null;
  private uPointSizeLoc: WebGLUniformLocation | null = null;
  private uColorLoc: WebGLUniformLocation | null = null;
  private uAaLoc: WebGLUniformLocation | null = null;

  private capacityFloats = 0;
  private activeCount = 0;
  private originMx = 0;
  private originMy = 0;
  private positions: Float32Array = new Float32Array(0);
  private dirty = false;
  private readonly translatedMatrix = new Float32Array(16);

  // Overtaek deep slate-ink (#1c3547) at 0.42 opacity for clean overlapping pack density
  private readonly color: [number, number, number, number] = [28 / 255, 53 / 255, 71 / 255, 0.42];

  onAdd(map: mapboxgl.Map, gl: WebGL2RenderingContext) {
    this.map = map;
    this.gl = gl;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    this.program = program;
    this.uMatrixLoc = gl.getUniformLocation(program, "u_matrix");
    this.uPointSizeLoc = gl.getUniformLocation(program, "u_pointSize");
    this.uColorLoc = gl.getUniformLocation(program, "u_color");
    this.uAaLoc = gl.getUniformLocation(program, "u_aa");

    this.vao = gl.createVertexArray();
    this.vbo = gl.createBuffer();
    if (!this.vao || !this.vbo) return;

    const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING) as WebGLVertexArrayObject | null;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const aOffset = gl.getAttribLocation(program, "a_offset");
    if (aOffset >= 0) {
      gl.enableVertexAttribArray(aOffset);
      gl.vertexAttribPointer(aOffset, 2, gl.FLOAT, false, 0, 0);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(prevVao);

    if (this.activeCount > 0) {
      this.dirty = true;
    }
  }

  onRemove(_map: mapboxgl.Map, gl: WebGL2RenderingContext) {
    if (this.vbo) gl.deleteBuffer(this.vbo);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.program) gl.deleteProgram(this.program);
    this.vbo = null;
    this.vao = null;
    this.program = null;
    this.capacityFloats = 0;
    this.gl = null;
    this.map = null;
  }

  updatePositions(xy: Float32Array, activeCount: number, originMx: number, originMy: number) {
    const floatCount = activeCount * 2;
    if (this.positions.length < floatCount) {
      this.positions = new Float32Array(Math.max(floatCount, 1024));
    }
    if (floatCount > 0) {
      this.positions.set(xy.subarray(0, floatCount));
    }
    this.activeCount = activeCount;
    this.originMx = originMx;
    this.originMy = originMy;
    this.dirty = true;
    this.map?.triggerRepaint();
  }

  render(gl: WebGL2RenderingContext, matrix: number[]) {
    if (!this.program || !this.vao || !this.vbo || this.activeCount === 0) return;

    const prevVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING) as WebGLVertexArrayObject | null;
    gl.bindVertexArray(this.vao);

    if (this.dirty) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
      const neededFloats = this.activeCount * 2;
      if (neededFloats > this.capacityFloats) {
        this.capacityFloats = Math.max(neededFloats, this.capacityFloats * 2 || 2048);
        gl.bufferData(gl.ARRAY_BUFFER, this.capacityFloats * 4, gl.DYNAMIC_DRAW);
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.positions.subarray(0, neededFloats));
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      this.dirty = false;
    }

    // Translate Mapbox's Float64 projection matrix by (originMx, originMy) before Float32 upload
    const m = this.translatedMatrix;
    for (let i = 0; i < 12; i++) m[i] = matrix[i];
    const tx = this.originMx;
    const ty = this.originMy;
    m[12] = matrix[0] * tx + matrix[4] * ty + matrix[12];
    m[13] = matrix[1] * tx + matrix[5] * ty + matrix[13];
    m[14] = matrix[2] * tx + matrix[6] * ty + matrix[14];
    m[15] = matrix[3] * tx + matrix[7] * ty + matrix[15];

    const z = this.map?.getZoom() ?? 11.5;
    const radiusCss =
      z <= 10
        ? 1.8
        : z <= 12.5
          ? 1.8 + ((z - 10) / 2.5) * 0.9
          : z <= 15
            ? 2.7 + ((z - 12.5) / 2.5) * 1.7
            : 4.4;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2.5);
    const pointSizePx = (radiusCss * 2 + 1.5) * dpr;
    const aa = Math.min(0.45, (1.25 * dpr) / Math.max(1, pointSizePx));

    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uMatrixLoc, false, m);
    gl.uniform1f(this.uPointSizeLoc, pointSizePx);
    gl.uniform4fv(this.uColorLoc, this.color);
    gl.uniform1f(this.uAaLoc, aa);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);

    gl.drawArrays(gl.POINTS, 0, this.activeCount);

    gl.bindVertexArray(prevVao);
  }
}
