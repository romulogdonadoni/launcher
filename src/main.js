const AdmZip = require('adm-zip');
const axios = require('axios');
const { exec } = require('child_process');
const { app, BrowserWindow, ipcMain, Tray, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');

// ATUALIZE ESTAS CONSTANTES COM SEUS VALORES REAIS
const REPO_OWNER = 'romulogdonadoni'; // Seu repositório real
const REPO_NAME = 'game';              // Seu repositório real

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false, // Remove a barra de ferramentas padrão do Windows
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  // Remove a linha que abre DevTools para debug
  
  win.loadFile(path.join(__dirname, 'index.html'));
  
  // Previne o fechamento da janela e minimiza para bandeja
  win.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      win.hide();
    }
  });
  
  // Cria o ícone da bandeja
  const tray = new Tray(path.join(__dirname, 'icon.png'));
  tray.setToolTip('Game Launcher');
  
  // Menu da bandeja
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostrar Launcher',
      click: () => {
        win.show();
        win.focus();
      }
    },
    {
      label: 'Sobre',
      click: () => {
        dialog.showMessageBox(win, {
          type: 'info',
          title: 'Sobre',
          message: 'Game Launcher v1.0.0',
          detail: 'Um launcher personalizado para seus jogos favoritos.'
        });
      }
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  
  // Duplo clique no ícone da bandeja mostra a janela
  tray.on('double-click', () => {
    win.show();
    win.focus();
  });
  
  // Salva a referência da bandeja para uso posterior
  app.tray = tray;
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

// Função de teste para verificar conectividade
ipcMain.handle('test-github-connection', async () => {
  try {
    console.log('Testando conectividade com GitHub...');
    const response = await axios.get('https://api.github.com/rate_limit');
    console.log('Resposta do teste de conectividade:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Erro no teste de conectividade:', error);
    return { success: false, error: error.message };
  }
});

// Busca a última versão do jogo no GitHub
ipcMain.handle('check-update', async () => {
  try {
    console.log('Verificando atualizações...');
    const releases = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`
    );
    console.log('Resposta da API:', releases.data);
    
    // Filtra assets para priorizar jogos
    if (releases.data.assets && Array.isArray(releases.data.assets)) {
      // Prioriza arquivos que pareçam ser jogos
      const gameAssets = releases.data.assets.filter(asset => {
        const name = asset.name.toLowerCase();
        return name.endsWith('.zip') || 
               name.endsWith('.exe') || 
               name.endsWith('.msi') ||
               name.includes('game') ||
               name.includes('jogo') ||
               name.includes('launcher') ||
               name.includes('setup');
      });
      
      if (gameAssets.length > 0) {
        // Usa o primeiro asset de jogo encontrado
        releases.data.gameAsset = gameAssets[0];
        console.log('Asset de jogo encontrado:', gameAssets[0].name);
      }
    }
    
    return releases.data;
  } catch (error) {
    console.error('Erro ao verificar atualizações:', error);
    throw error;
  }
});

// Baixa e extrai o jogo
ipcMain.handle('download-game', async (event, downloadUrl) => {
  try {
    console.log('Iniciando download de:', downloadUrl);
    
    // Cria o diretório de destino se não existir
    const userDataPath = app.getPath('userData');
    const gameDir = path.join(userDataPath, 'game');
    const zipPath = path.join(userDataPath, 'game.zip');
    
    console.log('Diretório de dados do usuário:', userDataPath);
    console.log('Diretório do jogo:', gameDir);
    console.log('Caminho do arquivo ZIP:', zipPath);
    
    // Cria o diretório do jogo se não existir
    if (!fs.existsSync(gameDir)) {
      fs.mkdirSync(gameDir, { recursive: true });
      console.log('Diretório do jogo criado');
    }
    
    const writer = fs.createWriteStream(zipPath);
    console.log('Stream de escrita criado');

    const response = await axios.get(downloadUrl, { 
      responseType: 'stream',
      timeout: 300000, // 5 minutos de timeout
      maxContentLength: 1024 * 1024 * 1024 // 1GB max
    });
    
    console.log('Resposta da API recebida, tamanho:', response.headers['content-length'] || 'desconhecido');
    
    let downloadedBytes = 0;
    const totalBytes = parseInt(response.headers['content-length']) || 0;
    
    response.data.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      if (totalBytes > 0) {
        const progress = Math.round((downloadedBytes / totalBytes) * 100);
        console.log(`Download progresso: ${progress}% (${downloadedBytes}/${totalBytes} bytes)`);
      }
    });

    response.data.pipe(writer);

        return new Promise((resolve, reject) => {
      writer.on('finish', async () => {
        console.log('Download concluído, verificando arquivo...');
        
        // Verifica se o arquivo foi baixado corretamente
        if (!fs.existsSync(zipPath)) {
          reject(new Error('Arquivo ZIP não foi criado'));
          return;
        }
        
        const stats = fs.statSync(zipPath);
        console.log('Tamanho do arquivo ZIP:', stats.size, 'bytes');
        
        if (stats.size === 0) {
          reject(new Error('Arquivo ZIP está vazio'));
          return;
        }
        
        console.log('Iniciando extração...');
        try {
          const zip = new AdmZip(zipPath);
          const zipEntries = zip.getEntries();
          console.log('Número de arquivos no ZIP:', zipEntries.length);
          
          zip.extractAllTo(gameDir, true);
          console.log('Extração concluída');
          
          // Remove o arquivo ZIP após extração
          fs.unlinkSync(zipPath);
          console.log('Arquivo ZIP removido');
          
          // Lista os arquivos extraídos
          const extractedFiles = fs.readdirSync(gameDir);
          console.log('Arquivos extraídos:', extractedFiles);
          
          // Salva a versão instalada no cache
          try {
            // Obtém a versão mais recente para salvar
            const releases = await axios.get(
              `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`
            );
            const latestReleaseId = releases.data.id;
            const asset = releases.data.assets.find((a) => a.name.endsWith('.zip'));
            
            if (asset) {
              saveInstalledRelease(latestReleaseId, {
                name: asset.name,
                size: asset.size,
                downloadUrl: asset.browser_download_url
              });
              console.log('Release instalada salva no cache:', latestReleaseId);
            }
          } catch (versionError) {
            console.error('Erro ao salvar release no cache:', versionError);
          }
          
          resolve();
        } catch (extractError) {
          console.error('Erro na extração:', extractError);
          reject(new Error(`Erro na extração: ${extractError.message}`));
        }
      });
      
      writer.on('error', (err) => {
        console.error('Erro no stream de escrita:', err);
        reject(new Error(`Erro no download: ${err.message}`));
      });
      
      response.data.on('error', (err) => {
        console.error('Erro no stream de leitura:', err);
        reject(new Error(`Erro na resposta: ${err.message}`));
      });
    });
  } catch (error) {
    console.error('Erro ao baixar jogo:', error);
    throw error;
  }
});

// Inicia o jogo
ipcMain.handle('launch-game', () => {
  try {
    const gamePath = path.join(app.getPath('userData'), 'game');
    
    // Função para procurar executáveis recursivamente
    function findExecutablesRecursively(dir) {
      const executables = [];
      
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Procura recursivamente em subdiretórios
            const subExecutables = findExecutablesRecursively(fullPath);
            executables.push(...subExecutables);
          } else if (stat.isFile()) {
            // Verifica se é um executável
            if (item.endsWith('.exe') || 
                item.endsWith('.app') || 
                item.endsWith('.dmg') ||
                item === 'electron' ||
                item === 'chromedriver') {
              executables.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao ler diretório:', dir, error);
      }
      
      return executables;
    }
    
    // Procura executáveis recursivamente
    const executableFiles = findExecutablesRecursively(gamePath);
    console.log('Executáveis disponíveis para execução:', executableFiles);
    
    if (executableFiles.length === 0) {
      throw new Error('Nenhum arquivo executável encontrado');
    }
    
    // Usa o primeiro executável encontrado
    const executablePath = executableFiles[0];
    console.log('Executando:', executablePath);
    
    // No Windows, usa o comando start para abrir o arquivo
    if (process.platform === 'win32') {
      exec(`start "" "${executablePath}"`);
    } else {
      // Em outros sistemas, executa diretamente
      exec(`"${executablePath}"`);
    }
    
    console.log('Jogo iniciado com sucesso');
  } catch (error) {
    console.error('Erro ao iniciar jogo:', error);
    throw error;
  }
});

// Verifica se o jogo está instalado e atualizado
ipcMain.handle('check-game-status', async () => {
  try {
    console.log('Verificando status do jogo...');
    const gamePath = path.join(app.getPath('userData'), 'game');
    
    console.log('Caminho do jogo:', gamePath);
    
    // Verifica se a pasta existe
    const gameDirExists = fs.existsSync(gamePath);
    console.log('Diretório do jogo existe:', gameDirExists);
    
    if (!gameDirExists) {
      console.log('Jogo não está instalado');
      return { isInstalled: false, isUpdated: false, currentVersion: null };
    }
    
    // Função para procurar executáveis recursivamente
    function findExecutablesRecursively(dir) {
      const executables = [];
      
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Procura recursivamente em subdiretórios
            const subExecutables = findExecutablesRecursively(fullPath);
            executables.push(...subExecutables);
          } else if (stat.isFile()) {
            // Verifica se é um executável
            if (item.endsWith('.exe') || 
                item.endsWith('.app') || 
                item.endsWith('.dmg') ||
                item === 'electron' ||
                item === 'chromedriver') {
              executables.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao ler diretório:', dir, error);
      }
      
      return executables;
    }
    
    // Procura executáveis recursivamente
    const executableFiles = findExecutablesRecursively(gamePath);
    console.log('Executáveis encontrados (recursivo):', executableFiles);
    
    if (executableFiles.length === 0) {
      console.log('Nenhum executável encontrado');
      return { isInstalled: false, isUpdated: false, currentVersion: null };
    }
    
    const isInstalled = true;
    
    // Obtém a versão instalada do cache
    const installedReleaseId = getInstalledReleaseId();
    console.log('Release instalada (cache):', installedReleaseId);
    
         // Verifica a release mais recente no GitHub
     try {
       console.log('Verificando release mais recente no GitHub...');
      const releases = await axios.get(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`
      );
      
      const releaseData = releases.data;
      const latestReleaseId = releaseData.id;
      const asset = releaseData.assets.find((a) => a.name.endsWith('.zip'));
      
             console.log('Release mais recente:', latestReleaseId);
      console.log('Asset encontrado:', asset ? asset.name : 'nenhum');
      
      if (asset) {
        console.log('URL do download:', asset.browser_download_url);
        console.log('Tamanho do asset:', asset.size, 'bytes');
      }
      
             // Compara os IDs das releases
       let isUpdated = false;
       let currentVersion = installedReleaseId || 'desconhecida';
       
       if (installedReleaseId) {
         const comparison = compareReleaseIds(installedReleaseId, latestReleaseId);
         isUpdated = comparison >= 0; // 0 = igual, 1 = mais nova, -1 = mais antiga
         
         console.log(`Comparação de releases: ${installedReleaseId} vs ${latestReleaseId} = ${comparison}`);
         console.log(`Jogo está atualizado: ${isUpdated}`);
       } else {
         // Se não há release no cache, considera como não atualizado
         isUpdated = false;
         console.log('Nenhuma release no cache, considerando como não atualizado');
       }
       
       return {
         isInstalled: true,
         isUpdated: isUpdated,
         currentVersion: currentVersion,
         latestVersion: latestReleaseId,
         downloadUrl: asset?.browser_download_url || null,
         needsUpdate: !isUpdated,
         updateAvailable: !isUpdated && asset
       };
         } catch (error) {
       console.error('Erro ao verificar release:', error);
       return { 
         isInstalled: true, 
         isUpdated: false, 
         currentVersion: installedReleaseId || 'desconhecida',
         needsUpdate: true
       };
     }
    
  } catch (error) {
    console.error('Erro ao verificar status do jogo:', error);
    return { isInstalled: false, isUpdated: false, currentVersion: null };
  }
});

