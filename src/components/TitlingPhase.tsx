import { useState, useEffect, useCallback } from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonInput,
  IonButton,
  IonText,
  IonItem,
  IonLabel,
  IonProgressBar,
} from '@ionic/react';
import { useGameState } from '../stores/gameState';
import { useUserState } from '../stores/userState';
import { submitStoryTitle } from '../services/firebase.service';

const TITLE_TIME = 45; // 45 seconds

const TitlingPhase: React.FC = () => {
  const { gameId, story, players, aiPlayers, titlePhaseStartTime } = useGameState();
  const { userId } = useUserState();
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(TITLE_TIME);

  // Determine winner (player with highest score)
  const allPlayers = [...players, ...aiPlayers];
  const winner = allPlayers.reduce((prev, current) =>
    (current.score > prev.score) ? current : prev
  );
  const isWinner = userId === winner.id;

  // Timer countdown
  useEffect(() => {
    if (!titlePhaseStartTime) return;

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - titlePhaseStartTime) / 1000);
      const remaining = Math.max(0, TITLE_TIME - elapsed);
      setTimeRemaining(remaining);
    };

    // Update immediately
    updateTimer();

    // Then update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [titlePhaseStartTime]);

  const handleSubmit = useCallback(async () => {
    if (!gameId || !title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await submitStoryTitle(gameId, title.trim(), userId || 'unknown');
    } catch (error) {
      console.error('Failed to submit title:', error);
      setIsSubmitting(false);
    }
  }, [gameId, title, userId, isSubmitting]);

  const handleSkip = useCallback(async () => {
    if (!gameId || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await submitStoryTitle(gameId, 'Untitled Story', 'ai');
    } catch (error) {
      console.error('Failed to skip title:', error);
      setIsSubmitting(false);
    }
  }, [gameId, isSubmitting]);

  const progress = timeRemaining / TITLE_TIME;
  const fullStory = story.join('\n\n');

  if (!isWinner) {
    // Non-winner view: waiting screen (don't reveal who won yet)
    return (
      <div className="ion-padding">
        <IonCard>
          <IonCardContent className="ion-text-center">
            <IonText>
              <h2>Round Complete!</h2>
              <p>Waiting for the winner to title the story...</p>
            </IonText>
            <IonProgressBar value={progress} />
            <IonText color="medium">
              <p>{timeRemaining} seconds remaining</p>
            </IonText>
          </IonCardContent>
        </IonCard>
      </div>
    );
  }

  // Winner view: title input
  return (
    <div className="ion-padding">
      {/* Timer */}
      <IonCard color={timeRemaining < 10 ? 'danger' : 'primary'}>
        <IonCardContent className="ion-text-center">
          <IonText>
            <h2>{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</h2>
            <p>Time to Title Your Story</p>
          </IonText>
          <IonProgressBar value={progress} />
        </IonCardContent>
      </IonCard>

      {/* Title Input */}
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>🏆 You Won! Title Your Story</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonItem>
            <IonLabel position="stacked">Story Title</IonLabel>
            <IonInput
              value={title}
              onIonInput={(e) => setTitle(e.detail.value || '')}
              placeholder="Enter a title for your story"
              maxlength={100}
              disabled={isSubmitting}
            />
          </IonItem>

          <div className="ion-text-end ion-margin-top">
            <IonText color="medium">
              <small>{title.length} / 100 characters</small>
            </IonText>
          </div>

          <IonButton
            expand="block"
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="ion-margin-top"
          >
            Submit Title
          </IonButton>

          <IonButton
            expand="block"
            fill="outline"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="ion-margin-top"
          >
            Skip (Use Default Title)
          </IonButton>
        </IonCardContent>
      </IonCard>

      {/* Story Preview */}
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Your Story</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <div style={{
            whiteSpace: 'pre-wrap',
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '12px',
            backgroundColor: 'var(--ion-color-light)',
            borderRadius: '8px',
          }}>
            <IonText>
              {fullStory}
            </IonText>
          </div>
        </IonCardContent>
      </IonCard>
    </div>
  );
};

export default TitlingPhase;
