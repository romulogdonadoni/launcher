# 🚀 COMO CRIAR INSTALADOR - GUIA RÁPIDO

## ✅ **PASSO A PASSO**

### 1. **Criar Ícone (OBRIGATÓRIO)**
```
📁 src/icon.ico ← Você precisa deste arquivo!
```
- Use um conversor online (convertio.co)
- Ou copie um arquivo .ico existente
- **Tamanho recomendado**: 256x256 pixels

### 2. **Criar Instalador**
```bash
# Instalador NSIS (recomendado)
npm run dist

# Ou especificamente para Windows
npm run dist-win
```

### 3. **Arquivo Gerado**
```
📁 dist-build/
└── Game Launcher Setup.exe    ← Instalador com atalho na área de trabalho
```

## 🎯 **COMANDOS DISPONÍVEIS**

| Comando | Descrição |
|---------|-----------|
| `npm run pack` | Teste de build (sem executável) |
| `npm run dist` | **Instalador NSIS** com atalho na área de trabalho |
| `npm run dist-win` | **Instalador NSIS** para Windows |

## ⚙️ **O QUE O INSTALADOR FAZ**

✅ **Instala** o programa no sistema  
✅ **Cria atalho** na área de trabalho  
✅ **Cria atalho** no menu iniciar  
✅ **Permite escolher** diretório de instalação  
✅ **Cria desinstalador** automático  
✅ **Usa ícone personalizado** em todos os lugares  

## ⚠️ **IMPORTANTE**

- ✅ **Ícone obrigatório**: `src/icon.ico`
- ✅ **Teste primeiro**: `npm run pack`
- ✅ **Criar instalador**: `npm run dist`
- ✅ **Arquivo em**: `dist-build/Game Launcher Setup.exe`

## 🎮 **RESULTADO**

Após o build, você terá:
1. **Instalador profissional** `Game Launcher Setup.exe`
2. **Atalho automático** na área de trabalho
3. **Atalho no menu iniciar**
4. **Desinstalador** no painel de controle

## 📱 **DISTRIBUIÇÃO**

- **Envie o arquivo**: `Game Launcher Setup.exe`
- **Usuários executam** o instalador
- **Atalho é criado** automaticamente na área de trabalho
- **Programa fica instalado** no sistema

---

**🎯 Execute `npm run dist` para criar o instalador com atalho na área de trabalho!**

