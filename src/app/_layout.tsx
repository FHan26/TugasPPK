import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { auth } from "../config/firebase";

// Kode error yang berarti akun sudah dihapus / dinonaktifkan / sesi dicabut
const INVALID_SESSION_CODES = [
  "auth/user-token-expired",
  "auth/user-not-found",
  "auth/user-disabled",
  "auth/invalid-user-token",
];

const clearSession = () =>
  AsyncStorage.multiRemove(["userToken", "tokenExpiry", "userData"]);

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // 1. Tanya Firebase apakah sesi benar-benar valid (bukan hanya baca AsyncStorage)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          // true = paksa cek ke server; gagal jika user sudah dihapus di Console
          const t = await u.getIdTokenResult(true);
          await AsyncStorage.setItem("userToken", t.token);
          await AsyncStorage.setItem("tokenExpiry", t.expirationTime);
          setUser(u);
        } else {
          await clearSession();
          setUser(null);
        }
      } catch (e: any) {
        console.log("SESSION CHECK ERROR:", e?.code, e?.message);
        if (INVALID_SESSION_CODES.includes(e?.code)) {
          await signOut(auth);
          await clearSession();
          setUser(null);
        } else {
          // Mis. tidak ada internet: jangan paksa logout
          setUser(u);
        }
      }
      setReady(true);
    });
    return unsubscribe;
  }, []);

  // 2. Redirect hanya setelah status diketahui; Stack selalu dirender
  useEffect(() => {
    if (!ready) return;
    const inHome = segments[0] === "home";

    if (user && !inHome) {
      router.replace("/home"); // bypass login
    } else if (!user && inHome) {
      router.replace("/");
    }
  }, [user, ready, segments]);

  return (
    <View style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ title: "Data Mahasiswa" }} />
      </Stack>

      {!ready && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#fff",
},
});
