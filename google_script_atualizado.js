/**
 * CÓDIGO PARA O GOOGLE APPS SCRIPT
 * 
 * INSTRUÇÕES:
 * 1. Abra sua planilha do Google Sheets.
 * 2. Vá em Extensões > Apps Script.
 * 3. Apague todo o código que estiver lá e cole este código abaixo.
 * 4. Salve o projeto.
 * 5. Clique em "Implantar" (Deploy) > "Nova implantação".
 * 6. Selecione o tipo "App da Web" (Web App).
 * 7. Executar como: "Eu".
 * 8. Quem pode acessar: "Qualquer pessoa" (Anyone).
 * 9. Clique em Implantar e copie a nova URL (se ela mudar, atualize no seu site).
 * 
 * NOTA: Este script NÃO apaga nenhum dado que já está na sua planilha! 
 * Os nomes das pessoas que já confirmaram continuarão lá intactos.
 */

const RSVP_SHEET_NAME = "Respostas RSVP";
const GIFTS_SHEET_NAME = "Presentes";

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Configura aba de RSVP se não existir
  let rsvpSheet = ss.getSheetByName(RSVP_SHEET_NAME);
  if (!rsvpSheet) {
    rsvpSheet = ss.insertSheet(RSVP_SHEET_NAME);
    rsvpSheet.appendRow(["Carimbo de data/hora", "Nome", "Cerimônia", "Restaurante", "Adultos", "Nomes Acompanhantes", "Crianças", "Nomes Crianças", "Mensagem"]);
  }

  // Configura aba de Presentes se não existir
  let giftsSheet = ss.getSheetByName(GIFTS_SHEET_NAME);
  if (!giftsSheet) {
    giftsSheet = ss.insertSheet(GIFTS_SHEET_NAME);
    giftsSheet.appendRow(["Carimbo de data/hora", "ID do Produto", "Nome do Produto", "Convidado"]);
  }
}

function doPost(e) {
  setupSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    // Se for uma requisição de reserva de presente
    // Segurança: só grava se o corpo do POST (e.postData.contents) estiver presente
    if (e.parameter && e.parameter.action === 'reserveGift') {
      // Se veio pelo corpo do POST, preferimos parsear o JSON
      let payload = null;
      if (e.postData && e.postData.contents) {
        try {
          payload = JSON.parse(e.postData.contents);
        } catch (err) {
          // fallback para usar e.parameter
          payload = e.parameter;
        }
      } else {
        // Sem corpo de POST — rejeitamos para evitar gravações indevidas
        return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "POST body missing; reservation not recorded." }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      const sheet = ss.getSheetByName(GIFTS_SHEET_NAME);
      const timestamp = new Date();
      const giftId = (payload && payload.giftId) ? payload.giftId : "";
      const giftName = (payload && payload.giftName) ? payload.giftName : "";
      const guestName = (payload && payload.guestName) ? payload.guestName : "";

      if (!giftId) {
        return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "giftId missing; reservation not recorded." }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      sheet.appendRow([timestamp, giftId, giftName, guestName]);

      return ContentService.createTextOutput(JSON.stringify({ "result": "success", "message": "Presente reservado com sucesso!" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // Se for uma requisição de RSVP normal
    else {
      const sheet = ss.getSheetByName(RSVP_SHEET_NAME);

      let data = e.parameter;
      if (!data || Object.keys(data).length === 0) {
        if (e.postData && e.postData.contents) {
          data = JSON.parse(e.postData.contents);
        }
      }

      const timestamp = data.timestamp || new Date();
      const name = data.name || "";
      const ceremony = data.ceremonyAttendance || "";
      const restaurant = data.restaurantAttendance || "";
      const adults = data.adultsCount || "";
      const companionNames = data.companionNames || "";
      const childrenCount = data.childrenCount || "";
      const childrenNames = data.childrenNames || "";
      const message = data.message || "";

      sheet.appendRow([timestamp, name, ceremony, restaurant, adults, companionNames, childrenCount, childrenNames, message]);

      return ContentService.createTextOutput(JSON.stringify({ "result": "success", "message": "RSVP salvo com sucesso!" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// O doGet será usado para o site consultar quais presentes já foram dados
function doGet(e) {
  setupSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    const sheet = ss.getSheetByName(GIFTS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const reservedGifts = [];

    // Ignora a primeira linha (cabeçalho)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const giftId = row[1];           // Coluna 1: ID do Produto
      const giftName = row[2];         // Coluna 2: Nome do Produto
      const guestName = row[3];        // Coluna 3: Convidado
      
      // Somente adiciona se houver ID (presente foi realmente reservado)
      if (giftId) {
        reservedGifts.push({
          id: giftId,
          name: giftName || "Sem nome",
          reserved_by: guestName || "Não informado"
        });
      }
    }

    // Permite leitura do site sem erro de CORS
    return ContentService.createTextOutput(JSON.stringify({ "reserved": reservedGifts }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
