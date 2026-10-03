import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

declare const process: { env: Record<string, string | undefined> };

/** Which GPU the browser actually draws with; "SwiftShader" or "Basic Render" means none. */
function gpuName(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return 'no WebGL';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return 'unknown';
  }
}

/**
 * Add `?debug` to the address to see the build, frame rate and GPU in a corner —
 * enough to tell a stale cache or a software-rendering browser from a slow scene.
 */
export function DebugOverlay() {
  const enabled = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
  const [line, setLine] = useState('');
  useEffect(() => {
    if (!enabled) return;
    const build = (process.env.EXPO_PUBLIC_BUILD ?? 'local').slice(0, 7);
    const gpu = gpuName();
    let frames = 0;
    let worst = 0;
    let last = performance.now();
    let windowStart = last;
    let raf = 0;
    const tick = (t: number) => {
      frames++;
      worst = Math.max(worst, t - last);
      last = t;
      if (t - windowStart >= 1000) {
        setLine(`${build} · ${Math.round((frames * 1000) / (t - windowStart))} fps · en yavaş ${Math.round(worst)} ms · dpr ${devicePixelRatio} · ${gpu}`);
        frames = 0;
        worst = 0;
        windowStart = t;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
  if (!enabled || !line) return null;
  return (
    <Text style={styles.line} pointerEvents="none">
      {line}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    left: 6,
    bottom: 4,
    right: 6,
    color: '#f3e3c0',
    backgroundColor: 'rgba(0,0,0,0.6)',
    fontSize: 11,
    fontFamily: 'monospace',
    paddingHorizontal: 4,
  },
});
