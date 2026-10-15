<script lang="ts">
  import PageHeader from "../shared/PageHeader.svelte";
  import Card from "../shared/Card.svelte";
  import Stat from "../shared/Stat.svelte";
  import Info from "../shared/Info.svelte";
  import Badge from "../shared/Badge.svelte";
  import { runtime } from "../../stores/runtime.js";
</script>

<PageHeader
  title="Panduan Penggunaan"
  description="Panduan penggunaan RMS Production dari login sampai Project selesai."
/>
<div class="guide-grid">
  <Card title="1. Login"
    ><p>
      Masuk menggunakan akun internal yang dibuat oleh Super Admin. Pada login
      pertama, ganti password awal melalui menu akun di kanan atas.
    </p></Card
  ><Card title="2. Pipeline Otomatis"
    ><div class="flow-line">
      <b>WARM</b> → <b>HOT</b> → <b>DP GAMBAR</b> → <b>DP PROYEK</b> →
      <b>PEMBANGUNAN</b>
      → <b>SELESAI</b>
    </div>
    <ul class="guide-list">
      <li>
        <b>WARM → HOT:</b> kebutuhan + lokasi + Est. RAB + Sales PIC + next follow-up
        + minimal Survey/Proposal/Meeting.
      </li>
      <li>
        <b>HOT → DP GAMBAR:</b> upload bukti DP Gambar, lalu Finance VERIFY.
      </li>
      <li><b>HOT/DP GAMBAR → DP PROYEK:</b> Finance VERIFY DP Proyek.</li>
      <li>
        <b>DP PROYEK → PEMBANGUNAN:</b> DP Proyek verified + Contract SIGNED + Handover
        ACCEPTED + Project Start APPROVED.
      </li>
      <li>
        <b>PEMBANGUNAN → SELESAI:</b> Progress 100% + semua QC Closed + BAST FINAL
        + Completion APPROVED.
      </li>
    </ul>
    <div class="notice warn">
      Upload bukti saja <b>tidak</b> menggeser stage. Perubahan DP baru terjadi setelah
      Finance VERIFY.
    </div></Card
  ><Card title="3. Lead & CRM"
    ><ol class="guide-list">
      <li>Buka CRM & Leads.</li>
      <li>Tambah lead dan lengkapi data Pipeline.</li>
      <li>Assign Sales PIC.</li>
      <li>
        Tambah milestone Survey / Proposal / Meeting agar sistem dapat
        mengevaluasi WARM → HOT.
      </li>
      <li>
        Lead dapat diedit. Penghapusan tersedia untuk Manager Sales / Admin CRM
        / Head BU / Super Admin selama Lead belum terhubung ke Project.
      </li>
      <li>
        Sales mengisi menu <b>Laporan Harian Sales</b> dengan deskripsi kegiatan/aktivitas
        yang dilakukan, hasil/capaian, kendala, dan rencana tindak lanjut; angka Lead
        dan aktivitas dihitung otomatis dari RMS.
      </li>
    </ol></Card
  ><Card title="4. Pembayaran"
    ><ol class="guide-list">
      <li>Pada lead HOT upload bukti DP Gambar atau DP Proyek.</li>
      <li>Bukti tersimpan private di Cloudflare R2.</li>
      <li>Status awal PENDING VERIFICATION.</li>
      <li>Finance membuka Payment Verification dan melakukan Verify/Reject.</li>
      <li>Worker menghitung ulang stage secara otomatis.</li>
    </ol></Card
  ><Card title="5. Chat Internal"
    ><p>Setiap Lead dan setiap Project mempunyai thread chat sendiri.</p>
    <ul class="guide-list">
      <li><b>Lead:</b> CRM & Leads → buka Lead → Chat Internal Lead.</li>
      <li><b>Project:</b> Semua Project → buka Project → tab Chat.</li>
      <li>
        Pesan tersimpan pada D1 dan lampiran disimpan pada private R2 Storage.
      </li>
    </ul></Card
  ><Card title="6. Project 360"
    ><p>
      Satu Project menjadi dossier lengkap: Ringkasan, Klien, Riwayat Sales,
      Chat, Kontrak, Pembayaran, Jadwal Cicilan, Adendum, Dokumen, Operasional,
      Laporan Progress, QC, Serah Terima dan Riwayat Aktivitas. Project salah
      input dapat diedit; penghapusan dibatasi untuk Head BU/Super Admin dan
      tidak boleh jika sudah ada transaksi VERIFIED.
    </p></Card
  ><Card title="7. Finance"
    ><ul class="guide-list">
      <li>Sales/Admin hanya upload bukti.</li>
      <li>Finance Verify/Reject.</li>
      <li>VERIFIED menambah Total Paid dan mengurangi Outstanding.</li>
      <li>Verified payment tidak dihapus; gunakan Reversal.</li>
      <li>Partial payment boleh terdiri dari beberapa transfer.</li>
    </ul></Card
  ><Card title="8. Dokumen, QC & Completion"
    ><ul class="guide-list">
      <li>
        Pada tab Dokumen, tekan kartu Akad Final/RAB Final/Gambar
        Final/Timeline/BAST. Jika sudah ada, kartu langsung membuka file; jika
        belum ada, kartu membuka form upload.
      </li>
      <li>
        Tab Laporan Progress menyimpan laporan harian dan mingguan serta dapat
        dipublikasikan ke Portal Client.
      </li>
      <li>Inspection → Finding → Corrective Action → Verification → Closed.</li>
      <li>Project tidak dapat selesai jika masih ada QC yang belum Closed.</li>
      <li>
        BAST FINAL + Progress 100% + QC Closed + Completion Approval diperlukan
        untuk SELESAI.
      </li>
    </ul></Card
  ><Card title="9. Jika Ada Masalah"
    ><ul class="guide-list">
      <li>Buka <b>System Check</b> sebagai Head BU/Super Admin.</li>
      <li>Hubungi Super Admin untuk akun, role, master data, atau akses.</li>
      <li>Gunakan Audit Log untuk melihat perubahan status penting.</li>
    </ul></Card
  >
</div>
