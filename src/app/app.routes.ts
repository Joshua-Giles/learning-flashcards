import { Routes } from '@angular/router';

const comingSoon = () => import('./features/coming-soon/coming-soon').then((m) => m.ComingSoon);

export const routes: Routes = [
  {
    path: '',
    title: 'Flashcards',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'sets/:setId',
    loadComponent: () => import('./features/set-overview/set-overview').then((m) => m.SetOverview),
  },
  {
    path: 'sets/:setId/study',
    title: 'Study · Flashcards',
    loadComponent: comingSoon,
    data: { heading: 'Study mode' },
  },
  {
    path: 'sets/:setId/quiz',
    title: 'Quiz · Flashcards',
    loadComponent: comingSoon,
    data: { heading: 'Quiz mode' },
  },
  {
    path: 'questions',
    title: 'Questions · Flashcards',
    loadComponent: comingSoon,
    data: { heading: 'Questions notebook' },
  },
  {
    path: 'stats',
    title: 'Stats · Flashcards',
    loadComponent: comingSoon,
    data: { heading: 'Stats & leaderboard' },
  },
  { path: '**', redirectTo: '' },
];
