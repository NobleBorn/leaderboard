# 🏆 Summer Games Leaderboard

An internal leaderboard application for a summer tournament centered around daily puzzle games such as Wordle and Connections. Colleagues manually submit their daily results, and the app automatically tracks scores, and updates the leaderboard. Players can see how they stack up against their coworkers throughout the tournament. The goal is simple: spark a little friendly competition 🔥, keep everyone engaged, and have some fun solving puzzles together! 🎉

## Stack

- **Frontend:** Vue 3 + Vite (`frontend/`)
- **Backend:** Node/Express + Node's built-in `node:sqlite` (`backend/`) — requires **Node ≥ 22.5**
- Data is stored in a local SQLite file at `backend/data/leaderboard.db` (git-ignored — it's runtime data, not source).