// Verifica se o processo do jogo está ativo
ipcMain.handle('check-game-process', async () => {
  try {
    const gamePath = path.join(app.getPath('userData'), 'game');
    
    // Função para procurar executáveis recursivamente
    function findExecutablesRecursively(dir) {
      const executables = [];
      
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            const subExecutables = findExecutablesRecursively(fullPath);
            executables.push(...subExecutables);
          } else if (stat.isFile()) {
            if (item.endsWith('.exe') || 
                item.endsWith('.app') || 
                item.endsWith('.dmg') ||
                item === 'electron' ||
                item === 'chromedriver') {
              executables.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao ler diretório:', dir, error);
      }
      
      return executables;
    }
    
    const executableFiles = findExecutablesRecursively(gamePath);
    
    if (executableFiles.length === 0) {
      return { isRunning: false, processName: null };
    }
    
    // Pega o nome do arquivo principal (sem o caminho completo)
    const mainExecutable = path.basename(executableFiles[0]);
    console.log('Verificando processo:', mainExecutable);
    
    // No Windows, usa tasklist para verificar se o processo está rodando
    if (process.platform === 'win32') {
      return new Promise((resolve) => {
        exec(`tasklist /FI "IMAGENAME eq ${mainExecutable}" /FO CSV`, (error, stdout) => {
          if (error) {
            console.error('Erro ao verificar processo:', error);
            resolve({ isRunning: false, processName: mainExecutable });
            return;
          }
          
          // Se a saída contém o nome do executável, o processo está rodando
          const isRunning = stdout.includes(mainExecutable);
          console.log('Processo está rodando:', isRunning);
          
          resolve({ isRunning, processName: mainExecutable });
        });
      });
    } else {
      // Em outros sistemas, usa ps
      return new Promise((resolve) => {
        exec(`ps aux | grep "${mainExecutable}" | grep -v grep`, (error, stdout) => {
          if (error) {
            console.error('Erro ao verificar processo:', error);
            resolve({ isRunning: false, processName: mainExecutable });
            return;
          }
          
          const isRunning = stdout.trim().length > 0;
          console.log('Processo está rodando:', isRunning);
          
          resolve({ isRunning, processName: mainExecutable });
        });
      });
    }
  } catch (error) {
    console.error('Erro ao verificar processo do jogo:', error);
    return { isRunning: false, processName: null };
  }
});

