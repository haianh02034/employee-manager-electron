console.log('preload/index.js loaded');
const { ipcRenderer } = require('electron');

window.electronAPI = {
    downloadAvatar: (avatarUrl) => ipcRenderer.invoke('downloadAvatar', avatarUrl),
    findEmployeeFolder: (parentFolderId, folderName) => ipcRenderer.invoke('find-employee-folder', { parentFolderId, folderName }),
    listEmployeeFiles: (folderId) => ipcRenderer.invoke('list-employee-files', folderId),
    downloadFile: (fileId) => ipcRenderer.invoke('download-file', fileId),
    getOfflineData: (key) => ipcRenderer.invoke('get-offline-data', key),
    setOfflineData: (key, value) => ipcRenderer.invoke('set-offline-data', { key, value }),
    getAllOfflineData: () => ipcRenderer.invoke('get-all-offline-data'),
    setAllOfflineData: (newData) => ipcRenderer.invoke('set-all-offline-data', newData),
    clearSheetData: (spreadsheetId, range) => ipcRenderer.invoke('clear-sheet-data', { spreadsheetId, range }),
    writeSheetData: (spreadsheetId, range, values) => ipcRenderer.invoke('write-sheet-data', { spreadsheetId, range, values }),
    readData: (spreadsheetId, range) => ipcRenderer.invoke('read-data', { spreadsheetId, range }),
    listFoldersInFolder: (folderId) => ipcRenderer.invoke('list-folders-in-folder', folderId),
    loadEmailTemplates: () => ipcRenderer.invoke('load-email-templates'),
    saveEmailTemplates: (templates) => ipcRenderer.invoke('save-email-templates', templates),
    uploadFileToDrive: (filePath, fileName, mimeType, folderId) => ipcRenderer.invoke('upload-file-to-drive', { filePath, fileName, mimeType, folderId }),
    openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
    sendEmail: (to, subject, html) => ipcRenderer.invoke('send-email', { to, subject, html })
};
