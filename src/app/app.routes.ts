import { Routes } from '@angular/router';

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
    loadComponent: () => import('./features/study/study-page').then((m) => m.StudyPage),
  },
  {
    path: 'sets/:setId/quiz',
    title: 'Quiz · Flashcards',
    loadComponent: () => import('./features/quiz/quiz-page').then((m) => m.QuizPage),
  },
  {
    path: 'questions',
    title: 'Questions · Flashcards',
    loadComponent: () => import('./features/notebook/questions-page').then((m) => m.QuestionsPage),
  },
  {
    path: 'stats',
    title: 'Stats · Flashcards',
    loadComponent: () => import('./features/stats/stats-page').then((m) => m.StatsPage),
  },
  {
    path: 'settings',
    title: 'Settings · Flashcards',
    loadComponent: () => import('./features/settings/settings-page').then((m) => m.SettingsPage),
  },
  { path: '**', redirectTo: '' },
];
