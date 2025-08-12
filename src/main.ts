import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';
import axios from 'axios';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { exec } from 'child_process';

// ATUALIZE ESTAS CONSTANTES COM SEUS VALORES REAIS
const REPO_OWNER = 'romulogdonadoni'; // Ex: 'romulo-pc'
const REPO_NAME = 'game';      // Ex: 'meu-jogo'

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  // Abre DevTools para debug
  win.webContents.openDevTools();
  
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  // Configura o autoUpdater para usar GitHub Releases
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: REPO_OWNER,
    repo: REPO_NAME
  });

  autoUpdater.checkForUpdatesAndNotify();
});

// Busca a última versão do jogo no GitHub
ipcMain.handle('check-update', async () => {
  try {
    console.log('Verificando atualizações...');
    const releases = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`
    );
    console.log('Resposta da API:', releases.data);
    return releases.data;
  } catch (error) {
    console.error('Erro ao verificar atualizações:', error);
    throw error;
  }
});

// Baixa e extrai o jogo
ipcMain.handle('download-game', async (_, downloadUrl: string) => {
  try {
    console.log('Iniciando download de:', downloadUrl);
    const filePath = path.join(app.getPath('userData'), 'game.zip');
    const writer = fs.createWriteStream(filePath);

    const response = await axios.get(downloadUrl, { responseType: 'stream' });
    (response.data as any).pipe(writer);

    return new Promise<void>((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Download concluído, extraindo...');
        const zip = new AdmZip(filePath);
        zip.extractAllTo(path.join(app.getPath('userData'), 'game'), true);
        fs.unlinkSync(filePath);
        console.log('Extração concluída');
        resolve();
      });
      writer.on('error', (err) => {
        console.error('Erro no download:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Erro ao baixar jogo:', error);
    throw error;
  }
});

// Inicia o jogo
ipcMain.handle('launch-game', () => {
  const gamePath = path.join(app.getPath('userData'), 'game', 'MeuJogo.exe');
  exec(`"${gamePath}"`);
});

// Verifica se o jogo está instalado e atualizado
ipcMain.handle('check-game-status', async () => {
  try {
    const gamePath = path.join(app.getPath('userData'), 'game');
    const exePath = path.join(gamePath, 'MeuJogo.exe');
    
    // Verifica se a pasta e executável existem
    const isInstalled = fs.existsSync(gamePath) && fs.existsSync(exePath);
    
    if (!isInstalled) {
      return { isInstalled: false, isUpdated: false, currentVersion: null };
    }
    
    // Verifica a versão mais recente no GitHub
    try {
      const releases = await axios.get(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`
      );
      
      const releaseData = releases.data as any;
      const latestVersion = releaseData.tag_name;
      const asset = releaseData.assets.find((a: any) => a.name.endsWith('.zip'));
      
      // Por enquanto, vamos considerar que se existe, está atualizado
      // Você pode implementar uma verificação mais sofisticada de versão aqui
      return {
        isInstalled: true,
        isUpdated: true,
        currentVersion: latestVersion,
        latestVersion: latestVersion,
        downloadUrl: asset?.browser_download_url || null
      };
    } catch (error) {
      console.error('Erro ao verificar versão:', error);
      return { isInstalled: true, isUpdated: false, currentVersion: 'desconhecida' };
    }
  } catch (error) {
    console.error('Erro ao verificar status do jogo:', error);
    return { isInstalled: false, isUpdated: false, currentVersion: null };
  }
});
