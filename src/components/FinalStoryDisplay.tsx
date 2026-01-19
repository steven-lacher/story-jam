import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonText,
  IonChip,
  IonButton,
} from '@ionic/react';
import { useGameState } from '../stores/gameState';
import { useHistory } from 'react-router-dom';

const FinalStoryDisplay: React.FC = () => {
  const { finalTitle, story, players, aiPlayers } = useGameState();
  const history = useHistory();

  // Get all players sorted by score (descending)
  const allPlayers = [...players, ...aiPlayers];
  const sortedPlayers = allPlayers.sort((a, b) => b.score - a.score);

  // Winner is first in sorted list
  const winner = sortedPlayers[0];
  const contributors = sortedPlayers.slice(1);

  // Full story with paragraphs
  const fullStory = story.join('\n\n');

  const handleReturnHome = () => {
    history.push('/home');
  };

  return (
    <div className="ion-padding">
      {/* Winner Announcement */}
      <IonCard color="success">
        <IonCardContent className="ion-text-center">
          <IonText>
            <h1>🏆 {winner.username} Wins!</h1>
            <p style={{ fontSize: '1.2rem', marginTop: '8px' }}>
              {winner.score} {winner.score === 1 ? 'point' : 'points'}
            </p>
          </IonText>
        </IonCardContent>
      </IonCard>

      {/* Story Title */}
      <IonCard>
        <IonCardHeader className="ion-text-center">
          <IonCardTitle style={{ fontSize: '2rem', marginBottom: '16px' }}>
            {finalTitle || 'Untitled Story'}
          </IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          {/* Story Text */}
          <div style={{
            whiteSpace: 'pre-wrap',
            fontSize: '1.1rem',
            lineHeight: '1.8',
            padding: '16px',
            backgroundColor: 'var(--ion-color-light)',
            borderRadius: '8px',
            marginBottom: '24px',
          }}>
            <IonText>
              {fullStory}
            </IonText>
          </div>

          {/* Byline */}
          <div className="ion-text-center" style={{ marginTop: '24px' }}>
            <IonText color="medium">
              <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
                Story by {winner.username}
              </p>
              <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                With contributions from:
              </p>
            </IonText>
            <div style={{ marginTop: '12px' }}>
              {contributors.map((player) => (
                <IonChip key={player.id} color="primary">
                  {player.username} ({player.score})
                </IonChip>
              ))}
            </div>
          </div>
        </IonCardContent>
      </IonCard>

      {/* Final Scores */}
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Final Scores</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: index === 0 ? 'var(--ion-color-success-tint)' : 'var(--ion-color-light)',
                borderRadius: '8px',
              }}
            >
              <IonText>
                <strong>
                  {index + 1}. {player.username}
                  {index === 0 && ' 🏆'}
                </strong>
              </IonText>
              <IonText>
                <strong>{player.score} {player.score === 1 ? 'point' : 'points'}</strong>
              </IonText>
            </div>
          ))}
        </IonCardContent>
      </IonCard>

      {/* Actions */}
      <IonButton expand="block" onClick={handleReturnHome} className="ion-margin-top">
        Return to Home
      </IonButton>
    </div>
  );
};

export default FinalStoryDisplay;
