import { useState } from "react";
import { Image, Text, View } from "react-native";
import { getFileUrl } from "../app/lib/api";
import { useTheme } from "../app/theme/ThemeProvider";
import { typography } from "../app/theme/tokens";

export function UserAvatar({ name, photo, size = 48 }: { name: string; photo?: string; size?: number }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("") || "?";
  return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2,
    borderColor: colors.primary, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
    {photo && failed !== photo ? <Image source={{ uri: getFileUrl(photo) }} accessibilityLabel={`${name}'s profile picture`}
      onError={() => setFailed(photo)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      : <Text style={[typography.display.lg, { color: colors.text, fontSize: Math.round(size * 0.36) }]}>{initials}</Text>}
  </View>;
}
