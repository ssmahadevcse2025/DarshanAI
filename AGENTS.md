# Antigravity Workspace Guidelines for DarshanAI

## 🔄 Automatic Team Synchronization & Collaboration
This repository is an active team project developed collaboratively by multiple engineers using **Google Antigravity**.

### On Session Start:
1. **Always Check for Remote Updates First**:
   - Before editing files or starting new features, run `git pull origin main` or execute `./pull_latest.bat` (on Windows) / `./pull_latest.ps1` to ensure you have the latest updates, models, CCTV feeds, and frontend routes.
   - If the user asks to start work or build a feature, verify with `git status` that the workspace is synchronized with `origin/main`.
2. **Safe Conflict Handling**:
   - If there are uncommitted local edits, either stash them (`git stash save`) before pulling or commit them to prevent merge collisions with team members.
3. **Commit & Push Protocol**:
   - After completing features or bug fixes, ensure all files are cleanly committed and pushed to `origin/main` so team collaborators receive the latest updates immediately.
