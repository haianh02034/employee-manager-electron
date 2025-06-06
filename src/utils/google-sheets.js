const { google } = require('googleapis');

// Hàm khởi tạo Google Auth client with Drive scope
const auth = new google.auth.GoogleAuth({
    keyFile: './gg-sheets-api-441108-f48f9f374902.json',
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly' // Added Drive read-only scope
    ]
});

module.exports = auth;

async function getGoogleSheetsClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: './gg-sheets-api-441108-f48f9f374902.json',
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.readonly' // Added Drive read-only scope
        ]
    });
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });
    return googleSheets;
}

// Function to get Google Drive client
async function getGoogleDriveClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: './gg-sheets-api-441108-f48f9f374902.json',
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.readonly' // Added Drive read-only scope
        ]
    });
    const client = await auth.getClient();
    const googleDrive = google.drive({ version: 'v3', auth: client });
    return googleDrive;
}

// Function to find a folder by name within a parent folder
async function findFolderByName(parentFolderId, folderName) {
    const drive = await getGoogleDriveClient();
    try {
        const res = await drive.files.list({
            q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive',
        });
        return res.data.files.length > 0 ? res.data.files[0] : null;
    } catch (error) {
        console.error('Error finding folder by name:', error);
        throw error;
    }
}

// Function to list files and folders within a folder
async function listFilesInFolder(folderId) {
    const drive = await getGoogleDriveClient();
    try {
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType, size)',
            spaces: 'drive',
        });
        return res.data.files;
    } catch (error) {
        console.error('Error listing files in folder:', error);
        throw error;
    }
}

// Function to generate a download link for a file
async function generateDownloadLink(fileId) {
    const drive = await getGoogleDriveClient();
    try {
        // For Google Workspace files (Docs, Sheets, Slides), use export
        // For other file types, use get with alt=media
        const fileMeta = await drive.files.get({
            fileId: fileId,
            fields: 'mimeType'
        });

        if (fileMeta.data.mimeType.startsWith('application/vnd.google-apps')) {
             // Handle Google Workspace files - need to export
             // This is a simplified example, you might need to handle different mime types for export
             return null; // Indicate that direct download link is not available for Google Workspace files
        } else {
             // Handle other file types
             const res = await drive.files.get({
                 fileId: fileId,
                 alt: 'media'
             }, {
                 responseType: 'arraybuffer' // Use arraybuffer to handle binary data
             });

             // In a real application, you would not return the arraybuffer directly here.
             // You would likely pipe this to a response stream or save it to a temporary file.
             // For this example, we'll indicate success but the actual download needs more handling.
             return `Download initiated for file ID: ${fileId}`; // Placeholder
        }

    } catch (error) {
        console.error('Error generating download link:', error);
        throw error;
    }
}


async function clearSheetData(spreadsheetId, range) {
    const googleSheets = await getGoogleSheetsClient();
    try {
        const res = await googleSheets.spreadsheets.values.clear({
            spreadsheetId,
            range,
        });
        console.log('Sheet data cleared:', res.data);
        return res.data;
    } catch (error) {
        console.error('Error clearing sheet data:', error);
        throw error;
    }
}

async function writeSheetData(spreadsheetId, range, values) {
    const googleSheets = await getGoogleSheetsClient();
    try {
        const res = await googleSheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            resource: {
                values: values,
            },
        });
        console.log('Sheet data written:', res.data);
        return res.data;
    } catch (error) {
        console.error('Error writing sheet data:', error);
        throw error;
    }
}

module.exports = {
    getGoogleSheetsClient,
    getGoogleDriveClient,
    findFolderByName,
    listFilesInFolder,
    generateDownloadLink,
    clearSheetData, // Export the new function
    writeSheetData, // Export the new function
    readData
};

async function readData(spreadsheetId, range) {
    const googleSheets = await getGoogleSheetsClient();
    try {
        const res = await googleSheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        return res.data.values;
    } catch (error) {
        console.error('Error reading sheet data:', error);
        throw error;
    }
}
