const STORAGE_KEY = 'citygame:guest-name'

/** Stable per-browser display name for tile claims, until real account auth is wired in. */
export function useGuestIdentity(): { guestName: string } {
    let guestName: string | null = null
    try {
        guestName = localStorage.getItem(STORAGE_KEY)
        if (!guestName) {
            guestName = `Player-${Math.floor(1000 + Math.random() * 9000)}`
            localStorage.setItem(STORAGE_KEY, guestName)
        }
    } catch {
        guestName = `Player-${Math.floor(1000 + Math.random() * 9000)}`
    }
    return { guestName }
}
