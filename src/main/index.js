const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios'); // Assuming axios is installed
const { findFolderByName, listFilesInFolder, generateDownloadLink, clearSheetData, writeSheetData, uploadFileToDrive } = require('../utils/google-sheets'); // Import Google Drive and Sheets functions
const DataStore = require('./data-store'); // Import the DataStore module
const { dialog } = require('electron'); // Import dialog for file selection

// Use a path relative to the application's root directory
const avatarsDir = path.join(__dirname, '..', '..', 'avatars');

// Ensure the avatars directory exists
if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir);
}

const store = new DataStore(); // Initialize the DataStore for offline-data.json
const emailTemplatesStore = new DataStore('emailTemplates.json'); // Initialize DataStore for emailTemplates.json

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, '../preload/index.js')
    }
  });

  mainWindow.loadFile('./src/renderer/components/dashboard.html');

  // Open DevTools - Remove for PRODUCTION!
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  // IPC handler to find employee folder
  ipcMain.handle('find-employee-folder', async (event, { parentFolderId, folderName }) => {
      try {
          const folder = await findFolderByName(parentFolderId, folderName);
          return folder;
      } catch (error) {
          console.error('Error in find-employee-folder IPC handler:', error);
          throw error;
      }
  });

  // IPC handler to list files in employee folder
  ipcMain.handle('list-employee-files', async (event, folderId) => {
      try {
          const files = await listFilesInFolder(folderId);
          return files;
      } catch (error) {
          console.error('Error in list-employee-files IPC handler:', error);
          throw error;
      }
  });

  // IPC handler to download a file
  ipcMain.handle('download-file', async (event, fileId) => {
      try {
          // The generateDownloadLink function in google-sheets.js is a placeholder.
          // A real download implementation would need to handle streaming the file
          // content back to the renderer or saving it locally.
          // For now, we'll just call the placeholder function.
          const result = await generateDownloadLink(fileId);
          return result; // This will be the placeholder message
      } catch (error) {
          console.error('Error in download-file IPC handler:', error);
          throw error;
      }
  });

  // IPC handlers for offline data storage
  ipcMain.handle('get-offline-data', (event, key) => {
      return store.getData(key);
  });

  ipcMain.handle('set-offline-data', (event, { key, value }) => {
      store.setData(key, value);
      return true; // Indicate success
  });

  ipcMain.handle('get-all-offline-data', () => {
      return store.getAllData();
  });

  ipcMain.handle('set-all-offline-data', (event, newData) => {
      store.setAllData(newData);
      return true; // Indicate success
  });

  // IPC handlers for Email Templates data storage
  ipcMain.handle('load-email-templates', () => {
      return emailTemplatesStore.getAllData();
  });

  ipcMain.handle('save-email-templates', (event, templates) => {
      emailTemplatesStore.setAllData(templates);
      return true; // Indicate success
  });

  ipcMain.handle('read-data', async (event, { spreadsheetId, range }) => {
    try {
        const { readData } = require('../utils/google-sheets');
        const data = await readData(spreadsheetId, range);
        return data;
    } catch (error) {
        console.error('Error in read-data IPC handler:', error);
        throw error;
    }
  });

  ipcMain.handle('list-folders-in-folder', async (event, folderId) => {
    try {
        const { listFoldersInFolder } = require('../utils/google-sheets');
        const folders = await listFoldersInFolder(folderId);
        return folders;
    } catch (error) {
        console.error('Error in list-folders-in-folder IPC handler:', error);
        throw error;
    }
  });

  // IPC handlers for Google Sheets data manipulation
  ipcMain.handle('clear-sheet-data', async (event, { spreadsheetId, range }) => {
      try {
          await clearSheetData(spreadsheetId, range);
          return true;
      } catch (error) {
          console.error('Error in clear-sheet-data IPC handler:', error);
          throw error;
      }
  });

  ipcMain.handle('write-sheet-data', async (event, { spreadsheetId, range, values }) => {
      try {
          await writeSheetData(spreadsheetId, range, values);
          return true;
      } catch (error) {
          console.error('Error in write-sheet-data IPC handler:', error);
          throw error;
      }
  });

  ipcMain.handle('upload-file-to-drive', async (event, { filePath, fileName, mimeType, folderId }) => {
    try {
        const result = await uploadFileToDrive(filePath, fileName, mimeType, folderId);
        return result;
    } catch (error) {
        console.error('Error in upload-file-to-drive IPC handler:', error);
        throw error;
    }
  });

  ipcMain.handle('open-file-dialog', async (event, options) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), options);
    if (canceled) {
      return null;
    } else {
      return filePaths[0];
    }
  });

  ipcMain.handle('downloadAvatar', async (event, avatarUrl) => {
    try {
      const match = avatarUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (!match || !match[1]) {
        console.error('Could not extract file ID from URL:', avatarUrl);
        return null;
      }
      const fileId = match[1];
      const directImageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
      // Check if the file already exists locally (need to check for multiple extensions)
      // For simplicity, let's assume common image formats for now
      const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
      let localFilePath = null;
      let existingFileFound = false;

      for (const ext of supportedExtensions) {
          const potentialPath = path.join(avatarsDir, `${fileId}${ext}`);
          if (fs.existsSync(potentialPath)) {
              localFilePath = potentialPath;
              existingFileFound = true;
              console.log('Avatar already exists locally:', localFilePath);
              break; // Found an existing file, no need to check other extensions
          }
      }

      if (existingFileFound) {
          return localFilePath;
      }

      const { getGoogleDriveClient } = require('../utils/google-sheets'); // Import the Drive client getter
      const googleDrive = await getGoogleDriveClient();

      const response = await googleDrive.files.get({
        fileId: fileId,
        alt: 'media' // This is crucial for downloading the file content
      }, {
        responseType: 'stream'
      });

      // Determine file extension from Content-Type header from Drive API response
      const contentType = response.headers['content-type'];
      console.log('Downloaded avatar Content-Type (Drive API):', contentType); // Log Content-Type

      // Check if the content type is an image
      if (!contentType || !contentType.startsWith('image/')) {
          console.error('Downloaded content is not an image (Drive API):', contentType);
          // Clean up any partially written file if necessary (though stream errors should handle this)
          return null; // Indicate failure to the renderer
      }

      let fileExtension = '.jpg'; // Default to jpg if type cannot be determined
      if (contentType.includes('image/png')) {
          fileExtension = '.png';
      } else if (contentType.includes('image/jpeg')) {
          fileExtension = '.jpg';
      } else if (contentType.includes('image/gif')) {
          fileExtension = '.gif';
      }
      // Add more cases for other image types if needed

      localFilePath = path.join(avatarsDir, `${fileId}${fileExtension}`);

      const writer = fs.createWriteStream(localFilePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log('Avatar downloaded successfully (Drive API):', localFilePath); // Log success
          resolve(localFilePath);
        });
        writer.on('error', (err) => {
          console.error('Error writing avatar file (Drive API):', err); // Log write error
          fs.unlink(localFilePath, () => reject(err)); // Clean up the failed download
        });
      });

    } catch (error) {
      console.error('Error downloading avatar (Drive API):', error); // Log general download error
      // Check for specific Google Drive API errors, e.g., file not found, permission denied
      if (error.code) {
          console.error('Google Drive API error code:', error.code);
      }
      if (error.errors) {
          console.error('Google Drive API errors:', error.errors);
      }
      return null;
    }
  });


  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
