import { create } from 'zustand';

export type PlayerType = 'human' | 'ai';

export interface Player {
  id: string;
  username: string;
  type: PlayerType;
  score: number;
  isHost?: boolean;
}

export interface AIPlayer extends Player {
  type: 'ai';
  personality: string;
}

export interface Submission {
  playerId: string;
  sentence: string;
  votes: number;
  timestamp: number;
}

export interface Round {
  roundNumber: number;
  prompt: string;
  submissions: Submission[];
  winningSentence?: string;
  winnerId?: string;
  phase: 'writing' | 'voting' | 'complete';
  startTime: number;
  endTime?: number;
}

export type GameStatus = 'lobby' | 'playing' | 'titling' | 'finished';

export interface GameState {
  // Game data
  gameId: string | null;
  hostId: string | null;
  players: Player[];
  aiPlayers: AIPlayer[];
  status: GameStatus;
  rounds: Round[];
  currentRoundIndex: number;
  story: string[];
  finalTitle?: string;
  titleAuthor?: string; // playerId or 'ai'
  titlePhaseStartTime?: number;

  // Actions
  setGameId: (gameId: string) => void;
  setHostId: (hostId: string) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  addAIPlayer: (aiPlayer: AIPlayer) => void;
  setGameStatus: (status: GameStatus) => void;
  startNewRound: (prompt: string) => void;
  addSubmission: (roundIndex: number, submission: Submission) => void;
  setRoundPhase: (roundIndex: number, phase: Round['phase']) => void;
  completeRound: (roundIndex: number, winnerId: string, winningSentence: string) => void;
  addToStory: (sentence: string) => void;
  resetGame: () => void;

  // Sync from Firebase
  syncGameData: (data: Partial<GameState>) => void;
}

const initialState = {
  gameId: null,
  hostId: null,
  players: [],
  aiPlayers: [],
  status: 'lobby' as GameStatus,
  rounds: [],
  currentRoundIndex: 0,
  story: [],
};

export const useGameState = create<GameState>((set) => ({
  ...initialState,

  setGameId: (gameId) => set({ gameId }),

  setHostId: (hostId) => set({ hostId }),

  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players, player],
    })),

  removePlayer: (playerId) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    })),

  addAIPlayer: (aiPlayer) =>
    set((state) => ({
      aiPlayers: [...state.aiPlayers, aiPlayer],
    })),

  setGameStatus: (status) => set({ status }),

  startNewRound: (prompt) =>
    set((state) => {
      const newRound: Round = {
        roundNumber: state.currentRoundIndex + 1,
        prompt,
        submissions: [],
        phase: 'writing',
        startTime: Date.now(),
      };
      return {
        rounds: [...state.rounds, newRound],
        currentRoundIndex: state.currentRoundIndex + 1,
      };
    }),

  addSubmission: (roundIndex, submission) =>
    set((state) => {
      const rounds = [...state.rounds];
      if (rounds[roundIndex]) {
        rounds[roundIndex] = {
          ...rounds[roundIndex],
          submissions: [...rounds[roundIndex].submissions, submission],
        };
      }
      return { rounds };
    }),

  setRoundPhase: (roundIndex, phase) =>
    set((state) => {
      const rounds = [...state.rounds];
      if (rounds[roundIndex]) {
        rounds[roundIndex] = {
          ...rounds[roundIndex],
          phase,
        };
      }
      return { rounds };
    }),

  completeRound: (roundIndex, winnerId, winningSentence) =>
    set((state) => {
      const rounds = [...state.rounds];
      if (rounds[roundIndex]) {
        rounds[roundIndex] = {
          ...rounds[roundIndex],
          phase: 'complete',
          winnerId,
          winningSentence,
          endTime: Date.now(),
        };
      }

      // Update winner's score
      const players = state.players.map((p) =>
        p.id === winnerId ? { ...p, score: p.score + 1 } : p
      );

      return { rounds, players };
    }),

  addToStory: (sentence) =>
    set((state) => ({
      story: [...state.story, sentence],
    })),

  resetGame: () => set(initialState),

  syncGameData: (data) => set((state) => ({ ...state, ...data })),
}));
