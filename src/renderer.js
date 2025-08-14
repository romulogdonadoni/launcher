// Elementos da interface
const updateButton = document.getElementById('update');
const testConnectionButton = document.getElementById('test-connection');
const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const closeBtn = document.getElementById('close-btn');
const statusText = document.getElementById('status');

// Elementos da barra de progresso
const downloadProgress = document.getElementById('download-progress');
const downloadStatus = document.getElementById('download-status');
const downloadPercentage = document.getElementById('download-percentage');
const progressBar = document.getElementById('progress-bar');
const downloadSpeed = document.getElementById('download-speed');
const downloadSize = document.getElementById('download-size');
const downloadTime = document.getElementById('download-time');

// Elementos do auto updater
const autoUpdateStatus = document.getElementById('auto-update-status');
const autoUpdateButton = document.getElementById('auto-update-button');

// Elemento para exibir a versão do app
const versionDisplay = document.getElementById('version-display');

// Variáveis para controle do auto updater
let isAutoUpdateInProgress = false;
let currentUpdateInfo = null;

// Funções para gerenciar a barra de progresso
function showDownloadProgress() {
  downloadProgress.style.display = 'block';
  downloadStatus.textContent = 'Baixando...';
  downloadPercentage.textContent = '0%';
  progressBar.style.width = '0%';
  downloadSpeed.textContent = '0 MB/s';
  downloadSize.textContent = '0 MB / 0 MB';
  downloadTime.textContent = '--:--';
}

function hideDownloadProgress() {
  downloadProgress.style.display = 'none';
}

function updateDownloadProgress(data) {
  downloadStatus.textContent = 'Baixando...';
  downloadPercentage.textContent = `${data.progress}%`;
  progressBar.style.width = `${data.progress}%`;
  downloadSpeed.textContent = data.speedFormatted;
  downloadSize.textContent = `${data.downloadedFormatted} / ${data.totalFormatted}`;
  downloadTime.textContent = data.timeRemainingFormatted;
}

function showDownloadComplete() {
  downloadStatus.textContent = 'Download Concluído!';
  downloadPercentage.textContent = '100%';
  progressBar.style.width = '100%';
  progressBar.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
  
  // Esconde a barra após 3 segundos
  setTimeout(() => {
    hideDownloadProgress();
    progressBar.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
  }, 3000);
}