// Para o processo do jogo
ipcMain.handle('stop-game-process', async () => {
  try {
    const gamePath = path.join(app.getPath('userData'), 'game');
    
    // Função para procurar executáveis recursivamente
    function findExecutablesRecursively(dir) {
      const executables = [];
      
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            const subExecutables = findExecutablesRecursively(fullPath);
            executables.push(...subExecutables);
          } else if (stat.isFile()) {
            if (item.endsWith('.exe') || 
                item.endsWith('.app') || 
                item.endsWith('.dmg') ||
                item === 'electron' ||
                item === 'chromedriver') {
              executables.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao ler diretório:', dir, error);
      }
      
      return executables;
    }
    
    const executableFiles = findExecutablesRecursively(gamePath);
    
    if (executableFiles.length === 0) {
      throw new Error('Nenhum executável encontrado');
    }
    
    const mainExecutable = path.basename(executableFiles[0]);
    console.log('Parando processo:', mainExecutable);
    
    // No Windows, usa taskkill para parar o processo
    if (process.platform === 'win32') {
      return new Promise((resolve, reject) => {
        exec(`taskkill /F /IM "${mainExecutable}"`, (error, stdout, stderr) => {
          if (error) {
            // Se o processo não estiver rodando, não é um erro
            if (error.message.includes('não foi encontrado') || 
                error.message.includes('not found') ||
                stderr.includes('não foi encontrado') ||
                stderr.includes('not found')) {
              console.log('Processo não estava rodando');
              resolve({ success: true, message: 'Processo não estava rodando' });
              return;
            }
            console.error('Erro ao parar processo:', error);
            reject(new Error(`Erro ao parar processo: ${error.message}`));
            return;
          }
          
          console.log('Processo parado com sucesso');
          resolve({ success: true, message: 'Processo parado com sucesso' });
        });
      });
    } else {
      // Em outros sistemas, usa pkill
      return new Promise((resolve, reject) => {
        exec(`pkill -f "${mainExecutable}"`, (error, stdout, stderr) => {
          if (error) {
            // Se o processo não estiver rodando, não é um erro
            if (error.message.includes('No matching processes') || 
                error.message.includes('não foi encontrado')) {
              console.log('Processo não estava rodando');
              resolve({ success: true, message: 'Processo não estava rodando' });
              return;
            }
            console.error('Erro ao parar processo:', error);
            reject(new Error(`Erro ao parar processo: ${error.message}`));
            return;
          }
          
          console.log('Processo parado com sucesso');
          resolve({ success: true, message: 'Processo parado com sucesso' });
        });
      });
    }
  } catch (error) {
    console.error('Erro ao parar processo do jogo:', error);
    throw error;
  }
});

