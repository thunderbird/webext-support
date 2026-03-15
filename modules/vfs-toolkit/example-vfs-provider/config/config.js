const STORAGE_KEY = 'vfs-toolkit-local-slow-data-transfer';

const checkbox = document.getElementById('slow-data-transfer');
const savedNotice = document.getElementById('saved-notice');

// Load saved setting
const rv = await browser.storage.local.get({ [STORAGE_KEY]: false });
checkbox.checked = rv[STORAGE_KEY];

// Save on change and briefly show confirmation
let hideTimer;
checkbox.addEventListener('change', async () => {
  await browser.storage.local.set({ [STORAGE_KEY]: checkbox.checked });
  savedNotice.classList.add('visible');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => savedNotice.classList.remove('visible'), 1500);
});
