/**
 * Apps Script universal — grava JSON em qualquer planilha da conta que publicar este Web App.
 *
 * Uso:
 *   POST <URL_DO_WEB_APP>/exec?spreadsheetId=<ID>&tab=<Nome da Aba>
 *   Content-Type: application/json
 *   Body: { "coluna_a": "valor", "coluna_b": "valor", ... }
 *
 * As chaves do JSON são casadas com os cabeçalhos da linha 1 da aba.
 * - Aba inexistente: é criada, usando as chaves do JSON como cabeçalho.
 * - Linha 1 vazia: os cabeçalhos são escritos a partir das chaves do JSON.
 * - Chave sem cabeçalho correspondente: uma nova coluna é adicionada no fim.
 *
 * Deploy: Implantar → Nova implantação → Tipo "App da Web"
 *   Executar como: Eu
 *   Quem pode acessar: Qualquer pessoa
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    var spreadsheetId = e && e.parameter ? e.parameter.spreadsheetId : null;
    if (!spreadsheetId) return _json({ ok: false, error: 'Parâmetro spreadsheetId ausente.' });

    var tabName = (e.parameter.tab || 'Leads').toString();
    var payload = JSON.parse(e.postData.contents);
    if (payload.body) payload = payload.body; // aceita { body: {...} } vindo do n8n

    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheet = ss.getSheetByName(tabName);
    var keys = Object.keys(payload);

    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      sheet.getRange(1, 1, 1, keys.length).setValues([keys]);
    }

    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
      return h === null || h === undefined ? '' : h.toString().trim();
    });

    // Linha 1 em branco → usa as chaves do payload como cabeçalho.
    if (headers.join('') === '') {
      headers = keys;
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // Chaves novas viram colunas extras no fim, sem perder o que já existe.
    var novas = keys.filter(function (k) { return headers.indexOf(k) === -1; });
    if (novas.length) {
      sheet.getRange(1, headers.length + 1, 1, novas.length).setValues([novas]);
      headers = headers.concat(novas);
    }

    var linha = headers.map(function (h) {
      var v = payload[h];
      if (v === null || v === undefined) return '';
      return typeof v === 'object' ? JSON.stringify(v) : v;
    });

    // Formata a linha como texto puro antes de escrever: preserva "+595...",
    // zeros à esquerda e evita que valores iniciados por + ou = virem fórmula.
    var novaLinha = sheet.getLastRow() + 1;
    var destino = sheet.getRange(novaLinha, 1, 1, linha.length);
    destino.setNumberFormat('@');
    destino.setValues([linha]);

    return _json({ ok: true, tab: tabName, row: novaLinha });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Health check: GET ...?spreadsheetId=<ID> lista as abas da planilha. */
function doGet(e) {
  try {
    var spreadsheetId = e && e.parameter ? e.parameter.spreadsheetId : null;
    if (!spreadsheetId) return _json({ ok: true, status: 'online' });

    var abas = SpreadsheetApp.openById(spreadsheetId).getSheets().map(function (s) {
      return { name: s.getName(), rows: s.getLastRow() };
    });
    return _json({ ok: true, tabs: abas });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
