import React, { createContext, useContext, useState, useCallback } from "react";

export type PlayingVideo = {
  videoId: number;
  title: string;
  thumbnail: string;
  youtubeId?: string | null;
  videoUrl?: string | null;
} | null;

const PlayingVideoContext = createContext<{
  playing: PlayingVideo;
  setPlaying: (v: PlayingVideo) => void;
  playVideo: (v: Omit<NonNullable<PlayingVideo>, "videoId"> & { videoId: number }) => void;
  stopPlaying: () => void;
  jukeboxIsActive: boolean;
  setJukeboxIsActive: (v: boolean) => void;
  jukeboxCommunityId: number | null;
  setJukeboxCommunityId: (v: number | null) => void;
}>({
  playing: null,
  setPlaying: () => {},
  playVideo: () => {},
  stopPlaying: () => {},
  jukeboxIsActive: false,
  setJukeboxIsActive: () => {},
  jukeboxCommunityId: null,
  setJukeboxCommunityId: () => {},
});

export function PlayingVideoProvider({ children }: { children: React.ReactNode }) {
  const [playing, setPlaying] = useState<PlayingVideo>(null);
  const [jukeboxIsActive, setJukeboxIsActive] = useState(false);
  const [jukeboxCommunityId, setJukeboxCommunityId] = useState<number | null>(null);

  const playVideo = useCallback((v: Omit<NonNullable<PlayingVideo>, "videoId"> & { videoId: number }) => {
    setPlaying((prev) => {
      if (prev?.videoId === v.videoId && prev?.youtubeId === v.youtubeId && prev?.videoUrl === v.videoUrl) {
        return prev;
      }
      return v;
    });
  }, []);

  const stopPlaying = useCallback(() => setPlaying(null), []);

  return (
    <PlayingVideoContext.Provider value={{ playing, setPlaying, playVideo, stopPlaying, jukeboxIsActive, setJukeboxIsActive, jukeboxCommunityId, setJukeboxCommunityId }}>
      {children}
    </PlayingVideoContext.Provider>
  );
}

export function usePlayingVideo() {
  return useContext(PlayingVideoContext);
}
