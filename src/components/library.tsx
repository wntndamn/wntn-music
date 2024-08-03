import { usePlayer } from "../hooks/usePlayer";
import { Songs } from "../assets/songs";
import { GrCopy } from "react-icons/gr";

const Library = () => {
  const { song, setSong } = usePlayer();

  const pickSound = (id: string) => {
    setSong(id);
  };
  
  return (
    <div className="mx-auto w-full lg:w-2/3">
      <h2 className="text-2xl font-bold mb-4 dark:text-white">all songs</h2>
      <ul className="flex flex-col gap-1">
          {Songs.map((item) => (
            <li
              key={item.id}
              onClick={() => pickSound(item.id)}
              className={`w-full h-16 rounded-lg flex items-center justify-between gap-4 py-2 px-4 transition-all duration-200 cursor-pointer ease-in-out border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 ${
                item.id == song?.id ? "bg-gray-200 dark:bg-gray-700" : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              <div className={"flex items-center gap-4 h-full"}>
                <img src={item.cover} className="aspect-square h-full rounded-lg" />
                <span>
                  <h4 className="text-lg font-bold dark:text-white">{item.title}</h4>
                  <h5 className="text-gray-500 dark:text-gray-400 text-md">{item.author}</h5>
                </span>
              </div>
              <div>
                <button onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(`${location.origin}/p/${item.id}`);
                  alert("copied to clipboard");
                }}>
                  <GrCopy className="stroke-black dark:stroke-white" />  
                </button>
              </div>
            </li>
          ))}
        </ul>
    </div>
  );
};

export default Library;
