const AdmZip = require('adm-zip');
const axios = require('axios');
const { exec } = require('child_process');
const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');

// ATUALIZE ESTAS CONSTANTES COM SEUS VALORES REAIS
const REPO_OWNER = 'romulogdonadoni'; // Seu repositório real
const REPO_NAME = 'game';              // Seu repositório real

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
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
      writer.on('finish', () => {
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
    
    // Verifica a versão mais recente no GitHub
    try {
      console.log('Verificando versão mais recente no GitHub...');
      const releases = await axios.get(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`
      );
      
      const releaseData = releases.data;
      const latestVersion = releaseData.tag_name;
      const asset = releaseData.assets.find((a) => a.name.endsWith('.zip'));
      
      console.log('Versão mais recente:', latestVersion);
      console.log('Asset encontrado:', asset ? asset.name : 'nenhum');
      
      if (asset) {
        console.log('URL do download:', asset.browser_download_url);
        console.log('Tamanho do asset:', asset.size, 'bytes');
      }
      
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
