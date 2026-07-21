import { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import {
  IconSun,
  IconMoon,
  IconBrandTelegram,
  IconUserCircle,
  IconLibrary,
  IconMicrophone2,
  IconLogout,
  IconShieldCheck,
} from "@tabler/icons-react";
import Home from "./components/Home";
import ArtistPage from "./components/ArtistPage";
import TrackPage from "./components/TrackPage";
import Player from "./components/Player";
import AuthPage from "./components/AuthPage";
import Library from "./components/Library";
import PlaylistPage from "./components/PlaylistPage";
import Studio from "./components/Studio";
import AdminPage from "./components/AdminPage";
import UserPage from "./components/UserPage";
import AlbumPage from "./components/AlbumPage";
import { useAuth } from "./hooks/useAuth";

function useTheme() {
  const [dark, setDark] = useState(
    () => (localStorage.getItem("theme") ?? "dark") !== "light",
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

function HeaderIcon({
  to,
  label,
  children,
}: {
  to: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-text"
    >
      {children}
    </Link>
  );
}

function AuthArea() {
  const { user, logout } = useAuth();
  if (!user)
    return (
      <Link
        to="/login"
        className="flex items-center gap-1.5 rounded-card bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-hover"
      >
        <IconUserCircle size={18} /> войти
      </Link>
    );
  return (
    <>
      <Link
        to={`/u/${user.username}`}
        aria-label="мой профиль"
        title={`@${user.username}`}
        className="grid h-9 w-9 place-items-center overflow-hidden rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-text"
      >
        {user.avatar ? (
          <img src={user.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <IconUserCircle size={18} />
        )}
      </Link>
      {user.isAdmin && (
        <HeaderIcon to="/admin" label="модерация">
          <IconShieldCheck size={18} />
        </HeaderIcon>
      )}
      <HeaderIcon to="/studio" label="студия">
        <IconMicrophone2 size={18} />
      </HeaderIcon>
      <HeaderIcon to="/library" label="библиотека">
        <IconLibrary size={18} />
      </HeaderIcon>
      <button
        onClick={() => void logout()}
        aria-label="выйти"
        title={`выйти (${user.username})`}
        className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-text"
      >
        <IconLogout size={18} />
      </button>
    </>
  );
}

export default function App() {
  const { dark, toggle } = useTheme();

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-xl tracking-tight">
            wntn<span className="text-accent">.</span>music
          </Link>
          <div className="flex items-center gap-2">
            <a
              href="https://t.me/wntnmusic"
              target="_blank"
              rel="noreferrer"
              className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-text"
              aria-label="телеграм"
            >
              <IconBrandTelegram size={18} />
            </a>
            <button
              onClick={toggle}
              aria-label="сменить тему"
              className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-text"
            >
              {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>
            <AuthArea />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/artist/:slug" element={<ArtistPage />} />
          <Route path="/track/:id" element={<TrackPage />} />
          <Route path="/album/:id" element={<AlbumPage />} />
          <Route path="/playlist/:id" element={<PlaylistPage />} />
          <Route path="/u/:username" element={<UserPage />} />
          <Route path="/library" element={<Library />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      <Player />
    </div>
  );
}
