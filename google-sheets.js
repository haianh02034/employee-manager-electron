const { google } = require('googleapis');

// Hàm khởi tạo Google Auth client
const auth = new google.auth.GoogleAuth({
    keyFile: './gg-sheets-api-441108-f48f9f374902.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

module.exports = auth;

async function getGoogleSheetsClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: './gg-sheets-api-441108-f48f9f374902.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });
    return googleSheets;
}

async function readData(spreadsheetId, range) {
    const googleSheets = await getGoogleSheetsClient();
    const getRows = await googleSheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
    });
    return getRows.data.values || [];
}

async function writeData(spreadsheetId, range, values) {
    const googleSheets = await getGoogleSheetsClient();
    await googleSheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: "USER_ENTERED",
        resource: {
            values: values,
        },
    });
}

async function updateData(spreadsheetId, range, values) {
    const googleSheets = await getGoogleSheetsClient();
    await googleSheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: "USER_ENTERED",
        resource: {
            values: values,
        },
    });
}

async function deleteData(spreadsheetId, range) {
    // This function is a placeholder. Deleting data directly from a sheet using the API is complex
    // and may require clearing the content of specific cells or rows.
    // Implement this function based on your specific requirements.
    console.warn("Delete data function is not fully implemented. Implement based on your needs.");
}

module.exports = {
    getGoogleSheetsClient,
    readData,
    writeData,
    updateData,
    deleteData
};
