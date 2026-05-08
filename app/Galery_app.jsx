import { useState, useEffect, useRef } from "react";

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

const storage = window.storage || {
  async get(key) {
    const value = window.localStorage.getItem(key);
    return value == null ? undefined : { value };
  },
  async set(key, value) {
    window.localStorage.setItem(key, value);
  },
};

const s = {
  app: {
    position: "relative",
    height: "700px",
    width: "100%",
    maxWidth: "400px",
    margin: "0 auto",
    background: C.bg,
    borderRadius: "24px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
    color: C.text,
    border: `1px solid ${C.border}`,
  },
  scroll: { flex: 1, overflowY: "auto", overflowX: "hidden" },
  grid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "2px" },
  cell: { aspectRatio: "1", overflow: "hidden", cursor: "pointer", position: "relative", background: C.surface2 },
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  nav: { display: "flex", background: C.surface, borderTop: `1px solid ${C.border}`, padding: "8px 0 16px" },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", border: "none", background: "transparent", cursor: "pointer", padding: "4px 0", fontSize: "10px", fontWeight: "600" },
  abs: (z = 10) => ({ position: "absolute", inset: 0, zIndex: z }),
  iconBtn: (bg = "rgba(255,255,255,0.18)", size = 36) => ({
    background: bg, border: "none", borderRadius: "50%",
    width: size, height: size, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  }),
};

