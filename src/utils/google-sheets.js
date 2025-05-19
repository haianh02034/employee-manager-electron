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
    try {
        const getRows = await googleSheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: range,
        });
        if (getRows.data && getRows.data.values) {
            return getRows.data.values;
        } else {
            console.error('Unexpected response format for readData:', getRows);
            return [];
        }
    } catch (error) {
        console.error('Error in readData:', error);
        throw error; // Re-throw the error to be caught in renderer.js
    }
}

async function writeData(spreadsheetId, range, values) {
    const googleSheets = await getGoogleSheetsClient();
    try {
        const response = await googleSheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: range,
            valueInputOption: "USER_ENTERED",
            resource: {
                values: values,
            },
        });
        if (!response.data) {
            console.error('Unexpected response format for writeData:', response);
            throw new Error('Unexpected response from Google Sheets API');
        }
    } catch (error) {
        console.error('Error in writeData:', error);
        throw error; // Re-throw the error to be caught in renderer.js
    }
}

async function updateData(spreadsheetId, range, values) {
    const googleSheets = await getGoogleSheetsClient();
    try {
        const response = await googleSheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: range,
            valueInputOption: "USER_ENTERED",
            resource: {
                values: values,
            },
        });
         if (!response.data) {
            console.error('Unexpected response format for updateData:', response);
            throw new Error('Unexpected response from Google Sheets API');
        }
    } catch (error) {
        console.error('Error in updateData:', error);
        throw error; // Re-throw the error to be caught in renderer.js
    }
}

async function deleteData(spreadsheetId, row) {
    const googleSheets = await getGoogleSheetsClient();
    try {
        const range = `Sheet1!A${row}:Z${row}`; // Assuming max 26 columns (A-Z)
        const response = await googleSheets.spreadsheets.values.clear({
            spreadsheetId: spreadsheetId,
            range: range,
        });

        if (response.status !== 200) {
            console.error('Unexpected response format for deleteData:', response);
            throw new Error('Unexpected response from Google Sheets API');
        }
    } catch (error) {
        console.error('Error in deleteData:', error);
        throw error; // Re-throw the error to be caught in renderer.js
    }
}

module.exports = {
    getGoogleSheetsClient,
    readData,
    writeData,
    updateData,
    deleteData
};
