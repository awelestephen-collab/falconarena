import { createInitialRoom } from "./game-engine";
import { GameRoomState } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __FALCON_ROOMS_STORE__: Map<string, GameRoomState> | undefined;
}

export function getServerRoomMap(): Map<string, GameRoomState> {
  if (!globalThis.__FALCON_ROOMS_STORE__) {
    const store = new Map<string, GameRoomState>();
    // Seed a default demo room PIN "199400" (Falcon founding year 1994) so anyone can test immediately
    const demoRoom = createInitialRoom({
      pin: "199400",
      deckId: "falcon-all-hands-mix",
      title: "Falcon Town Hall Super-Mix (4 Locations)",
    });
    store.set("199400", demoRoom);
    globalThis.__FALCON_ROOMS_STORE__ = store;
  }
  return globalThis.__FALCON_ROOMS_STORE__;
}
