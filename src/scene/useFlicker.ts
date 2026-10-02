import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * Gas-lamp flicker, around 1.0. Three slow sines that never line up, a little
 * grain on top, and now and then a draught that dips the flame and recovers.
 */
export function useFlicker(seed = 0): SharedValue<number> {
  const value = useSharedValue(1);
  const draught = useSharedValue(0);
  useFrameCallback((frame) => {
    const s = frame.timeSinceFirstFrame / 1000 + seed;
    const slow = Math.sin(s * 1.7) * 0.022 + Math.sin(s * 4.3 + 1.1) * 0.014 + Math.sin(s * 9.7 + 2.3) * 0.007;
    if (Math.random() < 0.0035) draught.value = 0.05 + Math.random() * 0.09;
    draught.value *= 0.955;
    const grain = (Math.random() - 0.5) * 0.008;
    value.value = 1 + slow + grain - draught.value;
  });
  return value;
}
