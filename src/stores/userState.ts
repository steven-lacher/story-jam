import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  totalVotes: number;
  favoriteGenre?: string;
}

export interface UserState {
  // User data
  userId: string | null;
  username: string | null;
  email: string | null;
  stats: UserStats;

  // Current session
  currentGameId: string | null;
  isHost: boolean;

  // Actions
  setUser: (userId: string, username: string, email?: string) => void;
  setUsername: (username: string) => void;
  updateStats: (stats: Partial<UserStats>) => void;
  joinGame: (gameId: string, isHost: boolean) => void;
  leaveGame: () => void;
  incrementGamesPlayed: () => void;
  incrementGamesWon: () => void;
  incrementVotes: () => void;
  clearUser: () => void;
}

const initialState = {
  userId: null,
  username: null,
  email: null,
  stats: {
    gamesPlayed: 0,
    gamesWon: 0,
    totalVotes: 0,
  },
  currentGameId: null,
  isHost: false,
};

// Using persist middleware to save user data to localStorage
export const useUserState = create<UserState>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (userId, username, email) =>
        set({
          userId,
          username,
          email: email || null,
        }),

      setUsername: (username) => set({ username }),

      updateStats: (newStats) =>
        set((state) => ({
          stats: { ...state.stats, ...newStats },
        })),

      joinGame: (gameId, isHost) =>
        set({
          currentGameId: gameId,
          isHost,
        }),

      leaveGame: () =>
        set({
          currentGameId: null,
          isHost: false,
        }),

      incrementGamesPlayed: () =>
        set((state) => ({
          stats: {
            ...state.stats,
            gamesPlayed: state.stats.gamesPlayed + 1,
          },
        })),

      incrementGamesWon: () =>
        set((state) => ({
          stats: {
            ...state.stats,
            gamesWon: state.stats.gamesWon + 1,
          },
        })),

      incrementVotes: () =>
        set((state) => ({
          stats: {
            ...state.stats,
            totalVotes: state.stats.totalVotes + 1,
          },
        })),

      clearUser: () => set(initialState),
    }),
    {
      name: 'story-jam-user', // localStorage key
    }
  )
);
