import { useEffect } from 'react';
import Library from "./components/library";
import Player from "./components/player";

import { TbSunFilled, TbMoonFilled } from "react-icons/tb";


function App() {
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme) {
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(theme);
    }
    // if (theme) document.documentElement.classList.add(theme);
  }, []);
  return (
    <div className="min-h-full relative flex flex-col items-start justify-start w-full py-4 px-4 gap-3 dark:bg-gray-900">
      <div className="flex flex-col items-center justify-center w-full gap-4 py-4">
        <h1 className="text-3xl font-extrabold w-full text-center dark:text-white">wntn.music</h1>
        <h1 className="text-3xl font-extrabold w-full text-center dark:text-white">the mostly worst music in the world!</h1>
        <h1 className="text-3xl font-extrabold w-full text-center dark:text-white">our tgch with changes: <a href="//t.me/wntnmusic" className="text-red-500">@wntnmusic</a></h1>
        <button className="p-2 rounded-lg border border-gray-500 bg-black text-white dark:bg-gray-800" onClick={() => {
          document.documentElement.classList.toggle("dark");
          localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
        }}>
          <TbSunFilled className="size-6 dark:hidden" />
          <TbMoonFilled className="size-6 hidden dark:block" />
        </button>
      </div>
      <Library />
      <Player />
      {/* empty space */}
      <div className='h-32'></div>
    </div>
  );
}

export default App;
