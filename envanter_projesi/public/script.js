// Türkçe karakterleri normalize etme fonksiyonu
function normalizeText(text) {
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'i');
}

// XSS koruması için HTML escape fonksiyonu
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Local Storage yardımcı fonksiyonları
function getInventoryFromStorage() {
    return JSON.parse(localStorage.getItem('inventory') || '[]');
}

function saveInventoryToStorage(inventory) {
    localStorage.setItem('inventory', JSON.stringify(inventory));
}

// Bildirim gösterme fonksiyonu
function showNotification(message, type = 'success') {
    const toastContainer = document.createElement('div');
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '1050';
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    document.body.appendChild(toastContainer);
    
    const bsToast = new bootstrap.Toast(toast, {
        animation: true,
        autohide: true,
        delay: 3000
    });
    
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toastContainer);
    });
}

// Çalışan adı kontrolü
function isEmployeeExists(name, excludeId = null) {
    const inventory = getInventoryFromStorage();
    return inventory.some(item => 
        item.employeeName.toLowerCase() === name.toLowerCase() && 
        item.id !== excludeId
    );
}

// Form submit işlemi için yardımcı fonksiyon
function handleFormSubmit(employeeName, formData) {
    if (isEmployeeExists(employeeName)) {
        showNotification('Bu çalışan adı zaten mevcut!', 'warning');
        return false;
    }
    return true;
}

// Excel verilerini içe aktarma - düzeltilmiş versiyon
function importExcelData(data) {
    if (!Array.isArray(data) || data.length === 0) {
        showNotification('Geçersiz Excel formatı!', 'danger');
        return;
    }

    const inventory = getInventoryFromStorage();
    let importCount = 0;
    let skipCount = 0;
    let duplicateCount = 0;

    // Debug için başlıkları yazdır
    console.log('Excel başlıkları:', Object.keys(data[0]));

    data.forEach(row => {
        // Başlıkları normalize et ve farklı yazım şekillerini kontrol et
        const employeeName = row['İsim'] || row['isim'] || row['Isim'] || row['ISIM'] || row['Ad Soyad'] || row['AD SOYAD'] || '';
        
        if (!employeeName) {
            skipCount++;
            return;
        }

        // Çalışan adı kontrolü
        if (isEmployeeExists(employeeName)) {
            duplicateCount++;
            return;
        }

        // Yeni kayıt oluştur
        const newItem = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            employeeName: employeeName,
            laptopModel: row['Bilgisayar Marka/Model'] || row['PC Model'] || row['Laptop Model'] || '',
            laptopSerial: row['Bilgisayar Seri No'] || row['PC Seri No'] || row['Laptop Seri No'] || '',
            phoneModel: row['Telefon Marka/Model'] || row['Telefon Model'] || '',
            phoneImei: row['Telefon IMEI'] || row['IMEI'] || '',
            phoneSerial: row['Telefon Seri No'] || row['Telefon Seri no'] || row['Tel Seri No'] || '',
            tabletModel: row['Tablet Marka/Model'] || row['Tablet Model'] || '',
            tabletSerial: row['Tablet Seri No'] || row['Tablet Seri no'] || '',
            deliveryDate: row['Teslim Tarihi'] || row['Teslim Edilen Tarih'] || new Date().toLocaleDateString('tr-TR')
        };

        // En az bir cihaz bilgisi varsa kaydet
        if (
            (newItem.laptopModel || newItem.laptopSerial) ||
            (newItem.phoneModel || newItem.phoneImei || newItem.phoneSerial) ||
            (newItem.tabletModel || newItem.tabletSerial)
        ) {
            inventory.push(newItem);
            importCount++;
        } else {
            skipCount++;
        }
    });

    if (importCount > 0) {
        saveInventoryToStorage(inventory);
        loadInventory();
        let message = `${importCount} kayıt başarıyla içe aktarıldı!`;
        if (skipCount > 0) {
            message += ` (${skipCount} boş kayıt atlandı)`;
        }
        if (duplicateCount > 0) {
            message += ` (${duplicateCount} tekrar eden kayıt atlandı)`;
        }
        showNotification(message, 'success');
    } else {
        showNotification('İçe aktarılacak kayıt bulunamadı!', 'warning');
    }
}

