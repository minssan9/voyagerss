import { ref, watch } from 'vue'
import type { AirspaceEvent } from '@/modules/vision/api/api-airspace'

const STORAGE_KEY = 'voy-airspace-alerts'

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

/** Two short tones synthesised with WebAudio, so no sound file is shipped. */
function beep(ctx: AudioContext): void {
  const start = ctx.currentTime
  for (const [offset, freq] of [[0, 880], [0.22, 660]] as const) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, start + offset)
    gain.gain.exponentialRampToValueAtTime(0.15, start + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.18)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start + offset)
    osc.stop(start + offset + 0.2)
  }
}

/**
 * Sound and a browser notification when a track reaches HIGH. The toggle is remembered
 * per browser; turning it on is a user gesture, which unlocks audio and asks for
 * notification permission.
 */
export function useAirspaceAlerts(describe: (ev: AirspaceEvent) => string, title: () => string) {
  const enabled = ref(readEnabled())
  let audio: AudioContext | null = null

  watch(enabled, (on) => {
    try {
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
    } catch {
      /* private mode: keep it for this page only */
    }
  })

  async function toggle(on: boolean): Promise<void> {
    enabled.value = on
    if (!on) return
    if (!audio && typeof AudioContext !== 'undefined') audio = new AudioContext()
    await audio?.resume()
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  function notify(ev: AirspaceEvent): boolean {
    if (!enabled.value || ev.threat !== 'HIGH' || ev.type === 'track_lost') return false
    if (audio && audio.state === 'running') beep(audio)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title(), { body: describe(ev), tag: `airspace-${ev.sessionId ?? ''}-${ev.trackId}` })
    }
    return true
  }

  return { enabled, toggle, notify }
}
