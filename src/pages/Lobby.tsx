import { useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonChip,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import { useGameState } from '../stores/gameState';
import { useUserState } from '../stores/userState';
import { useFirebaseGame } from '../hooks/useFirebaseGame';
import type { AIPlayer } from '../stores/gameState';

const Lobby: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const history = useHistory();
  const gameState = useGameState();
  const userState = useUserState();
  const { addAIPlayer, startGame, leaveGame } = useFirebaseGame();

  const isHost = userState.userId === gameState.hostId;
  const totalPlayers = gameState.players.length + gameState.aiPlayers.length;
  const canStart = totalPlayers >= 3 && totalPlayers % 2 === 1;

  // Set game ID when component mounts
  useEffect(() => {
    if (gameId && !gameState.gameId) {
      gameState.setGameId(gameId);
    }
  }, [gameId, gameState.gameId]);

  // Redirect to game when it starts
  useEffect(() => {
    if (gameState.status === 'playing') {
      history.push(`/game/${gameId}`);
    }
  }, [gameState.status, gameId, history]);

  const handleAddAI = async () => {
    const aiPlayer: AIPlayer = {
      id: `ai_${Date.now()}`,
      username: `AI Player ${gameState.aiPlayers.length + 1}`,
      type: 'ai',
      score: 0,
      personality: 'default',
    };

    try {
      await addAIPlayer(aiPlayer);
    } catch (error) {
      console.error('Failed to add AI:', error);
    }
  };

  const handleStartGame = async () => {
    try {
      // Get the first sentence from localStorage
      const firstSentence = localStorage.getItem(`game_${gameId}_firstSentence`);

      if (!firstSentence) {
        throw new Error('First sentence not found. Please recreate the game.');
      }

      console.log('Starting game with first sentence:', firstSentence);

      // Start the game (changes status to 'playing')
      await startGame();

      // Note: Do NOT remove from localStorage here
      // The Game component will use it and clean it up
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };

  const handleLeaveGame = async () => {
    try {
      await leaveGame();
      history.push('/home');
    } catch (error) {
      console.error('Failed to leave game:', error);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Game Lobby</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <div className="lobby-container">
          {/* Game Code */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Game Code</IonCardTitle>
            </IonCardHeader>
            <IonCardContent className="ion-text-center">
              <IonText>
                <h1 style={{ fontSize: '2.5rem', letterSpacing: '0.5rem' }}>
                  {gameId}
                </h1>
                <p>Share this code with friends to join!</p>
              </IonText>
            </IonCardContent>
          </IonCard>

          {/* Players List */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                Players ({totalPlayers})
                {isHost && (
                  <IonChip color="primary" style={{ marginLeft: '8px' }}>
                    You're the Host
                  </IonChip>
                )}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                {/* Human Players */}
                {gameState.players.map((player) => (
                  <IonItem key={player.id}>
                    <IonLabel>
                      {player.username}
                      {player.isHost && ' (Host)'}
                      {player.id === userState.userId && ' (You)'}
                    </IonLabel>
                    <IonChip color="success">Human</IonChip>
                  </IonItem>
                ))}

                {/* AI Players */}
                {gameState.aiPlayers.map((player) => (
                  <IonItem key={player.id}>
                    <IonLabel>{player.username}</IonLabel>
                    <IonChip color="secondary">AI</IonChip>
                  </IonItem>
                ))}
              </IonList>

              {/* Add AI Button (Host Only) */}
              {isHost && (
                <IonButton
                  expand="block"
                  onClick={handleAddAI}
                  className="ion-margin-top"
                  disabled={totalPlayers >= 7}
                >
                  Add AI Player
                </IonButton>
              )}
            </IonCardContent>
          </IonCard>

          {/* Game Requirements */}
          <IonCard color={canStart ? 'success' : 'warning'}>
            <IonCardContent>
              <IonText>
                <p>
                  <strong>Requirements:</strong>
                </p>
                <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                  <li>
                    Minimum 3 players {totalPlayers >= 3 ? '✓' : '✗'}
                  </li>
                  <li>
                    Odd number of players {totalPlayers % 2 === 1 ? '✓' : '✗'}
                  </li>
                </ul>
                {!canStart && (
                  <p style={{ marginTop: '8px' }}>
                    {totalPlayers < 3
                      ? 'Need at least 3 players to start'
                      : 'Need an odd number of players'}
                  </p>
                )}
              </IonText>
            </IonCardContent>
          </IonCard>

          {/* Action Buttons */}
          {isHost ? (
            <IonButton
              expand="block"
              onClick={handleStartGame}
              disabled={!canStart}
              size="large"
            >
              Start Game
            </IonButton>
          ) : (
            <IonText className="ion-text-center">
              <p>Waiting for host to start the game...</p>
            </IonText>
          )}

          <IonButton
            expand="block"
            fill="outline"
            color="danger"
            onClick={handleLeaveGame}
            className="ion-margin-top"
          >
            Leave Game
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Lobby;
