function doPost(e) {
  // Name of the sheet to save data to
  var sheetName = 'Data';
  
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName(sheetName);
    
    // If the "Data" sheet doesn't exist, create it
    if (!sheet) {
      sheet = doc.insertSheet(sheetName);
    }
    
    // Define the headers exactly matching the 'name' attributes in the HTML form
    var headers = ['timestamp', 'businessName', 'ownerName', 'businessType', 'city', 'state', 'mobile', 'email', 'painPoints', 'requirements', 'consent'];
    
    // If the sheet is empty, set the headers on the first row
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      // Make headers bold
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }
    
    var nextRow = sheet.getLastRow() + 1;
    
    // Map the incoming POST parameters to our headers array
    var newRow = headers.map(function(header) {
      if (header === 'timestamp') {
        return new Date();
      }
      return e.parameter[header] || '';
    });

    // Write the new row to the sheet
    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success', 'row': nextRow }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
