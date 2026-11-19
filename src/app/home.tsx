import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import { EmailAuthProvider, linkWithCredential, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore/lite";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from "../config/firebase";

// ---- Warna (mengikuti desain Figma) ----
const C = {
  primary: "#4F46E5",
  primaryLight: "#EEF2FF",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  success: "#16A34A",
  chipGray: "#E2E8F0",
  roleBg: "#EDE9FE",
  roleText: "#6D28D9",
};

const AVATARS = [
  { bg: "#E0E7FF", fg: "#4F46E5" },
  { bg: "#DCFCE7", fg: "#16A34A" },
  { bg: "#FEE2E2", fg: "#DC2626" },
  { bg: "#FEF3C7", fg: "#D97706" },
  { bg: "#E0F2FE", fg: "#0284C7" },
];

const ROLE_LABEL: Record<string, string> = { super_admin: "Super Admin" };

interface Mahasiswa {
  id: string;
  Nama: string;
  NIM: string;
  Jurusan?: string;
}

const initials = (text?: string | null) => {
  const parts = (text ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] ?? "";
  const second = parts[1]?.[0] ?? parts[0][1] ?? "";
  return (first + second).toUpperCase();
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;

  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [providers, setProviders] = useState<string[]>(
    user?.providerData.map((p) => p.providerId) ?? [],
  );
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Daftar mahasiswa
  const fetchData = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const snap = await getDocs(collection(db, "mahasiswa"));
      setMahasiswaList(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Mahasiswa),
      );
    } catch (e: any) {
      console.log("FIRESTORE ERROR:", e?.code, e?.message);
      setListError(e?.code ?? "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Role dicari berdasarkan UID, bukan berdasarkan metode login
  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        setRole(snap.exists() ? ((snap.data().role as string) ?? null) : null);
      } catch (e: any) {
        console.log("ROLE ERROR:", e?.code, e?.message);
        setRole(null);
      } finally {
        setRoleLoading(false);
      }
    };
    fetchRole();
  }, [user?.uid]);

  // Menambahkan provider Email/Password ke akun yang sedang login
  const handleSetPassword = async () => {
    const u = auth.currentUser;
    setPwMsg(null);
    if (!u?.email) return;
    if (newPassword.length < 6) {
      setPwMsg({ ok: false, text: "Password minimal 6 karakter" });
      return;
    }
    setPwLoading(true);
    try {
      await linkWithCredential(
        u,
        EmailAuthProvider.credential(u.email, newPassword),
      );
      setProviders(u.providerData.map((p) => p.providerId));
      setNewPassword("");
      setPwMsg({ ok: true, text: "Password berhasil ditambahkan" });
    } catch (e: any) {
      console.log("LINK ERROR:", e?.code, e?.message);
      const text =
        e?.code === "auth/provider-already-linked"
          ? "Password sudah pernah ditambahkan"
          : e?.code === "auth/requires-recent-login"
            ? "Sesi terlalu lama. Logout lalu login ulang"
            : e?.code === "auth/weak-password"
              ? "Password terlalu lemah"
              : (e?.message ?? "Gagal menambahkan password");
      setPwMsg({ ok: false, text });
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = async () => {
    // Lepas akun Google yang tersimpan agar pilihan akun muncul lagi
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      console.log("GOOGLE SIGNOUT ERROR:", e);
    }
    await signOut(auth);
    await AsyncStorage.multiRemove(["userToken", "tokenExpiry", "userData"]);
    router.replace("/");
  };

  const hasGoogle = providers.includes("google.com");
  const hasPassword = providers.includes("password");

  // ---- Komponen kecil ----
  const Chip = ({ ok, label }: { ok: boolean; label: string }) => (
    <View style={[styles.chip, ok ? styles.chipOk : styles.chipOff]}>
      <Ionicons
        name={ok ? "checkmark" : "lock-closed-outline"}
        size={13}
        color={ok ? C.success : C.muted}
      />
      <Text style={[styles.chipText, !ok && { color: C.muted }]}>{label}</Text>
    </View>
  );

  const header = (
    <View>
      {/* App bar */}
      <View style={styles.appBar}>
        <Text style={styles.appTitle}>Data Mahasiswa</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* Info Akun */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Info Akun</Text>
        <View style={[styles.row, { marginTop: 12 }]}>
          <View style={[styles.avatar, { backgroundColor: "#DDD6FE" }]}>
            <Text style={[styles.avatarText, { color: C.primary }]}>
              {initials(user?.displayName ?? user?.email?.split("@")[0])}
            </Text>
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.email} numberOfLines={1}>
              {user?.email}
            </Text>
            <Text style={styles.subText}>Akun terhubung</Text>
          </View>
        </View>

        <Text style={styles.uid}>UID: {user?.uid}</Text>

        <View style={styles.chipRow}>
          <Chip ok={hasGoogle} label={hasGoogle ? "Google" : "Google · belum terhubung"} />
          <Chip
            ok={hasPassword}
            label={hasPassword ? "Email/Password" : "Email/Password · belum aktif"}
          />
        </View>

        <View style={styles.roleBadge}>
          <MaterialCommunityIcons name="crown-outline" size={14} color={C.roleText} />
          <Text style={styles.roleText}>
            {roleLoading
              ? "Memuat role..."
              : role
                ? (ROLE_LABEL[role] ?? role)
                : "Belum ada role"}
          </Text>
        </View>
      </View>

      {/* Set Password (hanya jika belum punya password) */}
      {!hasPassword && (
        <View style={styles.pwCard}>
          <Text style={styles.cardTitle}>Set Password</Text>
          <Text style={styles.subText}>
            Aktifkan login dengan email & password.
          </Text>

          <View style={styles.inputBox}>
            <Ionicons name="lock-closed-outline" size={20} color={C.muted} />
            <TextInput
              style={styles.input}
              placeholder="Password baru"
              placeholderTextColor={C.muted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!pwLoading}
            />
            <TouchableOpacity onPress={() => setShowPassword((s) => !s)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={C.muted}
              />
            </TouchableOpacity>
          </View>

          {pwMsg && (
            <Text
              style={{
                color: pwMsg.ok ? C.success : C.danger,
                fontSize: 13,
                marginBottom: 10,
              }}
            >
              {pwMsg.text}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, pwLoading && { opacity: 0.7 }]}
            onPress={handleSetPassword}
            disabled={pwLoading}
            activeOpacity={0.85}
          >
            {pwLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryText}>TAMBAHKAN PASSWORD</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Judul daftar */}
      <View style={[styles.row, { marginTop: 8, marginBottom: 12 }]}>
        <Text style={styles.sectionTitle}>Daftar Mahasiswa</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {loading || listError ? "–" : mahasiswaList.length}
          </Text>
        </View>
      </View>
    </View>
  );

  const Skeleton = () => (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: C.chipGray }]} />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <View style={[styles.skelLine, { width: "55%" }]} />
        <View style={[styles.skelLine, { width: "35%", marginTop: 8 }]} />
      </View>
    </View>
  );

  // Selalu berupa elemen (bukan null) agar tipe ListEmptyComponent aman
  const emptyView = loading ? (
    <View>
      <View style={[styles.row, { marginBottom: 12 }]}>
        <ActivityIndicator size="small" color={C.primary} />
        <Text style={[styles.subText, { marginLeft: 10 }]}>
          Memuat data mahasiswa...
        </Text>
      </View>
      <Skeleton />
      <Skeleton />
    </View>
  ) : listError ? (
    <View style={styles.errorCard}>
      <View style={styles.errorIcon}>
        <Ionicons name="cloud-offline-outline" size={22} color={C.danger} />
      </View>
      <Text style={styles.errorTitle}>Gagal memuat data</Text>
      <Text style={[styles.subText, { textAlign: "center", marginTop: 6 }]}>
        {listError === "permission-denied"
          ? "Akses ditolak. Periksa Firestore Rules."
          : "Periksa koneksi internet Anda, lalu coba lagi."}
      </Text>
      <TouchableOpacity
        style={[styles.primaryButton, styles.retryButton]}
        onPress={fetchData}
        activeOpacity={0.85}
      >
        <Ionicons name="refresh" size={16} color="#fff" />
        <Text style={[styles.primaryText, { marginLeft: 8 }]}>COBA LAGI</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <Text style={[styles.subText, { textAlign: "center", marginTop: 16 }]}>
      Belum ada data.
    </Text>
  );

  const renderItem = ({ item, index }: { item: Mahasiswa; index: number }) => {
    const color = AVATARS[index % AVATARS.length];
    return (
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: color.bg }]}>
          <Text style={[styles.avatarText, { color: color.fg }]}>
            {initials(item.Nama)}
          </Text>
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.name}>{item.Nama}</Text>
          <Text style={styles.subText}>NIM {item.NIM}</Text>
          {!!item.Jurusan && <Text style={styles.subText}>{item.Jurusan}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.muted} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={loading || listError ? [] : mahasiswaList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={emptyView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 24,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  row: { flexDirection: "row", alignItems: "center" },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  appTitle: { fontSize: 26, fontWeight: "700", color: C.text },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    backgroundColor: C.primaryLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  pwCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "700", fontSize: 14 },
  email: { fontSize: 15, fontWeight: "700", color: C.text },
  subText: { fontSize: 13, color: C.muted },
  uid: {
    marginTop: 12,
    fontSize: 11,
    color: C.muted,
    fontFamily: "monospace",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipOk: { backgroundColor: "#fff", borderWidth: 1, borderColor: C.border },
  chipOff: { backgroundColor: C.chipGray },
  chipText: { marginLeft: 5, fontSize: 12, color: C.text },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: C.roleBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
  },
  roleText: { marginLeft: 5, fontSize: 12, fontWeight: "700", color: C.roleText },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    marginVertical: 12,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 14, color: C.text },
  primaryButton: {
    backgroundColor: C.primary,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  countBadge: {
    marginLeft: 10,
    minWidth: 26,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countText: { fontSize: 12, fontWeight: "700", color: C.primary },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 12,
  },
  name: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 2 },
  skelLine: { height: 10, borderRadius: 5, backgroundColor: C.chipGray },
  errorCard: {
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
  },
  errorIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.dangerBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  errorTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  retryButton: {
    flexDirection: "row",
    paddingHorizontal: 28,
    marginTop: 16,
  },
});