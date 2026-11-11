import { NextRequest, NextResponse } from "next/server";
import {
  addSimulatedPlayers,
  createInitialRoom,
  drawRaffleWinner,
  finalizeQuestionReveal,
  simulateBotAnswersForCurrentQuestion,
  submitPlayerAnswer,
} from "@/lib/game-engine";
import { getServerRoomMap } from "@/lib/server-room-cache";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { PREBUILT_GAME_DECKS } from "@/lib/falcon-data";
import { GameRoomState, PlayerState } from "@/lib/types";

function normalizeLocations(room: GameRoomState): GameRoomState {
  let nextRoom = room;
  const hasLegacyAbuja = nextRoom.locations.some(
    (loc) => loc.id === "abuja" || loc.name.toLowerCase().includes("abuja")
  );
  if (hasLegacyAbuja) {
    nextRoom = {
      ...nextRoom,
      locations: nextRoom.locations.map((loc) =>
        loc.id === "abuja" || loc.name.toLowerCase().includes("abuja")
          ? {
              ...loc,
              id: "lekki-ftz",
              name: "Lekki Free Trade Zone",
              shortName: "Lekki FTZ",
              subtitle: "Lekki Free Trade Zone Gas Infrastructure & Operations",
            }
          : loc
      ),
    };
  }

  if (
    nextRoom.deckId === "falcon-friday-chill" &&
    nextRoom.title.toLowerCase().includes("crowdparty")
  ) {
    const updatedDeck = PREBUILT_GAME_DECKS.find(
      (d) => d.id === "falcon-friday-chill"
    );
    if (updatedDeck) {
      nextRoom = {
        ...nextRoom,
        title: updatedDeck.title,
        questions: updatedDeck.questions,
      };
    }
  }

  return nextRoom;
}

async function loadRoom(pin: string): Promise<GameRoomState | null> {
  const store = getServerRoomMap();
  if (isSupabaseConfigured) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("falcon_rooms")
        .select("state")
        .eq("pin", pin)
        .maybeSingle();
      if (data?.state) {
        const roomState = normalizeLocations(data.state as GameRoomState);
        store.set(pin, roomState);
        return roomState;
      }
    }
  }
  const existing = store.get(pin);
  return existing ? normalizeLocations(existing) : null;
}

