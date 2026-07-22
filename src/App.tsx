import { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { IconBrandTelegram } from "@tabler/icons-react";
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
import UserMenu from "./components/UserMenu";

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
            <UserMenu dark={dark} toggleTheme={toggle} />
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
