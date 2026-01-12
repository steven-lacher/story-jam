import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonInput,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonText,
  IonTextarea,
} from '@ionic/react';
import { useUserState } from '../stores/userState';
import { useFirebaseGame } from '../hooks/useFirebaseGame';
import './Home.css';

const Home: React.FC = () => {
  const history = useHistory();
  const { username, setUser } = useUserState();
  const { createGame, joinGame } = useFirebaseGame();

  const [localUsername, setLocalUsername] = useState(username || '');
  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState('');
  const [showFirstSentencePrompt, setShowFirstSentencePrompt] = useState(false);
  const [firstSentence, setFirstSentence] = useState('');

  const handleSetUsername = () => {
    if (localUsername.trim().length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }

    // For MVP: use username as userId (no auth)
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    setUser(userId, localUsername.trim());
    setError('');
  };

  const handleCreateGame = () => {
    if (!username) {
      setError('Please enter a username first');
      return;
    }
    setShowFirstSentencePrompt(true);
  };

  const handleConfirmCreateGame = async () => {
    if (!firstSentence.trim()) {
      setError('Please enter a starting sentence');
      return;
    }

    try {
      const gameId = await createGame();
      console.log('Created game with ID:', gameId);
      console.log('Storing first sentence:', firstSentence.trim());

      // Store the first sentence in localStorage to use when starting the game
      localStorage.setItem(`game_${gameId}_firstSentence`, firstSentence.trim());

      console.log('Stored in localStorage with key:', `game_${gameId}_firstSentence`);
      console.log('Navigating to lobby:', `/lobby/${gameId}`);

      history.push(`/lobby/${gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    }
  };

  const handleCancelFirstSentence = () => {
    setShowFirstSentencePrompt(false);
    setFirstSentence('');
    setError('');
  };

  const handleJoinGame = async () => {
    if (!username) {
      setError('Please enter a username first');
      return;
    }

    if (!gameCode.trim()) {
      setError('Please enter a game code');
      return;
    }

    try {
      await joinGame(gameCode.trim().toUpperCase());
      history.push(`/lobby/${gameCode.trim().toUpperCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Story Jam</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <div className="home-container">
          <IonText className="ion-text-center">
            <h1>Story Jam</h1>
            <p>Collaborative Storytelling Game</p>
          </IonText>

          {/* Username Section */}
          {!username ? (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Enter Your Name</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonItem>
                  <IonLabel position="floating">Username</IonLabel>
                  <IonInput
                    value={localUsername}
                    onIonInput={(e) => setLocalUsername(e.detail.value || '')}
                    placeholder="Enter your username"
                    maxlength={20}
                  />
                </IonItem>
                <IonButton
                  expand="block"
                  onClick={handleSetUsername}
                  className="ion-margin-top"
                >
                  Continue
                </IonButton>
              </IonCardContent>
            </IonCard>
          ) : (
            <>
              <IonCard>
                <IonCardContent>
                  <IonText>
                    <p>Welcome, <strong>{username}</strong>!</p>
                  </IonText>
                  <IonButton
                    fill="clear"
                    size="small"
                    onClick={() => setUser('', '')}
                  >
                    Change Username
                  </IonButton>
                </IonCardContent>
              </IonCard>

              {/* Create Game */}
              {!showFirstSentencePrompt ? (
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Create New Game</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonButton expand="block" onClick={handleCreateGame}>
                      Create Game
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              ) : (
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Start Your Story</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonText>
                      <p>As the host, write the first sentence to begin the story:</p>
                    </IonText>
                    <IonTextarea
                      placeholder="Once upon a time..."
                      value={firstSentence}
                      onIonInput={(e) => setFirstSentence(e.detail.value || '')}
                      rows={4}
                      maxlength={200}
                      style={{
                        border: '1px solid var(--ion-color-medium)',
                        borderRadius: '8px',
                        padding: '12px',
                        marginTop: '16px',
                      }}
                    />
                    <div className="ion-text-end ion-margin-top">
                      <IonText color="medium">
                        <small>{firstSentence.length} / 200 characters</small>
                      </IonText>
                    </div>
                    <IonButton
                      expand="block"
                      onClick={handleConfirmCreateGame}
                      disabled={!firstSentence.trim()}
                      className="ion-margin-top"
                    >
                      Create Game & Continue
                    </IonButton>
                    <IonButton
                      expand="block"
                      fill="outline"
                      onClick={handleCancelFirstSentence}
                      className="ion-margin-top"
                    >
                      Cancel
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              )}

              {/* Join Game */}
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Join Game</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonItem>
                    <IonLabel position="floating">Game Code</IonLabel>
                    <IonInput
                      value={gameCode}
                      onIonInput={(e) => setGameCode(e.detail.value || '')}
                      placeholder="Enter 6-character code"
                      maxlength={6}
                    />
                  </IonItem>
                  <IonButton
                    expand="block"
                    onClick={handleJoinGame}
                    className="ion-margin-top"
                    disabled={!gameCode.trim()}
                  >
                    Join Game
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </>
          )}

          {/* Error Message */}
          {error && (
            <IonText color="danger" className="ion-text-center">
              <p>{error}</p>
            </IonText>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
