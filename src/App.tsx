import Library from "./components/library";
import Player from "./components/player";

function App() {
  return (
    <div className="min-h-full relative flex flex-col items-start justify-start w-screen p-10 gap-3">
      <div className="container flex justify-between w-full gap-10">
        <h1 className="text-2xl font-bold">wntn music</h1>
      </div>
      <Library />
      <Player />
    </div>
  );
}

export default App;
