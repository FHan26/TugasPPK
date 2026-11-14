import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore/lite";
import { useEffect, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../config/firebase";

interface Mahasiswa {
   id: string;
   Nama: string;
   NIM: string;
}

export default function HomeScreen() {
  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);
  const router = useRouter();

  // Mengambil data dari Tabel Firestore Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "mahasiswa"));
        const data: Mahasiswa[] = [];
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Mahasiswa);
        });
        setMahasiswaList(data);
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("userData");
    router.replace("/");
  };

  const renderItem = ({ item }: { item: Mahasiswa }) => (
  <View style={styles.card}>
    <Text style={styles.nameText}>{item.Nama}</Text>
    <Text style={styles.nimText}>NIM: {item.NIM}</Text>
  </View>
);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Daftar Mahasiswa</Text>

      <FlatList
        data={mahasiswaList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={{ textAlign: "center" }}>Memuat data...</Text>
        }
      />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>LOGOUT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  card: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
  },
  nameText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  nimText: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  logoutButton: {
    backgroundColor: "#ff3b30",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
