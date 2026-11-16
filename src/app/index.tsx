import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  User,
} from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../config/firebase";

// ---- Warna (mengikuti desain Figma) ----
const C = {
  primary: "#4F46E5",
  primaryDisabled: "#8B8CEC",
  primaryLight: "#EEF2FF",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  dangerBorder: "#FCA5A5",
  google: "#DB4437",
};

// Web Client ID dari Firebase / Google Cloud (tipe "Web client")
GoogleSignin.configure({
  webClientId:
    "913813945120-tnviceoruu8afe97g9chqnqld8euhjrn.apps.googleusercontent.com",
});

// Simpan info login ke AsyncStorage: token asli Firebase + data ringkas user
const saveSession = async (user: User) => {
  const t = await user.getIdTokenResult();
  await AsyncStorage.setItem("userToken", t.token);
  await AsyncStorage.setItem("tokenExpiry", t.expirationTime);
  await AsyncStorage.setItem(
    "userData",
    JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    }),
  );
};

const FIELD_ERROR_CODES = [
  "auth/invalid-credential",
  "auth/wrong-password",
  "auth/user-not-found",
  "auth/invalid-email",
];

const errorMessage = (e: any): string => {
  switch (e?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email atau password salah";
    case "auth/invalid-email":
      return "Format email tidak valid";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Coba lagi nanti";
    case "auth/network-request-failed":
      return "Tidak ada koneksi internet";
    default:
      return e?.message ?? "Terjadi kesalahan";
  }
};

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<null | "email" | "google">(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState(false);
  const busy = loading !== null;

  const handleEmailLogin = async () => {
    setError(null);
    setFieldError(false);
    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi");
      setFieldError(true);
      return;
    }
    setLoading("email");
    try {
      const result = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      await saveSession(result.user);
      router.replace("/home");
    } catch (e: any) {
      console.log("LOGIN ERROR:", e?.code, e?.message);
      setError(errorMessage(e));
      setFieldError(FIELD_ERROR_CODES.includes(e?.code));
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setFieldError(false);
    setLoading("google");
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      // Pengguna menutup pilihan akun: bukan error
      if (response.type !== "success") return;

      const idToken = response.data.idToken;
      if (!idToken) throw new Error("Gagal mendapatkan ID Token dari Google");

      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);

      await saveSession(result.user);
      router.replace("/home");
    } catch (e: any) {
      console.log("GOOGLE LOGIN ERROR:", e?.code, e?.message);
      setError(errorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.hero, { paddingTop: insets.top + 40 }]}>
          <View style={styles.logo}>
            <MaterialCommunityIcons
              name="shield-key-outline"
              size={36}
              color={C.primary}
            />
          </View>
          <Text style={styles.heroTitle}>Selamat Datang</Text>
          <Text style={styles.heroSub}>Masuk untuk melihat data mahasiswa</Text>
        </View>

        {/* Kartu form */}
        <View style={styles.card}>
          <View style={[styles.inputBox, fieldError && styles.inputError]}>
            <Ionicons name="mail-outline" size={20} color={C.muted} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!busy}
            />
          </View>

          <View style={[styles.inputBox, fieldError && styles.inputError]}>
            <Ionicons name="lock-closed-outline" size={20} color={C.muted} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={C.muted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              editable={!busy}
            />
            <TouchableOpacity onPress={() => setShowPassword((s) => !s)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={C.muted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              loading === "email" && { backgroundColor: C.primaryDisabled },
            ]}
            onPress={handleEmailLogin}
            disabled={busy}
            activeOpacity={0.85}
          >
            {loading === "email" ? (
              <View style={styles.row}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.primaryText, { marginLeft: 10 }]}>
                  SEDANG MASUK...
                </Text>
              </View>
            ) : (
              <Text style={styles.primaryText}>LOGIN EMAIL & PASSWORD</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>atau</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, busy && { opacity: 0.6 }]}
            onPress={handleGoogleLogin}
            disabled={busy}
            activeOpacity={0.85}
          >
            {loading === "google" ? (
              <ActivityIndicator color={C.primary} size="small" />
            ) : (
              <Ionicons name="logo-google" size={20} color={C.google} />
            )}
            <Text style={styles.googleText}>LOGIN DENGAN GOOGLE</Text>
          </TouchableOpacity>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={C.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1 }} />

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.footerTitle}>Tugas Login</Text>
          <Text style={styles.footerTitle}>AsyncStorage & Firebase</Text>
          <View style={[styles.row, { marginTop: 8 }]}>
            <Ionicons name="shield-checkmark" size={13} color={C.primary} />
            <Text style={styles.footerSecure}>Akses aman & terenkripsi</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  hero: {
    backgroundColor: C.primaryLight,
    alignItems: "center",
    paddingBottom: 44,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroTitle: { fontSize: 26, fontWeight: "700", color: C.text },
  heroSub: { fontSize: 14, color: C.muted, marginTop: 8 },
  card: {
    backgroundColor: C.card,
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputError: { borderColor: C.dangerBorder, backgroundColor: "#FFF7F7" },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: C.text },
  primaryButton: {
    backgroundColor: C.primary,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { marginHorizontal: 12, color: C.muted, fontSize: 13 },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#fff",
  },
  googleText: {
    marginLeft: 10,
    color: C.text,
    fontWeight: "700",
    fontSize: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.dangerBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  errorText: { marginLeft: 8, color: C.danger, fontSize: 13, flex: 1 },
  footer: { alignItems: "center", paddingTop: 32 },
  footerTitle: { fontSize: 13, color: C.muted, fontWeight: "600" },
  footerSecure: { marginLeft: 6, fontSize: 11, color: C.muted },
});