
/* ---------- 0. HELPER ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const bacaLokal = (kunci, awal) => {
  try { return JSON.parse(localStorage.getItem(kunci)) ?? awal; } catch { return awal; }
};
const simpanLokal = (kunci, nilai) => {
  try { localStorage.setItem(kunci, JSON.stringify(nilai)); return true; } catch { return false; }
};

/* ---------- 1. VIDEO (dialog pemutar) ---------- */
function pasangVideo() {
  const dialog = $("#videoDialog");
  if (!dialog) return;
  const video = $("video", dialog);

  $$(".video-card[data-full]").forEach(card => {
    card.addEventListener("click", () => {
      video.src = card.dataset.full;
      dialog.showModal();
      video.play().catch(() => {});
    });
  });

  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => {          // Esc, klik luar, atau tombol tutup
    video.pause();
    video.removeAttribute("src");
    video.load();
  });
}

/* ---------- 2. FOTO (upload + galeri) ---------- */
const KEY_FOTO = "bergembira_foto";

// Perkecil foto agar muat di localStorage (batas sekitar 5 MB)
function kecilkan(file, maks = 800) {
  return new Promise((ok, gagal) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const skala = Math.min(1, maks / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * skala;
      c.height = img.height * skala;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = gagal;
    img.src = url;
  });
}

function pasangFoto() {
  const wadah = $(".foto-list");
  if (!wadah) return;

  const batas = Number(wadah.dataset.batas) || Infinity;   // index: 4, gallery: semua
  const bisaHapus = wadah.dataset.hapus === "ya";          // hanya di gallery
  const input = $("#fotoInput");
  const pesan = $("#fotoPesan");
  const fotoDialog = $("#fotoDialog");

  function tampil() {
    const semua = bacaLokal(KEY_FOTO, []);
    wadah.innerHTML = "";
    if (!semua.length) {
      const p = document.createElement("p");
      p.className = "foto-kosong";
      p.textContent = "Belum ada foto. Jadilah yang pertama upload!";
      wadah.append(p);
      return;
    }
    semua.slice(0, batas).forEach(f => {
      // createElement + textContent (bukan innerHTML) agar isi dari pengguna tidak dieksekusi sebagai HTML
      const card = document.createElement("figure");
      card.className = "foto-card";
      const img = document.createElement("img");
      img.src = f.src;
      img.alt = "Foto pengunjung Bergembira";
      img.loading = "lazy";
      img.addEventListener("click", () => {
        $("img", fotoDialog).src = f.src;
        fotoDialog.showModal();
      });
      card.append(img);

      if (bisaHapus) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "hapus";
        b.textContent = "✕";
        b.setAttribute("aria-label", "Hapus foto");
        b.addEventListener("click", () => {
          simpanLokal(KEY_FOTO, bacaLokal(KEY_FOTO, []).filter(x => x.waktu !== f.waktu));
          tampil();
        });
        card.append(b);
      }
      wadah.append(card);
    });
  }

  $("#tombolUpload").addEventListener("click", () => input.click());

  input.addEventListener("change", async () => {
    const files = [...input.files].filter(f => f.type.startsWith("image/"));
    pesan.className = "pesan err";
    if (!files.length) { pesan.textContent = "Pilih file gambar saja."; return; }
    try {
      const baru = [];
      for (const [i, f] of files.entries()) baru.push({ src: await kecilkan(f), waktu: Date.now() + i });
      if (!simpanLokal(KEY_FOTO, [...baru, ...bacaLokal(KEY_FOTO, [])])) {
        pesan.textContent = "Penyimpanan browser penuh. Hapus beberapa foto dulu.";
      } else {
        pesan.className = "pesan";
        pesan.textContent = `${baru.length} foto ditambahkan.`;
        tampil();
      }
    } catch {
      pesan.textContent = "Salah satu file tidak bisa dibaca sebagai gambar.";
    }
    input.value = "";
  });

  fotoDialog.addEventListener("click", () => fotoDialog.close());
  tampil();
}

/* ---------- 3. SHOP (produk + keranjang) ---------- */
const PRODUK = [
  { id: "kaos",    nama: "Kaos Bergembira", harga: 150000, gambar: "assets/kaosbergembira.png", warna: "#ffb3cf" },
  { id: "topi",    nama: "Topi Festival",   harga: 95000,  gambar: "assets/topibergembira.png", warna: "#ffe066" },
  { id: "totebag", nama: "Tote Bag",        harga: 75000,  gambar: "assets/totebagbergembira.png", warna: "#a8e6cf" },
  { id: "stiker",  nama: "Paket Stiker",    harga: 5000,  gambar: "assets/stikerbergembira.png", warna: "#c3b8ff" },
];
const KEY_KERANJANG = "bergembira_keranjang";
const rupiah = n => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0
}).format(n);

