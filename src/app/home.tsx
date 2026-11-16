import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import { EmailAuthProvider, linkWithCredential, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore/lite";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";

interface Mahasiswa {
  id: string;
  Nama: string;
  NIM: string;
}

const notify = (title: string, message: string) => {
  if (Platform.OS === "web") window.alert(`${title}\n${message}`);
  else Alert.alert(title, message);
};

const PROVIDER_LABEL: Record<string, string> = {
  "google.com": "Google",
  password: "Email/Password",
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
};

export default function HomeScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [role, setRole] = useState("Memuat...");
  const [providers, setProviders] = useState<string[]>(
    user?.providerData.map((p) => p.providerId) ?? [],
  );
  const [newPassword, setNewPassword] = useState("");

  // Role dicari berdasarkan UID, bukan berdasarkan metode login
  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const r = snap.exists() ? (snap.data().role as string) : null;
        setRole(r ? (ROLE_LABEL[r] ?? r) : "Belum ada role");
      } catch (e: any) {
        console.log("ROLE ERROR:", e?.code, e?.message);
        setRole(`Gagal membaca role (${e?.code ?? "error"})`);
      }
    };
    fetchRole();
  }, [user?.uid]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, "mahasiswa"));
        setMahasiswaList(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Mahasiswa),
        );
      } catch (e: any) {
        console.log("FIRESTORE ERROR:", e?.code, e?.message);
        setListError(`${e?.code ?? "error"}`);
      }
    };
    fetchData();
  }, []);

  // Menambahkan provider Email/Password ke akun Google yang sedang login
  const handleSetPassword = async () => {
    const u = auth.currentUser;
    if (!u?.email) return;
    if (newPassword.length < 6) {
      notify("Perhatian", "Password minimal 6 karakter.");
      return;
    }
    try {
      await linkWithCredential(
        u,
        EmailAuthProvider.credential(u.email, newPassword),
      );
      setProviders(u.providerData.map((p) => p.providerId));
      setNewPassword("");
      notify("Berhasil", "Password ditambahkan ke akun ini.");
    } catch (e: any) {
      console.log("LINK ERROR:", e?.code, e?.message);
      notify("Gagal", `${e?.code ?? ""}\n${e?.message ?? e}`);
    }
  };

  const handleLogout = async () => {
    // Lepas akun Google yang tersimpan di perangkat agar pilihan akun muncul lagi
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      console.log("GOOGLE SIGNOUT ERROR:", e);
    }
    await signOut(auth);
    await AsyncStorage.multiRemove(["userToken", "tokenExpiry", "userData"]);
    router.replace("/");
  };

  const hasPassword = providers.includes("password");

  const header = (
    <View>
      <Text style={styles.header}>Info Akun</Text>
      <View style={styles.panel}>
        <Text style={styles.row}>Email: {user?.email}</Text>
        <Text style={styles.row}>UID: {user?.uid}</Text>
        <Text style={styles.row}>
          Provider: {providers.map((p) => PROVIDER_LABEL[p] ?? p).join(", ")}
        </Text>
        <Text style={[styles.row, styles.role]}>Role: {role}</Text>
      </View>

      {!hasPassword && (
        <View style={styles.panel}>
          <Text style={styles.row}>Set password untuk akun ini:</Text>
          <TextInput
            style={styles.input}
            placeholder="Password baru (min. 6 karakter)"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity style={styles.linkButton} onPress={handleSetPassword}>
            <Text style={styles.logoutText}>TAMBAHKAN PASSWORD</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.header}>Daftar Mahasiswa</Text>
      {listError && (
        <Text style={styles.errorText}>Gagal memuat data: {listError}</Text>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: Mahasiswa }) => (
    <View style={styles.card}>
      <Text style={styles.nameText}>{item.Nama}</Text>
      <Text style={styles.nimText}>NIM: {item.NIM}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={mahasiswaList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
  listError ? undefined : (
    <Text style={{ textAlign: "center" }}>Belum ada data.</Text>
  )
}
      />
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>LOGOUT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 14,
    textAlign: "center",
  },
  panel: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#eef6ff",
    marginBottom: 12,
  },
  row: { fontSize: 14, marginBottom: 4 },
  role: { fontWeight: "bold", fontSize: 16 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 5,
    marginVertical: 8,
  },
  card: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
  },
  nameText: { fontSize: 18, fontWeight: "bold" },
  nimText: { fontSize: 14, color: "#666", marginTop: 5 },
  errorText: { color: "#c00", textAlign: "center", marginBottom: 10 },
  linkButton: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
  },
  logoutButton: {
    backgroundColor: "#ff3b30",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 12,
  },
  logoutText: { color: "#fff", fontWeight: "bold" },
});