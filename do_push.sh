#!/bin/bash
cd /home/team/shared/site
git add -A
echo "---STATUS---"
git status --short
echo "---COMMIT---"
git commit -m "feat(zongosol): Phase 4 complete - Electrical/Smart tabs, 3D markers, summary items, animations" 2>&1
echo "---PUSH---"
git push 2>&1
echo "---DONE---"
