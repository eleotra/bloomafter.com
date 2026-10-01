/* edit-gate.js — dipakai BERSAMA oleh semua template Rumah Bucin.
 * File ini di-host di domain Rumah Bucin sendiri (statis, taruh di repo root
 * project rumah-bucin, sejajar dengan index.html), lalu tiap template cukup
 * tempel satu baris ini di HTML-nya:
 *
 *   <script src="https://bloomafter.my.id/edit-gate.js"></script>
 *
 * Kalau nanti ganti domain, cukup ubah BASE_URL SEKALI di sini — semua
 * template ikut ke-update otomatis (nggak perlu edit satu-satu).
 */
(function (global) {
  'use strict';

  // >>> GANTI SEKALI SAJA: domain Cloudflare Pages Rumah Bucin kamu (tanpa trailing slash)
  var BASE_URL = 'https://bloomafter.my.id';

  function getOrderToken() {
    var q = new URLSearchParams(location.search);
    return { order: q.get('order'), token: q.get('token') };
  }

  // Disimpan begitu protect() berhasil, dipakai lagi oleh submitFinal() supaya
  // template nggak perlu simpan/oper ulang order+token sendiri.
  var verifiedOrder = null;
  var verifiedToken = null;

  async function verifyToken() {
    var p = getOrderToken();
    if (!p.order || !p.token) return false;
    try {
      var res = await fetch(BASE_URL + '/api/orders/validate-edit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: p.order, token: p.token })
      });
      var data = await res.json();
      if (data && data.ok === true) {
        verifiedOrder = p.order;
        verifiedToken = p.token;
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  function overlay(html) {
    var old = document.getElementById('rb-gate-overlay');
    if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'rb-gate-overlay';
    el.setAttribute('role', 'alert');
    el.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;' +
      'justify-content:center;padding:24px;text-align:center;' +
      'background:rgba(10,6,20,.95);color:#f4eef8;font:15px/1.6 system-ui,sans-serif';
    el.innerHTML = html;
    document.body.appendChild(el);
    return el;
  }
  function defaultBlockedUI(reason) {
    var el = overlay(
      '<div style="max-width:320px"><p style="margin-bottom:16px"></p>' +
      '<button style="padding:9px 22px;border-radius:20px;border:1px solid #e7a8c4;background:transparent;color:#f4eef8;font:inherit;cursor:pointer">Tutup</button></div>'
    );
    el.querySelector('p').textContent = reason;
    el.querySelector('button').addEventListener('click', function () { el.remove(); });
  }

  // RumahBucinGate.protect(onValid, onInvalid?)
  // onValid()   -> dipanggil kalau order+token di URL VALID -> buka editor di sini.
  // onInvalid() -> opsional, dipanggil kalau TIDAK valid. Kalau nggak dikasih,
  //                dipakai tampilan blokir bawaan.
  //
  // RumahBucinGate.submitFinal(blob, filename) -> Promise<{ok, error?}>
  // Kirim file hasil export editor (Blob HTML ATAU ZIP, apa pun yang template
  // hasilkan) ke Rumah Bucin -- diupload ke R2 & dicatat sebagai submission,
  // BUKAN didownload ke browser customer. Pakai order+token dari protect()
  // yang tadi berhasil, jadi tinggal panggil dengan blob+nama file aja.
  global.RumahBucinGate = {
    protect: function (onValid, onInvalid) {
      verifyToken().then(function (ok) {
        if (ok) { onValid(); }
        else if (typeof onInvalid === 'function') { onInvalid(); }
        else {
          defaultBlockedUI('Akses edit tidak valid atau sudah tidak berlaku. Buka lewat tombol "Edit Website" di halaman Riwayat Rumah Bucin.');
        }
      });
    },

    submitFinal: async function (blob, filename) {
      if (!verifiedOrder || !verifiedToken) {
        return { ok: false, error: 'Akses edit belum diverifikasi. Muat ulang halaman lewat tombol "Edit Website" di Rumah Bucin.' };
      }
      var form = new FormData();
      form.append('order_id', verifiedOrder);
      form.append('token', verifiedToken);
      form.append('file', blob, filename || 'website-final.html');
      try {
        var res = await fetch(BASE_URL + '/api/orders/submit-final', { method: 'POST', body: form });
        var data = await res.json();
        return data;
      } catch (e) {
        return { ok: false, error: 'Gagal mengirim ke server. Cek koneksi internet lalu coba lagi.' };
      }
    },

    // Tampilan konfirmasi standar setelah submitFinal() sukses -- opsional dipakai,
    // template boleh juga bikin tampilan suksesnya sendiri.
    showSentConfirmation: function () {
      var el = overlay(
        '<div style="max-width:320px">' +
        '<div style="font-size:40px;margin-bottom:10px">✓</div>' +
        '<p style="margin-bottom:16px">Website berhasil dikirim ke kami ✓<br><span style="opacity:.7;font-size:13px">Kami akan proses & upload website kamu. Cek statusnya di halaman Riwayat Rumah Bucin.</span></p>' +
        '<button style="padding:9px 22px;border-radius:20px;border:1px solid #e7a8c4;background:transparent;color:#f4eef8;font:inherit;cursor:pointer">Tutup</button></div>'
      );
      el.querySelector('button').addEventListener('click', function () { el.remove(); });
    }
  };
})(window);
