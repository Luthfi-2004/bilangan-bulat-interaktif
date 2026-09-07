// ==========================================================
// SWEETALERT2 GLOBAL HELPER & NATIVE OVERRIDE
// Operasi Campuran Bilangan Bulat
// ==========================================================

// 1. Pastikan SweetAlert2 dimuat di halaman
(function initSweetAlert() {
  function setupSwalOverrides() {
    if (!window.Swal) return;

    // Toast notifikasi kecil
    window.SwalToast = window.Swal.mixin({
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = window.Swal.stopTimer;
        toast.onmouseleave = window.Swal.resumeTimer;
      }
    });

    // Override window.alert native browser agar tidak pernah muncul dialog kaku browser
    window.alert = function (message) {
      return window.Swal.fire({
        title: 'Pemberitahuan',
        text: String(message),
        icon: 'info',
        confirmButtonText: 'OK',
        confirmButtonColor: '#2563eb',
        customClass: {
          popup: 'rounded-2xl shadow-xl font-sans',
          confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-sm'
        }
      });
    };
  }

  if (typeof window.Swal === 'undefined') {
    const swalScript = document.createElement('script');
    swalScript.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
    swalScript.onload = () => {
      setupSwalOverrides();
    };
    document.head.appendChild(swalScript);
  } else {
    setupSwalOverrides();
  }
})();
