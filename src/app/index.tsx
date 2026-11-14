import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
// 1. Impor fungsi kredensial Firebase khusus Native
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
// 2. Impor GoogleSignin dari library native
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// 3. Pastikan path ini sesuai, kita hanya butuh 'auth' sekarang
import { auth } from "../config/firebase"; 

// 4. Inisialisasi Google Sign-In dengan Web Client ID dari Firebase Anda
GoogleSignin.configure({
  webClientId: "913813945120-tnviceoruu8afe97g9chqnqld8euhjrn.apps.googleusercontent.com",
});

export default function LoginScreen() {
  const router = useRouter();

  const handleGoogleLogin = async () => {
    try {
      // Cek ketersediaan Google Play Services di Emulator Android
      await GoogleSignin.hasPlayServices();

      // Panggil antarmuka Login Google bawaan OS Android
      const userInfo = await GoogleSignin.signIn();
      
      // Mengambil idToken (mendukung struktur respons library versi lama dan baru)
      const idToken = userInfo.data?.idToken || userInfo.idToken; 

      if (!idToken) {
        throw new Error("Gagal mendapatkan ID Token dari Google");
      }

      // Buat kredensial Firebase menggunakan token Android tersebut
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Otentikasi ke Firebase
      const result = await signInWithCredential(auth, googleCredential);
      const user = result.user;

      // Simpan informasi login ke Local Storage agar sesi tidak hilang
      await AsyncStorage.setItem("userToken", user.uid);
      await AsyncStorage.setItem("userData", JSON.stringify(user));

      Alert.alert("Sukses", "Login Berhasil!");

      // Arahkan ke halaman Home setelah berhasil
      router.replace("/home");
    } catch (error: any) {
      Alert.alert("Error", error.message);
      console.error("Gagal Login:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tugas Login AsyncStorage & Firebase</Text>

      {/* Sesuai desain UI awal Anda, form dibiarkan sebagai pelengkap desain */}
      <TextInput style={styles.input} placeholder="Masukkan Username" />
      <TextInput
        style={styles.input}
        placeholder="Masukkan Password"
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.buttonPrimary}
        onPress={handleGoogleLogin}
      >
        <Text style={styles.buttonText}>
          LOGIN DENGAN GOOGLE & SIMPAN TOKEN
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
  },
  buttonPrimary: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});