#!/bin/bash
set -e
cd /home/team/shared/site

# Get fresh credentials
# git pull is handled by the check below

# Check current branch
echo "=== Current state ==="
git status
echo ""

# Create branch
echo "=== Creating branch ==="
git checkout main
git pull origin main
git checkout -b feature/ai-voice-coach-session-integration
echo ""

# Stage changes
echo "=== Staging changes ==="
git add -A
git status --short
echo ""

# Commit
echo "=== Committing ==="
git commit -m "feat: integrate AiVoiceCoach into workout session + enhance voice-test page

- Replaced legacy useSpeech hook with AiVoiceCoach component (ref-based speak)
- Auto-announce exercises, phase transitions, rest countdowns, encouragement
- Voice command handler: pause, resume, next, previous, remaining
- Pause overlay with resume button
- Enhanced voice-test page with phrase function test buttons
- Real-time STT result history display
- Camera PiP and mute toggle test instructions"
echo ""

# Push
echo "=== Pushing ==="
git push origin feature/ai-voice-coach-session-integration
echo "DONE"
