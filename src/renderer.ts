import type { GameStatus } from './types';

// Elementos da interface
const updateButton = document.getElementById('update') as HTMLButtonElement | null;
const playButton = document.getElementById('play') as HTMLButtonElement | null;
const statusText = document.createElement('div') as HTMLDivElement;
statusText.id = 'status';
statusText.style.marginTop = '20px';
statusText.style.padding = '10px';
statusText.style.borderRadius = '5px';
statusText.style.textAlign = 'center';

// Adiciona o status ao DOM
document.body.appendChild(statusText);

// Função para verificar o status do jogo
async function checkGameStatus(): Promise<void> {
  try {
    console.log('Verificando status do jogo...');
    const status: GameStatus = await window.electronAPI.checkGameStatus();
    console.log('Status recebido:', status);
    
    updateUI(status);
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    updateUI({ isInstalled: false, isUpdated: false, currentVersion: null });
  }
}

// Função para atualizar a interface baseada no status
function updateUI(status: GameStatus): void {
  if (status.isInstalled && status.isUpdated) {
    // Jogo instalado e atualizado
    if (updateButton) updateButton.textContent = 'Verificar Atualizações';
    if (updateButton) updateButton.disabled = false;
    if (playButton) playButton.disabled = false;
    statusText.textContent = `✅ Jogo instalado (v${status.currentVersion})`;
    statusText.style.backgroundColor = '#d4edda';
    statusText.style.color = '#155724';
    statusText.style.border = '1px solid #c3e6cb';
  } else if (status.isInstalled && !status.isUpdated) {
    // Jogo instalado mas desatualizado
    if (updateButton) updateButton.textContent = 'Atualizar Jogo';
    if (updateButton) updateButton.disabled = false;
    if (playButton) playButton.disabled = true;
    statusText.textContent = `⚠️ Jogo desatualizado (v${status.currentVersion})`;
    statusText.style.backgroundColor = '#fff3cd';
    statusText.style.color = '#856404';
    statusText.style.border = '1px solid #ffeaa7';
  } else {
    // Jogo não instalado
    if (updateButton) updateButton.textContent = 'Baixar Jogo';
    if (updateButton) updateButton.disabled = false;
    if (playButton) playButton.disabled = true;
    statusText.textContent = '❌ Jogo não instalado';
    statusText.style.backgroundColor = '#f8d7da';
    statusText.style.color = '#721c24';
    statusText.style.border = '1px solid #f5c6cb';
  }
}

// Event listener para o botão de atualizar/baixar
updateButton?.addEventListener('click', async () => {
  if (!updateButton) return;

  try {
    updateButton.disabled = true;
    updateButton.textContent = 'Processando...';
    
    if (updateButton.textContent.includes('Baixar') || updateButton.textContent.includes('Atualizar')) {
      // Baixar ou atualizar o jogo
      const release: any = await window.electronAPI.checkUpdate();
      console.log('Release recebido:', release);
      
      if (!release.assets || !Array.isArray(release.assets)) {
        throw new Error('Release não tem assets válidos');
      }
      
      const asset = release.assets.find((a: any) => a.name.endsWith('.zip'));
      if (asset) {
        console.log('Asset encontrado:', asset);
        await window.electronAPI.downloadGame(asset.browser_download_url);
        alert('Jogo atualizado com sucesso!');
        
        // Reverte o status após download
        await checkGameStatus();
      } else {
        throw new Error('Nenhum arquivo .zip encontrado para download');
      }
    } else {
      // Apenas verificar atualizações
      await checkGameStatus();
    }
  } catch (error) {
    console.error('Erro:', error);
    alert(`Erro: ${(error as Error).message}`);
  } finally {
    updateButton.disabled = false;
    await checkGameStatus();
  }
});

// Event listener para o botão de jogar
playButton?.addEventListener('click', () => {
  try {
    window.electronAPI.launchGame();
  } catch (error) {
    console.error('Erro ao executar jogo:', error);
    alert(`Erro ao executar jogo: ${(error as Error).message}`);
  }
});

// Verifica o status automaticamente ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  checkGameStatus();
});