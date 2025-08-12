# 🚀 INSTRUÇÕES PARA CRIAR EXECUTÁVEL

## 📋 Pré-requisitos

1. **Instalar dependências**: `npm install`
2. **Criar ícone**: Você precisa de um arquivo `icon.ico` na pasta `src`

## 🎨 Criando o Ícone

### Opção 1: Converter PNG para ICO
1. Crie um arquivo PNG (recomendado: 256x256 pixels)
2. Use um conversor online (ex: convertio.co, icoconvert.com)
3. Salve como `icon.ico` na pasta `src`

### Opção 2: Usar ícone existente
1. Copie qualquer arquivo `.ico` existente
2. Renomeie para `icon.ico`
3. Coloque na pasta `src`

## 🔨 Comandos de Build

### 1. Build Completo (Instalador + Portable)
```bash
npm run dist
```

### 2. Apenas Windows (Instalador + Portable)
```bash
npm run dist-win
```

### 3. Apenas Portable
```bash
npm run dist-win-portable
```

### 4. Teste de Build (sem criar executável)
```bash
npm run pack
```

## 📁 Arquivos Gerados

Após o build, você encontrará na pasta `dist-build`:

- **`Game Launcher Setup.exe`** - Instalador NSIS
- **`GameLauncher-Portable.exe`** - Versão portable
- **`win-unpacked/`** - Pasta com arquivos descompactados

## ⚙️ Configurações do Build

### Instalador NSIS:
- ✅ Instalação personalizável
- ✅ Atalhos no Desktop e Menu Iniciar
- ✅ Desinstalador automático
- ✅ Permite escolher diretório

### Versão Portable:
- ✅ Executa sem instalação
- ✅ Pode ser copiada para USB
- ✅ Não modifica o sistema

## 🚨 Solução de Problemas

### Erro: "icon.ico not found"
- Verifique se o arquivo `icon.ico` existe na pasta `src`
- Use um arquivo ICO válido (não PNG renomeado)

### Erro: "electron-builder not found"
- Execute: `npm install --save-dev electron-builder`

### Build muito lento:
- Feche outros programas
- Desative antivírus temporariamente
- Use SSD se possível

## 📱 Distribuição

### Para Usuários Finais:
1. **Instalador**: `Game Launcher Setup.exe`
2. **Portable**: `GameLauncher-Portable.exe`

### Para Desenvolvedores:
- Pasta `win-unpacked/` para testes
- Arquivos de log em `dist-build/`

## 🎯 Dicas de Otimização

1. **Ícone**: Use 256x256 pixels para melhor qualidade
2. **Versão**: Atualize `version` no `package.json` antes de cada build
3. **Teste**: Sempre teste o executável em uma máquina limpa
4. **Backup**: Mantenha backups dos builds anteriores

## 🔄 Atualizações Automáticas

O launcher está configurado para:
- ✅ Verificar atualizações no GitHub
- ✅ Baixar e instalar automaticamente
- ✅ Notificar usuários sobre novas versões

---

**🎮 Agora você pode distribuir seu Game Launcher como um executável profissional!**



