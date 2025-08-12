// Elementos da interface
const updateButton = document.getElementById('update');
const testConnectionButton = document.getElementById('test-connection');
const statusText = document.createElement('div');
statusText.id = 'status';
statusText.style.marginTop = '20px';
statusText.style.padding = '10px';
statusText.style.borderRadius = '5px';
statusText.style.textAlign = 'center';

// Adiciona o status ao DOM
document.body.appendChild(statusText);

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
  if (status.isInstalled && status.isUpdated) {
    if (status.isProcessRunning) {
      // Jogo instalado, atualizado e rodando - Mostra botão de parar
      if (updateButton) {
        updateButton.textContent = '⏹️ Parar Jogo';
        updateButton.disabled = false;
        updateButton.style.background = 'linear-gradient(45deg, #dc3545, #c82333)';
      }
      statusText.textContent = `🎮 Jogo rodando (v${status.currentVersion}) - Clique em "Parar" para encerrar`;
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
      statusText.textContent = `✅ Jogo instalado e atualizado (v${status.currentVersion}) - Clique em "Jogar" para iniciar`;
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
    statusText.textContent = `⚠️ Jogo instalado mas desatualizado (v${status.currentVersion})`;
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
    statusText.textContent = '❌ Jogo não instalado';
    statusText.style.backgroundColor = '#f8d7da';
    statusText.style.color = '#721c24';
    statusText.style.border = '1px solid #f5c6cb';
  }
}

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
        
        await window.electronAPI.downloadGame(asset.browser_download_url);
        
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
        
        await window.electronAPI.downloadGame(asset.browser_download_url);
        
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

// Verifica o status automaticamente ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  checkGameStatus();
});
