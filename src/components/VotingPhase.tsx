import { useState, useEffect, useMemo } from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonText,
  IonList,
  IonItem,
  IonRadioGroup,
  IonRadio,
  IonLabel,
  IonChip,
} from '@ionic/react';
import { useUserState } from '../stores/userState';
import { useFirebaseGame } from '../hooks/useFirebaseGame';
import type { Round } from '../stores/gameState';

interface VotingPhaseProps {
  round: Round;
}

const VotingPhase: React.FC<VotingPhaseProps> = ({ round }) => {
  const { userId } = useUserState();
  const { voteForSubmission } = useFirebaseGame();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  // Shuffle submissions for anonymity (but keep it consistent per user)
  const shuffledSubmissions = useMemo(() => {
    const submissions = [...round.submissions];
    // Simple shuffle based on round number (same for all users in same round)
    const seed = round.roundNumber;
    for (let i = submissions.length - 1; i > 0; i--) {
      const j = Math.floor((Math.sin(seed + i) + 1) * 0.5 * (i + 1));
      [submissions[i], submissions[j]] = [submissions[j], submissions[i]];
    }
    return submissions;
  }, [round.submissions, round.roundNumber]);

  // Check if user has already voted
  useEffect(() => {
    // In a real implementation, track who voted
    // For MVP, we'll allow multiple votes for testing
    setHasVoted(false);
  }, [round]);

  // Find user's own submission to prevent self-voting
  const userSubmissionIndex = shuffledSubmissions.findIndex(
    (s) => s.playerId === userId
  );

  const handleVote = async () => {
    if (selectedIndex === null || hasVoted) return;

    // Find the original index in the non-shuffled array
    const selectedSubmission = shuffledSubmissions[selectedIndex];
    const originalIndex = round.submissions.findIndex(
      (s) => s === selectedSubmission
    );

    if (originalIndex === -1) return;

    try {
      await voteForSubmission(originalIndex);
      setHasVoted(true);
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  return (
    <div className="ion-padding">
      {/* Voting Instructions */}
      <IonCard color="secondary">
        <IonCardHeader>
          <IonCardTitle>Round {round.roundNumber} - Voting Phase</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonText>
            <p>
              <strong>Vote for the best sentence!</strong>
            </p>
            <p>All submissions are anonymous. You cannot vote for your own submission.</p>
          </IonText>
        </IonCardContent>
      </IonCard>

      {/* Voting Form */}
      {hasVoted ? (
        <IonCard color="success">
          <IonCardContent className="ion-text-center">
            <IonText>
              <h3>✓ Vote Submitted!</h3>
              <p>Waiting for other players to vote...</p>
            </IonText>
          </IonCardContent>
        </IonCard>
      ) : (
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Choose Your Favorite</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonRadioGroup
              value={selectedIndex}
              onIonChange={(e) => setSelectedIndex(e.detail.value)}
            >
              <IonList>
                {shuffledSubmissions.map((submission, index) => {
                  const isOwnSubmission = index === userSubmissionIndex;

                  return (
                    <IonItem
                      key={index}
                      disabled={isOwnSubmission}
                      style={{
                        opacity: isOwnSubmission ? 0.5 : 1,
                        marginBottom: '8px',
                        border: '1px solid var(--ion-color-medium)',
                        borderRadius: '8px',
                      }}
                    >
                      <IonRadio
                        slot="start"
                        value={index}
                        disabled={isOwnSubmission}
                      />
                      <IonLabel className="ion-text-wrap">
                        <p style={{ fontSize: '1.1rem', margin: '8px 0' }}>
                          {submission.sentence}
                        </p>
                        {isOwnSubmission && (
                          <IonChip color="warning" style={{ marginTop: '8px' }}>
                            Your Submission
                          </IonChip>
                        )}
                      </IonLabel>
                    </IonItem>
                  );
                })}
              </IonList>
            </IonRadioGroup>

            <IonButton
              expand="block"
              onClick={handleVote}
              disabled={selectedIndex === null || hasVoted}
              className="ion-margin-top"
            >
              Cast Vote
            </IonButton>
          </IonCardContent>
        </IonCard>
      )}

      {/* Vote Counter (for debugging/host) */}
      <IonCard>
        <IonCardContent>
          <IonText className="ion-text-center">
            <p>
              <strong>Current Votes:</strong>
            </p>
            {round.submissions.map((submission, index) => (
              <div key={index}>
                <IonChip color="primary">
                  Submission {index + 1}: {submission.votes} vote(s)
                </IonChip>
              </div>
            ))}
          </IonText>
        </IonCardContent>
      </IonCard>
    </div>
  );
};

export default VotingPhase;
