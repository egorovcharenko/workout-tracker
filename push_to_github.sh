#!/bin/bash
# Run this from your Sports folder: bash push_to_github.sh
cd "$(dirname "$0")"

# Clean up any previous git state
rm -rf .git

# Init fresh repo
git init
git branch -M main

# Add only the app files
git add workout.html workout_server.py .gitignore README.md

# Commit
git commit -m "Initial commit — dumbbell workout tracker

Vanilla HTML/JS app with Python/SQLite backend.
3 workout templates, auto-save, muscle recovery map,
rest timer, cross-workout weight hints.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

# Push to your repo
git remote add origin https://github.com/egorovcharenko/workout-tracker.git
git push -u origin main

echo ""
echo "Done! Check https://github.com/egorovcharenko/workout-tracker"
