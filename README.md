# 🎮 Game Launcher

Um launcher personalizado para jogos com interface moderna e funcionalidades avançadas.

## 🚀 **CRIAR INSTALADOR (PASSO A PASSO)**

### **1. Pré-requisitos**
```bash
npm install
```

### **2. Criar Instalador**
```bash
npm run dist
```

### **3. Resultado**
- 📁 `dist-build/Game Launcher Setup.exe` ← **Instalador final**

## ⚙️ **O QUE O INSTALADOR FAZ**

✅ **Instala** o programa no sistema  
✅ **Cria atalho** na área de trabalho  
✅ **Cria atalho** no menu iniciar  
✅ **Permite escolher** diretório de instalação  
✅ **Cria desinstalador** automático  

## 📁 **ESTRUTURA DO PROJETO**

```
📁 launcher/
├── 📁 src/
│   ├── main.js          ← Processo principal
│   ├── preload.js       ← Bridge para renderer
│   ├── renderer.js      ← Interface do usuário
│   ├── index.html       ← Layout da interface
│   └── icon.ico         ← Ícone do aplicativo
├── package.json         ← Configurações e dependências
├── COMO_CRIAR_EXECUTAVEL.md ← Guia completo
└── COMO_CRIAR_ICONE.md      ← Guia do ícone
```

## 🎯 **COMANDOS DISPONÍVEIS**

| Comando | Descrição |
|---------|-----------|
| `npm start` | Executar em modo desenvolvimento |
| `npm run pack` | Teste de build (sem executável) |
| `npm run dist` | **Criar instalador** com atalho na área de trabalho |

## 🔧 **FUNCIONALIDADES**

- 🎮 **Download automático** de jogos do GitHub
- 🔄 **Verificação de atualizações** automática
- 🚀 **Lançamento de jogos** com um clique
- ⏹️ **Controle de processos** (iniciar/parar)
- 🎨 **Interface moderna** com barra de título customizada
- 📱 **Sistema tray** para minimizar para bandeja
- 🔒 **Atualizações automáticas** via GitHub

## 📱 **DISTRIBUIÇÃO**

1. **Execute**: `npm run dist`
2. **Envie**: `Game Launcher Setup.exe`
3. **Usuários instalam** e têm atalho na área de trabalho

## 🚨 **IMPORTANTE**

- ✅ **Ícone obrigatório**: `src/icon.ico` (já existe!)
- ✅ **Teste primeiro**: `npm run pack`
- ✅ **Criar instalador**: `npm run dist`

---

**🎯 Execute `npm run dist` para criar o instalador com atalho na área de trabalho!**
