/* edit-gate.js — DEBUG VERSION */
(function (global) {
  'use strict';

  var BASE_URL = 'https://bloomafter.my.id';

  function getOrderToken() {
    var q = new URLSearchParams(location.search);
    return {
      order: q.get('order'),
      token: q.get('token')
    };
  }

  var verifiedOrder = null;
  var verifiedToken = null;

  async function verifyToken() {
    var p = getOrderToken();

    if (!p.order || !p.token) {
      return false;
    }

    try {
      var res = await fetch(
        BASE_URL + '/api/orders/validate-edit-token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            order_id: p.order,
            token: p.token
          })
        }
      );

      var raw = await res.text();

      console.log(
        '[RumahBucinGate] validate status:',
        res.status,
        raw
      );

      var data;

      try {
        data = JSON.parse(raw);
      } catch (e) {
        console.error(
          '[RumahBucinGate] validate bukan JSON:',
          raw
        );
        return false;
      }

      if (data && data.ok === true) {
        verifiedOrder = p.order;
        verifiedToken = p.token;
        return true;
      }

      return false;

    } catch (e) {
      console.error(
        '[RumahBucinGate] validate error:',
        e
      );

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
      'position:fixed;inset:0;z-index:2147483647;' +
      'display:flex;align-items:center;justify-content:center;' +
      'padding:24px;text-align:center;' +
      'background:rgba(10,6,20,.95);color:#f4eef8;' +
      'font:15px/1.6 system-ui,sans-serif';

    el.innerHTML = html;

    document.body.appendChild(el);

    return el;
  }

  function defaultBlockedUI(reason) {
    var el = overlay(
      '<div style="max-width:320px">' +
      '<p style="margin-bottom:16px"></p>' +
      '<button style="padding:9px 22px;border-radius:20px;' +
      'border:1px solid #e7a8c4;background:transparent;' +
      'color:#f4eef8;font:inherit;cursor:pointer">' +
      'Tutup</button></div>'
    );

    el.querySelector('p').textContent = reason;

    el.querySelector('button').addEventListener(
      'click',
      function () {
        el.remove();
      }
    );
  }

  global.RumahBucinGate = {

    protect: function (onValid, onInvalid) {

      verifyToken().then(function (ok) {

        if (ok) {
          onValid();
        }

        else if (typeof onInvalid === 'function') {
          onInvalid();
        }

        else {
          defaultBlockedUI(
            'Akses edit tidak valid atau sudah tidak berlaku.'
          );
        }

      });

    },

    submitFinal: async function (blob, filename) {

      if (!verifiedOrder || !verifiedToken) {

        return {
          ok: false,
          error:
            'Akses edit belum diverifikasi.'
        };

      }

      var form = new FormData();

      form.append(
        'order_id',
        verifiedOrder
      );

      form.append(
        'token',
        verifiedToken
      );

      form.append(
        'file',
        blob,
        filename || 'website-final.html'
      );

      try {

        console.log(
          '[RumahBucinGate] mulai upload:',
          {
            order: verifiedOrder,
            filename: filename,
            size: blob && blob.size,
            type: blob && blob.type
          }
        );

        var res = await fetch(
          BASE_URL + '/api/orders/submit-final',
          {
            method: 'POST',
            body: form
          }
        );

        var raw = await res.text();

        console.log(
          '[RumahBucinGate] submit HTTP:',
          res.status,
          raw
        );

        var data;

        try {

          data = JSON.parse(raw);

        } catch (parseError) {

          return {
            ok: false,
            error:
              'Server mengembalikan respons bukan JSON. ' +
              'HTTP ' + res.status +
              '. Respons: ' +
              raw.slice(0, 500)
          };

        }

        if (!res.ok || !data.ok) {

          return {
            ok: false,
            error:
              data.error ||
              ('Server error HTTP ' + res.status)
          };

        }

        return data;

      } catch (e) {

        console.error(
          '[RumahBucinGate] submit error:',
          e
        );

        return {
          ok: false,
          error:
            'Gagal terhubung ke server: ' +
            (e && e.message
              ? e.message
              : String(e))
        };

      }

    },

    showSentConfirmation: function () {

      var el = overlay(
        '<div style="max-width:320px">' +
        '<div style="font-size:40px;margin-bottom:10px">✓</div>' +
        '<p style="margin-bottom:16px">' +
        'Website berhasil dikirim ke kami ✓<br>' +
        '<span style="opacity:.7;font-size:13px">' +
        'Kami akan proses & upload website kamu.' +
        '</span></p>' +
        '<button style="padding:9px 22px;border-radius:20px;' +
        'border:1px solid #e7a8c4;background:transparent;' +
        'color:#f4eef8;font:inherit;cursor:pointer">' +
        'Tutup</button></div>'
      );

      el.querySelector('button').addEventListener(
        'click',
        function () {
          el.remove();
        }
      );

    }

  };

})(window);
