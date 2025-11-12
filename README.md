
# UCAD - Uma Comunidade de Apoio na luta contra as Drogas

Este repositório contém uma aplicação simples (backend + frontend estático) chamada UCAD — uma pequena comunidade para compartilhar publicações, comentar, editar perfil e compartilhar imagens. O objetivo deste README é explicar como configurar e executar o projeto em um ambiente de desenvolvimento local.

Sumário
- Sobre
- Funcionalidades
- Tecnologias
- Preparação do ambiente (MySQL e Node.js)
- Como executar (backend e frontend)
- Endpoints principais (rápido resumo)
- Observações de segurança
- Contribuição

## Sobre

UCAD é um protótipo de rede social educativa focada em apoio, informação e troca de experiências. É minimalista e serve como base para prototipagem — ideal para estudar como integrar upload de imagens, comentários e perfis de usuário.

## Funcionalidades

- Cadastro e login de usuários (simples)
- Criação de publicações com texto e imagem
- Visualização de feed e detalhe do post
- Comentários em posts
- Edição de perfil e upload de foto de perfil
- Visualização de avatar no cabeçalho e junto às publicações

## Tecnologias

- Backend: Node.js + Express
- Base de dados: MySQL (utilizando `mysql2` no backend)
- Uploads: `multer` (armazenamento temporário em memória e salvamento em BLOB no MySQL)
- Frontend: HTML, CSS e JavaScript (puro)

## Preparação do ambiente

Requisitos mínimos:
- Node.js (recomendado versão 14+)
- MySQL instalado e executando
- Python (opcional, para servir o frontend com `http.server`)

1) Crie o banco de dados no MySQL

- Abra seu cliente MySQL e crie um banco chamado `Ucad` (se ainda não existir). Em seguida rode o script `backend/bancodedados.sql` para criar as tabelas.

Exemplo (PowerShell):

```powershell
# entre no cliente mysql (ajuste usuário/senha conforme seu ambiente)
mysql -u root -p
# dentro do cliente mysql:
CREATE DATABASE IF NOT EXISTS Ucad CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE Ucad;
SOURCE .\backend\bancodedados.sql;
EXIT;
```

Se preferir, abra `backend/bancodedados.sql` e rode manualmente os comandos CREATE TABLE nele contidos.

2) Configurar credenciais

- O arquivo `backend/src/db_config.js` contém as credenciais para se conectar ao MySQL. Ajuste `host`, `user`, `password` e `database` conforme sua máquina.

## Executando o backend

1. Instale dependências e inicie o servidor:

```powershell
cd .\backend
npm install
npm start
```

2. O servidor roda por padrão em `http://localhost:3000`.

## Servindo o frontend

O frontend é composto por arquivos estáticos na pasta `frontend/`. Para evitar problemas de CORS/origens, sirva o diretório com um servidor estático. Alguns métodos:

- Usando Python (rápido):

```powershell
cd .\frontend
python -m http.server 8000
# abra http://localhost:8000/index.html
```

- Ou use a extensão "Live Server" no VS Code, ou qualquer servidor estático de sua preferência.

Observação: você também pode abrir os arquivos diretamente com `file://` no navegador, mas servir via HTTP é mais confiável para fetch/XHR.

## Endpoints principais (resumo)

O backend expõe rotas REST básicas. Abaixo um resumo rápido:

- POST /login — body: { email, password } → autentica (retorna user básico)
- POST /cadastro — body: { name, email, password } → cria usuário
- GET /posts — lista posts (sem imagens embutidas; tem flag `has_image`)
- POST /posts — multipart/form-data: { user_id, content, image? } → cria post
- GET /posts/:id — retorna post (inclui `image_url` se existir)
- PUT /posts/:id — editar post (checa `user_id` enviado)
- DELETE /posts/:id — deletar post (checa `user_id` enviado)
- GET /posts/:id/comments — lista comentários do post
- POST /posts/:id/comments — body: { user_id, content } → adiciona comentário
- GET /users/:id — retorna usuário (inclui `picture_url` se foto de perfil existir)
- PUT /users/:id — multipart/form-data: atualiza perfil (pode enviar `profile_picture`)

Para detalhes, abra `backend/src/server.js`.

## Observações de segurança (importante)

- Este projeto é um protótipo e não é pronto para produção.
- Senhas são armazenadas em texto simples no banco de dados neste código inicial: é altamente recomendável adicionar hashing de senhas (bcrypt) antes de qualquer uso real.
- Não existe autenticação baseada em tokens (JWT/sessões) neste protótipo — o frontend envia `user_id` nos requests para controlar autorizações. Em produção, troque isso por tokens seguros e verifique no servidor os usuários autenticados.
- As imagens são salvas como BLOB no MySQL. Para aplicações maiores, considere armazenar arquivos em um sistema de arquivos ou serviço de armazenamento (S3, etc.) e salvar apenas referências no banco.

## Possíveis melhorias

- Hash de senhas com bcrypt
- Autenticação com JWT ou sessões seguras
- Retornar `author.picture_url` diretamente no endpoint `/posts` para evitar múltiplas requisições no feed
- Validar e sanitizar entradas do usuário no servidor
- Paginação do feed e otimizações de performance

