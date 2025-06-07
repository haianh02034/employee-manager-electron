document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event listener executed');
  const desiredHeaders = [
    "STT",
    "Họ và tên",
    "Mã nhân viên",
    "Giới tính",
    "Ngày sinh",
    "Số điện thoại",
    "Email",
    "Ngân hàng",
    "Số tài khoản",
    "Chủ tài khoản",
    "Đơn vị chủ quản",
    "Trạng thái"
  ];

  const spreadsheetId = '1SfX6tY1mP0iMBJyI18QVoOs-ILhpBSdgocq3EbNa8fI';
  const range = 'Sheet1!A1:AZ1000'; // Adjusted range to include more columns

  let appData = {}; // Global variable to hold application data

  // DOM Elements
  const appDiv = document.getElementById('app');
  const modalOverlay = document.getElementById('modal-overlay');
  const addEmployeeFormContainer = document.getElementById('add-employee-form-container');
  const addEmployeeForm = document.getElementById('add-employee-form');
  const addEmployeeFormTitle = addEmployeeFormContainer ? addEmployeeFormContainer.querySelector('h2') : null;
  const addEmployeeFormSubmitButton = addEmployeeForm ? addEmployeeForm.querySelector('button[type="submit"]') : null;
  const addEmployeeBtn = document.getElementById('add-employee-btn');
  const cancelAddEmployeeButton = document.getElementById('cancel-add-employee');
  const closeAddEmployeeFormButton = document.getElementById('close-add-employee-form');
  const customContextMenu = document.getElementById('custom-context-menu');
  const employeeTableBody = document.querySelector('#employee-table tbody');


  // Helper function to format date to DD/MM/YYYY
  function formatDateToDDMMYYYY(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Helper function to parse DD/MM/YYYY to YYYY-MM-DD
  function parseDateToYYYYMMDD(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return '';
  }

  // Function to display data in the table
  async function displayData(dataToDisplay) {
    if (employeeTableBody) {
      employeeTableBody.innerHTML = ''; // Clear existing content

      if (dataToDisplay && dataToDisplay.length > 0) {
        // Assuming the table header is already in index.html
        // Create table rows
        for (let i = 0; i < dataToDisplay.length; i++) { // Iterate through all data rows
          const rowData = dataToDisplay[i];
          const row = document.createElement('tr');

          // Add checkbox
          const checkboxCell = document.createElement('td');
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.dataset.rowIndex = i; // Use 0-based index for internal logic
          checkboxCell.appendChild(checkbox);
          row.appendChild(checkboxCell);

          // Create cells based on desiredHeaders and map data
          desiredHeaders.forEach((header, index) => {
              const cell = document.createElement('td');
              // Assuming data columns in the sheet match the order of desiredHeaders
              cell.textContent = rowData[index] !== undefined ? rowData[index] : ''; // Use data based on index
              row.appendChild(cell);
          });

          employeeTableBody.appendChild(row);
        }
      } else {
        // If no data, clear the tbody and potentially add a message
        // employeeTableBody.textContent = 'No data found in the sheet.';
      }
    }
  }

  // Function to load initial data from offline store or Google Sheets
  async function loadInitialData() {
    try {
      console.log('Inside try block in loadInitialData');
      // Try to load from offline store first
      const offlineData = await window.electronAPI.getOfflineData('employeeData');
      if (offlineData && offlineData.length > 0) {
        appData.employeeData = offlineData;
        console.log('Loaded data from offline store.');
        displayData(appData.employeeData);
      } else {
        console.log('No offline data found, attempting to fetch from Google Sheets.');
        // If no offline data, try to fetch from Google Sheets
        const sheetData = await window.electronAPI.readData(spreadsheetId, range);
        if (sheetData && sheetData.length > 1) { // Assuming first row is header
          appData.employeeData = sheetData.slice(1); // Store data rows, excluding header
          await window.electronAPI.setOfflineData('employeeData', appData.employeeData);
          console.log('Fetched data from Google Sheets and saved to offline store.');
          displayData(appData.employeeData);
        } else {
          appData.employeeData = [];
          displayData([]);
          console.log('No data found in Google Sheets.');
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      // Fallback to empty data if both fail
      appData.employeeData = [];
      displayData([]);
      alert('Lỗi khi tải dữ liệu. Kiểm tra console để biết chi tiết.');
    }
  }

  // Function to save data to offline store and potentially synchronize
  async function saveAndSynchronizeData() {
    try {
      await window.electronAPI.setOfflineData('employeeData', appData.employeeData);
      console.log('Data saved to offline store.');

      // Synchronization with Google Sheets
      if (navigator.onLine) {
        console.log('Online: Attempting to synchronize with Google Sheets...');
        try {
          const sheetData = await window.readData(spreadsheetId, range);
          const sheetDataRows = sheetData ? sheetData.slice(1) : []; // Exclude header row

          if (appData.employeeData.length > sheetDataRows.length) {
            // Local data has more rows, overwrite the sheet
            console.log('Local data has more rows, overwriting Google Sheet.');
            await window.electronAPI.clearSheetData(spreadsheetId, range);
            // Add header row to the data before writing
            const dataToWrite = [desiredHeaders, ...appData.employeeData];
            await window.electronAPI.writeSheetData(spreadsheetId, range, dataToWrite);
            console.log('Google Sheet overwritten with local data.');
          } else {
            // Check if there are any local modifications
            // This is a simplified check; a more robust solution would track changes
            let hasModifications = false;
            if (appData.employeeData.length === sheetDataRows.length) {
              for (let i = 0; i < appData.employeeData.length; i++) {
                if (JSON.stringify(appData.employeeData[i]) !== JSON.stringify(sheetDataRows[i])) {
                  hasModifications = true;
                  break;
                }
              }
            } else {
              hasModifications = true; // Different number of rows, consider it modified
            }

            if (hasModifications) {
              console.log('Local data has modifications, overwriting Google Sheet.');
              await window.electronAPI.clearSheetData(spreadsheetId, range);
              // Add header row to the data before writing
              const dataToWrite = [desiredHeaders, ...appData.employeeData];
              await window.electronAPI.writeSheetData(spreadsheetId, range, dataToWrite);
              console.log('Google Sheet overwritten with local data.');
            } else {
              console.log('No local modifications, Google Sheet is up to date.');
            }
          }
        } catch (syncError) {
          console.error('Error during Google Sheets synchronization:', syncError);
        }
      } else {
        console.log('Offline: Data saved locally, synchronization deferred.');
      }
    } catch (error) {
      console.error('Error saving data to offline store:', error);
    }
  }

  // Filtering function
  function filterTable() {
    if (!appData.employeeData) return;

    // Get filter values from specific inputs and selects
    const filterStt = document.getElementById('filter-stt').value.toLowerCase();
    const filterName = document.getElementById('filter-name').value.toLowerCase();
    const filterEmployeeId = document.getElementById('filter-employee-id').value.toLowerCase();
    const filterPhone = document.getElementById('filter-phone').value.toLowerCase();
    const filterManagingUnit = document.getElementById('filter-managing-unit').value.toLowerCase();
    const filterGender = document.getElementById('filter-gender').value.toLowerCase();
    const filterStatus = document.getElementById('filter-status').value.toLowerCase();

    const filteredData = appData.employeeData.filter(rowData => {
      let match = true;

      // Check against specific columns (indices match desiredHeaders)
      // STT (Column 0)
      if (filterStt && !String(rowData[0]).toLowerCase().includes(filterStt)) {
        match = false;
      }
      // Họ và tên (Column 1)
      if (match && filterName && !String(rowData[1]).toLowerCase().includes(filterName)) {
        match = false;
      }
      // Mã nhân viên (Column 2)
      if (match && filterEmployeeId && !String(rowData[2]).toLowerCase().includes(filterEmployeeId)) {
        match = false;
      }
      // Số điện thoại (Column 5)
      if (match && filterPhone && !String(rowData[5]).toLowerCase().includes(filterPhone)) {
        match = false;
      }
      // Đơn vị chủ quản (Column 10)
      if (match && filterManagingUnit && !String(rowData[10]).toLowerCase().includes(filterManagingUnit)) {
        match = false;
      }
      // Giới tính (Column 3)
      if (match && filterGender && !String(rowData[3]).toLowerCase().includes(filterGender)) {
          match = false;
      }
      // Trạng thái (Column 11)
      if (match && filterStatus && !String(rowData[11]).toLowerCase().includes(filterStatus)) {
        match = false;
      }

      return match;
    });

    displayData(filteredData); // Display the filtered data
  }

  // Helper function to show the add employee modal
  function showAddEmployeeModal() {
    if (modalOverlay) modalOverlay.style.display = 'block';
    const bulkEditFormContainer = document.getElementById('bulk-edit-form-container');
    if (bulkEditFormContainer) bulkEditFormContainer.style.display = 'block';
  }

  // Helper function to show the bulk edit modal
  function showBulkEditModal() {
    if (modalOverlay) modalOverlay.style.display = 'block';
    const bulkEditFormContainer = document.getElementById('bulk-edit-form-container');
    if (bulkEditFormContainer) bulkEditFormContainer.style.display = 'block';
  }

  // Helper function to hide the bulk edit modal
  function hideBulkEditModal() {
    if (modalOverlay) modalOverlay.style.display = 'none';
    const bulkEditFormContainer = document.getElementById('bulk-edit-form-container');
    if (bulkEditFormContainer) bulkEditFormContainer.style.display = 'none';
    const bulkEditFieldSelect = document.getElementById('bulk-edit-field-select');
    if (bulkEditFieldSelect) bulkEditFieldSelect.innerHTML = ''; // Clear field options
    const bulkEditValueInputDiv = document.getElementById('bulk-edit-value-input');
    if (bulkEditValueInputDiv) bulkEditValueInputDiv.innerHTML = ''; // Clear value input
  }

  // Helper function to create the value input based on selected field
  function createValueInput(header, columnIndex) {
      const bulkEditValueInputDiv = document.getElementById('bulk-edit-value-input');
      if (!bulkEditValueInputDiv) return;

      bulkEditValueInputDiv.innerHTML = ''; // Clear previous input

      let input;
      if (header === 'Ngày sinh') {
        input = document.createElement('input');
        input.type = 'date';
      } else if (header === 'Giới tính') {
         input = document.createElement('select');
         ['Nam', 'Nữ', 'Khác'].forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText;
            option.textContent = optionText;
            input.appendChild(option);
         });
      } else if (header === 'Trạng thái') {
          input = document.createElement('select');
          ['Đang làm', 'Đã nghỉ', 'Xa thải'].forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText;
            option.textContent = optionText;
            input.appendChild(option);
          });
      }
       else {
        input = document.createElement('input');
        input.type = 'text';
      }

      input.id = 'bulk-edit-value'; // Assign a common ID for easy access
      input.dataset.columnIndex = columnIndex; // Store column index
      bulkEditValueInputDiv.appendChild(input);
  }


  const bulkEditBtn = document.getElementById('bulk-edit-btn');
  if (bulkEditBtn) {
    bulkEditBtn.addEventListener('click', () => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
      const selectedRowIndices = [];

      checkboxes.forEach(checkbox => {
        if (checkbox.dataset.rowIndex) {
          selectedRowIndices.push(parseInt(checkbox.dataset.rowIndex));
        }
      });

      if (selectedRowIndices.length === 0) {
        alert('Vui lòng chọn ít nhất một hàng để chỉnh sửa hàng loạt.');
        return;
      }

      // Store selected row indices for later use in the save function
      const bulkEditFormContainer = document.getElementById('bulk-edit-form-container');
      if (bulkEditFormContainer) {
        bulkEditFormContainer.dataset.selectedRowIndices = JSON.stringify(selectedRowIndices);
      }

      const bulkEditFieldSelect = document.getElementById('bulk-edit-field-select');
      if (bulkEditFieldSelect) {
        bulkEditFieldSelect.innerHTML = ''; // Clear previous options

        // Populate dropdown with headers (excluding STT)
        desiredHeaders.forEach((header, index) => {
            if (header !== "STT") { // Exclude STT from bulk edit
                const option = document.createElement('option');
                option.value = index; // Store column index as value
                option.textContent = header;
                bulkEditFieldSelect.appendChild(option);
            }
        });

        // Trigger change event to create initial value input
        if (bulkEditFieldSelect.options.length > 0) {
            const initialColumnIndex = parseInt(bulkEditFieldSelect.value);
            const initialHeader = desiredHeaders[initialColumnIndex];
            createValueInput(initialHeader, initialColumnIndex);
        }
      }

      showBulkEditModal();
    });
  }

  const bulkEditFieldSelect = document.getElementById('bulk-edit-field-select');
  if (bulkEditFieldSelect) {
      bulkEditFieldSelect.addEventListener('change', (event) => {
          const selectedColumnIndex = parseInt(event.target.value);
          const selectedHeader = desiredHeaders[selectedColumnIndex];
          createValueInput(selectedHeader, selectedColumnIndex);
      });
  }


  const saveBulkEditBtn = document.getElementById('save-bulk-edit-btn');
  if (saveBulkEditBtn) {
    saveBulkEditBtn.addEventListener('click', async () => {
      const bulkEditFormContainer = document.getElementById('bulk-edit-form-container');
      const selectedRowIndices = JSON.parse(bulkEditFormContainer.dataset.selectedRowIndices || '[]');

      if (selectedRowIndices.length === 0) {
        alert('Vui lòng chọn ít nhất một hàng để chỉnh sửa hàng loạt.');
        return;
      }

      const bulkEditValueInput = document.getElementById('bulk-edit-value');
      if (!bulkEditValueInput) {
          alert('Lỗi: Không tìm thấy trường nhập giá trị.');
          return;
      }

      const columnIndexToUpdate = parseInt(bulkEditValueInput.dataset.columnIndex);
      let newValue = bulkEditValueInput.value;

      // Format date to DD/MM/YYYY if it's the 'Ngày sinh' field
      if (desiredHeaders[columnIndexToUpdate] === 'Ngày sinh' && bulkEditValueInput.type === 'date') {
          newValue = formatDateToDDMMYYYY(newValue);
      }

      if (newValue === '') {
          alert('Vui lòng nhập giá trị mới.');
          return;
      }


      if (confirm(`Bạn có chắc chắn muốn cập nhật trường "${desiredHeaders[columnIndexToUpdate]}" thành "${newValue}" cho ${selectedRowIndices.length} hàng đã chọn không?`)) {
        try {
          // Update appData
          selectedRowIndices.forEach(rowIndex => {
            if (appData.employeeData[rowIndex]) {
              appData.employeeData[rowIndex][columnIndexToUpdate] = newValue;
            }
          });
          await saveAndSynchronizeData(); // Save to offline and attempt sync

          alert('Dữ liệu đã được cập nhật hàng loạt thành công!');
          hideBulkEditModal();
          displayData(appData.employeeData); // Refresh data display

        } catch (error) {
          console.error('Error saving bulk edit data:', error);
          alert('Lỗi khi lưu dữ liệu chỉnh sửa hàng loạt. Kiểm tra console để biết chi tiết.');
        }
      }
    });
  }

  const cancelBulkEditBtn = document.getElementById('cancel-bulk-edit-btn');
  if (cancelBulkEditBtn) {
    cancelBulkEditBtn.addEventListener('click', () => {
      hideBulkEditModal();
    });
  }

  const closeBulkEditFormButton = document.getElementById('close-bulk-edit-form');
  if (closeBulkEditFormButton) {
    closeBulkEditFormButton.addEventListener('click', () => {
      hideBulkEditModal();
    });
  }

  // Custom Context Menu
  function hideContextMenu() {
    if (customContextMenu) customContextMenu.style.display = 'none';
  }

  if (employeeTableBody) {
    employeeTableBody.addEventListener('contextmenu', (event) => {
      event.preventDefault();

      event.preventDefault();

      let clickedRow = event.target.closest('tr');
      if (!clickedRow) return;

      const checkedCheckboxes = employeeTableBody.querySelectorAll('input[type="checkbox"]:checked');
      const contextMenuViewProfile = document.getElementById('context-menu-view-profile');

      if (customContextMenu && contextMenuViewProfile) {
        if (checkedCheckboxes.length > 1) {
          contextMenuViewProfile.style.display = 'none'; // Hide "View Profile" if more than one is checked
        } else {
          contextMenuViewProfile.style.display = 'list-item'; // Show "View Profile" otherwise
        }

        customContextMenu.dataset.rowIndex = clickedRow.rowIndex; // Set to 0-based row index
        customContextMenu.style.display = 'block';

        // Calculate position relative to the document, considering scroll
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        customContextMenu.style.left = `${event.clientX + scrollX}px`;
        customContextMenu.style.top = `${event.clientY + scrollY}px`;
      }
    });
  }


  document.addEventListener('click', (event) => {
    if (customContextMenu && !customContextMenu.contains(event.target)) {
      hideContextMenu();
    }
  });

  document.addEventListener('scroll', () => {
    hideContextMenu();
  });

  const contextMenuCopy = document.getElementById('context-menu-copy');
  const contextMenuEdit = document.getElementById('context-menu-edit');
  const contextMenuDelete = document.getElementById('context-menu-delete');


  if (contextMenuCopy) {
    contextMenuCopy.addEventListener('click', async () => {
      console.log('Copy clicked');
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const selectedRowsData = [];
      const table = document.getElementById('employee-table');

      checkboxes.forEach(checkbox => {
        if (checkbox.checked && checkbox.dataset.rowIndex) {
          const rowIndex = parseInt(checkbox.dataset.rowIndex);
          const row = table ? table.rows[rowIndex + 1] : null; // +1 to account for table header

          if (row) {
            const rowData = [];
            // Start from index 1 to skip the checkbox cell
            for (let i = 1; i < row.cells.length; i++) {
              rowData.push(row.cells[i].textContent);
            }
            selectedRowsData.push(rowData.join('\t'));
          }
        }
      });

      if (selectedRowsData.length > 0) {
        const allSelectedData = selectedRowsData.join('\n');
        try {
          await navigator.clipboard.writeText(allSelectedData);
          console.log('Selected rows data copied to clipboard:', allSelectedData);
          alert('Dữ liệu của các hàng đã chọn đã được sao chép vào clipboard!');
        } catch (err) {
          console.error('Failed to copy selected rows data: ', err);
          alert('Không thể sao chép dữ liệu của các hàng đã chọn.');
        }
      } else {
        alert('Vui lòng chọn ít nhất một hàng để sao chép.');
      }

      hideContextMenu();
    });
  }

  if (contextMenuEdit) {
    contextMenuEdit.addEventListener('click', async () => {
      console.log('Edit clicked');
      const rowIndex = parseInt(customContextMenu.dataset.rowIndex);
      const table = document.getElementById('employee-table');
      const row = table ? table.rows[rowIndex ] : null;

      if (row) {
        const rowData = [];
        // Iterate through desiredHeaders to get data from corresponding cells
        desiredHeaders.forEach((header, index) => {
             // Add 1 to index to account for the checkbox column in the rendered table
            const cell = row.cells[index + 1];
            if (cell) {
                rowData.push(cell.textContent);
            } else {
                rowData.push(''); // Add empty string if cell doesn't exist
            }
        });


        if (addEmployeeFormContainer && addEmployeeForm && addEmployeeFormTitle && addEmployeeFormSubmitButton) {
          addEmployeeFormTitle.textContent = 'Chỉnh sửa nhân viên';
          addEmployeeFormSubmitButton.textContent = 'Lưu thay đổi';
          addEmployeeForm.dataset.editingRowIndex = rowIndex;

          // Populate form fields based on the order of desiredHeaders
          document.getElementById('new-stt').value = rowData[0] !== undefined ? rowData[0] : '';
          document.getElementById('new-name').value = rowData[1] !== undefined ? rowData[1] : '';
          document.getElementById('new-employee-id').value = rowData[2] !== undefined ? rowData[2] : ''; // Assuming input ID
          document.getElementById('new-gender').value = rowData[3] !== undefined ? rowData[3] : ''; // Assuming input ID
          document.getElementById('new-dob').value = rowData[4] !== undefined ? parseDateToYYYYMMDD(rowData[4]) : '';
          document.getElementById('new-phone').value = rowData[5] !== undefined ? rowData[5] : '';
          document.getElementById('new-email').value = rowData[6] !== undefined ? rowData[6] : ''; // Assuming input ID
          document.getElementById('new-bank').value = rowData[7] !== undefined ? rowData[7] : ''; // Assuming input ID
          document.getElementById('new-account-number').value = rowData[8] !== undefined ? rowData[8] : ''; // Assuming input ID
          document.getElementById('new-account-holder').value = rowData[9] !== undefined ? rowData[9] : ''; // Assuming input ID
          document.getElementById('new-managing-unit').value = rowData[10] !== undefined ? rowData[10] : ''; // Assuming input ID
          document.getElementById('new-status').value = rowData[11] !== undefined ? rowData[11] : '';

          // Show the modal
          showAddEmployeeModal();
        }
      }
      hideContextMenu();
    });
  }

  if (contextMenuDelete) {
    contextMenuDelete.addEventListener('click', async () => {
      console.log('Delete clicked');
      const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
      const selectedRowIndices = [];

      checkboxes.forEach(checkbox => {
        if (checkbox.dataset.rowIndex) {
          selectedRowIndices.push(parseInt(checkbox.dataset.rowIndex));
        }
      });

      if (selectedRowIndices.length === 0) {
        alert('Vui lòng chọn ít nhất một hàng để xóa.');
        hideContextMenu();
        return;
      }

      if (confirm(`Bạn có chắc chắn muốn xóa ${selectedRowIndices.length} hàng đã chọn không?`)) {
        try {
          // Sort indices in descending order to avoid issues with shifting rows
          selectedRowIndices.forEach(index => {
            appData.employeeData.splice(index, 1);
          });
          await saveAndSynchronizeData(); // Save to offline and attempt sync

          alert('Các hàng đã chọn đã được xóa thành công!');
          displayData(appData.employeeData); // Refresh data display

        } catch (error) {
          console.error('Error deleting selected rows:', error);
          alert('Lỗi khi xóa các hàng đã chọn. Kiểm tra console để biết chi tiết.');
        }
      }
      hideContextMenu();
    });
  }

  const contextMenuViewProfile = document.getElementById('context-menu-view-profile');

  if (contextMenuViewProfile) {
    contextMenuViewProfile.addEventListener('click', async () => {
      console.log('View Profile clicked');
      const checkedCheckboxes = employeeTableBody.querySelectorAll('input[type="checkbox"]:checked');

      if (checkedCheckboxes.length === 1) {
        const checkedRowIndex = parseInt(checkedCheckboxes[0].dataset.rowIndex);
        const rowData = appData.employeeData[checkedRowIndex]; // Get data from appData

        if (rowData && rowData.length > 0) {
          // Construct URL with query parameters using the full row data
          const profileUrl = `./EmployeeProfile.html?data=${encodeURIComponent(JSON.stringify(rowData))}`;
          console.log("Navigating to profile URL:", profileUrl);
          window.location.href = profileUrl;
        } else {
          alert('Không thể lấy dữ liệu cho hàng đã chọn.');
        }
      } else {
        alert('Vui lòng chọn chính xác một hàng để xem profile.');
      }
      hideContextMenu();
    });
  }


  // Function to set the top position of the table header
  function setStickyHeaderPosition() {
    const stickyHeader = document.querySelector('.sticky-header');
    const tableHead = document.querySelector('#employee-table thead');
    if (stickyHeader && tableHead) {
      const stickyHeaderHeight = stickyHeader.offsetHeight;
      tableHead.style.top = `${stickyHeaderHeight}px`;
    }
  }

  // Event listener for Apply Filter button
  const applyFilterBtn = document.getElementById('apply-filter');
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', filterTable);
  }

  // Event listener for Clear Filter button
  const clearFilterBtn = document.getElementById('clear-filter');
  if (clearFilterBtn) {
    clearFilterBtn.addEventListener('click', () => {
      const filterInputs = document.querySelectorAll('.filter-container input[type="text"]');
      filterInputs.forEach(input => input.value = '');
      const filterSelects = document.querySelectorAll('.filter-container select');
      filterSelects.forEach(select => select.value = ''); // Reset select values
      displayData(appData.employeeData); // Display all data after clearing filters
    });
  }

  // Initial data display
  loadInitialData(); // Call the new function to load data

  // Set initial sticky header position
  setStickyHeaderPosition();

  // Update sticky header position on window resize
  window.addEventListener('resize', setStickyHeaderPosition);
});
