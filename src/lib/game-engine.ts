import {
  DEFAULT_FALCON_LOCATIONS,
  DEFAULT_FALCON_SQUADS,
  FALCON_DEPARTMENTS,
  PLAYER_AVATARS,
  PREBUILT_GAME_DECKS,
  SIMULATED_FIRST_NAMES,
  SIMULATED_LAST_NAMES,
} from "./falcon-data";
import {
  FalconLocation,
  GameQuestion,
  GameRoomState,
  LocationStanding,
  PlayerState,
  RaffleWinnerRecord,
  SquadStanding,
} from "./types";

export function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function normalizeRebusAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’`\-_.,!?()/\\:;"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripLeadingArticle(normalized: string): string {
  return normalized.replace(/^(a |an |the )/i, "").trim();
}

export function isRebusAnswerMatch(
  submittedText: string,
  question: GameQuestion
): boolean {
  const cleanSubmitted = normalizeRebusAnswer(submittedText);
  if (!cleanSubmitted) return false;
  const submittedNoArticle = stripLeadingArticle(cleanSubmitted);

  const candidates = [
    ...(question.acceptedAnswers || []),
    ...(question.officialAnswer ? [question.officialAnswer] : []),
  ];

  for (const candidate of candidates) {
    const cleanCand = normalizeRebusAnswer(candidate);
    if (!cleanCand) continue;
    const candNoArticle = stripLeadingArticle(cleanCand);
    if (
      cleanSubmitted === cleanCand ||
      (submittedNoArticle.length >= 3 && submittedNoArticle === candNoArticle) ||
      cleanSubmitted.replace(/\s+/g, "") === cleanCand.replace(/\s+/g, "")
    ) {
      return true;
    }
  }
  return false;
}

export function createInitialRoom(params: {
  pin?: string;
  deckId?: string;
  title?: string;
  hostId?: string;
  teamTalkEnabled?: boolean;
  defaultTeamTalkSec?: number;
  personalModeEnabled?: boolean;
  allowPlayerSquadChoice?: boolean;
  customLocations?: FalconLocation[];
  customQuestions?: GameQuestion[];
}): GameRoomState {
  const deck =
    PREBUILT_GAME_DECKS.find((d) => d.id === params.deckId) ||
    PREBUILT_GAME_DECKS[0];
  const now = Date.now();
  return {
    pin: params.pin || generatePin(),
    title: params.title || deck.title,
    deckId: deck.id,
    hostId: params.hostId || "falcon-host",
    status: "lobby",
    teamTalkEnabled: params.teamTalkEnabled ?? true,
    defaultTeamTalkSec: params.defaultTeamTalkSec ?? 6,
    personalModeEnabled: params.personalModeEnabled ?? true,
    allowPlayerSquadChoice: params.allowPlayerSquadChoice ?? true,
    locations: params.customLocations?.length
      ? params.customLocations
      : DEFAULT_FALCON_LOCATIONS,
    squads: DEFAULT_FALCON_SQUADS,
    questions: params.customQuestions?.length
      ? params.customQuestions
      : deck.questions,
    currentQuestionIndex: 0,
    phaseStartedAt: now,
    phaseEndsAt: now,
    players: {},
    raffleHistory: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function calculateSpeedTriviaPoints(params: {
  isCorrect: boolean;
  responseTimeMs: number;
  timeLimitSec: number;
  multiplier: 1 | 2;
  newStreak: number;
}): number {
  if (!params.isCorrect) return 0;
  const maxTimeMs = Math.max(params.timeLimitSec * 1000, 1000);
  const clampedMs = Math.min(Math.max(params.responseTimeMs, 0), maxTimeMs);
  const speedRatio = 1 - clampedMs / (2 * maxTimeMs); // Between 0.5 and 1.0
  const basePoints = Math.round(1000 * speedRatio) * params.multiplier;
  const streakBonus =
    params.newStreak > 1 ? Math.min((params.newStreak - 1) * 100, 500) : 0;
  return basePoints + streakBonus;
}

export function submitPlayerAnswer(
  room: GameRoomState,
  playerId: string,
  optionId: number,
  nowMs: number = Date.now(),
  textAnswer?: string
): GameRoomState {
  const player = room.players[playerId];
  const question = room.questions[room.currentQuestionIndex];
  if (!player || !question) return room;
  if (room.status !== "question") return room;

  // Prevent duplicate submission for the same question
  if (player.answers[question.id]) return room;

  const responseTimeMs = Math.max(0, nowMs - room.phaseStartedAt);
  const multiplier = question.pointsMultiplier || 1;

  let isCorrect = false;
  let pointsAwarded = 0;
  let newStreak = player.streak;
  let newCorrectCount = player.correctCount;

  if (question.mode === "rebus_puzzle") {
    isCorrect = isRebusAnswerMatch(textAnswer || "", question);
    newStreak = isCorrect ? player.streak + 1 : 0;
    if (isCorrect) newCorrectCount += 1;
    pointsAwarded = calculateSpeedTriviaPoints({
      isCorrect,
      responseTimeMs,
      timeLimitSec: question.timeLimitSec,
      multiplier,
      newStreak,
    });
  } else if (question.mode === "speed_trivia") {
    isCorrect = question.correctOptionId === optionId;
    newStreak = isCorrect ? player.streak + 1 : 0;
    if (isCorrect) newCorrectCount += 1;
    pointsAwarded = calculateSpeedTriviaPoints({
      isCorrect,
      responseTimeMs,
      timeLimitSec: question.timeLimitSec,
      multiplier,
      newStreak,
    });
  } else if (question.mode === "icebreaker_poll") {
    isCorrect = true;
    newStreak = player.streak + 1;
    newCorrectCount += 1;
    pointsAwarded = 300 * multiplier;
  } else if (question.mode === "majority_wins") {
    isCorrect = false;
    pointsAwarded = 0;
  }

  const updatedPlayer: PlayerState = {
    ...player,
    score: player.score + pointsAwarded,
    streak: newStreak,
    bestStreak: Math.max(player.bestStreak, newStreak),
    correctCount: newCorrectCount,
    answeredCount: player.answeredCount + 1,
    lastSeenAt: nowMs,
    answers: {
      ...player.answers,
      [question.id]: {
        questionId: question.id,
        optionId: question.mode === "rebus_puzzle" ? -1 : optionId,
        textAnswer: textAnswer?.trim(),
        submittedAt: nowMs,
        responseTimeMs,
        pointsAwarded,
        isCorrect,
      },
    },
  };

  return {
    ...room,
    players: {
      ...room.players,
      [playerId]: updatedPlayer,
    },
    updatedAt: nowMs,
  };
}

/**
 * When revealing a question, if the question mode is "majority_wins",
 * determine the winning majority option(s) and award +750 * multiplier points to matching voters.
 */
export function finalizeQuestionReveal(room: GameRoomState): GameRoomState {
  const question = room.questions[room.currentQuestionIndex];
  if (!question) return { ...room, status: "reveal", updatedAt: Date.now() };

  if (question.mode !== "majority_wins") {
    return {
      ...room,
      status: "reveal",
      updatedAt: Date.now(),
    };
  }

  // Tally votes per option
  const counts: Record<number, number> = {};
  for (const opt of question.options) {
    counts[opt.id] = 0;
  }

  for (const player of Object.values(room.players)) {
    const ans = player.answers[question.id];
    if (ans !== undefined) {
      counts[ans.optionId] = (counts[ans.optionId] || 0) + 1;
    }
  }

  const maxVotes = Math.max(0, ...Object.values(counts));
  const winningOptionIds = new Set<number>(
    maxVotes > 0
      ? Object.entries(counts)
          .filter(([, count]) => count === maxVotes)
          .map(([optId]) => Number(optId))
      : []
  );

  const multiplier = question.pointsMultiplier || 1;
  const updatedPlayers: Record<string, PlayerState> = {};

  for (const [id, player] of Object.entries(room.players)) {
    const ans = player.answers[question.id];
    if (!ans || ans.pointsAwarded > 0) {
      updatedPlayers[id] = player;
      continue;
    }
    const wonMajority = winningOptionIds.has(ans.optionId);
    const pts = wonMajority ? 750 * multiplier : 150;
    const newStreak = wonMajority ? player.streak + 1 : 0;

    updatedPlayers[id] = {
      ...player,
      score: player.score + pts,
      streak: newStreak,
      bestStreak: Math.max(player.bestStreak, newStreak),
      correctCount: wonMajority ? player.correctCount + 1 : player.correctCount,
      answers: {
        ...player.answers,
        [question.id]: {
          ...ans,
          pointsAwarded: pts,
          isCorrect: wonMajority,
        },
      },
    };
  }

  return {
    ...room,
    status: "reveal",
    players: updatedPlayers,
    updatedAt: Date.now(),
  };
}

export function computeIndividualStandings(room: GameRoomState): PlayerState[] {
  return Object.values(room.players).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    return a.joinedAt - b.joinedAt;
  });
}

export function computeLocationStandings(
  room: GameRoomState,
  sortBy: "average" | "total" = "average"
): LocationStanding[] {
  const players = Object.values(room.players);

  const standings: LocationStanding[] = room.locations.map((location) => {
    const locPlayers = players
      .filter((p) => p.locationId === location.id)
      .sort((a, b) => b.score - a.score);

    const playerCount = locPlayers.length;
    const totalScore = locPlayers.reduce((sum, p) => sum + p.score, 0);
    const averageScore =
      playerCount > 0 ? Math.round(totalScore / playerCount) : 0;
    const totalAnswered = locPlayers.reduce(
      (sum, p) => sum + p.answeredCount,
      0
    );
    const totalCorrect = locPlayers.reduce((sum, p) => sum + p.correctCount, 0);
    const accuracyPercent =
      totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    return {
      location,
      playerCount,
      totalScore,
      averageScore,
      accuracyPercent,
      topPlayerName: locPlayers[0]?.name || null,
    };
  });

  return standings.sort((a, b) =>
    sortBy === "average"
      ? b.averageScore - a.averageScore || b.totalScore - a.totalScore
      : b.totalScore - a.totalScore || b.averageScore - a.averageScore
  );
}

export function computeSquadStandings(
  room: GameRoomState,
  sortBy: "average" | "total" = "average"
): SquadStanding[] {
  const players = Object.values(room.players);

  const standings: SquadStanding[] = room.squads.map((squad) => {
    const sqPlayers = players
      .filter((p) => p.squadId === squad.id)
      .sort((a, b) => b.score - a.score);

    const playerCount = sqPlayers.length;
    const totalScore = sqPlayers.reduce((sum, p) => sum + p.score, 0);
    const averageScore =
      playerCount > 0 ? Math.round(totalScore / playerCount) : 0;

    return {
      squad,
      playerCount,
      totalScore,
      averageScore,
      topPlayerName: sqPlayers[0]?.name || null,
    };
  });

  return standings.sort((a, b) =>
    sortBy === "average"
      ? b.averageScore - a.averageScore || b.totalScore - a.totalScore
      : b.totalScore - a.totalScore || b.averageScore - a.averageScore
  );
}

export function addSimulatedPlayers(
  room: GameRoomState,
  countToAdd: number = 40
): GameRoomState {
  const updatedPlayers = { ...room.players };
  const existingCount = Object.keys(updatedPlayers).length;
  const maxTotal = 220;
  const toCreate = Math.min(countToAdd, Math.max(0, maxTotal - existingCount));

  // Weighted distribution matching the 4 Falcon locations (~38% Lekki HQ, ~27% Ikorodu, ~22% PH, ~13% Lekki FTZ)
  const locationWeights = [
    room.locations[0]?.id || "lekki-hq",
    room.locations[0]?.id || "lekki-hq",
    room.locations[0]?.id || "lekki-hq",
    room.locations[1]?.id || "ikorodu-ldc",
    room.locations[1]?.id || "ikorodu-ldc",
    room.locations[2]?.id || "port-harcourt",
    room.locations[2]?.id || "port-harcourt",
    room.locations[3]?.id || "lekki-ftz",
  ];

  const now = Date.now();
  for (let i = 0; i < toCreate; i++) {
    const idx = existingCount + i + 1;
    const firstName =
      SIMULATED_FIRST_NAMES[(idx * 7 + i) % SIMULATED_FIRST_NAMES.length];
    const lastName =
      SIMULATED_LAST_NAMES[(idx * 13 + i) % SIMULATED_LAST_NAMES.length];
    const locationId = locationWeights[idx % locationWeights.length];
    const squad = room.squads[idx % room.squads.length];
    const department = FALCON_DEPARTMENTS[idx % FALCON_DEPARTMENTS.length];
    const avatar = PLAYER_AVATARS[idx % PLAYER_AVATARS.length];
    const playerId = `sim-${now}-${idx}`;

    updatedPlayers[playerId] = {
      id: playerId,
      name: `${firstName} ${lastName.charAt(0)}.`,
      department,
      locationId,
      squadId: squad.id,
      avatar,
      score: 0,
      streak: 0,
      bestStreak: 0,
      correctCount: 0,
      answeredCount: 0,
      joinedAt: now + i,
      lastSeenAt: now + i,
      isSimulated: true,
      answers: {},
    };
  }

  return {
    ...room,
    players: updatedPlayers,
    updatedAt: Date.now(),
  };
}

export function simulateBotAnswersForCurrentQuestion(
  room: GameRoomState
): GameRoomState {
  const question = room.questions[room.currentQuestionIndex];
  if (!question || room.status !== "question") return room;

  let nextRoom = { ...room };
  const now = Date.now();
  const maxTimeMs = question.timeLimitSec * 1000;

  for (const player of Object.values(room.players)) {
    if (!player.isSimulated) continue;
    if (player.answers[question.id]) continue;

    const simulatedOffsetMs = Math.floor(
      1400 + Math.random() * (maxTimeMs * 0.78)
    );

    if (question.mode === "rebus_puzzle") {
      const roll = Math.random();
      const typedAnswer =
        roll < 0.65
          ? question.officialAnswer || "Correct"
          : "Not sure";
      nextRoom = submitPlayerAnswer(
        nextRoom,
        player.id,
        -1,
        room.phaseStartedAt + simulatedOffsetMs,
        typedAnswer
      );
      continue;
    }

    let chosenOptionId = 0;
    if (
      question.mode === "speed_trivia" &&
      typeof question.correctOptionId === "number"
    ) {
      const roll = Math.random();
      if (roll < 0.68) {
        chosenOptionId = question.correctOptionId;
      } else {
        const wrongOpts = question.options.filter(
          (o) => o.id !== question.correctOptionId
        );
        chosenOptionId =
          wrongOpts[Math.floor(Math.random() * wrongOpts.length)]?.id ?? 0;
      }
    } else {
      const weights = [0.36, 0.28, 0.21, 0.15];
      const r = Math.random();
      let acc = 0;
      for (let idx = 0; idx < question.options.length; idx++) {
        acc += weights[idx] || 0.25;
        if (r <= acc) {
          chosenOptionId = question.options[idx].id;
          break;
        }
      }
    }

    nextRoom = submitPlayerAnswer(
      nextRoom,
      player.id,
      chosenOptionId,
      room.phaseStartedAt + simulatedOffsetMs
    );
  }

  return {
    ...nextRoom,
    updatedAt: now,
  };
}

/**
 * Draw a random winner for the Falcon Town Hall Lucky Draw
 */
export function drawRaffleWinner(
  room: GameRoomState,
  options: {
    locationFilterId: string | "all";
    excludePreviousWinners: boolean;
    prizeTitle: string;
  }
): { updatedRoom: GameRoomState; winner: RaffleWinnerRecord | null } {
  const prevWinnerIds = new Set(room.raffleHistory.map((w) => w.playerId));
  const candidates = Object.values(room.players).filter((p) => {
    if (
      options.locationFilterId !== "all" &&
      p.locationId !== options.locationFilterId
    ) {
      return false;
    }
    if (options.excludePreviousWinners && prevWinnerIds.has(p.id)) {
      return false;
    }
    return true;
  });

  if (candidates.length === 0) {
    return { updatedRoom: room, winner: null };
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const location = room.locations.find((l) => l.id === chosen.locationId);
  const squad = room.squads.find((s) => s.id === chosen.squadId);

  const winnerRecord: RaffleWinnerRecord = {
    id: `raffle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    playerId: chosen.id,
    playerName: chosen.name,
    department: chosen.department,
    locationId: chosen.locationId,
    locationName: location?.shortName || chosen.locationId,
    squadName: squad?.name || chosen.squadId,
    prizeTitle: options.prizeTitle || "Falcon Town Hall Star Prize",
    drawnAt: Date.now(),
  };

  const updatedRoom: GameRoomState = {
    ...room,
    raffleHistory: [winnerRecord, ...room.raffleHistory],
    updatedAt: Date.now(),
  };

  return { updatedRoom, winner: winnerRecord };
}
