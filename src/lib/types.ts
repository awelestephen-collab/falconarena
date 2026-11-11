export type QuestionMode =
  | "speed_trivia"
  | "majority_wins"
  | "icebreaker_poll"
  | "rebus_puzzle";

export interface FalconLocation {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
  color: string;
  accentBg: string;
  expectedStaff: number;
}

export interface FalconSquad {
  id: string;
  name: string;
  motto: string;
  color: string;
  icon: string;
}

export interface QuestionOption {
  id: number; // 0 = Red Triangle, 1 = Blue Diamond, 2 = Yellow Circle, 3 = Green Square
  text: string;
}

export interface GameQuestion {
  id: string;
  mode: QuestionMode;
  category: string;
  prompt: string;
  subtitle?: string;
  /** Optional visual Rebus puzzle text clue */
  rebusClue?: string;
  /** Downloaded/cropped Rebus puzzle image (data URI or static path) */
  imageUrl?: string;
  /** Official answer displayed after the countdown timer finishes */
  officialAnswer?: string;
  /** Accepted answer variations for automatic scoring of player-typed answers */
  acceptedAnswers?: string[];
  options: QuestionOption[];
  /** For speed_trivia, index of the correct option (0..3). Null/undefined for majority_wins, icebreaker_poll, or rebus_puzzle */
  correctOptionId?: number | null;
  timeLimitSec: number;
  teamTalkSec?: number;
  pointsMultiplier?: 1 | 2;
  funFact?: string;
}

export interface GameDeck {
  id: string;
  title: string;
  description: string;
  badge: string;
  estimatedMinutes: number;
  questions: GameQuestion[];
}

export interface PlayerAnswer {
  questionId: string;
  optionId: number;
  textAnswer?: string;
  submittedAt: number;
  responseTimeMs: number;
  pointsAwarded: number;
  isCorrect: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  department: string;
  locationId: string;
  squadId: string;
  avatar: string;
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  answeredCount: number;
  joinedAt: number;
  lastSeenAt: number;
  isSimulated?: boolean;
  /** Map of questionId -> PlayerAnswer */
  answers: Record<string, PlayerAnswer>;
}

export interface RaffleWinnerRecord {
  id: string;
  playerId: string;
  playerName: string;
  department: string;
  locationId: string;
  locationName: string;
  squadName: string;
  prizeTitle: string;
  drawnAt: number;
}

export type RoomPhase =
  | "lobby"
  | "team_talk"
  | "question"
  | "reveal"
  | "leaderboard"
  | "raffle"
  | "podium";

export interface GameRoomState {
  pin: string;
  title: string;
  deckId: string;
  hostId: string;
  status: RoomPhase;
  teamTalkEnabled: boolean;
  defaultTeamTalkSec: number;
  personalModeEnabled: boolean; // Personal Mode: show full question + options on player phones
  allowPlayerSquadChoice: boolean;
  locations: FalconLocation[];
  squads: FalconSquad[];
  questions: GameQuestion[];
  currentQuestionIndex: number;
  phaseStartedAt: number;
  phaseEndsAt: number;
  players: Record<string, PlayerState>;
  raffleHistory: RaffleWinnerRecord[];
  createdAt: number;
  updatedAt: number;
}

export interface LocationStanding {
  location: FalconLocation;
  playerCount: number;
  totalScore: number;
  averageScore: number;
  accuracyPercent: number;
  topPlayerName: string | null;
}

export interface SquadStanding {
  squad: FalconSquad;
  playerCount: number;
  totalScore: number;
  averageScore: number;
  topPlayerName: string | null;
}
