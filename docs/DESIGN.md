# DESIGN.md - Resto POS Multi-Channel

## Visual theme and atmosphere
Resto POS terasa "bersih, cepat, dan bisa diandalkan." Ini adalah alat kerja harian untuk kasir, pelayan, dan dapur yang sibuk — bukan brand showcase. Basis warna putih terang membuat mata tidak cepat lelah dipakai berjam-jam, dengan aksen biru sebagai warna identitas yang menandakan aksi utama dan status aktif. Terinspirasi dari aplikasi produktivitas modern (Linear, Notion, Stripe Dashboard): garis bersih, tipografi tegas, whitespace cukup lega, dan minim dekorasi yang tidak perlu. Setiap status pesanan (baru, dimasak, siap, diantar) harus bisa dikenali sekilas tanpa perlu membaca teks — warna dan ikon melakukan pekerjaan berat, terutama untuk layar Kitchen Display yang dibaca dari jarak agak jauh sambil memasak.

## Color palette and roles
| Role | Token | Value | Usage |
|---|---|---|---|
| Background utama | --bg-primary | #FFFFFF | Kanvas utama seluruh halaman |
| Background sekunder | --bg-secondary | #F5F7FA | Latar section, sidebar, area non-fokus |
| Surface/Card | --bg-surface | #FFFFFF | Kartu menu, kartu pesanan, modal |
| Border/Divider | --border-subtle | #E2E8F0 | Garis pemisah antar elemen |
| Brand primary | --accent-primary | #2563EB | Tombol utama, link, elemen aktif/terpilih |
| Brand primary hover | --accent-primary-hover | #1D4ED8 | State hover tombol primary |
| Brand tint | --accent-tint | #EFF6FF | Background lembut untuk elemen ber-highlight biru |
| Status - Baru | --status-new | #64748B | Badge pesanan baru masuk (netral, belum diproses) |
| Status - Dimasak | --status-cooking | #F59E0B | Badge pesanan sedang diproses dapur |
| Status - Siap | --status-ready | #16A34A | Badge pesanan siap saji/siap diantar |
| Status - Selesai | --status-done | #2563EB | Badge pesanan selesai dibayar/ditutup |
| Status - Bahaya/Habis | --status-danger | #DC2626 | Menu habis, meja bermasalah, pembatalan |
| Teks primer | --text-primary | #0F172A | Judul, teks konten utama |
| Teks sekunder | --text-secondary | #64748B | Label, keterangan, teks pendukung |
| Teks di atas warna solid | --text-on-accent | #FFFFFF | Teks di atas tombol/badge berwarna |

**Rasional:** putih dominan dipilih supaya UI terasa ringan dan tidak melelahkan mata staf yang menatapnya sepanjang shift kerja. Biru (`--accent-primary`) dipakai konsisten hanya untuk elemen yang butuh perhatian pengguna (tombol aksi, item terpilih) — bukan didekorasi ke seluruh halaman, supaya tetap punya "daya tarik" saat benar-benar dibutuhkan. Empat warna status (abu/kuning/hijau/biru) sengaja dipilih kontras tinggi satu sama lain agar mudah dibedakan sekilas di Kitchen Display.

## Typography rules
Font: **Inter** (UI utama), fallback ke system sans-serif.

| Level | Size | Weight | Line-height | Notes |
|---|---|---|---|---|
| Display | 32px | 700 | 1.2 | Judul halaman utama |
| Heading | 22px | 600 | 1.3 | Judul section/card |
| Subheading | 17px | 600 | 1.4 | Nama menu, nomor meja |
| Body | 15px | 400 | 1.6 | Teks konten umum |
| Caption | 13px | 400 | 1.5 | Label, keterangan kecil |
| Kitchen Display - Item Name | 24px | 600 | 1.3 | Wajib besar, dibaca dari jarak agak jauh |
| Kitchen Display - Status Badge | 16px | 700 | 1.2 | Uppercase, kontras tinggi |

## Component styles

### Button (Primary)
- Background: var(--accent-primary)
- Text: var(--text-on-accent), weight 600
- Padding: 12px 20px
- Border-radius: 8px
- Hover: var(--accent-primary-hover)
- Disabled: opacity 40%, no pointer

### Button (Secondary/Outline)
- Background: transparent
- Border: 1px solid var(--border-subtle)
- Text: var(--text-primary)
- Hover: background var(--bg-secondary)

