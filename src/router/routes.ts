import { RouteRecordRaw } from 'vue-router';
import MainLayout from 'layouts/MainLayout.vue';
import HomePage from 'pages/HomePage.vue';
import GamePage from 'pages/GamePage.vue';
import PlayPage from 'pages/PlayPage.vue';
import MakePage from 'pages/MakePage.vue';
import ResultPage from 'pages/ResultPage.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', name: 'HomePage', component: HomePage },
      { path: '/game', name: 'GamePage', component: GamePage },
      { path: '/play', name: 'PlayPage', component: PlayPage },
      { path: '/make', name: 'MakePage', component: MakePage },
      { path: '/result', name: 'ResultPage', component: ResultPage },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: HomePage,
  },
];

export default routes;