// Handlers para controle da janela customizada
ipcMain.handle('minimize-window', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

ipcMain.handle('maximize-window', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.handle('close-window', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.hide(); // Esconde ao invés de fechar
});

ipcMain.handle('quit-app', () => {
  app.isQuiting = true;
  app.quit();
});



// Função para comparar IDs de release (quanto maior o ID, mais recente)
function compareReleaseIds(id1, id2) {
  if (!id1 || !id2) return 0;
  
  // Converte para números para comparação
  const num1 = parseInt(id1);
  const num2 = parseInt(id2);
  
  if (isNaN(num1) || isNaN(num2)) return 0;
  
  if (num1 > num2) return 1;  // id1 é mais recente
  if (num1 < num2) return -1; // id1 é mais antigo
  return 0; // são iguais
}

// Função para obter a versão instalada do cache
function getInstalledReleaseId() {
  try {
    const userDataPath = app.getPath('userData');
    const versionFile = path.join(userDataPath, 'installed-release.json');
    
    if (fs.existsSync(versionFile)) {
      const releaseData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
      return releaseData.releaseId;
    }
  } catch (error) {
    console.error('Erro ao ler release instalada:', error);
  }
  
  return null;
}

// Função para salvar a release instalada no cache
function saveInstalledRelease(releaseId, assetInfo = null) {
  try {
    const userDataPath = app.getPath('userData');
    const releaseFile = path.join(userDataPath, 'installed-release.json');
    
    const releaseData = {
      releaseId: releaseId,
      installedAt: new Date().toISOString(),
      assetInfo: assetInfo
    };
    
    fs.writeFileSync(releaseFile, JSON.stringify(releaseData, null, 2));
    console.log('Release instalada salva no cache:', releaseId);
  } catch (error) {
    console.error('Erro ao salvar release instalada:', error);
  }
}


