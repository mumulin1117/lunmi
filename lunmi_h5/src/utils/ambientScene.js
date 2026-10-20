export const AMBIENT_SCENES = Object.freeze({
  home: '/static/scenes/willow-lantern-enhanced.png',
  wish: '/static/scenes/star-tree-twinkling.png'
})

const SOURCE_WIDTH = 853
const SOURCE_HEIGHT = 1844

// The image, deformation and light positions share the original artwork's coordinates.
export const scene_cover = (width, height) => {
  const scale = Math.max(width / SOURCE_WIDTH, height / SOURCE_HEIGHT)
  const x = width / (SOURCE_WIDTH * scale)
  const y = height / (SOURCE_HEIGHT * scale)
  return { scale: [x, y], offset: [(1 - x) / 2, (1 - y) / 2] }
}

const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUV;
void main() {
  vUV = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const FRAGMENT_SHADER = `
precision highp float;
uniform sampler2D uImage;
uniform vec2 uCoverScale;
uniform vec2 uCoverOffset;
uniform float uTime;
uniform float uScene;
varying vec2 vUV;

float region(vec2 uv, vec2 center, vec2 radius) {
  vec2 d = (uv - center) / radius;
  return 1.0 - smoothstep(0.30, 1.0, dot(d, d));
}

vec2 swing(vec2 uv, vec2 anchor, float angle) {
  vec2 p = (uv - anchor) * vec2(853.0, 1844.0);
  float c = cos(angle);
  float s = sin(angle);
  return anchor + mat2(c, -s, s, c) * p / vec2(853.0, 1844.0);
}

vec2 hanging_lamp(vec2 source, vec2 uv, vec2 center, vec2 radius, float phase, float speed) {
  vec2 anchor = center - vec2(0.0, radius.y * 1.2);
  float mask = region(uv, center + vec2(0.0, radius.y * 0.25), radius * vec2(0.80, 1.45));
  return mix(source, swing(uv, anchor, 0.028 * sin(uTime * speed + phase)), mask);
}

float water_mask(vec2 uv) {
  // Follow the edge of the pier, leaving its planks, railing and posts still.
  float pier = mix(0.28, 0.49, smoothstep(0.64, 0.72, uv.y))
    * (1.0 - smoothstep(0.79, 0.87, uv.y));
  float water = smoothstep(0.610, 0.635, uv.y) * smoothstep(pier, pier + 0.035, uv.x);
  water *= 1.0 - region(uv, vec2(0.710, 0.835), vec2(0.155, 0.045));
  water *= 1.0 - region(uv, vec2(0.870, 0.690), vec2(0.065, 0.021));
  water *= 1.0 - region(uv, vec2(0.525, 0.692), vec2(0.046, 0.018));
  return water;
}

vec3 light(vec3 color, vec2 uv, vec2 center, vec2 radius, float phase, float speed) {
  vec2 d = (uv - center) / radius;
  float halo = max(0.0, 1.0 - dot(d, d));
  halo *= halo;
  float pulse = 0.5 + 0.5 * sin(uTime * speed + phase);
  float warm = smoothstep(0.0, 0.22, color.r - color.b);
  color *= 1.0 + halo * warm * (pulse - 0.5) * 0.42;
  return color + vec3(1.0, 0.56, 0.17) * halo * (0.015 + pulse * 0.07);
}

void main() {
  vec2 uv = vec2(vUV.x, 1.0 - vUV.y) * uCoverScale + uCoverOffset;
  vec2 source = uv;
  if (uScene < 0.5) {
    float nearLamp = region(uv, vec2(0.191, 0.240), vec2(0.085, 0.100));
    float foliage = (1.0 - smoothstep(0.60, 0.80, uv.x))
      * (1.0 - smoothstep(0.38, 0.49, uv.y)) * (1.0 - nearLamp);
    float tip = smoothstep(0.0, 0.30, uv.y);
    float breeze = sin(uTime * 0.67 + uv.y * 10.5)
      + 0.33 * sin(uTime * 1.07 + uv.x * 9.0 - uv.y * 12.0);
    source.x += foliage * (0.0012 + 0.0026 * tip) * breeze;
    source.y += foliage * 0.0006 * sin(uTime * 0.70 + uv.x * 8.0) * tip;
    source = mix(source, swing(uv, vec2(0.191, 0.150), 0.012 * sin(uTime * 0.82 + 0.7)), nearLamp);
    float farLamp = region(uv, vec2(0.364, 0.450), vec2(0.040, 0.060));
    source = mix(source, swing(uv, vec2(0.363, 0.355), 0.014 * sin(uTime * 0.69 + 1.8)), farLamp);
    float porchLamp = region(uv, vec2(0.191, 0.493), vec2(0.032, 0.034));
    source = mix(source, swing(uv, vec2(0.191, 0.459), 0.012 * sin(uTime * 0.91 + 3.2)), porchLamp);
    float water = water_mask(uv);
    float depth = smoothstep(0.61, 1.0, uv.y);
    source.x += water * (0.0005 + depth * 0.0018)
      * (sin(uv.y * 220.0 - uTime * 0.78) + 0.3 * sin(uv.y * 410.0 + uv.x * 9.0 + uTime * 0.6));
    source.y += water * (0.0002 + depth * 0.0006) * sin(uv.y * 160.0 + uv.x * 25.0 - uTime * 0.7);
    vec2 ripple = (uv - vec2(0.710, 0.875)) * vec2(1.0, 4.4);
    float distance = length(ripple);
    float fade = (1.0 - smoothstep(0.15, 0.38, distance)) * smoothstep(0.015, 0.055, distance);
    float wave = sin(distance * 110.0 - uTime * 1.8) * fade;
    source += water * wave * vec2(0.0012, 0.00035) * ripple / max(distance, 0.001);
  } else {
    // Each lamp pivots from its string; the moon, trunk and branches stay fixed.
    source = hanging_lamp(source, uv, vec2(0.826, 0.152), vec2(0.090, 0.048), 0.3, 0.72);
    source = hanging_lamp(source, uv, vec2(0.608, 0.237), vec2(0.094, 0.050), 2.1, 0.65);
    source = hanging_lamp(source, uv, vec2(0.820, 0.238), vec2(0.060, 0.033), 4.2, 0.83);
    source = hanging_lamp(source, uv, vec2(0.978, 0.284), vec2(0.070, 0.040), 1.3, 0.69);
    source = hanging_lamp(source, uv, vec2(0.347, 0.300), vec2(0.080, 0.043), 3.7, 0.76);
    source = hanging_lamp(source, uv, vec2(0.574, 0.362), vec2(0.100, 0.055), 5.1, 0.61);
    source = hanging_lamp(source, uv, vec2(0.365, 0.405), vec2(0.060, 0.035), 0.8, 0.87);
    source = hanging_lamp(source, uv, vec2(0.102, 0.386), vec2(0.045, 0.026), 4.8, 0.78);
    source = hanging_lamp(source, uv, vec2(0.100, 0.431), vec2(0.044, 0.024), 2.6, 0.91);
    source = hanging_lamp(source, uv, vec2(0.276, 0.477), vec2(0.072, 0.039), 1.7, 0.71);
    source = hanging_lamp(source, uv, vec2(0.180, 0.490), vec2(0.044, 0.026), 5.4, 0.82);
    source = hanging_lamp(source, uv, vec2(0.466, 0.514), vec2(0.095, 0.052), 3.2, 0.66);
    source = hanging_lamp(source, uv, vec2(0.950, 0.509), vec2(0.080, 0.044), 4.5, 0.79);
    source = hanging_lamp(source, uv, vec2(0.197, 0.539), vec2(0.040, 0.024), 0.2, 0.88);
  }
  vec3 color = texture2D(uImage, source).rgb;
  if (uScene < 0.5) {
    color = light(color, source, vec2(0.191, 0.238), vec2(0.085, 0.055), 0.7, 0.88);
    color = light(color, source, vec2(0.364, 0.448), vec2(0.040, 0.030), 2.6, 0.74);
    vec2 ripple = (uv - vec2(0.710, 0.875)) * vec2(1.0, 4.4);
    float distance = length(ripple);
    float crest = pow(0.5 + 0.5 * cos(distance * 110.0 - uTime * 1.8), 16.0);
    float fade = (1.0 - smoothstep(0.15, 0.38, distance)) * smoothstep(0.015, 0.055, distance);
    color += vec3(1.0, 0.55, 0.22) * crest * fade * water_mask(uv) * 0.026;
  } else {
    color = light(color, source, vec2(0.826, 0.152), vec2(0.090, 0.048), 0.3, 1.10);
    color = light(color, source, vec2(0.608, 0.237), vec2(0.094, 0.050), 2.1, 0.94);
    color = light(color, source, vec2(0.820, 0.238), vec2(0.060, 0.033), 4.2, 1.22);
    color = light(color, source, vec2(0.978, 0.284), vec2(0.070, 0.040), 1.3, 0.85);
    color = light(color, source, vec2(0.347, 0.300), vec2(0.080, 0.043), 3.7, 1.04);
    color = light(color, source, vec2(0.574, 0.362), vec2(0.100, 0.055), 5.1, 0.83);
    color = light(color, source, vec2(0.365, 0.405), vec2(0.060, 0.035), 0.8, 1.28);
    color = light(color, source, vec2(0.102, 0.386), vec2(0.045, 0.026), 4.8, 0.97);
    color = light(color, source, vec2(0.100, 0.431), vec2(0.044, 0.024), 2.6, 1.16);
    color = light(color, source, vec2(0.276, 0.477), vec2(0.072, 0.039), 1.7, 0.91);
    color = light(color, source, vec2(0.180, 0.490), vec2(0.044, 0.026), 5.4, 1.06);
    color = light(color, source, vec2(0.466, 0.514), vec2(0.095, 0.052), 3.2, 0.86);
    color = light(color, source, vec2(0.950, 0.509), vec2(0.080, 0.044), 4.5, 1.18);
    color = light(color, source, vec2(0.197, 0.539), vec2(0.040, 0.024), 0.2, 0.99);
  }
  gl_FragColor = vec4(color, 1.0);
}`

export const create_scene_motion = (container, scene) => {
  const canvas = document.createElement('canvas')
  canvas.className = 'ambient-scene__motion'
  canvas.setAttribute('aria-hidden', 'true')
  container.appendChild(canvas)
  let gl = null
  try {
    gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power'
    })
  } catch {
    // Keep the original artwork when the browser cannot create a graphics context.
  }
  if (!gl) {
    canvas.remove()
    container.dataset.sceneMotion = 'unavailable'
    return { setActive() {}, setVisible() {}, destroy() {} }
  }
  let program = null
  let buffer = null
  let texture = null
  let uniforms = null
  let active = false
  let ready = false
  let disposed = false
  let lost = false
  let frame = null
  let last_frame = null
  let elapsed = 0
  let visible = true
  const image = new Image()

  const compile_shader = (type, source) => {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader)
      throw new Error('Scene shader is unavailable.')
    }
    return shader
  }
  const cancel_frame = () => {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
    last_frame = null
  }
  const draw = () => {
    if (!ready || lost || disposed) return
    gl.uniform1f(uniforms.time, elapsed)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  const resize = () => {
    const { width, height } = container.getBoundingClientRect()
    if (!width || !height || !ready || lost || disposed) return
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    gl.viewport(0, 0, canvas.width, canvas.height)
    const cover = scene_cover(width, height)
    gl.uniform2fv(uniforms.cover_scale, cover.scale)
    gl.uniform2fv(uniforms.cover_offset, cover.offset)
    draw()
  }
  const tick = (now) => {
    frame = null
    if (!active || !ready || lost || disposed) return
    if (last_frame === null || now - last_frame >= 1000 / 30) {
      if (last_frame !== null) elapsed += Math.min((now - last_frame) / 1000, 0.1)
      last_frame = now
      draw()
    }
    frame = requestAnimationFrame(tick)
  }
  const set_active = (next) => {
    active = Boolean(next)
    cancel_frame()
    if (active && ready && !lost && !disposed) {
      container.dataset.sceneMotion = 'running'
      frame = requestAnimationFrame(tick)
    } else if (!disposed && !lost) {
      container.dataset.sceneMotion = ready ? 'paused' : 'loading'
    }
  }
  const release_resources = () => {
    if (texture) gl.deleteTexture(texture)
    if (buffer) gl.deleteBuffer(buffer)
    if (program) gl.deleteProgram(program)
    texture = null
    buffer = null
    program = null
  }
  const initialize = () => {
    try {
      release_resources()
      const vertex = compile_shader(gl.VERTEX_SHADER, VERTEX_SHADER)
      const fragment = compile_shader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
      program = gl.createProgram()
      gl.attachShader(program, vertex)
      gl.attachShader(program, fragment)
      gl.linkProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Scene rendering is unavailable.')
      gl.useProgram(program)
      buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
      const attribute = gl.getAttribLocation(program, 'aPosition')
      gl.enableVertexAttribArray(attribute)
      gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0)
      texture = gl.createTexture()
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      uniforms = {
        time: gl.getUniformLocation(program, 'uTime'),
        cover_scale: gl.getUniformLocation(program, 'uCoverScale'),
        cover_offset: gl.getUniformLocation(program, 'uCoverOffset')
      }
      gl.uniform1i(gl.getUniformLocation(program, 'uImage'), 0)
      gl.uniform1f(gl.getUniformLocation(program, 'uScene'), scene === 'wish' ? 1 : 0)
      ready = true
      resize()
      canvas.style.opacity = visible ? '1' : '0'
      set_active(active)
    } catch {
      ready = false
      cancel_frame()
      canvas.style.opacity = '0'
      container.dataset.sceneMotion = 'unavailable'
      release_resources()
    }
  }
  const on_lost = (event) => {
    if (disposed) return
    event.preventDefault()
    lost = true
    cancel_frame()
    canvas.style.opacity = '0'
    container.dataset.sceneMotion = 'lost'
  }
  const on_restored = () => {
    if (disposed) return
    lost = false
    if (image.complete && image.naturalWidth) initialize()
  }
  canvas.addEventListener('webglcontextlost', on_lost)
  canvas.addEventListener('webglcontextrestored', on_restored)
  image.onload = () => { if (!disposed) initialize() }
  image.onerror = () => {
    container.dataset.sceneMotion = 'unavailable'
    canvas.style.opacity = '0'
  }
  image.src = AMBIENT_SCENES[scene] || AMBIENT_SCENES.home
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  return {
    setActive: set_active,
    setVisible(next) {
      visible = Boolean(next)
      canvas.style.opacity = visible && ready && !lost ? '1' : '0'
    },
    destroy() {
      disposed = true
      cancel_frame()
      observer.disconnect()
      image.onload = null
      image.onerror = null
      canvas.removeEventListener('webglcontextlost', on_lost)
      canvas.removeEventListener('webglcontextrestored', on_restored)
      release_resources()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }
}
