const AdmZip = require('adm-zip');
const axios = require('axios');
const { exec } = require('child_process');
const { app, BrowserWindow, ipcMain, Tray, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');
const log = require('electron-log');

// Configuração de logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// ATUALIZE ESTAS CONSTANTES COM SEUS VALORES REAIS
const REPO_OWNER = 'romulogdonadoni'; // Seu repositório real
const REPO_NAME = 'game';             // Repositório do jogo
const REPO_NAME_LAUNCHER = 'launcher'; // Repositório do launcher

// Configuração do auto updater
autoUpdater.autoDownload = true; // Baixa automaticamente
autoUpdater.autoInstallOnAppQuit = true; // Instala automaticamente ao fechar
autoUpdater.allowDowngrade = false; // Não permite downgrade
autoUpdater.allowPrerelease = false; // Não permite versões pré-release

// Configurações adicionais para melhor experiência
autoUpdater.forceDevUpdateConfig = false; // Não força configurações de desenvolvimento
autoUpdater.logger = log; // Configura o logger

// Variável para controlar se há uma atualização em andamento
let isUpdateInProgress = false;
let updateInfo = null; // Armazena informações da atualização disponível

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
      label: 'Verificar Atualizações',
      click: () => {
        checkForUpdates();
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
  
  // Salva referência da janela principal para uso no auto updater
  app.mainWindow = win;
}

// Função para verificar atualizações
function checkForUpdates() {
  if (isUpdateInProgress) {
    log.info('Verificação de atualização já em andamento');
    return;
  }
  
  log.info('Iniciando verificação de atualizações...');
  isUpdateInProgress = true;
  
  // Notifica o frontend sobre o início da verificação
  if (app.mainWindow) {
    app.mainWindow.webContents.send('update-status', {
      status: 'checking',
      message: 'Verificando atualizações...',
      timestamp: new Date().toISOString()
    });
  }
  
  // Verifica se há uma conexão com a internet antes de prosseguir
  try {
    autoUpdater.checkForUpdates();
  } catch (error) {
    log.error('Erro ao verificar atualizações:', error);
    isUpdateInProgress = false;
    
    if (app.mainWindow) {
      app.mainWindow.webContents.send('update-status', {
        status: 'error',
        message: 'Erro ao verificar atualizações',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Configuração dos eventos do auto updater
function setupAutoUpdater() {
  // Evento: Iniciando verificação
  autoUpdater.on('checking-for-update', () => {
    log.info('Verificando atualizações...');
    if (app.mainWindow) {
      app.mainWindow.webContents.send('update-status', {
        status: 'checking',
        message: 'Verificando atualizações...'
      });
    }
  });

  // Evento: Atualização disponível
  autoUpdater.on('update-available', (info) => {
    log.info('Atualização disponível:', info);
    isUpdateInProgress = false;
    updateInfo = info; // Armazena informações da atualização
    
    if (app.mainWindow) {
      app.mainWindow.webContents.send('update-status', {
        status: 'available',
        message: 'Nova atualização disponível!',
        info: info,
        timestamp: new Date().toISOString(),
        currentVersion: app.getVersion(),
        newVersion: info.version || 'Nova versão'
      });
    }
    
    // Mostra notificação na bandeja
    if (app.tray) {
      app.tray.displayBalloon({
        title: 'Atualização Disponível',
        content: `Nova versão ${info.version || 'disponível'} do Game Launcher!`,
        icon: path.join(__dirname, 'icon.png')
      });
    }
  });

  // Evento: Nenhuma atualização disponível
  autoUpdater.on('update-not-available', (info) => {
    log.info('Nenhuma atualização disponível:', info);
    isUpdateInProgress = false;
    
    if (app.mainWindow) {
      app.mainWindow.webContents.send('update-status', {
        status: 'not-available',
        message: 'Você já tem a versão mais recente!',
        info: info
      });
    }
  });

  // Evento: Download iniciado
  autoUpdater.on('download-progress', (progressObj) => {
    const logMessage = `Velocidade: ${progressObj.bytesPerSecond} - Baixado: ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
    log.info(logMessage);
    
    if (app.mainWindow) {
      app.mainWindow.webContents.send('update-status', {
        status: 'downloading',
        message: 'Baixando atualização...',
        progress: progressObj
      });
    }
  });

  // Evento: Download concluído
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Atualização baixada com sucesso:', info);
    isUpdateInProgress = false;
    
    if (app.mainWindow) {
      app.mainWindow.webContents.send('update-status', {
        status: 'downloaded',
        message: 'Atualização baixada! Reiniciando para aplicar...',
        info: info,
        timestamp: new Date().toISOString()
      });
    }
    
    // Mostra diálogo de confirmação
    dialog.showMessageBox(app.mainWindow, {
      type: 'info',
      title: 'Atualização Pronta',
      message: 'A atualização foi baixada com sucesso!',
      detail: `Versão ${info.version || 'nova'} está pronta para instalar. O aplicativo será reiniciado para aplicar as mudanças.`,
      buttons: ['Reiniciar Agora', 'Reiniciar Mais Tarde'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        // Reinicia imediatamente
        log.info('Reiniciando aplicativo para instalar atualização...');
        autoUpdater.quitAndInstall();
      } else {
        log.info('Usuário escolheu reiniciar mais tarde');
        // A atualização será instalada automaticamente quando o app for fechado
        // devido à configuração autoInstallOnAppQuit = true
      }
    });
  });

  // Evento: Erro no auto updater
  autoUpdater.on('error', (err) => {
    log.error('Erro no auto updater:', err);
    isUpdateInProgress = false;
    
    if (app.mainWindow) {
      app.mainWindow.webContents.send('update-status', {
        status: 'error',
        message: 'Erro ao verificar atualizações',
        error: err.message
      });
    }
    
    // Mostra erro na bandeja
    if (app.tray) {
      app.tray.displayBalloon({
        title: 'Erro na Atualização',
        content: `Erro ao verificar atualizações: ${err.message}`,
        icon: path.join(__dirname, 'icon.png')
      });
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  
  // Configura o auto updater
  setupAutoUpdater();
  
  // Configura o autoUpdater para usar GitHub Releases
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: REPO_OWNER,
    repo: REPO_NAME_LAUNCHER
  });

  // Verifica atualizações automaticamente ao iniciar
  log.info('Verificando atualizações automaticamente...');
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
    const startTime = Date.now();
    let lastUpdateTime = startTime;
    let lastDownloadedBytes = 0;
    
    // Função para formatar bytes em MB
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 MB';
      const mb = bytes / (1024 * 1024);
      return `${mb.toFixed(1)} MB`;
    };
    
    // Função para formatar tempo
    const formatTime = (seconds) => {
      if (seconds < 60) return `${Math.floor(seconds)}s`;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
    
    response.data.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      const currentTime = Date.now();
      
      if (totalBytes > 0) {
        const progress = Math.round((downloadedBytes / totalBytes) * 100);
        
        // Calcula velocidade de download (MB/s)
        const timeDiff = (currentTime - lastUpdateTime) / 1000; // em segundos
        if (timeDiff >= 0.5) { // Atualiza a cada 0.5 segundos
          const bytesDiff = downloadedBytes - lastDownloadedBytes;
          const speedMBps = (bytesDiff / (1024 * 1024)) / timeDiff;
          
          // Calcula tempo restante
          const remainingBytes = totalBytes - downloadedBytes;
          const estimatedTimeRemaining = remainingBytes / (bytesDiff / timeDiff);
          
          // Envia progresso para o frontend
          event.sender.send('download-progress', {
            progress: progress,
            downloaded: downloadedBytes,
            total: totalBytes,
            speed: speedMBps,
            timeRemaining: estimatedTimeRemaining,
            downloadedFormatted: formatBytes(downloadedBytes),
            totalFormatted: formatBytes(totalBytes),
            speedFormatted: `${speedMBps.toFixed(1)} MB/s`,
            timeRemainingFormatted: formatTime(estimatedTimeRemaining)
          });
          
          lastUpdateTime = currentTime;
          lastDownloadedBytes = downloadedBytes;
        }
        
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

// Handlers para o auto updater
ipcMain.handle('check-for-updates', () => {
  try {
    log.info('Verificação de atualizações solicitada pelo frontend');
    checkForUpdates();
    return { success: true, message: 'Verificação de atualizações iniciada' };
  } catch (error) {
    log.error('Erro ao verificar atualizações:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('download-update', () => {
  try {
    if (isUpdateInProgress) {
      return { success: false, error: 'Atualização já em andamento' };
    }
    
    log.info('Download de atualização solicitado pelo frontend');
    autoUpdater.downloadUpdate();
    return { success: true, message: 'Download de atualização iniciado' };
  } catch (error) {
    log.error('Erro ao iniciar download:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', () => {
  try {
    log.info('Instalação de atualização solicitada pelo frontend');
    autoUpdater.quitAndInstall();
    return { success: true, message: 'Reiniciando para instalar atualização' };
  } catch (error) {
    log.error('Erro ao instalar atualização:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-update-status', () => {
  return {
    isUpdateInProgress,
    currentVersion: app.getVersion(),
    autoDownload: autoUpdater.autoDownload,
    autoInstallOnAppQuit: autoUpdater.autoInstallOnAppQuit,
    updateInfo: updateInfo,
    lastCheck: new Date().toISOString()
  };
});

ipcMain.handle('get-update-info', () => {
  return {
    currentVersion: app.getVersion(),
    updateInfo: updateInfo,
    isUpdateInProgress,
    autoUpdaterConfig: {
      autoDownload: autoUpdater.autoDownload,
      autoInstallOnAppQuit: autoUpdater.autoInstallOnAppQuit,
      allowDowngrade: autoUpdater.allowDowngrade,
      allowPrerelease: autoUpdater.allowPrerelease
    }
  };
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


