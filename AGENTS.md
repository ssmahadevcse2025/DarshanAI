# Antigravity Workspace Guidelines for DarshanAI

## 🔄 Automatic Team Synchronization & Collaboration Protocol
This repository is an active collaborative project between teammates developed with **Google Antigravity**.

### ⚠️ MANDATORY RULE FOR ANTIGRAVITY AGENT:
Whenever any user or collaborator begins work, prompts the agent, or starts a new task:
1. **Always Check for Remote Updates First**:
   - Before editing any code or creating new files, the agent **MUST** proactively check synchronization with `origin/main`.
   - The agent should inform the user: *"Checking for latest team changes from GitHub..."* and run `git pull --autostash origin main` (or `./pull_latest.bat` on Windows / `./pull_latest.ps1`) to ensure the local environment is 100% up to date with teammates' work.
   - If the workspace is behind `origin/main`, the agent must pull the latest changes before proceeding.
2. **Safe Conflict Handling**:
   - Always use `git pull --autostash origin main` so that any local modifications in progress are automatically stashed and cleanly reapplied without data loss.
3. **Continuous Commit & Push Protocol**:
   - Upon completing any feature, enhancement, or bug fix requested by the user, the agent must commit all changes with a clear conventional commit message and push to `origin/main` so that fellow teammates receive updates immediately.
