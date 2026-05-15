/**
 * CÓDIGO PARA O GOOGLE APPS SCRIPT - APENAS PARA PRESENTES
 * 
 * INSTRUÇÕES:
 * 1. Crie uma nova planilha no Google Sheets (para os presentes).
 * 2. Vá em Extensões > Apps Script.
 * 3. Apague todo o código que estiver lá e cole este código abaixo.
 * 4. Salve o projeto.
 * 5. Clique em "Implantar" (Deploy) > "Nova implantação".
 * 6. Selecione o tipo "App da Web" (Web App).
 * 7. Executar como: "Eu".
 * 8. Quem pode acessar: "Qualquer pessoa" (Anyone).
 * 9. Clique em Implantar e copie a nova URL.
 * 10. Coloque essa nova URL no arquivo .env como VITE_GOOGLE_SCRIPT_GIFTS_URL e também no Netlify!
 */

const GIFTS_SHEET_NAME = "Presentes";

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let giftsSheet = ss.getSheetByName(GIFTS_SHEET_NAME);
  
  if (!giftsSheet) {
    // Se a aba "Presentes" não existir, cria ou renomeia a "Página1"
    const sheet1 = ss.getSheetByName("Página1") || ss.getSheetByName("Sheet1");
    if (sheet1) {
      sheet1.setName(GIFTS_SHEET_NAME);
      giftsSheet = sheet1;
    } else {
      giftsSheet = ss.insertSheet(GIFTS_SHEET_NAME);
    }
    // Cria o cabeçalho se a planilha for nova
    if (giftsSheet.getLastRow() === 0) {
      giftsSheet.appendRow(["Carimbo de data/hora", "ID do Produto", "Nome do Produto", "Convidado"]);
    }
  }
  return giftsSheet;
}

function doPost(e) {
  try {
    const sheet = setupSheet();
    
    let payload = {};
    if (e.postData && e.postData.contents) {
      try { payload = JSON.parse(e.postData.contents); } catch (err) {}
    }
    if (e.parameter) {
      for (let key in e.parameter) {
        if (!payload[key]) payload[key] = e.parameter[key];
      }
    }

    const timestamp = new Date();
    const giftId = payload.giftId || "";
    const giftName = payload.giftName || "";
    const guestName = payload.guestName || "";

    if (!giftId) {
      return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "giftId não informado." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    sheet.appendRow([timestamp, giftId, giftName, guestName]);

    return ContentService.createTextOutput(JSON.stringify({ "result": "success", "message": "Presente reservado com sucesso!" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = setupSheet();
    const data = sheet.getDataRange().getValues();
    const reservedGifts = [];

    // Ignora a primeira linha (cabeçalho)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const giftId = row[1];
      const giftName = row[2];
      const guestName = row[3];

      if (giftId) {
        reservedGifts.push({
          id: String(giftId),
          name: giftName ? String(giftName) : "Sem nome",
          reserved_by: guestName ? String(guestName) : "Não informado"
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ "reserved": reservedGifts }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