function pasangShop() {
  const daftar = $("#produkList");
  if (!daftar) return;

  let keranjang = bacaLokal(KEY_KERANJANG, {});            // { idProduk: jumlah }
  const dlg = $("#keranjangDialog");
  const itemEl = $("#itemKeranjang");
  const coPesan = $("#coPesan");

  // data produk berasal dari array di atas (bukan input pengguna), jadi aman memakai innerHTML
  daftar.innerHTML = PRODUK.map(p => `
    <article class="produk">
      <div class="produk-gambar" style="--warna:${p.warna}">
        <img src="${p.gambar}" alt="${p.nama}">
      </div>
      <div class="produk-isi">
        <h3>${p.nama}</h3>
        <p class="harga">${rupiah(p.harga)}</p>
        <button type="button" class="tombol" data-tambah="${p.id}">Tambah ke keranjang</button>
      </div>
    </article>`).join("");

  function render() {
    const ids = Object.keys(keranjang).filter(id => keranjang[id] > 0);
    let total = 0, jumlah = 0;
    itemEl.innerHTML = ids.length ? ids.map(id => {
      const p = PRODUK.find(x => x.id === id);
      const q = keranjang[id];
      total += p.harga * q;
      jumlah += q;
      return `<li>
        <span><strong>${p.nama}</strong><br>${rupiah(p.harga * q)}</span>
        <span class="qty">
          <button type="button" data-kurang="${id}" aria-label="Kurangi">−</button>${q}
          <button type="button" data-plus="${id}" aria-label="Tambah">+</button>
        </span></li>`;
    }).join("") : "<li>Keranjang masih kosong.</li>";
    $("#totalHarga").textContent = rupiah(total);
    $("#jumlahKeranjang").textContent = jumlah;
    simpanLokal(KEY_KERANJANG, keranjang);
  }

  const ubah = (id, selisih) => {
    keranjang[id] = Math.max(0, (keranjang[id] || 0) + selisih);
    render();
  };

  daftar.addEventListener("click", e => { if (e.target.dataset.tambah) ubah(e.target.dataset.tambah, 1); });
  itemEl.addEventListener("click", e => {
    if (e.target.dataset.plus)   ubah(e.target.dataset.plus, 1);
    if (e.target.dataset.kurang) ubah(e.target.dataset.kurang, -1);
  });

  $("#bukaKeranjang").addEventListener("click", () => { coPesan.textContent = ""; dlg.showModal(); });
  $("#tutupKeranjang").addEventListener("click", () => dlg.close());

  $("#formCheckout").addEventListener("submit", e => {
    e.preventDefault();
    const nama = $("#coNama").value.trim();
    const alamat = $("#coAlamat").value.trim();
    coPesan.className = "pesan err";
    if (!Object.values(keranjang).some(q => q > 0)) { coPesan.textContent = "Keranjang masih kosong."; return; }
    if (nama.length < 3)    { coPesan.textContent = "Nama minimal 3 karakter."; return; }
    if (alamat.length < 10) { coPesan.textContent = "Alamat minimal 10 karakter."; return; }

    keranjang = {};
    render();
    e.target.reset();
    coPesan.className = "pesan";
    coPesan.textContent = `Terima kasih, ${nama}! Pesananmu tercatat (simulasi, tanpa pembayaran nyata).`;
  });

  render();
}

/* 4. MARQUEE (teks berjalan) */
function pasangMarquee() {
  const elemen = $$(".berjalan p");
  if (!elemen.length || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const marquee = elemen.map((el, i) => ({
    el,
    asli: el.textContent.trim(),
    arah: i % 2 ? 1 : -1,          
    lebar: 0,
    x: 0
  }));

  
  function siapkan(m) {
    const unit = m.asli + "  ✿  ";
    let paruh = unit;
    m.el.textContent = paruh;
    while (m.el.scrollWidth < innerWidth) { paruh += unit; m.el.textContent = paruh; }
    m.el.textContent = paruh + paruh;
    m.lebar = m.el.scrollWidth / 2;
    m.x = m.arah > 0 ? -m.lebar : 0;
  }
  marquee.forEach(siapkan);

  let yTerakhir = scrollY, dorongan = 0, timer;
  addEventListener("scroll", () => {
    dorongan = Math.min(Math.abs(scrollY - yTerakhir), 60);
    yTerakhir = scrollY;
  }, { passive: true });
  addEventListener("resize", () => {              
    clearTimeout(timer);
    timer = setTimeout(() => marquee.forEach(siapkan), 200);
  });

  function jalan() {
    dorongan *= 0.92;                              
    const kecepatan = 0.6 + dorongan * 0.3;        
    marquee.forEach(m => {
      m.x += m.arah * kecepatan;
      if (m.arah < 0 && m.x <= -m.lebar) m.x += m.lebar;
      if (m.arah > 0 && m.x >= 0)        m.x -= m.lebar;
      m.el.style.transform = `translateX(${m.x}px)`;
    });
    requestAnimationFrame(jalan);
  }
  jalan();
}


pasangVideo();
pasangFoto();
pasangShop();
pasangMarquee();
