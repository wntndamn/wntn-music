import { usePlayer } from "../hooks/usePlayer";
import { Songs } from "../assets/songs";

const Library = () => {
  const { song, setSong } = usePlayer();

  const pickSound = (id: number) => {
    setSong(id);
    // setIsLibraryVisible(false);
  };
  return (
    <>
      <h2 className='text-1xl font-bold'>all songs</h2>
      <ul className="flex flex-col gap-1 w-full lg:w-2/3">
          {Songs.map((item) => (
            <li
              key={item.id}
              onClick={() => pickSound(item.id)}
              className={`w-full h-16 rounded-lg flex items-center gap-4 py-2 px-4 transition-all duration-200 cursor-pointer ease-in-out hover:bg-gray-200 ${
                item.id == song ? "bg-blue-200" : "bg-white"
              }`}
            >
              <img src={item.cover} className="aspect-square h-full rounded-lg" />
              <span>
                <h4 className="text-lg">{item.title}</h4>
                <h5 className="text-gray-500 text-md">{item.author}</h5>
              </span>
            </li>
          ))}
        </ul>
    </>
  );
};

export default Library;
