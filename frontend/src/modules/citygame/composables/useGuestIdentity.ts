const NAME_STORAGE_KEY = 'citygame:guest-name'
const ID_STORAGE_KEY = 'citygame:guest-id'

function randomName(): string {
    return `Player-${Math.floor(1000 + Math.random() * 9000)}`
}

function randomId(): string {
    return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Stable per-browser identity for tile claims, until real account auth is
 * wired in. `guestId` is what the server records as `ownerId` — it must be
 * a client-generated id persisted independently of the Socket.IO
 * connection, not `socket.id`. A `socket.id` changes on every reconnect
 * (network blip, dev-server HMR, mobile network switch), which would make
 * a player's own client stop recognizing a tile it legitimately claimed
 * earlier in the same session — a real bug, not just a display glitch,
 * since `object:place` would then be silently refused as "not your tile."
 */
export function useGuestIdentity(): { guestName: string; guestId: string } {
    let guestName: string | null = null
    let guestId: string | null = null
    try {
        guestName = localStorage.getItem(NAME_STORAGE_KEY)
        if (!guestName) {
            guestName = randomName()
            localStorage.setItem(NAME_STORAGE_KEY, guestName)
        }
        guestId = localStorage.getItem(ID_STORAGE_KEY)
        if (!guestId) {
            guestId = randomId()
            localStorage.setItem(ID_STORAGE_KEY, guestId)
        }
    } catch {
        guestName = guestName ?? randomName()
        guestId = guestId ?? randomId()
    }
    return { guestName, guestId }
}
