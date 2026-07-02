<template>
  <div class="app-shell">
    <nav class="navbar">
      <router-link to="/" class="navbar-brand">🏆 Summer Games</router-link>
      <div class="navbar-links">
        <router-link to="/" class="nav-link" exact>🏠 Home</router-link>
        <router-link to="/submit" class="nav-link">✏️ Submit</router-link>
        <router-link to="/leaderboard" class="nav-link">🥇 Leaderboard</router-link>
        <router-link to="/daily" class="nav-link">📅 Daily</router-link>
        <router-link to="/participants" class="nav-link">👥 Players</router-link>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>
