/**
 * Modal Component
 *
 * 銈枫兂銉椼儷銇儮銉笺儉銉偑銉笺儛銉笺儸銈ゃ€? */

const Modal = {
  close() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    document.getElementById('modal-container')?.classList.remove('policy-modal');
  },

  open() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
  }
};

// Close on overlay click
document.addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') {
    Modal.close();
  }
});

window.Modal = Modal;
