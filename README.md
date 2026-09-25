# Currículo AI

Aplicação que transforma informações profissionais em currículos estruturados e permite exportar três estilos visuais em PDF ou DOCX.

## Configuração

1. Instale o Node.js 20 ou superior.
2. Entre em `backend` e instale as dependências:

```bash
npm install
```

3. Copie `.env.example` para `.env` e informe uma chave válida do Gemini.
4. Inicie a API:

```bash
npm start
```

5. Abra `frontend/index.html` no navegador. Para evitar bloqueios de origem em ambientes restritos, sirva a pasta `frontend` por um servidor HTTP local.

## Funcionalidades

- Geração estruturada com IA sem inventar informações.
- Prévia do currículo no modelo clássico.
- Download em PDF e DOCX com os estilos clássico, moderno e minimalista.
- Exemplos para estudante, profissional de TI, primeiro emprego e desenvolvimento júnior.

## Segurança

Nunca versione `.env` ou chaves de API. A chave que esteve no histórico do projeto deve ser revogada e substituída no painel do provedor.
