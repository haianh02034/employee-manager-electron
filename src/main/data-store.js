const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class DataStore {
    constructor(fileName = 'offline-data.json') {
        this.filePath = path.join(__dirname, '..', '..', fileName);
        this.data = this._readData();
    }

    _readData() {
        try {
            return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        } catch (error) {
            console.error('Error reading offline data:', error);
            return {}; // Return an empty object if file doesn't exist or is invalid
        }
    }

    _writeData() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
        } catch (error) {
            console.error('Error writing offline data:', error);
        }
    }

    getData(key) {
        return this.data[key] || null;
    }

    setData(key, value) {
        this.data[key] = value;
        this._writeData();
    }

    getAllData() {
        return this.data;
    }

    setAllData(newData) {
        this.data = newData;
        this._writeData();
    }
}

module.exports = DataStore;
