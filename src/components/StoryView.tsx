import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonText,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { useGameState } from '../stores/gameState';
import { useUIState } from '../stores/uiState';

const StoryView: React.FC = () => {
  const { story, rounds } = useGameState();
  const { toggleStoryView } = useUIState();

  return (
    <div className="ion-padding">
      <IonCard>
        <IonCardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <IonCardTitle>The Story So Far</IonCardTitle>
            <IonButton fill="clear" onClick={toggleStoryView}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </div>
        </IonCardHeader>
        <IonCardContent>
          {story.length === 0 ? (
            <IonText className="ion-text-center">
              <p style={{ fontStyle: 'italic', color: 'var(--ion-color-medium)' }}>
                The story hasn't started yet. Complete rounds to build your collaborative story!
              </p>
            </IonText>
          ) : (
            <div
              style={{
                fontSize: '1.2rem',
                lineHeight: '1.8',
                padding: '16px',
                background: 'var(--ion-color-light)',
                borderRadius: '8px',
              }}
            >
              {story.map((sentence, index) => (
                <span key={index}>
                  {sentence}
                  {index < story.length - 1 ? ' ' : ''}
                </span>
              ))}
            </div>
          )}

          {story.length > 0 && (
            <IonText className="ion-text-center" style={{ marginTop: '24px' }}>
              <p>
                <strong>{story.length}</strong> sentence{story.length !== 1 ? 's' : ''} •{' '}
                <strong>{rounds.filter(r => r.phase === 'complete').length}</strong> round{rounds.filter(r => r.phase === 'complete').length !== 1 ? 's' : ''} completed
              </p>
            </IonText>
          )}
        </IonCardContent>
      </IonCard>

      {/* Individual Sentences with Attribution */}
      {story.length > 0 && (
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Sentence Breakdown</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {rounds
              .filter((r) => r.phase === 'complete' && r.winningSentence)
              .map((round, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: '16px',
                    padding: '12px',
                    background: 'var(--ion-color-light)',
                    borderRadius: '8px',
                    borderLeft: '4px solid var(--ion-color-primary)',
                  }}
                >
                  <IonText>
                    <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
                      "{round.winningSentence}"
                    </p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--ion-color-medium)' }}>
                      Round {round.roundNumber} winner
                    </p>
                  </IonText>
                </div>
              ))}
          </IonCardContent>
        </IonCard>
      )}
    </div>
  );
};

export default StoryView;