// Funções para gerenciar o auto updater
async function checkForLauncherUpdates() {
  if (isAutoUpdateInProgress) {
    console.log('Verificação de atualização já em andamento');
    return;
  }

  try {
    isAutoUpdateInProgress = true;
    autoUpdateButton.disabled = true;
    autoUpdateButton.textContent = '🔍 Verificando...';
    
    updateAutoUpdateStatus('Verificando atualizações do launcher...', 'info');
    
    const result = await window.electronAPI.checkForUpdates();
    console.log('Resultado da verificação:', result);
    
    if (result.success) {
      updateAutoUpdateStatus('Verificação iniciada com sucesso', 'success');
    } else {
      updateAutoUpdateStatus(`Erro: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('Erro ao verificar atualizações:', error);
    updateAutoUpdateStatus(`Erro: ${error.message}`, 'error');
  } finally {
    isAutoUpdateInProgress = false;
    autoUpdateButton.disabled = false;
    autoUpdateButton.textContent = '🔄 Verificar Atualizações do Launcher';
  }
}

function updateAutoUpdateStatus(message, type = 'info') {
  autoUpdateStatus.textContent = message;
  
  switch (type) {
    case 'success':
      autoUpdateStatus.style.backgroundColor = '#d4edda';
      autoUpdateStatus.style.color = '#155724';
      autoUpdateStatus.style.border = '1px solid #c3e6cb';
      break;
    case 'error':
      autoUpdateStatus.style.backgroundColor = '#f8d7da';
      autoUpdateStatus.style.color = '#721c24';
      autoUpdateStatus.style.border = '1px solid #f5c6cb';
      break;
    case 'warning':
      autoUpdateStatus.style.backgroundColor = '#fff3cd';
      autoUpdateStatus.style.color = '#856404';
      autoUpdateStatus.style.border = '1px solid #ffeaa7';
      break;
    case 'info':
    default:
      autoUpdateStatus.style.backgroundColor = '#e3f2fd';
      autoUpdateStatus.style.color = '#1565c0';
      autoUpdateStatus.style.border = '1px solid #bbdefb';
      break;
  }
}

// Função para atualizar a exibição da versão
async function updateVersionDisplay() {
  try {
    const updateStatus = await window.electronAPI.getUpdateStatus();
    const currentVersion = updateStatus.currentVersion || 'Desconhecida';
    versionDisplay.textContent = `Versão: ${currentVersion}`;
    versionDisplay.style.backgroundColor = '#e8f5e8';
    versionDisplay.style.color = '#2e7d32';
    versionDisplay.style.border = '1px solid #a5d6a7';
  } catch (error) {
    console.error('Erro ao obter versão:', error);
    versionDisplay.textContent = 'Versão: Erro ao carregar';
    versionDisplay.style.backgroundColor = '#ffebee';
    versionDisplay.style.color = '#c62828';
    versionDisplay.style.border = '1px solid #ffcdd2';
  }
}

function handleUpdateStatus(data) {
  console.log('Status da atualização recebido:', data);
  
  switch (data.status) {
    case 'checking':
      updateAutoUpdateStatus('🔍 Verificando atualizações...', 'info');
      break;
      
    case 'available':
      currentUpdateInfo = data.info;
      const newVersion = data.newVersion || 'nova versão';
      updateAutoUpdateStatus(
        `🆕 Atualização disponível: ${newVersion}! Baixando automaticamente...`, 
        'success'
      );
      
      // Atualiza a exibição da versão com a nova versão disponível
      if (data.newVersion) {
        versionDisplay.textContent = `Versão: ${data.currentVersion} → ${data.newVersion}`;
        versionDisplay.style.backgroundColor = '#fff3cd';
        versionDisplay.style.color = '#856404';
        versionDisplay.style.border = '1px solid #ffeaa7';
      }
      
      // Mostra botão para instalar quando disponível
      if (autoUpdateButton) {
        autoUpdateButton.textContent = '⬇️ Baixando Atualização...';
        autoUpdateButton.disabled = true;
      }
      break;
      
    case 'downloading':
      if (data.progress) {
        const percent = Math.round(data.progress.percent || 0);
        updateAutoUpdateStatus(
          `⬇️ Baixando atualização: ${percent}%`, 
          'info'
        );
      } else {
        updateAutoUpdateStatus('⬇️ Baixando atualização...', 'info');
      }
      break;
      
    case 'downloaded':
      updateAutoUpdateStatus(
        '✅ Atualização baixada! Clique para instalar ou reinicie o aplicativo.', 
        'success'
      );
      
      // Atualiza a exibição da versão para mostrar que está pronta para instalar
      if (currentUpdateInfo && currentUpdateInfo.version) {
        versionDisplay.textContent = `Versão: ${currentUpdateInfo.version} (Pronta para instalar)`;
        versionDisplay.style.backgroundColor = '#d4edda';
        versionDisplay.style.color = '#155724';
        versionDisplay.style.border = '1px solid #c3e6cb';
      }
      
      // Habilita botão para instalar
      if (autoUpdateButton) {
        autoUpdateButton.textContent = '🚀 Instalar Atualização';
        autoUpdateButton.disabled = false;
        autoUpdateButton.onclick = installLauncherUpdate;
      }
      break;
      
    case 'not-available':
      updateAutoUpdateStatus('✅ Você já tem a versão mais recente do launcher!', 'success');
      break;
      
    case 'error':
      updateAutoUpdateStatus(`❌ Erro: ${data.error}`, 'error');
      
      // Reabilita botão em caso de erro
      if (autoUpdateButton) {
        autoUpdateButton.disabled = false;
        autoUpdateButton.textContent = '🔄 Verificar Atualizações do Launcher';
        autoUpdateButton.onclick = checkForLauncherUpdates;
      }
      break;
      
    default:
      updateAutoUpdateStatus(`Status desconhecido: ${data.status}`, 'warning');
      break;
  }
}

async function installLauncherUpdate() {
  try {
    updateAutoUpdateStatus('🚀 Instalando atualização...', 'info');
    
    const result = await window.electronAPI.installUpdate();
    console.log('Resultado da instalação:', result);
    
    if (result.success) {
      updateAutoUpdateStatus('🔄 Reiniciando para aplicar atualização...', 'success');
    } else {
      updateAutoUpdateStatus(`Erro na instalação: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('Erro ao instalar atualização:', error);
    updateAutoUpdateStatus(`Erro: ${error.message}`, 'error');
  }
}

// Event listeners para os botões da barra de título
minimizeBtn?.addEventListener('click', () => {
  window.electronAPI.minimizeWindow();
});

maximizeBtn?.addEventListener('click', () => {
  window.electronAPI.maximizeWindow();
});

closeBtn?.addEventListener('click', () => {
  window.electronAPI.closeWindow();
});

// Função para verificar o status do jogo
async function checkGameStatus() {
  try {
    console.log('Verificando status do jogo...');
    const status = await window.electronAPI.checkGameStatus();
    console.log('Status recebido:', status);
    
    // Verifica se o processo está rodando
    const processStatus = await window.electronAPI.checkGameProcess();
    console.log('Status do processo:', processStatus);
    
    // Combina o status do jogo com o status do processo
    const combinedStatus = {
      ...status,
      isProcessRunning: processStatus.isRunning
    };
    
    updateUI(combinedStatus);
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    updateUI({ isInstalled: false, isUpdated: false, currentVersion: null, isProcessRunning: false });
  }
}

// Função para atualizar a interface baseada no status
function updateUI(status) {
  console.log('Atualizando UI com status:', status);
  
  if (status.isInstalled && status.isUpdated) {
    if (status.isProcessRunning) {
      // Jogo instalado, atualizado e rodando - Mostra botão de parar
      if (updateButton) {
        updateButton.textContent = '⏹️ Parar Jogo';
        updateButton.disabled = false;
        updateButton.style.background = 'linear-gradient(45deg, #dc3545, #c82333)';
      }
      statusText.textContent = `🎮 Jogo rodando (Release #${status.currentVersion}) - Clique em "Parar" para encerrar`;
      statusText.style.backgroundColor = '#d1ecf1';
      statusText.style.color = '#0c5460';
      statusText.style.border = '1px solid #bee5eb';
    } else {
      // Jogo instalado e atualizado mas não rodando - Mostra botão de jogar
      if (updateButton) {
        updateButton.textContent = '🎮 Jogar';
        updateButton.disabled = false;
        updateButton.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
      }
      statusText.textContent = `✅ Jogo instalado e atualizado (Release #${status.currentVersion}) - Clique em "Jogar" para iniciar`;
      statusText.style.backgroundColor = '#d4edda';
      statusText.style.color = '#155724';
      statusText.style.border = '1px solid #c3e6cb';
    }
  } else if (status.isInstalled && !status.isUpdated) {
    // Jogo instalado mas desatualizado - Mostra botão de atualizar
    if (updateButton) {
      updateButton.textContent = '🔄 Atualizar Jogo';
      updateButton.disabled = false;
      updateButton.style.background = 'linear-gradient(45deg, #ffc107, #fd7e14)';
    }
    
    if (status.latestVersion) {
      statusText.textContent = `⚠️ Atualização disponível! Release atual: #${status.currentVersion} → Nova release: #${status.latestVersion}`;
    } else {
      statusText.textContent = `⚠️ Jogo instalado mas desatualizado (Release #${status.currentVersion})`;
    }
    statusText.style.backgroundColor = '#fff3cd';
    statusText.style.color = '#856404';
    statusText.style.border = '1px solid #ffeaa7';
  } else if (status.needsUpdate && status.updateAvailable) {
    // Jogo precisa de atualização e há uma disponível
    if (updateButton) {
      updateButton.textContent = '🔄 Atualizar Jogo';
      updateButton.disabled = false;
      updateButton.style.background = 'linear-gradient(45deg, #ffc107, #fd7e14)';
    }
    
    if (status.latestVersion) {
      statusText.textContent = `🆕 Nova release disponível: #${status.latestVersion}! Clique em "Atualizar" para baixar.`;
    } else {
      statusText.textContent = '🔄 Atualização disponível! Clique em "Atualizar" para baixar.';
    }
    statusText.style.backgroundColor = '#fff3cd';
    statusText.style.color = '#856404';
    statusText.style.border = '1px solid #ffeaa7';
  } else {
    // Jogo não instalado - Mostra botão de baixar
    if (updateButton) {
      updateButton.textContent = '⬇️ Baixar Jogo';
      updateButton.disabled = false;
      updateButton.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
    }
    
    if (status.latestVersion) {
      statusText.textContent = `⬇️ Jogo não instalado. Release disponível: #${status.latestVersion}`;
    } else {
      statusText.textContent = '❌ Jogo não instalado';
    }
    statusText.style.backgroundColor = '#f8d7da';
    statusText.style.color = '#721c24';
    statusText.style.border = '1px solid #f5c6cb';
  }
}

// Event listener para o botão de auto updater
autoUpdateButton?.addEventListener('click', checkForLauncherUpdates);

// Event listener para o botão de teste de conectividade
testConnectionButton?.addEventListener('click', async () => {
  try {
    testConnectionButton.disabled = true;
    testConnectionButton.textContent = 'Testando...';
    
    statusText.textContent = '🔍 Testando conectividade com GitHub...';
    statusText.style.backgroundColor = '#e3f2fd';
    statusText.style.color = '#1565c0';
    statusText.style.border = '1px solid #bbdefb';
    
    const result = await window.electronAPI.testGitHubConnection();
    
    if (result.success) {
      statusText.textContent = '✅ Conexão com GitHub funcionando!';
      statusText.style.backgroundColor = '#d4edda';
      statusText.style.color = '#155724';
      statusText.style.border = '1px solid #c3e6cb';
      console.log('Teste de conectividade bem-sucedido:', result.data);
    } else {
      statusText.textContent = `❌ Erro na conexão: ${result.error}`;
      statusText.style.backgroundColor = '#f8d7da';
      statusText.style.color = '#721c24';
      statusText.style.border = '1px solid #f5c6cb';
      console.error('Teste de conectividade falhou:', result.error);
    }
  } catch (error) {
    console.error('Erro no teste:', error);
    statusText.textContent = `❌ Erro no teste: ${error.message}`;
    statusText.style.backgroundColor = '#f8d7da';
    statusText.style.color = '#721c24';
    statusText.style.border = '1px solid #f5c6cb';
  } finally {
    testConnectionButton.disabled = false;
    testConnectionButton.textContent = 'Testar Conexão';
  }
});

// Event listener para o botão principal (baixar/atualizar/jogar/parar)
updateButton?.addEventListener('click', async () => {
  if (!updateButton) return;

  console.log('Botão clicado! Texto atual:', updateButton.textContent);

  try {
    updateButton.disabled = true;
    const originalText = updateButton.textContent; // Armazena o texto original
    updateButton.textContent = 'Processando...';
    
    console.log('Texto original do botão:', originalText);
    
    if (originalText.includes('Baixar')) {
      // Baixar o jogo
      console.log('Iniciando processo de download...');
      statusText.textContent = '🔍 Verificando atualizações...';
      statusText.style.backgroundColor = '#e3f2fd';
      statusText.style.color = '#1565c0';
      statusText.style.border = '1px solid #bbdefb';
      
      const release = await window.electronAPI.checkUpdate();
      console.log('Release recebido:', release);
      
      // Usa o asset de jogo específico se disponível
      let asset = null;
      if (release.gameAsset) {
        asset = release.gameAsset;
        console.log('Usando asset de jogo específico:', asset.name);
      } else {
        // Fallback: procura por qualquer arquivo ZIP
        if (!release.assets || !Array.isArray(release.assets)) {
          throw new Error('Release não tem assets válidos');
        }
        
        asset = release.assets.find((a) => a.name.endsWith('.zip'));
        if (asset) {
          console.log('Asset ZIP encontrado como fallback:', asset.name);
        }
      }
      
             if (asset) {
         console.log('Asset encontrado:', asset);
         statusText.textContent = '⬇️ Baixando jogo... (isso pode demorar alguns minutos)';
         statusText.style.backgroundColor = '#fff3e0';
         statusText.style.color = '#ef6c00';
         statusText.style.border = '1px solid #ffcc02';
         
         // Mostra a barra de progresso
         showDownloadProgress();
         
         await window.electronAPI.downloadGame(asset.browser_download_url);
         
         // Mostra download concluído
         showDownloadComplete();
         
         statusText.textContent = '✅ Jogo baixado com sucesso!';
         statusText.style.backgroundColor = '#d4edda';
         statusText.style.color = '#155724';
         statusText.style.border = '1px solid #c3e6cb';
         
         alert('Jogo baixado com sucesso!');
         
         // Reverte o status após download
         await checkGameStatus();
       } else {
        throw new Error('Nenhum arquivo de jogo encontrado para download');
      }
    } else if (originalText.includes('Atualizar')) {
      // Atualizar o jogo
      console.log('Iniciando processo de atualização...');
      statusText.textContent = '🔍 Verificando atualizações...';
      statusText.style.backgroundColor = '#e3f2fd';
      statusText.style.color = '#1565c0';
      statusText.style.border = '1px solid #bbdefb';
      
      const release = await window.electronAPI.checkUpdate();
      console.log('Release recebido:', release);
      
      // Usa o asset de jogo específico se disponível
      let asset = null;
      if (release.gameAsset) {
        asset = release.gameAsset;
        console.log('Usando asset de jogo específico para atualização:', asset.name);
      } else {
        // Fallback: procura por qualquer arquivo ZIP
        if (!release.assets || !Array.isArray(release.assets)) {
          throw new Error('Release não tem assets válidos');
        }
        
        asset = release.assets.find((a) => a.name.endsWith('.zip'));
        if (asset) {
          console.log('Asset ZIP encontrado como fallback para atualização:', asset.name);
        }
      }
      
             if (asset) {
         console.log('Asset encontrado:', asset);
         statusText.textContent = '⬇️ Atualizando jogo... (isso pode demorar alguns minutos)';
         statusText.style.backgroundColor = '#fff3e0';
         statusText.style.color = '#ef6c00';
         statusText.style.border = '1px solid #ffcc02';
         
         // Mostra a barra de progresso
         showDownloadProgress();
         
         await window.electronAPI.downloadGame(asset.browser_download_url);
         
         // Mostra download concluído
         showDownloadComplete();
         
         statusText.textContent = '✅ Jogo atualizado com sucesso!';
         statusText.style.backgroundColor = '#d4edda';
         statusText.style.color = '#155724';
         statusText.style.border = '1px solid #c3e6cb';
         
         alert('Jogo atualizado com sucesso!');
         
         // Reverte o status após atualização
         await checkGameStatus();
       } else {
        throw new Error('Nenhum arquivo de jogo encontrado para atualização');
      }
    } else if (originalText.includes('Jogar')) {
      // Jogar o jogo
      console.log('Iniciando jogo...');
      statusText.textContent = '🎮 Iniciando jogo...';
      statusText.style.backgroundColor = '#e8f5e8';
      statusText.style.color = '#2e7d32';
      statusText.style.border = '1px solid #c8e6c9';
      
      try {
        await window.electronAPI.launchGame();
        statusText.textContent = '🎮 Jogo iniciado!';
        statusText.style.backgroundColor = '#d4edda';
        statusText.style.color = '#155724';
        statusText.style.border = '1px solid #c3e6cb';
        
        // Aguarda um pouco e verifica o status novamente para atualizar o botão
        setTimeout(async () => {
          await checkGameStatus();
        }, 2000);
      } catch (error) {
        console.error('Erro ao executar jogo:', error);
        statusText.textContent = `❌ Erro ao executar jogo: ${error.message}`;
        statusText.style.backgroundColor = '#f8d7da';
        statusText.style.color = '#721c24';
        statusText.style.border = '1px solid #f5c6cb';
        alert(`Erro ao executar jogo: ${error.message}`);
      }
    } else if (originalText.includes('Parar')) {
      // Parar o jogo
      console.log('Parando jogo...');
      statusText.textContent = '⏹️ Parando jogo...';
      statusText.style.backgroundColor = '#f8d7da';
      statusText.style.color = '#721c24';
      statusText.style.border = '1px solid #f5c6cb';
      
      try {
        const result = await window.electronAPI.stopGameProcess();
        console.log('Resultado da parada:', result);
        
        statusText.textContent = `✅ ${result.message}`;
        statusText.style.backgroundColor = '#d4edda';
        statusText.style.color = '#155724';
        statusText.style.border = '1px solid #c3e6cb';
        
        // Verifica o status novamente para atualizar o botão
        await checkGameStatus();
      } catch (error) {
        console.error('Erro ao parar jogo:', error);
        statusText.textContent = `❌ Erro ao parar jogo: ${error.message}`;
        statusText.style.backgroundColor = '#f8d7da';
        statusText.style.color = '#721c24';
        statusText.style.border = '1px solid #f5c6cb';
        alert(`Erro ao parar jogo: ${error.message}`);
      }
    } else {
      // Verificar atualizações (fallback)
      console.log('Verificando atualizações...');
      statusText.textContent = '🔍 Verificando atualizações...';
      statusText.style.backgroundColor = '#e3f2fd';
      statusText.style.color = '#1565c0';
      statusText.style.border = '1px solid #bbdefb';
      
      await checkGameStatus();
    }
  } catch (error) {
    console.error('Erro:', error);
    
    statusText.textContent = `❌ Erro: ${error.message}`;
    statusText.style.backgroundColor = '#f8d7da';
    statusText.style.color = '#721c24';
    statusText.style.border = '1px solid #f5c6cb';
    
    alert(`Erro: ${error.message}`);
  } finally {
    updateButton.disabled = false;
    // Só verifica o status se não for uma ação de parar (para evitar loop)
    if (!originalText.includes('Parar')) {
      await checkGameStatus();
    }
  }
});

// Event listener para o botão de jogar
// playButton?.addEventListener('click', () => {
//   try {
//     window.electronAPI.launchGame();
//   } catch (error) {
//     console.error('Erro ao executar jogo:', error);
//     alert(`Erro ao executar jogo: ${error.message}`);
//   }
// });

// Configura o listener de progresso do download
window.electronAPI.onDownloadProgress((event, data) => {
  updateDownloadProgress(data);
});

// Configura o listener de status do auto updater
window.electronAPI.onUpdateStatus((event, data) => {
  handleUpdateStatus(data);
});

// Verifica o status automaticamente ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
  // Verifica o status do jogo
  checkGameStatus();
  
  // Atualiza a exibição da versão
  await updateVersionDisplay();
  
  // Verifica o status inicial do auto updater
  try {
    const updateStatus = await window.electronAPI.getUpdateStatus();
    console.log('Status inicial do auto updater:', updateStatus);
    
    if (updateStatus.updateInfo) {
      currentUpdateInfo = updateStatus.updateInfo;
      updateAutoUpdateStatus(
        `🆕 Atualização disponível: ${updateStatus.updateInfo.version || 'nova versão'}!`, 
        'success'
      );
      
      if (autoUpdateButton) {
        autoUpdateButton.textContent = '🚀 Instalar Atualização';
        autoUpdateButton.onclick = installLauncherUpdate;
      }
    } else {
      updateAutoUpdateStatus('✅ Launcher atualizado', 'success');
    }
  } catch (error) {
    console.error('Erro ao obter status do auto updater:', error);
    updateAutoUpdateStatus('❌ Erro ao verificar status', 'error');
  }
});
