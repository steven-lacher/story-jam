import { useState, useEffect } from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonTextarea,
  IonButton,
  IonText,
  IonChip,
  IonProgressBar,
} from '@ionic/react';
import { useUserState } from '../stores/userState';
import { useFirebaseGame } from '../hooks/useFirebaseGame';
import { useRoundTimer } from '../hooks/useRoundTimer';
import type { Round } from '../stores/gameState';

interface WritingPhaseProps {
  round: Round;
}

const WRITING_TIME = 60; // 60 seconds for MVP

const WritingPhase: React.FC<WritingPhaseProps> = ({ round }) => {
  const { userId } = useUserState();
  const { submitSentence } = useFirebaseGame();
  const [sentence, setSentence] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Check if user has already submitted
  useEffect(() => {
    const userSubmission = round.submissions.find((s) => s.playerId === userId);
    if (userSubmission) {
      setHasSubmitted(true);
      setSentence('');
    }
  }, [round.submissions, userId]);

  // Round timer
  const { formattedTime, timeRemaining } = useRoundTimer({
    duration: WRITING_TIME,
    autoStart: true,
    onComplete: () => {
      // Auto-submit if user hasn't submitted
      if (!hasSubmitted && sentence.trim()) {
        handleSubmit();
      }
    },
  });

  const handleSubmit = async () => {
    if (!sentence.trim() || hasSubmitted) return;

    try {
      await submitSentence(sentence.trim());
      setHasSubmitted(true);
      setSentence('');
    } catch (error) {
      console.error('Failed to submit:', error);
    }
  };

  const progress = timeRemaining !== null ? timeRemaining / WRITING_TIME : 0;

  return (
    <div className="ion-padding">
      {/* Timer and Progress */}
      <IonCard color={timeRemaining !== null && timeRemaining < 10 ? 'danger' : 'primary'}>
        <IonCardContent className="ion-text-center">
          <IonText>
            <h2>{formattedTime}</h2>
            <p>Time Remaining</p>
          </IonText>
          <IonProgressBar value={progress} />
        </IonCardContent>
      </IonCard>

      {/* Writing Prompt */}
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Round {round.roundNumber} - Writing Phase</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonText>
            <h3>Prompt:</h3>
            <p style={{ fontSize: '1.2rem', fontStyle: 'italic', margin: '16px 0' }}>
              {round.prompt}
            </p>
          </IonText>

          {hasSubmitted ? (
            <IonCard color="success">
              <IonCardContent className="ion-text-center">
                <IonText>
                  <h3>✓ Submission Received!</h3>
                  <p>Waiting for other players...</p>
                  <p>
                    <strong>
                      {round.submissions.length} / {/* Will need total player count */}
                      submitted
                    </strong>
                  </p>
                </IonText>
              </IonCardContent>
            </IonCard>
          ) : (
            <>
              <IonTextarea
                placeholder="Write your sentence to continue the story..."
                value={sentence}
                onIonInput={(e) => setSentence(e.detail.value || '')}
                rows={4}
                maxlength={200}
                disabled={hasSubmitted}
                style={{
                  border: '1px solid var(--ion-color-medium)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '16px',
                }}
              />

              <div className="ion-text-end ion-margin-top">
                <IonText color="medium">
                  <small>
                    {sentence.length} / 200 characters
                  </small>
                </IonText>
              </div>

              <IonButton
                expand="block"
                onClick={handleSubmit}
                disabled={!sentence.trim() || hasSubmitted}
                className="ion-margin-top"
              >
                Submit Sentence
              </IonButton>
            </>
          )}
        </IonCardContent>
      </IonCard>

      {/* Submissions Counter */}
      <IonCard>
        <IonCardContent>
          <IonText className="ion-text-center">
            <p>
              <strong>Submissions:</strong>{' '}
              {round.submissions.map((_, index) => (
                <IonChip key={index} color="success">
                  ✓
                </IonChip>
              ))}
            </p>
          </IonText>
        </IonCardContent>
      </IonCard>
    </div>
  );
};

export default WritingPhase;
