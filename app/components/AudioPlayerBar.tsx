import { Ionicons } from "@expo/vector-icons";
import {
  type AudioSource,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getFileUrl, getStoredToken } from "../lib/api";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing, typography } from "../theme/tokens";

export function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Turns a server path like "/api/files/<id>" into a player source that
// includes the login token.
export function useAuthorizedAudioSource(path?: string | null) {
  const [source, setSource] = useState<{
    uri: string;
    headers: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!path) {
      setSource(null);
      return;
    }

    getStoredToken().then((token) => {
      if (cancelled) return;
      setSource({
        uri: getFileUrl(path),
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return source;
}

interface AudioPlayerBarProps {
  source: AudioSource | null;
  title: string;
  subtitle?: string;
}

export function AudioPlayerBar({ source, title, subtitle }: AudioPlayerBarProps) {
  const { colors } = useTheme();
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
      () => {}
    );
  }, []);

  const toggle = async () => {
    if (!source) return;

    if (status.playing) {
      player.pause();
      return;
    }

    if (status.duration > 0 && status.currentTime >= status.duration - 0.1) {
      await player.seekTo(0);
    }
    player.play();
  };

  const progress =
    status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Pressable
        onPress={toggle}
        disabled={!source}
        hitSlop={8}
        style={[
          styles.playButton,
          { backgroundColor: colors.primary, opacity: source ? 1 : 0.5 },
        ]}
      >
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={22}
          color={colors.primaryText}
        />
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text
          style={[typography.display.md, { color: colors.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[typography.reading.sm, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        )}
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: colors.primary, width: `${progress * 100}%` },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 3,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});