// Handles login and redirects to game.html with query params
const usernameEl = document.getElementById('username');
const modeSelect = document.getElementById('modeSelect');
const startBtn   = document.getElementById('startBtn');
const clearBtn   = document.getElementById('clearBtn');

startBtn.addEventListener('click', () => {
  const name = (usernameEl.value || '').trim();
  const mode = modeSelect.value;
  if (!name) {
    alert('Please enter your name.');
    return;
  }
  const qs = new URLSearchParams({ name, mode }).toString();
  window.location.href = `game.html?${qs}`;
});

clearBtn.addEventListener('click', () => {
  usernameEl.value = '';
  modeSelect.value = 'two';
});