### Order Status Badge
- Border-radius: 999px (pill shape)
- Padding: 4px 12px
- Background: warna status terkait pada 15% opacity
- Text: warna status terkait, weight 700, uppercase, letter-spacing 0.5px

### Card (Menu Item / Order Card)
- Background: var(--bg-surface)
- Border: 1px solid var(--border-subtle)
- Border-radius: 12px
- Padding: 16px
- Shadow: level 1 (lihat Depth and elevation)

### Kitchen Display - Order Ticket
- Background: var(--bg-surface)
- Border-left: 6px solid (warna sesuai status pesanan)
- Border-radius: 8px
- Padding: 20px
- Animasi masuk: fade + slide-in dari atas, 200ms

### Table Status Indicator (Peta Meja)
- Kosong: border var(--status-ready), background var(--accent-tint)
- Terisi: border var(--accent-primary), background var(--bg-secondary)
- Perlu dibersihkan: border var(--status-danger), background putih dengan pattern diagonal tipis

## Layout principles
- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px
- Max content width (Kasir/Admin): 1280px, centered
- Kitchen Display: full-width grid, tidak dibatasi max-width (memaksimalkan layar besar di dapur)
- Border-radius scale: 6px (elemen kecil, badge), 8px (tombol, ticket), 12px (card, modal)
- Grid pesanan Kitchen Display: kolom otomatis menyesuaikan lebar layar, minimal 3 kolom pada layar besar

## Depth and elevation
| Level | Usage | Shadow Value |
|---|---|---|
| 0 | Background, area datar | none |
| 1 | Card menu, card pesanan | 0 1px 3px rgba(15,23,42,0.08) |
| 2 | Dropdown, tooltip | 0 4px 12px rgba(15,23,42,0.12) |
| 3 | Modal, dialog konfirmasi | 0 12px 32px rgba(15,23,42,0.18) |

## Do's and don'ts
**Do:**
- Gunakan `--accent-primary` (biru) hanya untuk elemen interaktif utama (tombol, link, item terpilih)
- Pertahankan kontras tinggi pada semua badge status — ini bukan area untuk gradasi warna lembut
- Jaga whitespace lega di antarmuka Kasir/Pelayan agar tidak salah tekan saat terburu-buru
- Perbesar ukuran teks & badge status di Kitchen Display dibanding antarmuka lain

**Don't:**
- Jangan pakai warna selain 4 warna status (abu/kuning/hijau/biru) untuk menandai status pesanan — jangan menambah warna baru yang bisa membingungkan staf
- Jangan gunakan shadow berat/dekoratif berlebihan — brand ini soal kecepatan dan kejelasan, bukan estetika dekoratif
- Jangan campur radius sudut yang tidak konsisten dalam satu tampilan (pilih sesuai skala yang ditentukan)
- Jangan gunakan animasi lebih dari 300ms — staf butuh feedback instan, bukan animasi yang terasa lambat

## Responsive behavior
- **Kasir (Desktop/Tablet besar):** layout 2 kolom (daftar menu di kiri, ringkasan pesanan di kanan), breakpoint utama di 1024px
- **Pelayan (Tablet/HP):** layout 1 kolom, tombol besar untuk kemudahan sentuh, breakpoint mobile-first di bawah 768px
- **Kitchen Display (Layar besar/TV):** selalu grid multi-kolom, tidak pernah stack vertikal 1 kolom meski layar lebar, teks & badge diperbesar otomatis mengikuti ukuran layar
- **Pesan Mandiri Pelanggan (HP):** mobile-first penuh, 1 kolom, tombol "Pesan" sticky di bagian bawah layar agar selalu terlihat

## Agent prompt guide
Saat membuat komponen UI untuk proyek ini:
1. Selalu rujuk token warna dari section "Color palette and roles" — jangan gunakan hex code baru di luar tabel tersebut
2. Untuk elemen terkait status pesanan (badge, border ticket, indikator meja), wajib gunakan salah satu dari 4 warna status yang ditentukan — konsisten di semua antarmuka (Kasir, Pelayan, Kitchen Display, Pesan Mandiri)
3. Prioritaskan keterbacaan di atas dekorasi, terutama untuk Kitchen Display — asumsikan dilihat dari jarak 1-2 meter dalam kondisi dapur yang sibuk
4. Pastikan kontras warna teks memenuhi WCAG AA minimum, terutama teks putih di atas warna status
5. Untuk antarmuka Pelayan dan Pesan Mandiri, prioritaskan ukuran target sentuh (tombol) minimal 44x44px mengikuti standar mobile usability