async function saveRoom(room: GameRoomState): Promise<GameRoomState> {
  const store = getServerRoomMap();
  room.updatedAt = Date.now();
  store.set(room.pin, room);

  if (isSupabaseConfigured) {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from("falcon_rooms").upsert(
        {
          pin: room.pin,
          title: room.title,
          status: room.status,
          state: room,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "pin" }
      );
    }
  }
  return room;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ pin: string }> }
) {
  const { pin } = await context.params;
  const cleanPin = pin.trim();
  let room = await loadRoom(cleanPin);

  if (!room && cleanPin === "199400") {
    room = createInitialRoom({ pin: "199400" });
    await saveRoom(room);
  }

  if (!room) {
    return NextResponse.json(
      { error: "Game room not found. Check the 6-digit Game PIN." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    room,
    realtimeMode: isSupabaseConfigured ? "supabase" : "hybrid",
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ pin: string }> }
) {
  const { pin } = await context.params;
  const cleanPin = pin.trim();
  const body = await req.json();
  const action = body.action as string;

  let room = await loadRoom(cleanPin);

  if (action === "create_room") {
    room = createInitialRoom({
      pin: cleanPin,
      deckId: body.deckId,
      title: body.title,
      teamTalkEnabled: body.teamTalkEnabled,
      defaultTeamTalkSec: body.defaultTeamTalkSec,
      personalModeEnabled: body.personalModeEnabled,
      allowPlayerSquadChoice: body.allowPlayerSquadChoice,
      customLocations: body.customLocations,
      customQuestions: body.customQuestions,
    });
    await saveRoom(room);
    return NextResponse.json({ room });
  }

  if (!room) {
    // Auto-rehydrate if host sent full snapshot or create default room
    if (body.roomSnapshot) {
      room = body.roomSnapshot as GameRoomState;
    } else {
      room = createInitialRoom({ pin: cleanPin });
    }
  }

  switch (action) {
    case "join_player": {
      const player = body.player as PlayerState;
      if (player && player.id) {
        const existing = room.players[player.id];
        room = {
          ...room,
          players: {
            ...room.players,
            [player.id]: existing
              ? {
                  ...existing,
                  name: player.name,
                  department: player.department,
                  locationId: player.locationId,
                  squadId: player.squadId,
                  avatar: player.avatar,
                  lastSeenAt: Date.now(),
                }
              : player,
          },
        };
      }
      break;
    }

    case "submit_answer": {
      const { playerId, optionId } = body as {
        playerId: string;
        optionId: number;
      };
      room = submitPlayerAnswer(room, playerId, Number(optionId));
      break;
    }

    case "start_question": {
      const questionIndex =
        typeof body.questionIndex === "number"
          ? body.questionIndex
          : room.currentQuestionIndex;
      const question = room.questions[questionIndex];
      if (question) {
        const now = Date.now();
        const teamTalkSec =
          room.teamTalkEnabled && (question.teamTalkSec ?? room.defaultTeamTalkSec) > 0
            ? question.teamTalkSec ?? room.defaultTeamTalkSec
            : 0;

        if (teamTalkSec > 0 && !body.skipTeamTalk) {
          room = {
            ...room,
            currentQuestionIndex: questionIndex,
            status: "team_talk",
            phaseStartedAt: now,
            phaseEndsAt: now + teamTalkSec * 1000,
          };
        } else {
          room = {
            ...room,
            currentQuestionIndex: questionIndex,
            status: "question",
            phaseStartedAt: now,
            phaseEndsAt: now + question.timeLimitSec * 1000,
          };
        }
      }
      break;
    }

    case "open_question_answers": {
      const question = room.questions[room.currentQuestionIndex];
      if (question) {
        const now = Date.now();
        room = {
          ...room,
          status: "question",
          phaseStartedAt: now,
          phaseEndsAt: now + question.timeLimitSec * 1000,
        };
      }
      break;
    }

    case "reveal_question": {
      room = finalizeQuestionReveal(room);
      break;
    }

    case "set_phase": {
      const nextPhase = body.status as GameRoomState["status"];
      if (nextPhase === "reveal") {
        room = finalizeQuestionReveal(room);
      } else {
        room = {
          ...room,
          status: nextPhase,
        };
      }
      break;
    }

    case "simulate_players": {
      const count = typeof body.count === "number" ? body.count : 40;
      room = addSimulatedPlayers(room, count);
      break;
    }

    case "simulate_answers": {
      room = simulateBotAnswersForCurrentQuestion(room);
      break;
    }

    case "draw_raffle": {
      const { updatedRoom, winner } = drawRaffleWinner(room, {
        locationFilterId: body.locationFilterId || "all",
        excludePreviousWinners: body.excludePreviousWinners ?? true,
        prizeTitle: body.prizeTitle || "Falcon Town Hall Star Prize",
      });
      room = updatedRoom;
      await saveRoom(room);
      return NextResponse.json({ room, winner });
    }

    case "update_settings": {
      room = {
        ...room,
        title: body.title ?? room.title,
        teamTalkEnabled: body.teamTalkEnabled ?? room.teamTalkEnabled,
        defaultTeamTalkSec: body.defaultTeamTalkSec ?? room.defaultTeamTalkSec,
        personalModeEnabled:
          body.personalModeEnabled ?? room.personalModeEnabled,
        allowPlayerSquadChoice:
          body.allowPlayerSquadChoice ?? room.allowPlayerSquadChoice,
        locations: body.locations ?? room.locations,
        questions: body.questions ?? room.questions,
      };
      break;
    }

    case "reset_room": {
      room = createInitialRoom({
        pin: cleanPin,
        deckId: body.deckId || room.deckId,
        title: room.title,
        customLocations: room.locations,
        customQuestions: room.questions,
      });
      break;
    }

    default:
      break;
  }

  await saveRoom(room);
  return NextResponse.json({ room });
}
