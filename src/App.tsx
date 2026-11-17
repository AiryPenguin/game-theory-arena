import { ExamPage } from './features/exam/ExamPage';
import { HomePage } from './features/misc/HomePage';
import { AchievementsPage, GlossaryPage, LeaderboardPage } from './features/misc/OtherPages';
import { StatsPage } from './features/misc/StatsPage';
import { PDPage } from './features/pd/PDPage';
import { useRoute } from './router';
import { Toasts } from './ui/feedback';

const NAV = [
  { to: '/', label: 'Start', icon: '🏠' },
  { to: '/pd', label: 'Spielen', icon: '🎮' },
  { to: '/exam', label: 'Klausur', icon: '📝' },
  { to: '/stats', label: 'Statistik', icon: '📊' },
  { to: '/achievements', label: 'Erfolge', icon: '🏅' },
  { to: '/leaderboard', label: 'Bestenliste', icon: '🏆' },
  { to: '/glossary', label: 'Glossar', icon: '📖' },
];

export function App() {
  const route = useRoute();
  let page;
  switch (route.path) {
    case '/pd':
      page = <PDPage />;
      break;
    case '/exam':
      page = <ExamPage key={route.query.toString()} route={route} />;
      break;
    case '/stats':
      page = <StatsPage />;
      break;
    case '/achievements':
      page = <AchievementsPage />;
      break;
    case '/leaderboard':
      page = <LeaderboardPage />;
      break;
    case '/glossary':
      page = <GlossaryPage />;
      break;
    default:
      page = <HomePage />;
  }
  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2">
          <a href="#/" className="shrink-0 font-extrabold text-indigo-700 dark:text-indigo-300">
            ♟️ <span className="hidden sm:inline">GT Arena</span>
          </a>
          <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto">
            {NAV.slice(1).map((n) => (
              <a
                key={n.to}
                href={`#${n.to}`}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium ${
                  route.path === n.to
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span aria-hidden>{n.icon}</span> {n.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5 pb-16">{page}</main>
      <Toasts />
    </div>
  );
}
