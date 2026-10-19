import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  readArenaScoreTrack,
  writeArenaScoreTrack,
  type ScoreTrack,
} from "@fitness-battle/shared";
import { useCallback, useEffect, useState } from "react";

const KEY = "fb:arena-score-track";

export function useScoreTrackLens(): [ScoreTrack, (next: ScoreTrack) => void] {
  const [track, setTrack] = useState<ScoreTrack>("open");

  useEffect(() => {
    void AsyncStorage.getItem(KEY).then((raw) => {
      setTrack(readArenaScoreTrack({ getItem: () => raw }));
    });
  }, []);

  const choose = useCallback((next: ScoreTrack) => {
    setTrack(next);
    void AsyncStorage.setItem(KEY, next);
  }, []);

  return [track, choose];
}
