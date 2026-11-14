import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userToken = await AsyncStorage.getItem("userToken");

        // Ganti pengecekan (auth) menjadi mengecek apakah sedang di halaman home
        const inHome = segments[0] === "home";

        if (userToken && !inHome) {
          // Bypass ke halaman home jika token aktif
          router.replace("/home");
        } else if (!userToken && inHome) {
          // Kembalikan ke login jika mencoba akses home tanpa token
          router.replace("/");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsReady(true);
      }
    };

    checkLoginStatus();
  }, [segments]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ title: "Data Mahasiswa" }} />
    </Stack>
  );
}
