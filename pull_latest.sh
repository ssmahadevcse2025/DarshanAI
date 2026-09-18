#!/usr/bin/env bash
# DarshanAI - Git Pull & Sync Utility for Bash / Linux / macOS / Git Bash
set -e

echo "======================================================="
echo "       DarshanAI - Team Repository Sync Utility        "
echo "======================================================="
echo ""

if ! command -v git &> /dev/null; then
    echo "[ERROR] Git is not installed or not in PATH."
    exit 1
fi

echo "[1/2] Pulling latest changes from GitHub (origin/main)..."
git pull --autostash origin main

echo ""
echo "[2/2] Repository is up to date! Latest commit:"
git log -n 1 --oneline --decorate

echo ""
echo "======================================================="
echo "   SUCCESS: Ready to work on DarshanAI in Antigravity!  "
echo "======================================================="
