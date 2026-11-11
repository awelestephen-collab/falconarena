"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase";
import { GameRoomState, RaffleWinnerRecord } from "./types";

const LOCAL_CHANNEL_NAME = "falcon-arena-sync-v1";

export function useRoomSync(pin: string) {
  const [room, setRoom] = useState<GameRoomState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeMode, setRealtimeMode] = useState<"supabase" | "hybrid">(
    isSupabaseConfigured ? "supabase" : "hybrid"
  );
  const bcRef = useRef<BroadcastChannel | null>(null);
  const latestRoomRef = useRef<GameRoomState | null>(null);

  const applyRoomUpdate = useCallback((incoming: GameRoomState) => {
    if (!incoming) return;
    setRoom((prev) => {
      if (prev && incoming.updatedAt < prev.updatedAt) {
        return prev;
      }
      latestRoomRef.current = incoming;
      return incoming;
    });
    setError(null);
  }, []);

  const fetchRoom = useCallback(async () => {
    if (!pin) return;
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(pin)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Room not found");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.realtimeMode) {
        setRealtimeMode(data.realtimeMode);
      }
      if (data.room) {
        applyRoomUpdate(data.room);
      }
    } catch {
      // Keep existing state on transient network hiccup
    } finally {
      setLoading(false);
    }
  }, [pin, applyRoomUpdate]);

  useEffect(() => {
    fetchRoom();

    // 1. Cross-tab BroadcastChannel for instant zero-latency local multi-tab testing
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel(LOCAL_CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data?.pin === pin && event.data?.room) {
          applyRoomUpdate(event.data.room);
        }
      };
      bcRef.current = bc;
    }

    // 2. Supabase Realtime subscription when configured
    const supabase = getSupabaseClient();
    const channel = supabase
      ? supabase
          .channel(`falcon-room:${pin}`)
          .on("broadcast", { event: "room_update" }, (payload) => {
            if (payload.payload?.room) {
              applyRoomUpdate(payload.payload.room as GameRoomState);
            }
          })
          .subscribe()
      : null;

    // 3. Background polling fallback (every 1000ms) so all connected players stay in sync even across serverless instances
    const interval = setInterval(fetchRoom, 1000);

    return () => {
      clearInterval(interval);
      if (bcRef.current) {
        bcRef.current.close();
        bcRef.current = null;
      }
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [pin, fetchRoom, applyRoomUpdate]);

  const dispatchRoomAction = useCallback(
    async (
      action: string,
      payload: Record<string, unknown> = {}
    ): Promise<{ room?: GameRoomState; winner?: RaffleWinnerRecord | null }> => {
      const res = await fetch(`/api/rooms/${encodeURIComponent(pin)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...payload,
          roomSnapshot: latestRoomRef.current,
        }),
      });
      const data = await res.json();
      if (data.room) {
        applyRoomUpdate(data.room);

        // Broadcast to sibling tabs
        if (bcRef.current) {
          bcRef.current.postMessage({ pin, room: data.room });
        }

        // Broadcast over Supabase Realtime if connected
        const supabase = getSupabaseClient();
        if (supabase) {
          supabase.channel(`falcon-room:${pin}`).send({
            type: "broadcast",
            event: "room_update",
            payload: { room: data.room },
          });
        }
      }
      return data;
    },
    [pin, applyRoomUpdate]
  );

  return {
    room,
    loading,
    error,
    realtimeMode,
    dispatchRoomAction,
    refreshRoom: fetchRoom,
  };
}
