import { useEffect, useCallback } from 'react';
import { useGameState } from '../stores/gameState';
import { useUserState } from '../stores/userState';
import { useUIState } from '../stores/uiState';
import {
  subscribeToGameLobby,
  createGameLobby,
  joinGameLobby,
  leaveGameLobby,
  addAIPlayerToGame,
  updateGameStatus,
  startNewRound as firebaseStartNewRound,
  updateRound,
  addToStory as firebaseAddToStory,
  type FirestoreGameLobby,
} from '../services/firebase.service';
import type { Player, AIPlayer, Round, Submission } from '../stores/gameState';

/**
 * Custom hook for managing Firebase game operations
 * Syncs Firestore data with local Zustand stores
 */
export const useFirebaseGame = () => {
  const gameState = useGameState();
  const userState = useUserState();
  const uiState = useUIState();

  // Subscribe to game updates
  useEffect(() => {
    if (!gameState.gameId) return;

    const unsubscribe = subscribeToGameLobby(
      gameState.gameId,
      (gameData: FirestoreGameLobby) => {
        // Sync Firebase data to Zustand store
        gameState.syncGameData({
          hostId: gameData.hostId,
          players: gameData.players,
          aiPlayers: gameData.aiPlayers,
          status: gameData.status,
          rounds: gameData.rounds,
          story: gameData.story,
          currentRoundIndex: gameData.rounds.length, // Calculate from rounds array
        });
      },
      (error) => {
        console.error('Error subscribing to game:', error);
        uiState.showToast(error.message, 'error');
      }
    );

    return () => unsubscribe();
  }, [gameState.gameId]);

  // Create a new game
  const createGame = useCallback(async () => {
    try {
      uiState.setLoading(true, 'Creating game...');

      if (!userState.userId || !userState.username) {
        throw new Error('User not set');
      }

      const hostPlayer: Player = {
        id: userState.userId,
        username: userState.username,
        type: 'human',
        score: 0,
        isHost: true,
      };

      const gameId = await createGameLobby(userState.userId, hostPlayer);

      gameState.setGameId(gameId);
      gameState.setHostId(userState.userId);
      userState.joinGame(gameId, true);

      uiState.showToast('Game created!', 'success');
      return gameId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create game';
      uiState.showToast(message, 'error');
      throw error;
    } finally {
      uiState.setLoading(false);
    }
  }, [userState.userId, userState.username]);

  // Join an existing game
  const joinGame = useCallback(
    async (gameId: string) => {
      try {
        uiState.setLoading(true, 'Joining game...');

        if (!userState.userId || !userState.username) {
          throw new Error('User not set');
        }

        const player: Player = {
          id: userState.userId,
          username: userState.username,
          type: 'human',
          score: 0,
          isHost: false,
        };

        await joinGameLobby(gameId, player);

        gameState.setGameId(gameId);
        userState.joinGame(gameId, false);

        uiState.showToast('Joined game!', 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to join game';
        uiState.showToast(message, 'error');
        throw error;
      } finally {
        uiState.setLoading(false);
      }
    },
    [userState.userId, userState.username]
  );

  // Leave the current game
  const leaveGame = useCallback(async () => {
    try {
      if (!gameState.gameId || !userState.userId) return;

      await leaveGameLobby(gameState.gameId, userState.userId);

      gameState.resetGame();
      userState.leaveGame();

      uiState.showToast('Left game', 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to leave game';
      uiState.showToast(message, 'error');
      throw error;
    }
  }, [gameState.gameId, userState.userId]);

  // Add AI player
  const addAIPlayer = useCallback(
    async (aiPlayer: AIPlayer) => {
      try {
        if (!gameState.gameId) {
          throw new Error('No active game');
        }

        await addAIPlayerToGame(gameState.gameId, aiPlayer);
        uiState.showToast(`${aiPlayer.username} joined!`, 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add AI player';
        uiState.showToast(message, 'error');
        throw error;
      }
    },
    [gameState.gameId]
  );

  // Start the game
  const startGame = useCallback(async () => {
    try {
      if (!gameState.gameId) {
        throw new Error('No active game');
      }

      const totalPlayers = gameState.players.length + gameState.aiPlayers.length;
      if (totalPlayers < 3) {
        throw new Error('Need at least 3 players to start');
      }

      if (totalPlayers % 2 === 0) {
        throw new Error('Need an odd number of players');
      }

      await updateGameStatus(gameState.gameId, 'playing');
      uiState.showToast('Game starting!', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start game';
      uiState.showToast(message, 'error');
      throw error;
    }
  }, [gameState.gameId, gameState.players, gameState.aiPlayers]);

  // Start a new round
  const startRound = useCallback(
    async (prompt: string) => {
      try {
        if (!gameState.gameId) {
          throw new Error('No active game');
        }

        const newRound: Round = {
          roundNumber: gameState.currentRoundIndex + 1,
          prompt,
          submissions: [],
          phase: 'writing',
          startTime: Date.now(),
        };

        await firebaseStartNewRound(gameState.gameId, newRound);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to start round';
        uiState.showToast(message, 'error');
        throw error;
      }
    },
    [gameState.gameId, gameState.currentRoundIndex]
  );

  // Submit a sentence for the current round
  const submitSentence = useCallback(
    async (sentence: string) => {
      try {
        if (!gameState.gameId || !userState.userId) {
          throw new Error('No active game or user');
        }

        const currentRound = gameState.rounds[gameState.currentRoundIndex - 1];
        if (!currentRound || currentRound.phase !== 'writing') {
          throw new Error('Not in writing phase');
        }

        const submission: Submission = {
          playerId: userState.userId,
          sentence,
          votes: 0,
          timestamp: Date.now(),
        };

        const updatedSubmissions = [...currentRound.submissions, submission];

        await updateRound(gameState.gameId, gameState.currentRoundIndex - 1, {
          submissions: updatedSubmissions,
        });

        uiState.showToast('Sentence submitted!', 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to submit sentence';
        uiState.showToast(message, 'error');
        throw error;
      }
    },
    [gameState.gameId, gameState.rounds, gameState.currentRoundIndex, userState.userId]
  );

  // Move to voting phase
  const startVoting = useCallback(async () => {
    try {
      if (!gameState.gameId) {
        throw new Error('No active game');
      }

      await updateRound(gameState.gameId, gameState.currentRoundIndex - 1, {
        phase: 'voting',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start voting';
      uiState.showToast(message, 'error');
      throw error;
    }
  }, [gameState.gameId, gameState.currentRoundIndex]);

  // Vote for a submission
  const voteForSubmission = useCallback(
    async (submissionIndex: number) => {
      try {
        if (!gameState.gameId || !userState.userId) {
          throw new Error('No active game or user');
        }

        const currentRound = gameState.rounds[gameState.currentRoundIndex - 1];
        if (!currentRound || currentRound.phase !== 'voting') {
          throw new Error('Not in voting phase');
        }

        const updatedSubmissions = [...currentRound.submissions];
        updatedSubmissions[submissionIndex] = {
          ...updatedSubmissions[submissionIndex],
          votes: updatedSubmissions[submissionIndex].votes + 1,
        };

        await updateRound(gameState.gameId, gameState.currentRoundIndex - 1, {
          submissions: updatedSubmissions,
        });

        userState.incrementVotes();
        uiState.showToast('Vote cast!', 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to vote';
        uiState.showToast(message, 'error');
        throw error;
      }
    },
    [gameState.gameId, gameState.rounds, gameState.currentRoundIndex, userState.userId]
  );

  // Complete the round (determine winner)
  const completeRound = useCallback(
    async (winnerId: string, winningSentence: string) => {
      try {
        if (!gameState.gameId) {
          throw new Error('No active game');
        }

        await updateRound(gameState.gameId, gameState.currentRoundIndex - 1, {
          phase: 'complete',
          winnerId,
          winningSentence,
          endTime: Date.now(),
        });

        await firebaseAddToStory(gameState.gameId, winningSentence);

        uiState.showToast('Round complete!', 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to complete round';
        uiState.showToast(message, 'error');
        throw error;
      }
    },
    [gameState.gameId, gameState.currentRoundIndex]
  );

  return {
    // Game lifecycle
    createGame,
    joinGame,
    leaveGame,
    addAIPlayer,
    startGame,

    // Round management
    startRound,
    submitSentence,
    startVoting,
    voteForSubmission,
    completeRound,
  };
};
