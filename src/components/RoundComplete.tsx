import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonText,
} from '@ionic/react';
import { useGameState } from '../stores/gameState';
import { useUserState } from '../stores/userState';
import type { Round } from '../stores/gameState';

interface RoundCompleteProps {
  round: Round;
}

const RoundComplete: React.FC<RoundCompleteProps> = ({ round }) => {
  const { players, aiPlayers, hostId } = useGameState();
  const { userId } = useUserState();

  const isHost = userId === hostId;
  const allPlayers = [...players, ...aiPlayers];
  const winner = allPlayers.find((p) => p.id === round.winnerId);

  return (
    <div className="ion-padding">
      {/* Winner Announcement */}
      <IonCard color="success">
        <IonCardHeader>
          <IonCardTitle>Round {round.roundNumber} Complete!</IonCardTitle>
        </IonCardHeader>
        <IonCardContent className="ion-text-center">
          <IonText>
            <h2>🏆 Winner: {winner?.username || 'Unknown'}</h2>
            <div
              style={{
                fontSize: '1.3rem',
                fontStyle: 'italic',
                margin: '24px 0',
                padding: '16px',
                background: 'var(--ion-color-light)',
                borderRadius: '8px',
              }}
            >
              "{round.winningSentence}"
            </div>
          </IonText>
        </IonCardContent>
      </IonCard>

      {/* Leaderboard */}
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Leaderboard</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          {allPlayers
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <div
                key={player.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  marginBottom: '8px',
                  background:
                    index === 0
                      ? 'var(--ion-color-success-tint)'
                      : 'var(--ion-color-light)',
                  borderRadius: '8px',
                }}
              >
                <IonText>
                  <strong>
                    {index + 1}. {player.username}
                  </strong>
                  {player.id === userId && ' (You)'}
                </IonText>
                <IonText>
                  <strong>{player.score} points</strong>
                </IonText>
              </div>
            ))}
        </IonCardContent>
      </IonCard>

      {/* Next Round Button (Host Only) */}
      {isHost && (
        <IonCard>
          <IonCardContent>
            <IonText className="ion-text-center">
              <p>Ready to continue?</p>
            </IonText>
            <IonButton expand="block" disabled>
              Start Next Round
            </IonButton>
            <IonText color="medium" className="ion-text-center">
              <small>
                (Next round functionality coming soon - for MVP, this is the
                end of the demo)
              </small>
            </IonText>
          </IonCardContent>
        </IonCard>
      )}

      {!isHost && (
        <IonCard>
          <IonCardContent className="ion-text-center">
            <IonText>
              <p>Waiting for host to start the next round...</p>
            </IonText>
          </IonCardContent>
        </IonCard>
      )}
    </div>
  );
};

export default RoundComplete;