// Excel'e dışa aktarma - geliştirilmiş versiyon
function exportToExcel() {
    const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    if (inventory.length === 0) {
        showNotification('Dışa aktarılacak kayıt bulunamadı.', 'warning');
        return;
    }

    const ws = XLSX.utils.json_to_sheet(inventory.map((item, index) => ({
        'No': index + 1,
        'İsim': item.employeeName || '',
        'Bilgisayar Marka/Model': item.laptopModel || '',
        'Bilgisayar Seri No': item.laptopSerial || '',
        'Telefon Marka/Model': item.phoneModel || '',
        'Telefon IMEI': item.phoneImei || '',
        'Telefon Seri no': item.phoneSerial || '',
        'Tablet Marka/Model': item.tabletModel || '',
        'Tablet Seri no': item.tabletSerial || ''
    })));

    // Sütun genişliklerini ayarlama
    const colWidths = [
        { wch: 5 },  // No
        { wch: 20 }, // İsim
        { wch: 20 }, // Bilgisayar Marka/Model
        { wch: 20 }, // Bilgisayar Seri No
        { wch: 20 }, // Telefon Marka/Model
        { wch: 20 }, // Telefon IMEI
        { wch: 20 }, // Telefon Seri no
        { wch: 20 }, // Tablet Marka/Model
        { wch: 20 }  // Tablet Seri no
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Zimmet Listesi');
    XLSX.writeFile(wb, 'zimmet_formlari.xlsx');
    
    showNotification('Excel dosyası başarıyla oluşturuldu.', 'success');
}

// Kayıt düzenleme fonksiyonu - mavi renk şeması
function editItem(id) {
    const inventory = getInventoryFromStorage();
    const item = inventory.find(item => item.id === id);
    
    if (!item) return;

    // Modal içeriğini oluştur
    const modalHtml = `
        <div class="modal fade" id="editModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header" style="background-color: #3498DB; color: white;">
                        <h5 class="modal-title">
                            <i class="fas fa-edit me-2"></i>
                            ${escapeHtml(item.employeeName)} - Zimmet Düzenle
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editForm">
                            <div class="row mb-3">
                                <div class="col-12">
                                    <label class="form-label">Çalışan Adı</label>
                                    <input type="text" class="form-control" id="editEmployeeName" value="${escapeHtml(item.employeeName)}" required>
                                </div>
                            </div>
                            
                            <!-- Laptop Bilgileri -->
                            <div class="card mb-3 border-info">
                                <div class="card-header bg-light">
                                    <i class="fas fa-laptop me-2"></i>Laptop Bilgileri
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Laptop Modeli</label>
                                            <input type="text" class="form-control" id="editLaptopModel" value="${escapeHtml(item.laptopModel)}">
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Laptop Seri No</label>
                                            <input type="text" class="form-control" id="editLaptopSerial" value="${escapeHtml(item.laptopSerial)}">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Telefon Bilgileri -->
                            <div class="card mb-3 border-info">
                                <div class="card-header bg-light">
                                    <i class="fas fa-mobile-alt me-2"></i>Telefon Bilgileri
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-4 mb-3">
                                            <label class="form-label">Telefon Modeli</label>
                                            <input type="text" class="form-control" id="editPhoneModel" value="${escapeHtml(item.phoneModel)}">
                                        </div>
                                        <div class="col-md-4 mb-3">
                                            <label class="form-label">Telefon IMEI</label>
                                            <input type="text" class="form-control" id="editPhoneImei" value="${escapeHtml(item.phoneImei)}">
                                        </div>
                                        <div class="col-md-4 mb-3">
                                            <label class="form-label">Telefon Seri No</label>
                                            <input type="text" class="form-control" id="editPhoneSerial" value="${escapeHtml(item.phoneSerial)}">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Tablet Bilgileri -->
                            <div class="card mb-3 border-info">
                                <div class="card-header bg-light">
                                    <i class="fas fa-tablet-alt me-2"></i>Tablet Bilgileri
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Tablet Modeli</label>
                                            <input type="text" class="form-control" id="editTabletModel" value="${escapeHtml(item.tabletModel)}">
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Tablet Seri No</label>
                                            <input type="text" class="form-control" id="editTabletSerial" value="${escapeHtml(item.tabletSerial)}">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                        <button type="button" class="btn" style="background-color: #3498DB; color: white;" onclick="saveEdit('${id}')">
                            <i class="fas fa-save me-2"></i>Kaydet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Varsa eski modalı kaldır
    const oldModal = document.querySelector('#editModal');
    if (oldModal) oldModal.remove();

    // Yeni modalı ekle ve göster
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

// Düzenlenen kaydı kaydetme - güncellenmiş versiyon
function saveEdit(id) {
    const inventory = getInventoryFromStorage();
    const index = inventory.findIndex(item => item.id === id);
    
    if (index === -1) return;

    const newEmployeeName = document.getElementById('editEmployeeName').value;

    // Aynı isimde başka bir çalışan var mı kontrol et
    if (isEmployeeExists(newEmployeeName, id)) {
        showNotification('Bu çalışan adı zaten mevcut!', 'warning');
        return;
    }

    // Düzenlenen verileri al
    const editedItem = {
        ...inventory[index],
        employeeName: newEmployeeName,
        laptopModel: document.getElementById('editLaptopModel').value,
        laptopSerial: document.getElementById('editLaptopSerial').value,
        phoneModel: document.getElementById('editPhoneModel').value,
        phoneImei: document.getElementById('editPhoneImei').value,
        phoneSerial: document.getElementById('editPhoneSerial').value,
        tabletModel: document.getElementById('editTabletModel').value,
        tabletSerial: document.getElementById('editTabletSerial').value
    };

    // Kaydı güncelle
    inventory[index] = editedItem;
    saveInventoryToStorage(inventory);
    loadInventory();

    // Modalı kapat ve bildirim göster
    const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
    modal.hide();
    showNotification('Kayıt başarıyla güncellendi!', 'success');
}

// Global scope'ta silme fonksiyonu - güncellenmiş versiyon
function deleteItem(id) {
    if (confirm('Bu kaydı silmek istediğinizden emin misiniz?')) {
        const inventory = getInventoryFromStorage();
        const updatedInventory = inventory.filter(item => item.id !== id);
        saveInventoryToStorage(updatedInventory);
        loadInventory(); // Listeyi yeniden yükle
        showNotification('Kayıt başarıyla silindi!', 'success');
    }
}

// Tüm kayıtları silme fonksiyonu - güncellenmiş versiyon
function clearAllInventory() {
    if (confirm('Tüm kayıtları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
        localStorage.removeItem('inventory');
            const inventoryList = document.getElementById('inventoryList');
        if (inventoryList) {
            inventoryList.innerHTML = '';
        }
        showNotification('Tüm kayıtlar başarıyla silindi!', 'success');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('inventoryForm');
    const inventoryList = document.getElementById('inventoryList');
    const fileInput = document.getElementById('fileInput');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    // Local Storage'dan verileri yükle
    loadInventory();

    // Tümünü Sil butonu için event listener
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllInventory);
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Form doğrulama
            if (!form.checkValidity()) {
                e.stopPropagation();
                form.classList.add('was-validated');
                return;
            }

            const employeeName = document.getElementById('employeeName').value.trim();

            // Çalışan adı kontrolü
            if (!employeeName) {
                showNotification('Çalışan adı boş olamaz!', 'warning');
                return;
            }

            if (isEmployeeExists(employeeName)) {
                showNotification('Bu çalışan adı zaten mevcut!', 'warning');
                return;
            }

            // En az bir cihaz bilgisi girilmiş mi kontrol et
            const laptopModel = document.getElementById('laptopModel').value.trim();
            const laptopSerial = document.getElementById('laptopSerial').value.trim();
            const phoneModel = document.getElementById('phoneModel').value.trim();
            const phoneImei = document.getElementById('phoneImei').value.trim();
            const phoneSerial = document.getElementById('phoneSerial').value.trim();
            const tabletModel = document.getElementById('tabletModel').value.trim();
            const tabletSerial = document.getElementById('tabletSerial').value.trim();

            if (!(laptopModel || laptopSerial || phoneModel || phoneImei || phoneSerial || tabletModel || tabletSerial)) {
                showNotification('En az bir cihaz bilgisi girilmelidir!', 'warning');
                return;
            }

            // Yeni kayıt oluştur
            const newItem = {
                id: Date.now().toString(),
                employeeName: employeeName,
                laptopModel: laptopModel,
                laptopSerial: laptopSerial,
                phoneModel: phoneModel,
                phoneImei: phoneImei,
                phoneSerial: phoneSerial,
                tabletModel: tabletModel,
                tabletSerial: tabletSerial,
                deliveryDate: new Date().toLocaleDateString('tr-TR')
            };

            // Verileri Local Storage'a kaydet
            const inventory = getInventoryFromStorage();
            inventory.push(newItem);
            saveInventoryToStorage(inventory);

            showNotification('Kayıt başarıyla eklendi!', 'success');
            
            // Kullanıcıya sor
            setTimeout(() => {
                const userChoice = confirm('Kayıt başarıyla eklendi! Ne yapmak istersiniz?\n\nTamam: Yeni kayıt ekle\nİptal: Ana sayfaya dön');
                if (userChoice) {
                    // Formu temizle
                    form.reset();
                    form.classList.remove('was-validated');
                } else {
                    // Ana sayfaya yönlendir
                    window.location.href = 'index.html';
                }
            }, 500);
        });
    }

    // Excel dosyası yükleme olayını dinle
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    
                    // Excel verilerini başlık satırıyla birlikte al
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
                        raw: false,
                        defval: ''
                    });

                    console.log('Excel verisi:', jsonData); // Debug için
                    importExcelData(jsonData);
                } catch (error) {
                    console.error('Excel okuma hatası:', error);
                    showNotification('Excel dosyası okunurken hata oluştu!', 'danger');
                }
            };
            reader.readAsArrayBuffer(file);
        }
    });

    // Arama işlevi güncellendi
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = normalizeText(e.target.value);
            const rows = document.querySelectorAll('#inventoryList tr');
            
            rows.forEach(row => {
                const text = normalizeText(row.textContent);
                if (text.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
}

    // Arama temizleme
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        const event = new Event('input');
        searchInput.dispatchEvent(event);
    });
});

function addInventoryItem(item) {
    const inventory = getInventoryFromStorage();
    const id = Date.now().toString();
    
    const newItem = {
        id,
        ...item
    };

    inventory.push(newItem);
    saveInventoryToStorage(inventory);
    displayInventoryItem(newItem);
}

function displayInventoryItem(item, rowNumber) {
    const inventoryList = document.getElementById('inventoryList');
    if (!inventoryList) return;

    const row = document.createElement('tr');
    row.dataset.id = item.id;
    row.style.cursor = 'pointer';
    row.className = 'align-middle'; // Dikey hizalama için
    
    row.innerHTML = `
        <td class="text-center">
            <span class="badge rounded-pill bg-secondary">${rowNumber}</span>
        </td>
        <td class="fw-bold">${escapeHtml(item.employeeName)}</td>
        <td>${escapeHtml(item.laptopModel) || '-'}</td>
        <td>${escapeHtml(item.laptopSerial) || '-'}</td>
        <td>${escapeHtml(item.phoneModel) || '-'}</td>
        <td>${escapeHtml(item.phoneImei) || '-'}</td>
        <td>${escapeHtml(item.phoneSerial) || '-'}</td>
        <td>${escapeHtml(item.tabletModel) || '-'}</td>
        <td>${escapeHtml(item.tabletSerial) || '-'}</td>
        <td class="text-end">
            <div class="btn-group">
                <button class="btn btn-sm" style="background-color: #3498DB; color: white;" 
                    onclick="event.stopPropagation(); editItem('${item.id}')" 
                    title="Düzenle">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm" style="background-color: #E74C3C; color: white;" 
                    onclick="event.stopPropagation(); deleteItem('${item.id}')"
                    title="Sil">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </td>
    `;

    // Satıra tıklama olayı ekle - sadece görüntüleme için
    row.addEventListener('click', () => viewItem(item.id));

    // Satıra hover efekti ekle
    row.addEventListener('mouseenter', () => {
        row.style.backgroundColor = '#f8f9fa';
    });
    row.addEventListener('mouseleave', () => {
        row.style.backgroundColor = '';
    });

    inventoryList.appendChild(row);
}

// Kayıt görüntüleme fonksiyonu - yeni renk şeması
function viewItem(id) {
    const inventory = getInventoryFromStorage();
    const item = inventory.find(item => item.id === id);
    
    if (!item) return;

    // Modal içeriğini oluştur
    const modalHtml = `
        <div class="modal fade" id="viewModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header" style="background-color: #2C3E50; color: white;">
                        <h5 class="modal-title">
                            <i class="fas fa-clipboard-check me-2"></i>
                            ${escapeHtml(item.employeeName)} - Zimmet Bilgileri
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Laptop Bilgileri -->
                        <div class="card mb-3">
                            <div class="card-header bg-light">
                                <i class="fas fa-laptop me-2"></i>Laptop Bilgileri
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label fw-bold">Laptop Modeli</label>
                                        <p>${escapeHtml(item.laptopModel) || '-'}</p>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label fw-bold">Laptop Seri No</label>
                                        <p>${escapeHtml(item.laptopSerial) || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Telefon Bilgileri -->
                        <div class="card mb-3">
                            <div class="card-header bg-light">
                                <i class="fas fa-mobile-alt me-2"></i>Telefon Bilgileri
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-4 mb-3">
                                        <label class="form-label fw-bold">Telefon Modeli</label>
                                        <p>${escapeHtml(item.phoneModel) || '-'}</p>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label class="form-label fw-bold">Telefon IMEI</label>
                                        <p>${escapeHtml(item.phoneImei) || '-'}</p>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label class="form-label fw-bold">Telefon Seri No</label>
                                        <p>${escapeHtml(item.phoneSerial) || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Tablet Bilgileri -->
                        <div class="card mb-3">
                            <div class="card-header bg-light">
                                <i class="fas fa-tablet-alt me-2"></i>Tablet Bilgileri
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label fw-bold">Tablet Modeli</label>
                                        <p>${escapeHtml(item.tabletModel) || '-'}</p>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label fw-bold">Tablet Seri No</label>
                                        <p>${escapeHtml(item.tabletSerial) || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn" style="background-color: #2C3E50; color: white;" data-bs-dismiss="modal">Kapat</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Varsa eski modalı kaldır
    const oldModal = document.querySelector('#viewModal');
    if (oldModal) oldModal.remove();

    // Yeni modalı ekle ve göster
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('viewModal'));
    modal.show();
}

function loadInventory() {
    const inventoryList = document.getElementById('inventoryList');
    if (!inventoryList) return;
    
    const inventory = getInventoryFromStorage();
    inventoryList.innerHTML = '';

    // Alfabetik sıralama
    inventory.sort((a, b) => {
        const nameA = (a.employeeName || '').toLowerCase();
        const nameB = (b.employeeName || '').toLowerCase();
        return nameA.localeCompare(nameB, 'tr');
    });

    // Sıra numarası ile birlikte göster
    inventory.forEach((item, index) => {
        displayInventoryItem(item, index + 1);
    });
}