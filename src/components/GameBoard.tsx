import { useGameState } from '../stores/gameState';
import WritingPhase from './WritingPhase';
import VotingPhase from './VotingPhase';
import RoundComplete from './RoundComplete';
import { IonCard, IonCardContent, IonText } from '@ionic/react';

const GameBoard: React.FC = () => {
  const { rounds, currentRoundIndex } = useGameState();

  const currentRound = rounds[currentRoundIndex - 1];

  if (!currentRound) {
    return (
      <div className="ion-padding">
        <IonCard>
          <IonCardContent className="ion-text-center">
            <IonText>
              <h2>Waiting for round to start...</h2>
              <p>The host will begin the first round soon.</p>
            </IonText>
          </IonCardContent>
        </IonCard>
      </div>
    );
  }

  return (
    <div className="game-board">
      {currentRound.phase === 'writing' && <WritingPhase round={currentRound} />}
      {currentRound.phase === 'voting' && <VotingPhase round={currentRound} />}
      {currentRound.phase === 'complete' && <RoundComplete round={currentRound} />}
    </div>
  );
};

export default GameBoard;
