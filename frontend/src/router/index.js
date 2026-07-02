import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import SubmitView from '../views/SubmitView.vue';
import LeaderboardView from '../views/LeaderboardView.vue';
import DailyView from '../views/DailyView.vue';
import ParticipantsView from '../views/ParticipantsView.vue';
import AdminView from '../views/AdminView.vue';

const routes = [
  { path: '/',             component: HomeView,         meta: { title: 'Dashboard' } },
  { path: '/submit',       component: SubmitView,       meta: { title: 'Submit Result' } },
  { path: '/leaderboard',  component: LeaderboardView,  meta: { title: 'Leaderboard' } },
  { path: '/daily',        component: DailyView,        meta: { title: "Today's Results" } },
  { path: '/participants', component: ParticipantsView, meta: { title: 'Participants' } },
  { path: '/admin',        component: AdminView,        meta: { title: 'Admin' } },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
