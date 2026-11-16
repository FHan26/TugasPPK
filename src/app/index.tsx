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
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../config/firebase";

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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleError = (error: any) => {
    console.log("LOGIN ERROR:", error?.code, error?.message);
    Alert.alert("Login gagal", `${error?.code ?? ""}\n${error?.message ?? error}`);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Cek Google Play Services di emulator/perangkat Android
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
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Perhatian", "Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      await saveSession(result.user);
      router.replace("/home");
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tugas Login AsyncStorage & Firebase</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.buttonPrimary, loading && { opacity: 0.6 }]}
        onPress={handleEmailLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>LOGIN EMAIL & PASSWORD</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.buttonGoogle, loading && { opacity: 0.6 }]}
        onPress={handleGoogleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>LOGIN DENGAN GOOGLE</Text>
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
    marginBottom: 12,
  },
  buttonGoogle: {
    backgroundColor: "#DB4437",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
