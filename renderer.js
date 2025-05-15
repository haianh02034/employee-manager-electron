const spreadsheetId = '1SfX6tY1mP0iMBJyI18QVoOs-ILhpBSdgocq3EbNa8fI';
const range = 'Sheet1!A1:Z1000'; // Adjust the range as needed

async function displayData() {
  try {
    const data = await window.readData(spreadsheetId, range);
    const appDiv = document.getElementById('app');

    if (data && data.length > 0) {
      const table = document.createElement('table');
      table.classList.add('data-table'); // Add class for styling
      const thead = document.createElement('thead');
      const tbody = document.createElement('tbody');

      // Create table header and filter inputs
      const headerRow = document.createElement('tr');
      // Add checkbox header
      const checkboxHeader = document.createElement('th');
      headerRow.appendChild(checkboxHeader);

      data[0].forEach((headerText, index) => {
        const header = document.createElement('th');
        header.textContent = headerText;
        headerRow.appendChild(header);

        // Create filter input
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = `Filter ${headerText}`;
        filterInput.classList.add('filter-input'); // Add class for styling
        filterInput.dataset.columnIndex = index;
        filterInput.id = `filterInput${index}`; // Add ID to filter input
        filterInput.addEventListener('keyup', filterTable);
        header.appendChild(filterInput);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Create table rows
      for (let i = 1; i < data.length; i++) {
        const rowData = data[i];
        const row = document.createElement('tr');

        // Add checkbox
        const checkboxCell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.rowIndex = i;
        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);

        rowData.forEach(cellData => {
          const cell = document.createElement('td');
          cell.textContent = cellData;
          row.appendChild(cell);
        });
        tbody.appendChild(row);
      }
      table.appendChild(tbody);
      appDiv.appendChild(table);
    } else {
      appDiv.textContent = 'No data found in the sheet.';
    }
  } catch (error) {
    console.error('Error fetching or displaying data:', error);
    const appDiv = document.getElementById('app');
    appDiv.textContent = 'Error fetching data. Check console for details.';
  }
}

// Filtering function
function filterTable(event) {
  const filterValues = [];
  const table = document.querySelector('.data-table');
  const rows = table.querySelectorAll('tbody tr');

  // Get filter values from all input fields
  const filterInputs = document.querySelectorAll('.filter-input');
  filterInputs.forEach(input => {
    filterValues.push(input.value.toLowerCase());
  });

  rows.forEach(row => {
    let match = true;
    const cells = row.querySelectorAll('td');

    // Check if the row matches all filter criteria
    cells.forEach((cell, index) => {
      const columnIndex = cell.cellIndex - 1; // Subtract 1 to account for checkbox column
      const cellText = cell.textContent.toLowerCase();
      if (filterValues[columnIndex] && !cellText.includes(filterValues[columnIndex])) {
        match = false;
      }
    });

    // STT search fix
    const sttFilterValue = document.getElementById('filterInput0').value.toLowerCase();
    if (sttFilterValue) {
        const sttCell = row.querySelectorAll('td')[0];
        if (sttCell) {
            const sttCellText = sttCell.textContent.toLowerCase();
            const regex = new RegExp(`.*${sttFilterValue}.*`);
            if (!regex.test(sttCellText)) {
                match = false;
            }
        }
    }

    if (match) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}


const addEmployeeBtn = document.getElementById('addEmployeeBtn');
const addEmployeeForm = document.getElementById('addEmployeeForm');

addEmployeeBtn.addEventListener('click', () => {
  addEmployeeForm.style.display = 'block';
});

const saveEmployeeBtn = document.getElementById('saveEmployeeBtn');

saveEmployeeBtn.addEventListener('click', async () => {
  const stt = document.getElementById('stt').value;
  const hoTen = document.getElementById('hoTen').value;
  const email = document.getElementById('email').value;
  const soDienThoai = document.getElementById('soDienThoai').value;

  const values = [[stt, hoTen, email, soDienThoai]];

  try {
    await window.writeData(spreadsheetId, range, values);
    alert('Data saved successfully!');
    addEmployeeForm.style.display = 'none';
    displayData(); // Refresh the table
  } catch (error) {
    console.error('Error saving data:', error);
    alert('Error saving data. Check console for details.');
  }
});

const bulkEditBtn = document.getElementById('bulkEditBtn');
const bulkEditForm = document.getElementById('bulkEditForm');

bulkEditBtn.addEventListener('click', async () => {
  bulkEditForm.style.display = 'block';
});

const saveBulkEditBtn = document.getElementById('saveBulkEditBtn');

saveBulkEditBtn.addEventListener('click', async () => {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  const selectedRows = [];

  checkboxes.forEach(checkbox => {
    if (checkbox.checked && checkbox.dataset.rowIndex) {
      selectedRows.push(parseInt(checkbox.dataset.rowIndex));
    }
  });

  if (selectedRows.length === 0) {
    alert('Please select rows to edit.');
    return;
  }

  const columnIndices = document.getElementById('columnIndices').value.split(',').map(value => parseInt(value.trim()));
  const newValues = document.getElementById('newValues').value.split(',').map(value => value.trim());

  if (columnIndices.length !== newValues.length) {
    alert('The number of column indices must match the number of new values.');
    return;
  }

  try {
    for (let i = 0; i < selectedRows.length; i++) {
      const rowIndex = selectedRows[i];
      for (let j = 0; j < columnIndices.length; j++) {
        const columnIndex = columnIndices[j];
        const newValue = newValues[j];
        const range = `Sheet1!${String.fromCharCode(65 + parseInt(columnIndex))}${rowIndex + 1}`; // Convert column index to letter
        await window.updateData(spreadsheetId, range, [[newValue]]);
      }
    }
    alert('Data updated successfully!');
    displayData(); // Refresh the table
  } catch (error) {
    console.error('Error updating data:', error);
    alert('Error updating data. Check console for details.');
  }
});

const editButtons = document.querySelectorAll('button[data-row-index]');
editButtons.forEach(editButton => {
  editButton.addEventListener('click', async () => {
    const rowIndex = parseInt(editButton.dataset.rowIndex);
    const newValue = prompt('Enter the new values for the row (comma-separated):');

    if (!newValue) {
      alert('Please enter the new values.');
      return;
    }

    const values = newValue.split(',').map(value => value.trim());

    try {
      const range = `Sheet1!A${rowIndex + 1}:${String.fromCharCode(64 + values.length)}${rowIndex + 1}`;
      await window.updateData(spreadsheetId, range, [values]);
      alert('Data updated successfully!');
      displayData(); // Refresh the table
    } catch (error) {
      console.error('Error updating data:', error);
      alert('Error updating data. Check console for details.');
    }
  });
});

displayData();
