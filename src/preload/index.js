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
    readData: (spreadsheetId, range) => ipcRenderer.invoke('read-data', { spreadsheetId, range })
};
