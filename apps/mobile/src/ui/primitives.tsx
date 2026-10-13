import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "../lib/auth-context";
import { buildLoginHref, buildSignupHref } from "../lib/auth-redirect";
import { colors } from "../theme";
import { ui } from "./styles";

export function Kicker({ children }: { children: ReactNode }) {
  return <Text style={ui.kicker}>{children}</Text>;
}

export function Title({
  line1,
  line2,
}: {
  line1: string;
  line2?: string;
}) {
  return (
    <Text style={ui.title}>
      {line1}
      {line2 ? (
        <>
          {"\n"}
          <Text style={ui.titleAccent}>{line2}</Text>
        </>
      ) : null}
    </Text>
  );
}

export function Copy({ children }: { children: ReactNode }) {
  return <Text style={ui.copy}>{children}</Text>;
}

export function Note({ children }: { children: ReactNode }) {
  return <Text style={ui.note}>{children}</Text>;
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[ui.card, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[ui.btn, disabled ? ui.btnDisabled : null]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={ui.btnText}>{label}</Text>
    </Pressable>
  );
}

export function LineButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[ui.btnLine, disabled ? ui.btnDisabled : null]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={ui.btnLineText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={ui.btnGhost} onPress={onPress}>
      <Text style={ui.btnGhostText}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  on,
  onPress,
}: {
  label: string;
  on?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[ui.chip, on ? ui.chipOn : null]} onPress={onPress}>
      <Text style={[ui.chipText, on ? ui.chipTextOn : null]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={ui.chips}>{children}</View>;
}

export function Field({
  label,
  ...inputProps
}: { label: string } & TextInputProps) {
  return (
    <View style={ui.field}>
      <Text style={ui.fieldLabel}>{label}</Text>
      <TextInput
        style={ui.input}
        placeholderTextColor="#9aa3b5"
        {...inputProps}
      />
    </View>
  );
}

export function ProductHeader({
  sourceStatus = "disconnected",
  sourceLabel = "No source",
}: {
  sourceStatus?: "disconnected" | "stub" | "connected";
  sourceLabel?: string;
}) {
  return (
    <View style={ui.header}>
      <Link href="/" asChild>
        <Pressable>
          <Text style={ui.brand}>
            Fitness Battle <Text style={ui.brandMark}>·</Text>
          </Text>
        </Pressable>
      </Link>
      <Pressable onPress={() => router.push("/you")}>
        <Text
          style={[
            ui.source,
            sourceStatus === "connected" ? ui.sourceLive : null,
          ]}
        >
          {sourceLabel}
        </Text>
      </Pressable>
    </View>
  );
}

export function AuthPrompt({
  open,
  reason,
  nextPath = "/",
  onClose,
}: {
  open: boolean;
  reason: string;
  nextPath?: string;
  onClose: () => void;
}) {
  if (!open) return null;
  const signup = buildSignupHref(nextPath);
  const login = buildLoginHref(nextPath);
  return (
    <Modal transparent animationType="slide" visible={open} onRequestClose={onClose}>
      <Pressable style={ui.modalBackdrop} onPress={onClose}>
        <Pressable style={ui.modalCard} onPress={(e) => e.stopPropagation()}>
          <Kicker>Join in</Kicker>
          <Text style={ui.cardTitle}>Create an account to compete</Text>
          <Copy>{reason}</Copy>
          <PrimaryButton
            label="Create account"
            onPress={() => {
              onClose();
              router.push(signup);
            }}
          />
          <LineButton
            label="Sign in"
            onPress={() => {
              onClose();
              router.push(login);
            }}
          />
          <GhostButton label="Keep browsing" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function AuthGate({
  reason,
  children,
}: {
  reason: string;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[ui.copy, { marginTop: 12 }]}>Checking your account…</Text>
      </View>
    );
  }
  if (user) return <>{children}</>;

  return (
    <View style={ui.scroll}>
      <Card>
        <Kicker>Account</Kicker>
        <Text style={ui.title}>Sign in to continue</Text>
        <Copy>{reason}</Copy>
        <PrimaryButton
          label="Create account"
          onPress={() => router.push(buildSignupHref("/you"))}
        />
        <LineButton
          label="Sign in"
          onPress={() => router.push(buildLoginHref("/you"))}
        />
      </Card>
    </View>
  );
}

export function LoadingCopy({ label }: { label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <ActivityIndicator color={colors.accent} />
      <Text style={[ui.copy, { marginTop: 12 }]}>{label}</Text>
    </View>
  );
}
