import React, { useState, useRef, useEffect } from "react";
import MusicPlayer from "./components/MusicPlayer";
import VideoPlayer from "./components/VideoPlayer";
import MusicLibrary from "./components/MusicLibrary";
import FileUpload from "./components/FileUpload";

function App() {
  const [musicFiles, setMusicFiles] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  // Load music files from localStorage on component mount
  useEffect(() => {
    const savedMusic = localStorage.getItem("musicFiles");
    if (savedMusic) {
      setMusicFiles(JSON.parse(savedMusic));
    }
  }, []);

  // Save music files to localStorage whenever musicFiles changes
  useEffect(() => {
    localStorage.setItem("musicFiles", JSON.stringify(musicFiles));
  }, [musicFiles]);

  const getFileType = (file) => {
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    if (file.name.match(/\.(mp4|avi|mov|mkv|webm)$/i)) return "video";
    return "audio";
  };

  const handleFileUpload = (files) => {
    const newMusicFiles = Array.from(files).map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      file: file,
      url: URL.createObjectURL(file),
      size: file.size,
      type: file.type,
      mediaType: getFileType(file),
    }));

    setMusicFiles((prev) => [...prev, ...newMusicFiles]);

    cacheFilesForOffline(newMusicFiles);
  };

  const cacheFilesForOffline = async (files) => {
    if ("caches" in window) {
      const cache = await caches.open("music-cache-v1");
      files.forEach(async (musicFile) => {
        try {
          await cache.put(musicFile.url, await fetch(musicFile.url));
        } catch (error) {
          console.error("Failed to cache file:", error);
        }
      });
    }
  };

  const handlePlay = (track) => {
    setCurrentTrack(track);
    setIsPlaying(true);

    if (track.mediaType === "video") {
      if (videoRef.current) {
        videoRef.current.src = track.url;
        videoRef.current.play();
      }
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.play();
      }
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (currentTrack && currentTrack.mediaType === "video") {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  };

  const handleNext = () => {
    if (currentTrack) {
      const currentIndex = musicFiles.findIndex(
        (track) => track.id === currentTrack.id
      );
      const nextIndex = (currentIndex + 1) % musicFiles.length;
      handlePlay(musicFiles[nextIndex]);
    }
  };

  const handlePrevious = () => {
    if (currentTrack) {
      const currentIndex = musicFiles.findIndex(
        (track) => track.id === currentTrack.id
      );
      const prevIndex =
        currentIndex === 0 ? musicFiles.length - 1 : currentIndex - 1;
      handlePlay(musicFiles[prevIndex]);
    }
  };

  const handleTimeUpdate = () => {
    const mediaElement =
      currentTrack && currentTrack.mediaType === "video"
        ? videoRef.current
        : audioRef.current;
    if (mediaElement) {
      setCurrentTime(mediaElement.currentTime);
      setDuration(mediaElement.duration);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * duration;

    const mediaElement =
      currentTrack && currentTrack.mediaType === "video"
        ? videoRef.current
        : audioRef.current;
    if (mediaElement) {
      mediaElement.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleEnded = () => {
    handleNext();
  };

  const deleteTrack = (trackId) => {
    setMusicFiles((prev) => prev.filter((track) => track.id !== trackId));
    if (currentTrack && currentTrack.id === trackId) {
      setIsPlaying(false);
      setCurrentTrack(null);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎵🎬 Media Player Offline
          </h1>
          <p className="text-slate-300">
            Upload your audio and video files and enjoy them offline
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* File Upload Section */}
          <div className="lg:col-span-1">
            <FileUpload onFileUpload={handleFileUpload} />
          </div>

          {/* Music Library */}
          <div className="lg:col-span-2">
            <MusicLibrary
              musicFiles={musicFiles}
              currentTrack={currentTrack}
              onPlay={handlePlay}
              onDelete={deleteTrack}
            />
          </div>
        </div>

        {/* Media Player */}
        {currentTrack && (
          <div className="mt-8">
            {currentTrack.mediaType === "video" ? (
              <VideoPlayer
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                onPlay={handlePlay}
                onPause={handlePause}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onSeek={handleSeek}
              />
            ) : (
              <MusicPlayer
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                onPlay={handlePlay}
                onPause={handlePause}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onSeek={handleSeek}
              />
            )}
          </div>
        )}

        {/* Hidden Media Elements */}
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
            }
          }}
        />
        <video
          ref={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
            }
          }}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}

export default App;