function PhotoGrid({ photos, onOpen, emptyMsg, emptyIcon = "ti-photo" }) {
  if (!photos.length)
    return (
      <div style={{ textAlign: "center", padding: "70px 24px", color: C.muted }}>
        <i className={`ti ${emptyIcon}`} style={{ fontSize: "52px", display: "block", marginBottom: "14px", color: "#D5CBC4" }} />
        <p style={{ fontSize: "15px", color: C.muted, margin: 0 }}>{emptyMsg}</p>
      </div>
    );
  return (
    <div style={s.grid}>
      {photos.map((photo, i) => (
        <div key={photo.id} style={s.cell} onClick={() => onOpen(i)}>
          <img src={photo.src} alt={photo.name} style={s.img} />
          {photo.favorite && (
            <div style={{ position: "absolute", bottom: 5, right: 5 }}>
              <i className="ti ti-heart" style={{ fontSize: 13, color: "#FF6060", background: "rgba(255,255,255,0.85)", borderRadius: "50%", padding: "2px" }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function GaleriKu() {
  const [photos, setPhotos] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [tab, setTab] = useState("library");
  const [viewer, setViewer] = useState(null);
  const [albumView, setAlbumView] = useState(null);
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [addToAlbumFor, setAddToAlbumFor] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const fileRef = useRef();

  useEffect(() => {
    (async () => {
      try { const r = await storage.get(PHOTOS_KEY); if (r) setPhotos(JSON.parse(r.value)); } catch {}
      try { const r = await storage.get(ALBUMS_KEY); if (r) setAlbums(JSON.parse(r.value)); } catch {}
      setLoading(false);
    })();
  }, []);

  const savePhotos = (arr) => { setPhotos(arr); storage.set(PHOTOS_KEY, JSON.stringify(arr)).catch(() => {}); };
  const saveAlbums = (arr) => { setAlbums(arr); storage.set(ALBUMS_KEY, JSON.stringify(arr)).catch(() => {}); };

  const handleUpload = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const photo = { id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, src: ev.target.result, name: file.name.replace(/\.[^.]+$/, ""), date: new Date().toISOString(), favorite: false };
        setPhotos(prev => { const u = [photo, ...prev]; window.storage.set(PHOTOS_KEY, JSON.stringify(u)).catch(() => {}); return u; });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const toggleFav = (id) => {
    const u = photos.map(p => p.id === id ? { ...p, favorite: !p.favorite } : p);
    savePhotos(u);
    if (viewer) setViewer(v => ({ ...v, list: u.filter(p => v.list.some(vp => vp.id === p.id)) }));
  };

  const deletePhoto = (id) => {
    const u = photos.filter(p => p.id !== id);
    savePhotos(u);
    saveAlbums(albums.map(a => ({ ...a, photoIds: a.photoIds.filter(x => x !== id) })));
    if (viewer) {
      const newList = viewer.list.filter(p => p.id !== id);
      if (!newList.length) setViewer(null);
      else setViewer({ list: newList, idx: Math.min(viewer.idx, newList.length - 1) });
    }
    if (albumView) setAlbumView(a => ({ ...a, photoIds: a.photoIds.filter(x => x !== id) }));
  };

  const createAlbum = () => {
    if (!newAlbumName.trim()) return;
    saveAlbums([...albums, { id: `al_${Date.now()}`, name: newAlbumName.trim(), photoIds: [], createdAt: new Date().toISOString() }]);
    setNewAlbumName(""); setShowNewAlbum(false);
  };

  const addToAlbum = (photoId, albumId) => {
    saveAlbums(albums.map(a => a.id !== albumId || a.photoIds.includes(photoId) ? a : { ...a, photoIds: [...a.photoIds, photoId] }));
    setAddToAlbumFor(null);
  };

  const deleteAlbum = (id) => { saveAlbums(albums.filter(a => a.id !== id)); if (albumView?.id === id) setAlbumView(null); };

  const groupByDate = (arr) => {
    const map = new Map();
    arr.forEach(p => {
      const k = new Date(p.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(p);
    });
    return [...map.entries()];
  };

  const favPhotos = photos.filter(p => p.favorite);
  const searched = search ? photos.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : photos;

  const openViewer = (list, idx) => setViewer({ list, idx });

  const navTabs = [
    { id: "library", icon: "ti-photo", label: "Library" },
    { id: "albums", icon: "ti-layout-grid", label: "Albums" },
    { id: "search", icon: "ti-search", label: "Cari" },
  ];

  const NavBar = ({ onTabChange }) => (
    <div style={s.nav}>
      {navTabs.map(({ id, icon, label }) => (
        <button key={id} style={{ ...s.navBtn, color: tab === id ? C.accent : C.muted }} onClick={() => { onTabChange?.(id); setTab(id); }}>
          <i className={`ti ${icon}`} style={{ fontSize: 22 }} />
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div style={s.app}>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleUpload} />

      {/* ── MAIN HEADER ── */}
      {!albumView && (
        <div style={{ padding: "20px 20px 10px", background: C.bg, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", color: C.text }}>
                {tab === "library" ? "Library" : tab === "albums" ? "Albums" : "Cari Foto"}
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>
                {tab === "library" ? `${photos.length} foto` : tab === "albums" ? `${albums.length} album` : `${searched.length} hasil`}
              </p>
            </div>
            {tab !== "search" && (
              <button onClick={() => tab === "albums" ? setShowNewAlbum(true) : fileRef.current.click()}
                aria-label={tab === "albums" ? "Tambah album baru" : "Tambah foto"}
                style={{ background: C.accent, border: "none", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 24, lineHeight: 1, color: "#FFF", fontWeight: 700 }}>+</span>
              </button>
            )}
          </div>
          {tab === "search" && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", background: C.surface2, borderRadius: 12, padding: "10px 14px", gap: 8 }}>
              <i className="ti ti-search" style={{ fontSize: 15, color: C.muted }} />
              <input type="text" placeholder="Cari nama foto..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 15, color: C.text }} />
              {search && <button onClick={() => setSearch("")} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.muted, display: "flex" }}><i className="ti ti-x" style={{ fontSize: 14 }} /></button>}
            </div>
          )}
        </div>
      )}

      {/* ── ALBUM VIEW HEADER ── */}
      {albumView && (
        <div style={{ padding: "16px 20px 10px", background: C.bg, borderBottom: `1px solid ${C.border}` }}>
          <button onClick={() => setAlbumView(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.accent, display: "flex", alignItems: "center", gap: 4, padding: 0, fontSize: 15, fontWeight: 500, marginBottom: 8 }}>
            <i className="ti ti-chevron-left" style={{ fontSize: 18 }} /> Albums
          </button>
          <h2 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 700 }}>{albumView.name}</h2>
          <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{albumView.photoIds.filter(id => photos.find(p => p.id === id)).length} foto</p>
        </div>
      )}

      {/* ── SCROLL AREA ── */}
      <div style={s.scroll}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
            <i className="ti ti-refresh" style={{ fontSize: 32, display: "block", marginBottom: 12 }} />Memuat...
          </div>
        ) : albumView ? (
          /* ALBUM CONTENT */
          (() => {
            const ap = albumView.photoIds.map(id => photos.find(p => p.id === id)).filter(Boolean);
            return <PhotoGrid photos={ap} onOpen={i => openViewer(ap, i)} emptyMsg="Album ini masih kosong. Buka foto dan tambahkan ke album ini." />;
          })()
        ) : tab === "library" ? (
          /* LIBRARY */
          photos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 28px", color: C.muted }}>
              <i className="ti ti-camera" style={{ fontSize: 60, display: "block", marginBottom: 18, color: "#D9D0C8" }} />
              <p style={{ fontSize: 17, fontWeight: 600, color: C.text, margin: "0 0 8px" }}>Galeri Kosong</p>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>Tekan <strong>+</strong> untuk menambah foto pertamamu</p>
            </div>
          ) : (
            groupByDate(photos).map(([date, group]) => (
              <div key={date}>
                <div style={{ padding: "14px 16px 6px", fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.3px" }}>{date}</div>
                <div style={s.grid}>
                  {group.map((photo) => (
                    <div key={photo.id} style={s.cell} onClick={() => openViewer(photos, photos.findIndex(p => p.id === photo.id))}>
                      <img src={photo.src} alt={photo.name} style={s.img} />
                      {photo.favorite && <div style={{ position: "absolute", bottom: 5, right: 5 }}><i className="ti ti-heart" style={{ fontSize: 13, color: C.red, background: "rgba(255,255,255,0.88)", borderRadius: "50%", padding: "2px 2px 0" }} /></div>}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )
        ) : tab === "albums" ? (
          /* ALBUMS */
          <div style={{ padding: 16 }}>
            <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px" }}>Koleksi Sistem</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Semua Foto", icon: "ti-photo", count: photos.length, ids: photos.map(p => p.id) },
                { label: "Favorit", icon: "ti-heart", count: favPhotos.length, ids: favPhotos.map(p => p.id) },
              ].map(({ label, icon, count, ids }) => (
                <div key={label} onClick={() => setAlbumView({ id: `_sys_${label}`, name: label, photoIds: ids })}
                  style={{ background: C.surface, borderRadius: 14, overflow: "hidden", cursor: "pointer", border: `1px solid ${C.border}` }}>
                  <div style={{ height: 90, background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className={`ti ${icon}`} style={{ fontSize: 34, color: C.accent }} />
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>{count} foto</p>
                  </div>
                </div>
              ))}
            </div>

            <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px" }}>Album Saya</p>
            {albums.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 20px", color: C.muted }}>
                <p style={{ fontSize: 14, margin: 0 }}>Tekan + untuk membuat album baru</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {albums.map(album => {
                  const cover = photos.find(p => p.id === album.photoIds[0]);
                  return (
                    <div key={album.id} style={{ background: C.surface, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}` }}>
                      <div onClick={() => setAlbumView(album)} style={{ height: 90, background: C.surface2, overflow: "hidden", cursor: "pointer" }}>
                        {cover ? <img src={cover.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                            <i className="ti ti-layout-grid" style={{ fontSize: 30, color: "#C8BEB7" }} />
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div onClick={() => setAlbumView(album)} style={{ cursor: "pointer", flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{album.name}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>{album.photoIds.length} foto</p>
                        </div>
                        <button onClick={() => deleteAlbum(album.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.muted, padding: "4px", display: "flex" }}>
                          <i className="ti ti-trash" style={{ fontSize: 15 }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* SEARCH */
          <PhotoGrid photos={searched} onOpen={i => openViewer(searched, i)} emptyMsg={search ? `Tidak ada foto untuk "${search}"` : "Ketik nama foto untuk mulai mencari"} emptyIcon="ti-search" />
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <NavBar onTabChange={() => setAlbumView(null)} />

      {/* ══════════════════════════════════════════
          OVERLAY: PHOTO VIEWER
      ══════════════════════════════════════════ */}
      {viewer && (() => {
        const photo = viewer.list[viewer.idx];
        if (!photo) return null;
        const isFirst = viewer.idx === 0;
        const isLast = viewer.idx === viewer.list.length - 1;
        return (
          <div style={{ ...s.abs(100), background: "#1C1714", display: "flex", flexDirection: "column" }}>
            {/* Viewer top bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 8px" }}>
              <button onClick={() => setViewer(null)} style={{ ...s.iconBtn(), color: "#FFF" }}><i className="ti ti-x" style={{ fontSize: 18 }} /></button>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>{viewer.idx + 1} / {viewer.list.length}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => toggleFav(photo.id)} style={{ ...s.iconBtn(), color: photo.favorite ? C.red : "#FFF" }}>
                  <i className="ti ti-heart" style={{ fontSize: 18 }} />
                </button>
                <button onClick={() => { fileRef.current.click(); }} style={{ ...s.iconBtn(), color: "#FFF" }}>
                  <i className="ti ti-upload" style={{ fontSize: 18 }} />
                </button>
              </div>
            </div>

            {/* Image */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
              <img src={photo.src} alt={photo.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              {!isFirst && (
                <button onClick={() => setViewer(v => ({ ...v, idx: v.idx - 1 }))} style={{ ...s.iconBtn("rgba(255,255,255,0.2)"), position: "absolute", left: 12, color: "#FFF" }}>
                  <i className="ti ti-chevron-left" style={{ fontSize: 20 }} />
                </button>
              )}
              {!isLast && (
                <button onClick={() => setViewer(v => ({ ...v, idx: v.idx + 1 }))} style={{ ...s.iconBtn("rgba(255,255,255,0.2)"), position: "absolute", right: 12, color: "#FFF" }}>
                  <i className="ti ti-chevron-right" style={{ fontSize: 20 }} />
                </button>
              )}
            </div>

            {/* Viewer bottom info */}
            <div style={{ padding: "14px 20px 24px", background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
              <p style={{ margin: "0 0 3px", color: "#FFF", fontSize: 15, fontWeight: 600 }}>{photo.name}</p>
              <p style={{ margin: "0 0 12px", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                {new Date(photo.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setAddToAlbumFor(photo.id)}
                  style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", color: "#FFF", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-folder-plus" style={{ fontSize: 15 }} /> Tambah ke Album
                </button>
                <button onClick={() => deletePhoto(photo.id)}
                  style={{ background: "rgba(226,75,74,0.25)", border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", color: "#FF8080", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-trash" style={{ fontSize: 15 }} /> Hapus
                </button>
              </div>
            </div>

            {/* Add to album sheet (inside viewer) */}
            {addToAlbumFor && (
              <div style={{ ...s.abs(200), background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end" }}>
                <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", width: "100%", padding: 24, maxHeight: "60%", overflowY: "auto", boxSizing: "border-box" }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700 }}>Tambah ke Album</h3>
                  {albums.length === 0 ? (
                    <p style={{ color: C.muted, fontSize: 14 }}>Belum ada album. Buat album baru di tab Albums.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {albums.map(a => (
                        <button key={a.id} onClick={() => addToAlbum(addToAlbumFor, a.id)}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.surface2, borderRadius: 12, border: "none", cursor: "pointer", textAlign: "left" }}>
                          <i className="ti ti-folder" style={{ fontSize: 20, color: C.accent }} />
                          <span style={{ fontSize: 15, color: C.text, flex: 1 }}>{a.name}</span>
                          {a.photoIds.includes(addToAlbumFor) && <span style={{ fontSize: 12, color: C.accent }}>Sudah ada</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setAddToAlbumFor(null)} style={{ marginTop: 14, width: "100%", padding: 12, background: C.surface2, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 15, color: C.text, fontWeight: 500 }}>
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════
          MODAL: NEW ALBUM
      ══════════════════════════════════════════ */}
      {showNewAlbum && (
        <div style={{ ...s.abs(150), background: "rgba(42,36,32,0.45)", display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", width: "100%", padding: 24, boxSizing: "border-box" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Album Baru</h3>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: C.muted }}>Beri nama albummu</p>
            <input type="text" placeholder="Nama album..." value={newAlbumName} autoFocus
              onChange={e => setNewAlbumName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createAlbum()}
              style={{ width: "100%", padding: "14px 16px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 15, outline: "none", color: C.text, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => { setShowNewAlbum(false); setNewAlbumName(""); }}
                style={{ flex: 1, padding: 13, background: C.surface2, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 15, fontWeight: 500, color: C.text }}>
                Batal
              </button>
              <button onClick={createAlbum}
                style={{ flex: 1, padding: 13, background: C.accent, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 15, fontWeight: 600, color: "#FFF" }}>
                Buat Album
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}