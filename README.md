# Passagem de conta: Dra. Fernanda Ângelo (HOF For You)

Pacote para replicar toda a estrutura de captação de leads na sua própria conta.

## O que existe (5 formulários / quizzes)

| Quiz (pasta em /quizzes) | Público | Webhook do n8n | Workflow (pasta /workflows-n8n) |
|---|---|---|---|
| hof-lineskin-fernanda-quiz | Paciente: firmeza corporal (LineSkin) | /webhook/hof-lineskin-lead | 3-LineSkin.json |
| hof-nbm-quiz | Paciente: perfil facial (NBM) | /webhook/hof-nbm-lead | 4-NBM.json |
| hof-bbup-quiz | Paciente: glúteos (BB UP) | /webhook/hof-bbup-lead | 2-BBUP.json |
| hof-for-you-quiz | Paciente: BB UP, versão original (v1) | /webhook/hof-quiz-lead | 1-BBUP-legado-hof-for-you-quiz.json |
| skinface-quiz | Profissional da saúde: formação educacional SkinFace | /webhook/skinface-quiz-lead | 5-SkinFace-educacional.json |

Dica: o hof-for-you-quiz é a primeira versão do BB UP. Se você for usar só o hof-bbup-quiz, pode ignorar o hof-for-you-quiz e o workflow 1.

## Como tudo funciona

Lead responde o quiz (HTML hospedado na Vercel)
-> o quiz envia um POST para um webhook do n8n
-> o n8n faz duas coisas ao mesmo tempo:
   1. grava o lead numa planilha Google (via Apps Script)
   2. envia o evento "Lead" para a Meta Conversions API (CAPI), só no envio final

## O que você precisa criar na SUA conta

- [ ] n8n (próprio ou cloud) 
- [ ] Conta Google com 1 planilha de leads (pode ser 1 por produto) + 1 Apps Script publicado
- [ ] Pixel/Dataset da Meta + token de acesso da Conversions API
- [ ] Conta Vercel (para hospedar os quizzes)

## O que NÃO é seu (não reutilizar)

Pixel 1483548759360040, token da Meta, Apps Scripts e planilhas do Renan, projetos Vercel dele. Os JSONs deste pacote já vêm SEM token, sem pixel e sem URL de Apps Script (tem placeholders SEU_...).

## Passo a passo

### 1. Planilha e Apps Script (15 min)
1. Crie uma planilha Google chamada "HOF For You - Leads". Anote o ID (trecho entre /d/ e /edit na URL).
2. Entre em script.google.com, novo projeto, cole o conteúdo de apps-script/Code.gs.
3. Implantar > Nova implantação > Tipo "App da Web". Executar como: Eu. Quem pode acessar: Qualquer pessoa.
4. Copie a URL que termina em /exec.
5. Se der 403, use uma conta Gmail pessoal (contas Workspace às vezes bloqueiam). 
6. Teste no navegador: abra  URL/exec?spreadsheetId=SEU_ID  (deve listar as abas).

Como o script funciona: cada POST em  URL/exec?spreadsheetId=ID&tab=NomeDaAba  grava uma linha, casando as chaves do JSON com o cabeçalho. Aba e cabeçalho são criados sozinhos na primeira vez. Sugestão de abas: LineSkin, NBM, BBUP, SkinFace (uma por produto).

### 2. Meta (10 min)
1. Gerenciador de Eventos: crie ou use um Pixel/Dataset seu. Anote o ID.
2. Configurações > API de Conversões > gere o token de acesso. Anote.
3. Use "Testar eventos" para pegar o test_event_code durante os testes.

### 3. n8n (20 min)
1. Importe os 5 JSONs (Workflows > Import from file).
2. Em CADA workflow, edite:
   - nó "Enviar para Google Sheets": troque a URL por  https://script.google.com/macros/s/SEU_ID_DO_APPS_SCRIPT/exec?spreadsheetId=SEU_ID_DA_PLANILHA&tab=NOME_DA_ABA
   - nó "Enviar Lead para Meta CAPI": troque SEU_PIXEL_ID na URL e SEU_TOKEN_META_CAPI no parâmetro access_token.
3. Os nós de Sheets e CAPI já vêm com Retry on Fail (3 tentativas). Não remova: o Apps Script do Google devolve 404 intermitente em 2 a 6% das chamadas.
4. Ative cada workflow (Active) e copie a URL de PRODUÇÃO do webhook (não a de teste).

### 4. Quizzes (20 min)
Em cada pasta de /quizzes, abra o index.html (o outro .html com nome do quiz é cópia idêntica) e troque:
- WEBHOOK_URL = '...'  pela URL de produção do seu n8n
- Pixel ID (aparece no topo, no script do fbevents e no <noscript>: procure 1483548759360040)
- número de WhatsApp (procure wa.me/) pelo da clínica/atendimento
Depois, em cada pasta: vercel --prod (ou arraste a pasta no painel da Vercel). Cada quiz é um projeto separado.

### 5. Teste ponta a ponta
1. Preencha cada quiz até o fim com dados falsos.
2. Confira: a linha apareceu na planilha? Execução verde no n8n? Evento Lead apareceu em "Testar eventos" da Meta?
3. Apague as linhas de teste.

## Cuidados
- Nunca cole token da Meta em chat público ou repositório.
- Dois quizzes não podem compartilhar o mesmo path de webhook.
- Se o lead não chegar na planilha mas o n8n estiver verde, olhe a resposta do nó Sheets (pode ser 200 com erro dentro do JSON).
