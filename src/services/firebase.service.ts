import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Player, AIPlayer, Round, GameStatus } from '../stores/gameState';

// Firestore collection references
const GAME_LOBBIES = 'gameLobbies';
const USERS = 'users';

// Types matching Firestore schema
export interface FirestoreGameLobby {
  hostId: string;
  players: Player[];
  aiPlayers: AIPlayer[];
  status: GameStatus;
  rounds: Round[];
  story: string[];
  finalTitle?: string;
  titleAuthor?: string;
  titlePhaseStartTime?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreUser {
  email?: string;
  username: string;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalVotes: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Generate a random 6-character game code
export const generateGameCode = (): string => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

// Create a new game lobby
export const createGameLobby = async (
  hostId: string,
  hostPlayer: Player
): Promise<string> => {
  const gameId = generateGameCode();
  const gameRef = doc(db, GAME_LOBBIES, gameId);

  const gameLobby: FirestoreGameLobby = {
    hostId,
    players: [hostPlayer],
    aiPlayers: [],
    status: 'lobby',
    rounds: [],
    story: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await setDoc(gameRef, gameLobby);
  return gameId;
};

// Join an existing game lobby
export const joinGameLobby = async (
  gameId: string,
  player: Player
): Promise<void> => {
  const gameRef = doc(db, GAME_LOBBIES, gameId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameSnap.data() as FirestoreGameLobby;

  if (gameData.status !== 'lobby') {
    throw new Error('Game has already started');
  }

  // Check if player already exists
  const playerExists = gameData.players.some((p) => p.id === player.id);
  if (playerExists) {
    throw new Error('Player already in game');
  }

  await updateDoc(gameRef, {
    players: [...gameData.players, player],
    updatedAt: Timestamp.now(),
  });
};

// Leave a game lobby
export const leaveGameLobby = async (
  gameId: string,
  playerId: string
): Promise<void> => {
  const gameRef = doc(db, GAME_LOBBIES, gameId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameSnap.data() as FirestoreGameLobby;
  const updatedPlayers = gameData.players.filter((p) => p.id !== playerId);

  // If host leaves, delete the game or assign new host
  if (gameData.hostId === playerId) {
    if (updatedPlayers.length > 0) {
      // Assign new host
      const newHost = updatedPlayers[0];
      newHost.isHost = true;
      await updateDoc(gameRef, {
        hostId: newHost.id,
        players: updatedPlayers,
        updatedAt: Timestamp.now(),
      });
    } else {
      // No players left, could delete the game here
      // For now, just update
      await updateDoc(gameRef, {
        players: updatedPlayers,
        updatedAt: Timestamp.now(),
      });
    }
  } else {
    await updateDoc(gameRef, {
      players: updatedPlayers,
      updatedAt: Timestamp.now(),
    });
  }
};

// Add AI player to game
export const addAIPlayerToGame = async (
  gameId: string,
  aiPlayer: AIPlayer
): Promise<void> => {
  const gameRef = doc(db, GAME_LOBBIES, gameId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameSnap.data() as FirestoreGameLobby;

  await updateDoc(gameRef, {
    aiPlayers: [...gameData.aiPlayers, aiPlayer],
    updatedAt: Timestamp.now(),
  });
};

// Update game status
export const updateGameStatus = async (
  gameId: string,
  status: GameStatus
): Promise<void> => {
  const gameRef = doc(db, GAME_LOBBIES, gameId);
  await updateDoc(gameRef, {
    status,
    updatedAt: Timestamp.now(),
  });
};

// Start a new round
export const startNewRound = async (
  gameId: string,
  round: Round
): Promise<void> => {
  const gameRef = doc(db, GAME_LOBBIES, gameId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameSnap.data() as FirestoreGameLobby;

  // Check if a round with this roundNumber already exists
  const roundExists = gameData.rounds.some(r => r.roundNumber === round.roundNumber);
  if (roundExists) {
    console.log(`Round ${round.roundNumber} already exists, skipping creation`);
    return;
  }

  console.log(`Creating round ${round.roundNumber}`);
  await updateDoc(gameRef, {
    rounds: [...gameData.rounds, round],
    status: 'playing',
    updatedAt: Timestamp.now(),
  });
};

// Update a specific round
export const updateRound = async (
  gameId: string,
  roundIndex: number,
  roundData: Partial<Round>
): Promise<void> => {
  const gameRef = doc(db, GAME_LOBBIES, gameId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameSnap.data() as FirestoreGameLobby;
  const rounds = [...gameData.rounds];

  if (rounds[roundIndex]) {
    rounds[roundIndex] = { ...rounds[roundIndex], ...roundData };

    await updateDoc(gameRef, {
      rounds,
      updatedAt: Timestamp.now(),
    });
  }
};

// Add a sentence to the story
export const addToStory = async (
  gameId: string,
  sentence: string
): Promise<void> => {
  const gameRef = doc(db, GAME_LOBBIES, gameId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameSnap.data() as FirestoreGameLobby;

  // Check if this exact sentence is already the last entry in the story
  const lastSentence = gameData.story[gameData.story.length - 1];
  if (lastSentence === sentence) {
    console.log('Sentence already added to story, skipping duplicate');
    return;
  }

  console.log('Adding sentence to story:', sentence);
  await updateDoc(gameRef, {
    story: [...gameData.story, sentence],
    updatedAt: Timestamp.now(),
  });
};

// Subscribe to game lobby updates
export const subscribeToGameLobby = (
  gameId: string,
  callback: (gameData: FirestoreGameLobby) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const gameRef = doc(db, GAME_LOBBIES, gameId);

  return onSnapshot(
    gameRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as FirestoreGameLobby);
      } else if (onError) {
        onError(new Error('Game not found'));
      }
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    }
  );
};

// User management
export const createUser = async (
  userId: string,
  username: string,
  email?: string
): Promise<void> => {
  const userRef = doc(db, USERS, userId);

  const user: FirestoreUser = {
    username,
    email,
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      totalVotes: 0,
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await setDoc(userRef, user);
};

export const updateUserStats = async (
  userId: string,
  stats: Partial<FirestoreUser['stats']>
): Promise<void> => {
  const userRef = doc(db, USERS, userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error('User not found');
  }

  const userData = userSnap.data() as FirestoreUser;

  await updateDoc(userRef, {
    stats: { ...userData.stats, ...stats },
    updatedAt: Timestamp.now(),
  });
};

export const getUser = async (userId: string): Promise<FirestoreUser | null> => {
  const userRef = doc(db, USERS, userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return userSnap.data() as FirestoreUser;
};

// Update player score
export const updatePlayerScore = async (
  gameId: string,
  playerId: string,
  pointsToAdd: number
): Promise<void> => {
  const gameRef = doc(db, GAME_LOBBIES, gameId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameSnap.data() as FirestoreGameLobby;

  // Update score for human players
  const updatedPlayers = gameData.players.map((player) =>
    player.id === playerId
      ? { ...player, score: player.score + pointsToAdd }
      : player
  );

  // Update score for AI players
  const updatedAIPlayers = gameData.aiPlayers.map((player) =>
    player.id === playerId
      ? { ...player, score: player.score + pointsToAdd }
      : player
  );

  await updateDoc(gameRef, {
    players: updatedPlayers,
    aiPlayers: updatedAIPlayers,
    updatedAt: Timestamp.now(),
  });
};

// Start titling phase
export const startTitlingPhase = async (gameId: string): Promise<void> => {
  const gameRef = doc(db, GAME_LOBBIES, gameId);
  await updateDoc(gameRef, {
    status: 'titling',
    titlePhaseStartTime: Date.now(),
    updatedAt: Timestamp.now(),
  });
};

// Submit story title
export const submitStoryTitle = async (
  gameId: string,
  title: string,
  authorId: string
): Promise<void> => {
  const gameRef = doc(db, GAME_LOBBIES, gameId);
  await updateDoc(gameRef, {
    finalTitle: title,
    titleAuthor: authorId,
    status: 'finished',
    updatedAt: Timestamp.now(),
  });
};

// Finalize story with auto-generated title
export const finalizeStoryWithAutoTitle = async (gameId: string): Promise<void> => {
  const gameRef = doc(db, GAME_LOBBIES, gameId);
  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    throw new Error('Game not found');
  }

  const gameData = gameSnap.data() as FirestoreGameLobby;

  // Only apply auto-title if no title exists yet
  if (gameData.finalTitle) {
    console.log('Title already exists, skipping auto-title');
    return;
  }

  await updateDoc(gameRef, {
    finalTitle: 'Untitled Story',
    titleAuthor: 'ai',
    status: 'finished',
    updatedAt: Timestamp.now(),
  });
};
