import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { bookOutline } from 'ionicons/icons';
import { useGameState } from '../stores/gameState';
import { useUIState } from '../stores/uiState';
import { useUserState } from '../stores/userState';
import { useFirebaseGame } from '../hooks/useFirebaseGame';
import { startTitlingPhase, finalizeStoryWithAutoTitle } from '../services/firebase.service';
import GameBoard from '../components/GameBoard';
import StoryView from '../components/StoryView';
import TitlingPhase from '../components/TitlingPhase';
import FinalStoryDisplay from '../components/FinalStoryDisplay';

const TITLE_TIMEOUT = 45000; // 45 seconds in milliseconds

const Game: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const gameState = useGameState();
  const userState = useUserState();
  const { isStoryViewExpanded, toggleStoryView } = useUIState();
  const { startRound, startVoting, completeRound } = useFirebaseGame();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const isHost = userState.userId === gameState.hostId;
  const totalPlayers = gameState.players.length + gameState.aiPlayers.length;
  const maxRounds = totalPlayers + 1; // X players = X+1 rounds

  // Check if all players have submitted in the current round
  const checkWritingPhaseComplete = useCallback(() => {
    const currentRound = gameState.rounds[gameState.currentRoundIndex - 1];
    if (!currentRound || currentRound.phase !== 'writing') return false;

    return currentRound.submissions.length >= totalPlayers;
  }, [gameState.rounds, gameState.currentRoundIndex, totalPlayers]);

  // Set game ID when component mounts
  useEffect(() => {
    if (gameId && !gameState.gameId) {
      gameState.setGameId(gameId);
    }
  }, [gameId, gameState.gameId]);

  // Auto-start first round when game status is 'playing' and story is empty
  useEffect(() => {
    console.log('Game state check:', {
      isHost,
      gameId,
      status: gameState.status,
      storyLength: gameState.story.length,
      roundsLength: gameState.rounds.length,
      isInitializing,
    });

    const initializeStory = async () => {
      // Only run once: if host, game is playing, story has one entry, rounds is empty, and not already initializing
      if (
        isHost &&
        gameId &&
        gameState.status === 'playing' &&
        gameState.story.length === 1 &&
        gameState.rounds.length === 0 &&
        !isInitializing
      ) {
        try {
          setIsInitializing(true);
          const firstSentence = localStorage.getItem(`game_${gameId}_firstSentence`);
          console.log('First sentence from localStorage:', firstSentence);

          if (firstSentence) {
            // Now start Round 1 with a prompt to continue the story
            const prompt = `Continue the story after: "${firstSentence}"`;
            await startRound(prompt);

            // Clean up localStorage
            localStorage.removeItem(`game_${gameId}_firstSentence`);
            console.log('First round started successfully!');
          } else {
            console.warn('No first sentence found in localStorage');
          }
        } catch (error) {
          console.error('Failed to initialize story:', error);
          setIsInitializing(false); // Reset on error so we can retry
        }
      }
    };

    initializeStory();
  }, [isHost, gameId, gameState.status, gameState.story.length, isInitializing, startRound]);

  // Auto-transition from writing to voting when all players have submitted
  useEffect(() => {
    const transitionToVoting = async () => {
      if (!isHost || !gameId) return;

      const currentRound = gameState.rounds[gameState.currentRoundIndex - 1];
      if (!currentRound || currentRound.phase !== 'writing') return;

      // Check if all players have submitted
      if (checkWritingPhaseComplete()) {
        console.log('All players submitted, transitioning to voting phase');
        try {
          await startVoting();
        } catch (error) {
          console.error('Failed to start voting:', error);
        }
      }
    };

    transitionToVoting();
  }, [isHost, gameId, gameState.rounds, gameState.currentRoundIndex, checkWritingPhaseComplete, startVoting]);

  // Auto-complete voting and transition to next round or end game
  useEffect(() => {
    const handleVotingComplete = async () => {
      if (!isHost || !gameId || isTransitioning) return;

      const currentRound = gameState.rounds[gameState.currentRoundIndex - 1];
      if (!currentRound || currentRound.phase !== 'voting') return;

      // Count total votes
      const totalVotes = currentRound.submissions.reduce((sum, sub) => sum + sub.votes, 0);

      // Check if all players have voted
      if (totalVotes >= totalPlayers) {
        console.log('All votes cast, determining winner');
        setIsTransitioning(true);

        try {
          // Find winner (submission with most votes)
          let maxVotes = -1;
          let winnerIndex = -1;

          currentRound.submissions.forEach((submission, index) => {
            if (submission.votes > maxVotes) {
              maxVotes = submission.votes;
              winnerIndex = index;
            }
          });

          if (winnerIndex >= 0) {
            const winnerId = currentRound.submissions[winnerIndex].playerId;
            const winningSentence = currentRound.submissions[winnerIndex].sentence;
            const points = maxVotes; // Award points equal to number of votes received

            console.log('Winner:', winnerId, 'Sentence:', winningSentence, 'Points:', points);

            // Complete the current round
            await completeRound(winnerId, winningSentence, points);

            // Wait a moment to show the winner
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Check if we should start another round or end the game
            if (gameState.currentRoundIndex < maxRounds) {
              console.log(`Starting round ${gameState.currentRoundIndex + 1} of ${maxRounds}`);

              // Start next round with updated story context
              const currentStory = gameState.story.join(' ');
              const prompt = `Continue the story: "${currentStory} ${winningSentence}"`;

              await startRound(prompt);
            } else {
              console.log('Game complete! Final round finished. Starting titling phase.');
              // Game is over - start the titling phase
              await startTitlingPhase(gameId);
            }
          }
        } catch (error) {
          console.error('Failed to complete voting:', error);
        } finally {
          setIsTransitioning(false);
        }
      }
    };

    handleVotingComplete();
  }, [isHost, gameId, isTransitioning, gameState.rounds, gameState.currentRoundIndex, gameState.story, totalPlayers, maxRounds, completeRound, startRound]);

  // Auto-finalize with default title when timeout expires
  useEffect(() => {
    if (gameState.status !== 'titling' || !gameState.titlePhaseStartTime || !gameId) return;

    const timeElapsed = Date.now() - gameState.titlePhaseStartTime;
    const timeRemaining = TITLE_TIMEOUT - timeElapsed;

    // If already expired, finalize immediately (but only if no title exists yet)
    if (timeRemaining <= 0) {
      console.log('Title timeout expired, auto-finalizing');
      if (!gameState.finalTitle) {
        finalizeStoryWithAutoTitle(gameId).catch((error) => {
          console.error('Failed to auto-finalize story:', error);
        });
      }
      return;
    }

    // Otherwise, set a timeout
    const timer = setTimeout(() => {
      console.log('Title timeout reached, checking if auto-finalize needed');
      // Double-check that status is still 'titling' before auto-finalizing
      // This prevents race conditions where winner submitted just before timeout
      const currentState = useGameState.getState();
      if (currentState.status === 'titling' && !currentState.finalTitle) {
        console.log('Auto-finalizing with default title');
        finalizeStoryWithAutoTitle(gameId).catch((error) => {
          console.error('Failed to auto-finalize story:', error);
        });
      } else {
        console.log('Title already submitted, skipping auto-finalize');
      }
    }, timeRemaining);

    return () => clearTimeout(timer);
  }, [gameState.status, gameState.titlePhaseStartTime, gameId, gameState.finalTitle]);

  // Get the current round's number for display
  const currentRound = gameState.rounds[gameState.currentRoundIndex - 1];
  const displayRoundNumber = currentRound?.roundNumber ?? 1;

  // Render different content based on game status
  const renderContent = () => {
    if (gameState.status === 'finished') {
      return <FinalStoryDisplay />;
    }

    if (gameState.status === 'titling') {
      return <TitlingPhase />;
    }

    // Normal gameplay (playing status)
    return isStoryViewExpanded ? <StoryView /> : <GameBoard />;
  };

  // Determine if current user is the winner
  const allPlayers = [...gameState.players, ...gameState.aiPlayers];
  const winner = allPlayers.reduce((prev, current) =>
    (current.score > prev.score) ? current : prev
  );
  const isWinner = userState.userId === winner.id;

  // Update title based on status
  const getTitle = () => {
    if (gameState.status === 'finished') {
      return 'Story Jam - Story Complete';
    }
    if (gameState.status === 'titling') {
      return isWinner ? 'Story Jam - Title Your Story' : 'Story Jam - Game Complete';
    }
    return `Story Jam - Round ${displayRoundNumber}`;
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{getTitle()}</IonTitle>
          {gameState.status === 'playing' && (
            <IonButtons slot="end">
              <IonButton onClick={toggleStoryView}>
                <IonIcon icon={bookOutline} />
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {renderContent()}
      </IonContent>
    </IonPage>
  );
};

export default Game;
