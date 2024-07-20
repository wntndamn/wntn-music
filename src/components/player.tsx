import { useState, useRef, useEffect } from "react";
import { Songs } from "../assets/songs";
import { usePlayer } from "../hooks/usePlayer";
import { GrNext } from "react-icons/gr";
import { GrPrevious } from "react-icons/gr";
import { BsPauseFill } from "react-icons/bs";
import { BsFillPlayFill } from "react-icons/bs";

const Player = () => {
  const { song, setSong } = usePlayer();

  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState<number>(0);
  const [currnetTime, setCurrentTime] = useState<number>(0);
  const svol = localStorage.getItem('wntn-music-volume');
  const [volume, setVolume] = useState<number>(svol ? +svol : 100);

  const audioPlayer = useRef<HTMLAudioElement | null>(null);
  const progressBar = useRef<HTMLDivElement | null>(null);

  const playAudio = () => {
    if (audioPlayer.current) {
      setIsPlaying(true);
      audioPlayer.current.play().catch(() => {
        // failed because the user didn't interact with the document first
        setIsPlaying(false);
      });
    }
  };

  useEffect(() => {
    if (Songs.length > 0 && !song) setSong(Songs[0].id);
  }, [setSong, song]);

  useEffect(() => {
    console.log("audioPlayer: current", audioPlayer.current);
    if (audioPlayer.current) {
      playAudio();
      audioPlayer.current.volume = volume / 100;
      audioPlayer.current.onloadedmetadata = () => {
        const seconds = Math.floor(audioPlayer.current?.duration || 0);
        setDuration(seconds);
        playAudio();
        audioPlayer.current!.addEventListener("canplaythrough", () => {
          audioPlayer.current!.play();
        });
      }
      audioPlayer.current.onended = () => {
        const nextIndex = song ? song.index+1 % Songs.length : 0;
        setSong(Songs[nextIndex].id);
      }
    }
  }, [setSong, song, song?.id]);

  useEffect(() => {
    if (audioPlayer.current) {
      console.log("set volume", volume, `before:${audioPlayer.current.volume}`);
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


  return song && <div className='fixed bottom-0 left-0 w-full'>
    <div className="relative flex flex-col items-center w-full h-4 gap-2 overflow-hidden">
      <audio
        ref={audioPlayer}
        src={song.details.song}
        controls
        onTimeUpdate={handleTimeUpdate}
        className="hidden"
      />
      <div className="flex items-center justify-between w-full leading-none select-none px-4" onClick={(e) => {
        setSeekByPercentage(e.clientX / e.currentTarget.clientWidth);
      }}>
        <div>{calculateTime(currnetTime)}</div>
        <div ref={progressBar} className="absolute left-0 h-full bg-blue-100 -z-10"></div>
        <div>{calculateTime(duration)}</div>
      </div>
    </div>
    <div className='w-full h-auto bg-blue-400 flex flex-col gap-4 md:gap-0 md:flex-row items-center justify-between px-6 py-2'>
      <div className='w-full flex items-center justify-start gap-4 h-full'>
        <div className="flex items-center justify-center gap-2">
          <span className="flex items-center justify-center w-1/3">
            {song.index > 0 ? (
              <button onClick={() => setSong(Songs[song.index-1].id)} aria-label="Back Button">
                <GrPrevious className="text-xl" />
              </button>
            ) : null}
          </span>
          <span className="flex items-center justify-center w-1/3">
            <button onClick={togglePlayPause}>
              {isPlaying ? (
                <BsPauseFill className="text-3xl" />
              ) : (
                <BsFillPlayFill className="text-3xl" />
              )}
            </button>
          </span>
          <span className="flex items-center justify-center w-1/3">
            {song.index < Songs.length - 1 ? (
              <button
                onClick={() => setSong(Songs[song.index+1].id)}
                aria-label="Forward Button"
              >
                <GrNext className="text-xl" />
              </button>
            ) : null}
          </span>
        </div>
        <div className="flex items-center gap-4 h-full">
          <img src={song.details.cover} className="rounded-2xl aspect-square h-12" />
          <div className="flex flex-col items-start justify-center overflow-hidden whitespace-nowrap">
            <h2 className="text-xl text-black font-bold w-full">{song.details.title}</h2>
            <h3 className="text-md text-white">{song.details.author}</h3>
          </div>
        </div>
      </div>
      <input className='w-16' type="range" value={volume} min={0} max={100} onChange={e => onVolumeChange(e)} />
    </div>
  </div>;
};

export default Player;
