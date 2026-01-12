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
import GameBoard from '../components/GameBoard';
import StoryView from '../components/StoryView';

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
      // Only run once: if host, game is playing, story is empty, and not already initializing
      if (
        isHost &&
        gameId &&
        gameState.status === 'playing' &&
        gameState.story.length === 0 &&
        !isInitializing
      ) {
        try {
          setIsInitializing(true);
          const firstSentence = localStorage.getItem(`game_${gameId}_firstSentence`);
          console.log('First sentence from localStorage:', firstSentence);

          if (firstSentence) {
            // Add the first sentence to the story (not as a round!)
            const { addToStory } = await import('../services/firebase.service');
            await addToStory(gameId, firstSentence);
            console.log('First sentence added to story');

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

            console.log('Winner:', winnerId, 'Sentence:', winningSentence);

            // Complete the current round
            await completeRound(winnerId, winningSentence);

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
              console.log('Game complete! Final round finished.');
              // Game is over - the winner will be prompted to enter a title
              // This will be handled in the RoundComplete component
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Story Jam - Round {gameState.currentRoundIndex}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={toggleStoryView}>
              <IonIcon icon={bookOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {isStoryViewExpanded ? <StoryView /> : <GameBoard />}
      </IonContent>
    </IonPage>
  );
};

export default Game;
