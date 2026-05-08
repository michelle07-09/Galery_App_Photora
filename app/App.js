import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";

const PHOTOS_KEY = "galeriku_v1_photos";
const ALBUMS_KEY = "galeriku_v1_albums";

const C = {
  accent: "#C96B4E",
  accentLight: "#F0D8CF",
  bg: "#FAF8F5",
  surface: "#FFFFFF",
  surface2: "#F4F0EB",
  border: "#E8E2DB",
  text: "#2A2420",
  muted: "#968880",
  red: "#E24B4A",
};

function groupByDate(arr) {
  const map = new Map();
  arr.forEach((photo) => {
    const key = new Date(photo.date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(photo);
  });
  return [...map.entries()];
}

function PhotoGrid({ photos, onOpen, emptyMsg }) {
  if (!photos.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMsg}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={photos}
      keyExtractor={(item) => item.id}
      numColumns={3}
      columnWrapperStyle={styles.columnWrapper}
      renderItem={({ item, index }) => (
        <TouchableOpacity style={styles.cell} onPress={() => onOpen(index)}>
          <Image source={{ uri: item.src }} style={styles.cellImage} />
          {item.favorite && <View style={styles.favoriteBadge}><Text style={styles.favoriteIcon}>❤</Text></View>}
        </TouchableOpacity>
      )}
    />
  );
}

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [tab, setTab] = useState("library");
  const [viewer, setViewer] = useState(null);
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [addToAlbumPhoto, setAddToAlbumPhoto] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storedPhotos = await AsyncStorage.getItem(PHOTOS_KEY);
      const storedAlbums = await AsyncStorage.getItem(ALBUMS_KEY);
      if (storedPhotos) setPhotos(JSON.parse(storedPhotos));
      if (storedAlbums) setAlbums(JSON.parse(storedAlbums));
    } catch (error) {
      console.warn(error);
    } finally {
      setLoading(false);
    }
  };

  const savePhotos = async (nextPhotos) => {
    setPhotos(nextPhotos);
    await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(nextPhotos));
  };

  const saveAlbums = async (nextAlbums) => {
    setAlbums(nextAlbums);
    await AsyncStorage.setItem(ALBUMS_KEY, JSON.stringify(nextAlbums));
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Izin ditolak", "Aplikasi memerlukan akses galeri untuk menambah foto.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      const photo = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        src: asset.uri,
        name: asset.fileName || "Foto baru",
        date: new Date().toISOString(),
        favorite: false,
      };
      savePhotos([photo, ...photos]);
    }
  };

  const toggleFavorite = (id) => {
    const nextPhotos = photos.map((photo) =>
      photo.id === id ? { ...photo, favorite: !photo.favorite } : photo
    );
    savePhotos(nextPhotos);
    if (viewer) {
      const updated = nextPhotos.filter((photo) => viewer.list.some((item) => item.id === photo.id));
      setViewer((prev) => ({ ...prev, list: updated }));
    }
  };

  const deletePhoto = (id) => {
    const nextPhotos = photos.filter((photo) => photo.id !== id);
    savePhotos(nextPhotos);
    saveAlbums(
      albums.map((album) => ({
        ...album,
        photoIds: album.photoIds.filter((photoId) => photoId !== id),
      }))
    );
    if (viewer) {
      const updated = viewer.list.filter((photo) => photo.id !== id);
      if (!updated.length) setViewer(null);
      else setViewer({ list: updated, idx: Math.min(viewer.idx, updated.length - 1) });
    }
  };

  const createAlbum = async () => {
    if (!newAlbumName.trim()) return;
    const next = [
      ...albums,
      {
        id: `al_${Date.now()}`,
        name: newAlbumName.trim(),
        photoIds: [],
        createdAt: new Date().toISOString(),
      },
    ];
    await saveAlbums(next);
    setNewAlbumName("");
    setShowNewAlbum(false);
  };

  const addPhotoToAlbum = async (photoId, albumId) => {
    const next = albums.map((album) =>
      album.id !== albumId || album.photoIds.includes(photoId)
        ? album
        : { ...album, photoIds: [...album.photoIds, photoId] }
    );
    await saveAlbums(next);
    setAddToAlbumPhoto(null);
  };

  const deleteAlbum = async (id) => {
    await saveAlbums(albums.filter((album) => album.id !== id));
    if (viewer && viewer.albumId === id) setViewer(null);
  };

  const openViewer = (list, idx) => setViewer({ list, idx });

  const filteredPhotos = search.trim()
    ? photos.filter((photo) => photo.name.toLowerCase().includes(search.toLowerCase()))
    : photos;
  const favoritePhotos = photos.filter((photo) => photo.favorite);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            {tab === "library" ? "Library" : tab === "albums" ? "Albums" : "Cari Foto"}
          </Text>
          <Text style={styles.subtitle}>
            {tab === "library"
              ? `${photos.length} foto`
              : tab === "albums"
              ? `${albums.length} album`
              : `${filteredPhotos.length} hasil`}
          </Text>
        </View>
        {tab !== "search" && (
          <TouchableOpacity style={styles.addButton} onPress={tab === "albums" ? () => setShowNewAlbum(true) : pickImage}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {tab === "search" && (
        <View style={styles.searchBox}>
          <TextInput
            placeholder="Cari nama foto..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={C.muted}
            style={styles.searchInput}
          />
        </View>
      )}

      <ScrollView style={styles.body}>
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Memuat...</Text>
          </View>
        ) : tab === "library" ? (
          photos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Galeri Kosong</Text>
              <Text style={styles.emptyText}>Tekan + untuk menambah foto pertamamu.</Text>
            </View>
          ) : (
            groupByDate(photos).map(([date, group]) => (
              <View key={date} style={styles.groupSection}>
                <Text style={styles.groupLabel}>{date}</Text>
                <PhotoGrid photos={group} onOpen={(idx) => openViewer(photos, photos.findIndex((p) => p.id === group[idx].id))} emptyMsg="" />
              </View>
            ))
          )
        ) : tab === "albums" ? (
          <View>
            <Text style={styles.sectionTitle}>Koleksi Sistem</Text>
            <View style={styles.albumList}>
              {[
                {
                  label: "Semua Foto",
                  count: photos.length,
                  ids: photos.map((photo) => photo.id),
                },
                {
                  label: "Favorit",
                  count: favoritePhotos.length,
                  ids: favoritePhotos.map((photo) => photo.id),
                },
              ].map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.albumCard}
                  onPress={() => setViewer({ list: photos.filter((photo) => item.ids.includes(photo.id)), idx: 0 })}
                >
                  <Text style={styles.albumLabel}>{item.label}</Text>
                  <Text style={styles.albumCount}>{item.count} foto</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Album Saya</Text>
            {albums.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Tekan + untuk membuat album baru.</Text>
              </View>
            ) : (
              albums.map((album) => {
                const coverPhoto = photos.find((photo) => photo.id === album.photoIds[0]);
                return (
                  <View key={album.id} style={styles.albumCardLarge}>
                    <TouchableOpacity onPress={() => setViewer({ list: photos.filter((photo) => album.photoIds.includes(photo.id)), idx: 0 })} style={styles.albumCover}>
                      {coverPhoto ? (
                        <Image source={{ uri: coverPhoto.src }} style={styles.albumImage} />
                      ) : (
                        <View style={styles.albumPlaceholder}>
                          <Text style={styles.placeholderIcon}>📁</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={styles.albumInfoRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.albumName}>{album.name}</Text>
                        <Text style={styles.albumCount}>{album.photoIds.length} foto</Text>
                      </View>
                      <TouchableOpacity onPress={() => deleteAlbum(album.id)} style={styles.deleteButton}>
                        <Text style={styles.deleteButtonText}>Hapus</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <PhotoGrid photos={filteredPhotos} onOpen={(idx) => openViewer(filteredPhotos, idx)} emptyMsg={search ? `Tidak ada foto untuk "${search}"` : "Ketik nama foto untuk mulai mencari"} />
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        {[
          { id: "library", label: "Library" },
          { id: "albums", label: "Albums" },
          { id: "search", label: "Cari" },
        ].map((item) => (
          <TouchableOpacity key={item.id} onPress={() => setTab(item.id)} style={styles.navButton}>
            <Text style={[styles.navLabel, tab === item.id && styles.navLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={!!viewer} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setViewer(null)}>
                <Text style={styles.modalClose}>Batal</Text>
              </TouchableOpacity>
              <Text style={styles.modalCounter}>{viewer ? `${viewer.idx + 1} / ${viewer.list.length}` : ""}</Text>
              <TouchableOpacity onPress={() => toggleFavorite(viewer.list[viewer.idx].id)}>
                <Text style={[styles.modalAction, viewer?.list[viewer.idx]?.favorite ? styles.favoriteText : null]}>❤</Text>
              </TouchableOpacity>
            </View>
            {viewer && (
              <Image source={{ uri: viewer.list[viewer.idx].src }} style={styles.modalImage} resizeMode="contain" />
            )}
            <View style={styles.modalFooter}>
              <Text style={styles.modalTitle}>{viewer?.list[viewer.idx]?.name}</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalButton} onPress={() => setAddToAlbumPhoto(viewer.list[viewer.idx].id)}>
                  <Text style={styles.modalButtonText}>Tambah ke Album</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.modalDelete]} onPress={() => deletePhoto(viewer.list[viewer.idx].id)}>
                  <Text style={styles.modalDeleteText}>Hapus</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.viewerNavRow}>
                <TouchableOpacity
                  disabled={viewer?.idx === 0}
                  onPress={() => setViewer((prev) => ({ ...prev, idx: Math.max(prev.idx - 1, 0) }))}
                >
                  <Text style={styles.viewerNav}>{"<"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={viewer?.idx === viewer.list.length - 1}
                  onPress={() => setViewer((prev) => ({ ...prev, idx: Math.min(prev.idx + 1, prev.list.length - 1) }))}
                >
                  <Text style={styles.viewerNav}>{">"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showNewAlbum} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Album Baru</Text>
            <TextInput
              value={newAlbumName}
              onChangeText={setNewAlbumName}
              placeholder="Nama album..."
              style={styles.sheetInput}
            />
            <View style={styles.sheetButtons}>
              <TouchableOpacity style={styles.sheetButton} onPress={() => setShowNewAlbum(false)}>
                <Text style={styles.sheetButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetButton, styles.sheetConfirm]} onPress={createAlbum}>
                <Text style={[styles.sheetButtonText, styles.sheetConfirmText]}>Buat Album</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!addToAlbumPhoto} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Tambah ke Album</Text>
            <ScrollView style={{ width: "100%" }}>
              {albums.length === 0 ? (
                <Text style={styles.emptyText}>Belum ada album. Buat album baru di tab Albums.</Text>
              ) : (
                albums.map((album) => (
                  <TouchableOpacity key={album.id} style={styles.albumOption} onPress={() => addPhotoToAlbum(addToAlbumPhoto, album.id)}>
                    <Text style={styles.albumOptionText}>{album.name}</Text>
                    {album.photoIds.includes(addToAlbumPhoto) && <Text style={styles.albumOptionHint}>Sudah ada</Text>}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.sheetButton} onPress={() => setAddToAlbumPhoto(null)}>
              <Text style={styles.sheetButtonText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    padding: 20,
    paddingTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.bg,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: C.text,
  },
  subtitle: {
    color: C.muted,
    marginTop: 4,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 28,
    lineHeight: 28,
    fontWeight: "800",
  },
  searchBox: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 12,
  },
  searchInput: {
    color: C.text,
    fontSize: 16,
  },
  body: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    marginBottom: 8,
  },
  emptyText: {
    color: C.muted,
    fontSize: 15,
    textAlign: "center",
  },
  groupSection: {
    marginBottom: 16,
  },
  groupLabel: {
    marginHorizontal: 20,
    marginBottom: 10,
    color: C.muted,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
  },
  columnWrapper: {
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  cell: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: C.surface2,
  },
  cellImage: {
    width: "100%",
    height: "100%",
  },
  favoriteBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    padding: 4,
  },
  favoriteIcon: {
    color: C.red,
    fontSize: 12,
  },
  sectionTitle: {
    marginHorizontal: 20,
    marginBottom: 12,
    color: C.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  albumList: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  albumCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  albumLabel: {
    fontWeight: "700",
    marginBottom: 8,
  },
  albumCount: {
    color: C.muted,
    fontSize: 13,
  },
  albumCardLarge: {
    backgroundColor: C.surface,
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  albumCover: {
    height: 120,
    backgroundColor: C.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  albumImage: {
    width: "100%",
    height: "100%",
  },
  albumPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  placeholderIcon: {
    fontSize: 30,
    color: "#C8BEB7",
  },
  albumInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  albumName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteButtonText: {
    color: C.red,
    fontWeight: "700",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  navButton: {
    alignItems: "center",
  },
  navLabel: {
    color: C.muted,
    fontSize: 14,
  },
  navLabelActive: {
    color: C.accent,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: C.surface,
    borderRadius: 24,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  modalClose: {
    color: C.accent,
    fontWeight: "700",
  },
  modalCounter: {
    color: C.muted,
  },
  modalAction: {
    color: C.text,
    fontSize: 18,
  },
  favoriteText: {
    color: C.red,
  },
  modalImage: {
    width: "100%",
    height: 320,
    backgroundColor: C.surface2,
  },
  modalFooter: {
    padding: 16,
  },
  modalTitle: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: C.surface2,
    alignItems: "center",
  },
  modalButtonText: {
    color: C.text,
    fontWeight: "700",
  },
  modalDelete: {
    backgroundColor: "rgba(226,75,74,0.15)",
  },
  modalDeleteText: {
    color: C.red,
    fontWeight: "700",
  },
  viewerNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  viewerNav: {
    color: C.accent,
    fontSize: 24,
    fontWeight: "700",
    paddingHorizontal: 20,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetContent: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    width: "100%",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  sheetInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: C.surface2,
    marginBottom: 16,
  },
  sheetButtons: {
    flexDirection: "row",
    gap: 10,
  },
  sheetButton: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: C.surface2,
    alignItems: "center",
  },
  sheetButtonText: {
    color: C.text,
    fontWeight: "700",
  },
  sheetConfirm: {
    backgroundColor: C.accent,
  },
  sheetConfirmText: {
    color: "#FFF",
  },
  albumOption: {
    backgroundColor: C.surface2,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  albumOptionText: {
    fontWeight: "700",
    color: C.text,
  },
  albumOptionHint: {
    color: C.accent,
  },
});
