import * as vfs from '../vendor/vfs-provider/vfs-provider.mjs';

const CONNECTIONS_KEY = 'vfs-toolkit-connections';

const params = new URLSearchParams(location.search);
const addonId = params.get('addonId');
const addonName = params.get('addonName');
const setupToken = params.get('setupToken');

const capabilities = {
  file:   { read: true, add: true, modify: true, delete: true },
  folder: { read: true, add: true, modify: true, delete: true },
};

const rv = await browser.storage.local.get({ [CONNECTIONS_KEY]: [] });
const alreadyConnected = rv[CONNECTIONS_KEY].some(c => c.addonId === addonId);

if (alreadyConnected) {
  document.getElementById('msg').textContent =
    `Access for add-on "${addonName ?? addonId}" already granted.`;
  const btn = document.getElementById('grant-btn');
  btn.textContent = 'OK';
  btn.addEventListener('click', () => window.close());
} else {
  if (addonName) {
    document.getElementById('msg').textContent =
      `Do you want to allow the "${addonName}" add-on to connect to the storage of the example storage provider?`;
  }
  document.getElementById('grant-btn').addEventListener('click', async () => {
    const storageId = crypto.randomUUID();
    const name = 'Example External Storage';
    await vfs.reportNewConnection(addonId, addonName, storageId, name, capabilities, setupToken);
    window.close();
  });
}
