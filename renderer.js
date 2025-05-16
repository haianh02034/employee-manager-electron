document.addEventListener('DOMContentLoaded', () => {
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
  const range = 'Sheet1!A1:Z1000'; // Adjust the range as needed

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
  const bulkEditBtn = document.getElementById('bulkEditBtn');
  const bulkEditForm = document.getElementById('bulkEditForm');
  const saveBulkEditBtn = document.getElementById('saveBulkEditBtn');
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


  async function displayData() {
    try {
      const data = await window.readData(spreadsheetId, range);

      if (employeeTableBody) {
        employeeTableBody.innerHTML = ''; // Clear existing content

        if (data && data.length > 0) {
          // Assuming the table header is already in index.html
          // Create table rows
          for (let i = 1; i < data.length; i++) { // Iterate through all data rows
            const rowData = data[i];
            const row = document.createElement('tr');

            // Add checkbox
            const checkboxCell = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.rowIndex = i;
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
          // employeeTableBody.textContent = 'No data found in the sheet.'; // This might not be ideal for a tbody
        }
      }
    } catch (error) {
      console.error('Error fetching or displaying data:', error);
      // Error handling for the tbody might be different than for appDiv
    }
  }

  // Filtering function
  function filterTable() {
    const filterValues = [];
    const table = document.querySelector('.data-table');
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    const filterInputs = document.querySelectorAll('.filter-input');

    filterInputs.forEach(input => {
      filterValues.push(input.value.toLowerCase());
    });

    rows.forEach(row => {
      let match = true;
      const cells = row.querySelectorAll('td');

      cells.forEach((cell, index) => {
        const columnIndex = cell.cellIndex - 1; // Subtract 1 for checkbox
        const cellText = cell.textContent.toLowerCase();
        const filterValue = filterValues[columnIndex];

        if (filterValue && !cellText.includes(filterValue)) {
          match = false;
        }
      });

      // STT search fix (retained original regex logic)
      const sttFilterInput = document.getElementById('filterInput0');
      if (sttFilterInput) {
        const sttFilterValue = sttFilterInput.value.toLowerCase();
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
      }


      row.style.display = match ? '' : 'none';
    });
  }

  // Helper function to show the add employee modal
  function showAddEmployeeModal() {
    if (modalOverlay) modalOverlay.style.display = 'block';
    if (addEmployeeFormContainer) addEmployeeFormContainer.style.display = 'block';
  }

  // Helper function to hide the add employee modal
  function hideAddEmployeeModal() {
    if (modalOverlay) modalOverlay.style.display = 'none';
    if (addEmployeeFormContainer) addEmployeeFormContainer.style.display = 'none';
    if (addEmployeeForm) {
      addEmployeeForm.reset();
      addEmployeeForm.removeAttribute('data-editing-row-index');
    }
  }


  // Event Listeners
  if (addEmployeeBtn) {
    addEmployeeBtn.addEventListener('click', () => {
      if (addEmployeeFormTitle) addEmployeeFormTitle.textContent = 'Thêm nhân viên mới';
      if (addEmployeeFormSubmitButton) addEmployeeFormSubmitButton.textContent = 'Thêm nhân viên';
      if (addEmployeeForm) {
        addEmployeeForm.removeAttribute('data-editing-row-index');
        addEmployeeForm.reset();
      }
      showAddEmployeeModal();
    });
  }

  if (cancelAddEmployeeButton) {
    cancelAddEmployeeButton.addEventListener('click', () => {
      hideAddEmployeeModal();
    });
  }

  if (closeAddEmployeeFormButton) {
    closeAddEmployeeFormButton.addEventListener('click', () => {
      hideAddEmployeeModal();
    });
  }

  if (addEmployeeForm) {
    addEmployeeForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const editingRowIndex = addEmployeeForm.dataset.editingRowIndex;

      try {
        // Collect data from the form - ensure these match the desiredHeaders order
        const stt = document.getElementById('new-stt').value;
        const hoTen = document.getElementById('new-name').value;
        const maNhanVien = document.getElementById('new-employee-id').value; // Assuming an input with this ID exists
        const gioiTinh = document.getElementById('new-gender').value; // Assuming an input with this ID exists
        const ngaySinhValue = document.getElementById('new-dob').value;
        const soDienThoai = document.getElementById('new-phone').value;
        const email = document.getElementById('new-email').value; // Assuming an input with this ID exists
        const nganHang = document.getElementById('new-bank').value; // Assuming an input with this ID exists
        const soTaiKhoan = document.getElementById('new-account-number').value; // Assuming an input with this ID exists
        const chuTaiKhoan = document.getElementById('new-account-holder').value; // Assuming an input with this ID exists
        const donViChuQuan = document.getElementById('new-managing-unit').value; // Assuming an input with this ID exists
        const trangThai = document.getElementById('new-status').value;

        // Basic email validation
        if (email && (!email.includes('@') || !email.includes('.'))) {
          alert('Vui lòng nhập địa chỉ email hợp lệ.');
          return; // Stop the form submission
        }

        const ngaySinhFormatted = formatDateToDDMMYYYY(ngaySinhValue);

        const values = [[
          stt,
          hoTen,
          maNhanVien,
          gioiTinh,
          ngaySinhFormatted,
          soDienThoai,
          email,
          nganHang,
          soTaiKhoan,
          chuTaiKhoan,
          donViChuQuan,
          trangThai
        ]];

        if (editingRowIndex !== undefined) {
          const rowNumber = parseInt(editingRowIndex) + 1;
          const rangeToUpdate = `Sheet1!A${rowNumber}`;
          await window.updateData(spreadsheetId, rangeToUpdate, values);
          alert('Dữ liệu đã được cập nhật thành công!');
          hideAddEmployeeModal(); // Hide modal and reset form after successful update
        } else {
          const existingData = await window.readData(spreadsheetId, range);
          let nextStt = 1;
          if (existingData && existingData.length > 1) {
            const lastRow = existingData[existingData.length - 1];
            const lastStt = parseInt(lastRow[0]);
            if (!isNaN(lastStt)) {
              nextStt = lastStt + 1;
            }
          }
          values[0][0] = nextStt;

          await window.writeData(spreadsheetId, range, values);
          alert('Dữ liệu đã được lưu thành công!');
          hideAddEmployeeModal(); // Hide modal and reset form after successful save
        }

        displayData(); // Refresh data display after save or update

      } catch (error) {
        console.error('Error saving data:', error);
        alert('Lỗi khi lưu dữ liệu. Kiểm tra console để biết chi tiết.');
      }
    });
  }

  if (bulkEditBtn) {
    bulkEditBtn.addEventListener('click', () => {
      if (bulkEditForm) bulkEditForm.style.display = 'block';
    });
  }

  if (saveBulkEditBtn) {
    saveBulkEditBtn.addEventListener('click', async () => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const selectedRows = [];

      checkboxes.forEach(checkbox => {
        if (checkbox.checked && checkbox.dataset.rowIndex) {
          selectedRows.push(parseInt(checkbox.dataset.rowIndex));
        }
      });

      if (selectedRows.length === 0) {
        alert('Vui lòng chọn hàng để chỉnh sửa.');
        return;
      }

      const columnIndicesInput = document.getElementById('columnIndices');
      const newValuesInput = document.getElementById('newValues');

      if (!columnIndicesInput || !newValuesInput) {
        alert('Lỗi: Không tìm thấy trường nhập chỉnh sửa hàng loạt.');
        return;
      }

      const columnIndices = columnIndicesInput.value.split(',').map(value => parseInt(value.trim())).filter(value => !isNaN(value));
      const newValues = newValuesInput.value.split(',').map(value => value.trim());

      if (columnIndices.length !== newValues.length) {
        alert('Số lượng chỉ mục cột phải khớp với số lượng giá trị mới.');
        return;
      }

      try {
        for (let i = 0; i < selectedRows.length; i++) {
          const rowIndex = selectedRows[i];
          for (let j = 0; j < columnIndices.length; j++) {
            const columnIndex = columnIndices[j];
            const newValue = newValues[j];
            const range = `Sheet1!${String.fromCharCode(65 + parseInt(columnIndex))}${rowIndex + 1}`;
            await window.updateData(spreadsheetId, range, [[newValue]]);
          }
        }
        alert('Dữ liệu đã được cập nhật thành công!');
        displayData();
      } catch (error) {
        console.error('Error updating data:', error);
        alert('Lỗi khi cập nhật dữ liệu. Kiểm tra console để biết chi tiết.');
      }
    });
  }

  // Custom Context Menu
  function hideContextMenu() {
    if (customContextMenu) customContextMenu.style.display = 'none';
  }

  if (employeeTableBody) {
    employeeTableBody.addEventListener('contextmenu', (event) => {
      event.preventDefault();

      let clickedRow = event.target.closest('tr');
      if (!clickedRow) return;

      if (customContextMenu) {
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
      const rowIndex = parseInt(customContextMenu.dataset.rowIndex);

      if (confirm('Bạn có chắc chắn muốn xóa hàng này không?')) {
        try {
          await window.deleteData(spreadsheetId, rowIndex + 2);
          alert('Hàng đã được xóa thành công!');
          displayData();
        } catch (error) {
          console.error('Error deleting row:', error);
          alert('Lỗi khi xóa hàng. Kiểm tra console để biết chi tiết.');
        }
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

  // Initial data display
  displayData();

  // Set initial sticky header position
  setStickyHeaderPosition();

  // Update sticky header position on window resize
  window.addEventListener('resize', setStickyHeaderPosition);
});
