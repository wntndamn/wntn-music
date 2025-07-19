import { useEffect, useRef, useState } from "react";
import { BsFillPlayFill, BsPauseFill } from "react-icons/bs";
import { GrNext, GrPrevious } from "react-icons/gr";
import { Songs } from "../assets/songs";
import { usePlayer } from "../hooks/usePlayer";
import { slugifySong } from '../utils/sluggify';

const Player = () => {
  const { song, setSong } = usePlayer();

  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const svol = localStorage.getItem('wntn-music-volume');
  const [volume, setVolume] = useState<number>(svol ? +svol : 100);

  const audioPlayer = useRef<HTMLAudioElement | null>(null);
  const progressBar = useRef<HTMLDivElement | null>(null);

  const playAudio = () => {
    if (audioPlayer.current) {
      setIsPlaying(true);
      audioPlayer.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  };

  useEffect(() => {
    if (Songs.length > 0 && !song) {
      // play by /p endpoint
      if (location.pathname.startsWith("/p/")) {
        const reNewSlug = /^(?<hash>[0-9a-f]{6})(?:-(?<slug_en>.+)|)$/
        const slugOrId = location.pathname.split("/p/")[1]
        let id = Songs[0].id;
        
        // old version
        if (/^[0-9a-f]{64}$/.test(slugOrId) && Songs.findIndex((s) => s.id === slugOrId) !== -1) {
          id = slugOrId
        } else if (reNewSlug.test(slugOrId)) {
          const params = reNewSlug.exec(slugOrId)!.groups as {
            hash: string;
            slug?: string
          }

          
          
          const result = Songs.find((v) => v.id.startsWith(params.hash) && (params.slug ? slugifySong(v) === slugOrId : true));
          if (result) id = result.id;
        }
        setSong(id);
        playAudio();
      }
    }
  }, [setSong, song]);

  useEffect(() => {
    if (audioPlayer.current) {
      playAudio();
      audioPlayer.current.volume = volume / 100;
      audioPlayer.current.onloadedmetadata = () => {
        const seconds = Math.floor(audioPlayer.current?.duration || 0);
        setDuration(seconds);
        playAudio();
        audioPlayer.current!.addEventListener("canplaythrough", () => {
          audioPlayer.current!.play().catch((err) => console.error(err));
        });
      };
      audioPlayer.current.onended = () => {
        const nextIndex = song ? song.index + 1 % Songs.length : 0;
        setSong(Songs[nextIndex].id);
      };
    }
  }, [setSong, song, song?.id]);

  useEffect(() => {
    if (audioPlayer.current) {
      audioPlayer.current.volume = volume / 100;
    }

    const timeout = setTimeout(() => {
      localStorage.setItem('wntn-music-volume', String(volume));
    }, 500);

    return () => clearTimeout(timeout);
  }, [volume]);

  const calculateTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const returnedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const seconds = Math.floor(secs % 60);
    const returnedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${returnedMinutes}:${returnedSeconds}`;
  };

  const togglePlayPause = () => {
    if (audioPlayer.current!.paused) {
      setIsPlaying(true);
      audioPlayer.current!.play();
    } else {
      setIsPlaying(false);
      audioPlayer.current!.pause();
    }
  };

  const handleTimeUpdate = () => {
    if (audioPlayer.current && progressBar.current) {
      setCurrentTime(audioPlayer.current.currentTime);
      progressBar.current.style.width = `${(audioPlayer.current.currentTime / audioPlayer.current.duration) * 100}%`;
    }
  };

  const setSeekByPercentage = (percentage: number) => {
    if (audioPlayer.current) {
      audioPlayer.current.currentTime = audioPlayer.current.duration * percentage;
    }
    setIsPlaying(true);
  };

  const onVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    if (audioPlayer.current) {
      setVolume(Number(newValue));
    }
  };

  const handleBackButton = () => {
    if (song && audioPlayer.current) {
      if (currentTime > 3) {
        audioPlayer.current.currentTime = 0;
      }
      else {
        setSong(Songs[song.index - 1].id);
      }
    }
  };

  return song && <div className='fixed bottom-0 left-0 w-full'>
    <div className="relative flex flex-col items-center mx-auto w-full lg:w-2/3 h-4 gap-2 leading-none select-none overflow-hidden text-black dark:text-gray-300" onClick={(e) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      setSeekByPercentage((e.clientX - rect.left) / rect.width);
    }}>
      <audio
        ref={audioPlayer}
        src={song.details.song}
        controls
        onTimeUpdate={handleTimeUpdate}
        className="hidden"
      />
      <div ref={progressBar} className="absolute left-0 h-full bg-gray-300 dark:bg-gray-500"></div>
      <div className="absolute left-4">{calculateTime(currentTime)}</div>
      <div className="absolute right-4">{calculateTime(duration)}</div>
      <div className="w-full h-full px-4 bg-white dark:bg-gray-600" />
    </div>
    <div className="bg-gray-200 dark:bg-gray-800 w-full">
      <div className='mx-auto w-full lg:w-2/3 h-auto flex flex-col gap-4 md:gap-0 md:flex-row items-center justify-between px-6 py-2'>
        <div className='w-full flex items-center justify-start gap-4 h-full'>
          <div className="flex items-center justify-center gap-2">
            <span className="flex items-center justify-center w-1/3">
              {song.index > 0 ? (
                <button onClick={handleBackButton} aria-label="Back Button">
                  <GrPrevious className="text-xl stroke-black dark:stroke-white" />
                </button>
              ) : null}
            </span>
            <span className="flex items-center justify-center w-1/3">
              <button onClick={togglePlayPause}>
                {isPlaying ? (
                  <BsPauseFill className="text-3xl fill-black dark:fill-white" />
                ) : (
                  <BsFillPlayFill className="text-3xl fill-black dark:fill-white" />
                )}
              </button>
            </span>
            <span className="flex items-center justify-center w-1/3">
              {song.index < Songs.length - 1 ? (
                <button
                  onClick={() => setSong(Songs[song.index + 1].id)}
                  aria-label="Forward Button"
                >
                  <GrNext className="text-xl stroke-black dark:stroke-white" />
                </button>
              ) : null}
            </span>
          </div>
          <div className="flex items-center gap-4 h-full">
            <img src={song.details.cover} className="rounded-2xl aspect-square h-12" />
            <div className="text-black dark:text-white flex flex-col items-start justify-center overflow-hidden whitespace-nowrap">
              <h2 className="text-xl font-bold w-full">{song.details.title}</h2>
              <h3 className="text-md">{song.details.author}</h3>
            </div>
          </div>
        </div>
        {/* <div className="w-16">
          <input id="minmax-range" type="range" min="0" max="10" className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"></input>
        </div> */}
        <input className="w-full mb-4 md:mb-0 md:w-24 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" type="range" value={volume} min={0} max={100} onChange={e => onVolumeChange(e)} />
      </div>
    </div>
  </div>;
};

export default Player;
