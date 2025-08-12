# 🎨 COMO CRIAR O ÍCONE - GUIA RÁPIDO

## ⚠️ **OBRIGATÓRIO PARA BUILD**

**Sem este arquivo, o build NÃO funcionará!**

## 📁 **LOCALIZAÇÃO**

```
📁 src/icon.ico ← DEVE estar aqui!
```

## 🎯 **OPÇÕES PARA CRIAR O ÍCONE**

### **Opção 1: Converter PNG para ICO (RECOMENDADO)**

1. **Crie uma imagem PNG**:
   - Tamanho: **256x256 pixels** (recomendado)
   - Formato: PNG com fundo transparente
   - Assunto: 🎮 (jogo, launcher, etc.)

2. **Converta online**:
   - [convertio.co](https://convertio.co/png-ico/)
   - [icoconvert.com](https://icoconvert.com/)
   - [favicon.io](https://favicon.io/favicon-converter/)

3. **Salve como**: `icon.ico` na pasta `src`

### **Opção 2: Usar Ícone Existente**

1. **Copie qualquer arquivo .ico**:
   - Do Windows (C:\Windows\System32\*.ico)
   - De outros programas
   - Da internet

2. **Renomeie para**: `icon.ico`

3. **Coloque na pasta**: `src`

### **Opção 3: Criar Ícone Simples**

1. **Use um editor online**:
   - [favicon.io](https://favicon.io/favicon-generator/)
   - [realfavicongenerator.net](https://realfavicongenerator.net/)

2. **Escolha um emoji**: 🎮 🚀 ⚡ 🎯

3. **Baixe como**: `icon.ico`

## ✅ **VERIFICAÇÃO**

Após criar o arquivo, verifique:

```
📁 src/
├── main.js
├── preload.js
├── renderer.js
├── index.html
└── icon.ico ← ✅ DEVE existir aqui!
```

## 🚨 **PROBLEMAS COMUNS**

### **Erro: "icon.ico not found"**
- ✅ Verifique se o arquivo está em `src/icon.ico`
- ✅ Use um arquivo ICO válido (não PNG renomeado)
- ✅ Verifique a extensão do arquivo

### **Ícone não aparece**
- ✅ Use tamanho 256x256 pixels
- ✅ Formato ICO válido
- ✅ Arquivo não corrompido

## 🎮 **EXEMPLO DE ÍCONE**

Se quiser um ícone simples, use este emoji: 🎮

**Passos**:
1. Vá para [favicon.io](https://favicon.io/favicon-generator/)
2. Digite: 🎮
3. Baixe como ICO
4. Renomeie para `icon.ico`
5. Coloque na pasta `src`

---

**🎯 Crie o arquivo `src/icon.ico` e depois execute `npm run dist`!**
