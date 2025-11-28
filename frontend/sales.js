// frontend/sales.js
// ─────────────────────────────
// MOCK DATA (แทน DB/Backend จริง)
// ─────────────────────────────
let mockMedicines = [
    {
      _id: "med1",
      name: "Paracetamol 500mg",
      brand: "Tylenol",
      price: 5,
      quantity: 100,
    },
    {
      _id: "med2",
      name: "Amoxicillin 250mg",
      brand: "Amoxi",
      price: 12,
      quantity: 50,
    },
    {
      _id: "med3",
      name: "Cough Syrup",
      brand: "FluCare",
      price: 30,
      quantity: 30,
    },
  ];
  
  let mockSales = []; // เก็บประวัติการขายจำลองในหน้านี้
  
  // ─────────────────────────────
  // DOM ELEMENTS
  // ─────────────────────────────
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");
  const selectedSummaryEl = document.getElementById("selectedSummary");
  
  const billItemsTbody = document.getElementById("billItems");
  const grandTotalEl = document.getElementById("grandTotal");
  const customerNameInput = document.getElementById("customerName");
  const customerErrorEl = document.getElementById("customerError");
  const submitSaleBtn = document.getElementById("submitSaleBtn");
  const salesHistoryTbody = document.getElementById("salesHistory");
  
  // state ในหน้า
  let allMedicines = [];
  let billItems = []; // { medicineId, name, price, quantity, lineTotal }
  
  // ─────────────────────────────
  // HELPER: ข้อความ summary ว่ายาที่เลือกอยู่
  // ─────────────────────────────
  function updateSelectedSummary() {
    if (billItems.length === 0) {
      selectedSummaryEl.textContent = "Selected medicines: none";
      return;
    }
    const names = billItems.map((it) => it.name);
    selectedSummaryEl.textContent = "Selected medicines: " + names.join(", ");
  }
    // HELPER: ไม่สามารถเลือก จำนวน ยา มากกว่าใน stock ได้
  function getStockFor(id) {
    const med = mockMedicines.find((m) => m._id === id);
    return med ? med.quantity : Infinity; // ถ้าไม่เจอให้ถือว่าไม่จำกัด
  }
  
  // ─────────────────────────────
  // LOAD MEDICINES (จาก mock)
  // ─────────────────────────────
  async function fetchMedicines() {
    // clone mockMedicines → กันไปแก้ array ต้นฉบับตรง ๆ
    allMedicines = mockMedicines.map((m) => ({ ...m }));
    renderSearchResults("");
  }
  
  // แสดงผลตารางค้นหา + checkbox
  function renderSearchResults(keyword) {
    const q = keyword.toLowerCase();
    const filtered = allMedicines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.brand && m.brand.toLowerCase().includes(q))
    );
  
    if (filtered.length === 0) {
      searchResults.innerHTML =
        `<tr><td colspan="4" class="py-1 text-gray-400 text-center">No medicines found.</td></tr>`;
      return;
    }
  
    searchResults.innerHTML = filtered
      .map((m) => {
        const inBill = billItems.some((it) => it.medicineId === m._id);
        return `
          <tr class="border-b">
            <td class="py-1">${m.name}</td>
            <td class="py-1 text-right">${m.price.toFixed(2)}</td>
            <td class="py-1 text-right">${m.quantity}</td>
            <td class="py-1 text-center">
              <input
                type="checkbox"
                data-select="${m._id}"
                ${inBill ? "checked" : ""}
              />
            </td>
          </tr>
        `;
      })
      .join("");
  }
  
  // ─────────────────────────────
  // CURRENT BILL (ตะกร้า)
  // ─────────────────────────────
  function renderBill() {
    if (billItems.length === 0) {
      billItemsTbody.innerHTML =
        `<tr><td colspan="5" class="py-1 text-gray-400 text-center">No items in bill.</td></tr>`;
      grandTotalEl.textContent = "0.00";
      updateSelectedSummary();
      renderSearchResults(searchInput.value || "");
      return;
    }
  
    billItemsTbody.innerHTML = billItems
      .map(
        (item, idx) => `
        <tr class="border-b">
          <td class="py-1">${item.name}</td>
          <td class="py-1 text-right">${item.price.toFixed(2)}</td>
          <td class="py-1 text-center">
            <input
              type="number"
              min="1"
              value="${item.quantity}"
              data-idx="${idx}"
              class="w-16 border rounded px-1 py-0.5 text-center text-sm qty-input"
            />
          </td>
          <td class="py-1 text-right">${item.lineTotal.toFixed(2)}</td>
          <td class="py-1 text-center">
            <button
              class="text-xs text-red-500"
              data-remove="${idx}"
            >
              ✕
            </button>
          </td>
        </tr>
      `
      )
      .join("");
  
    const total = billItems.reduce((sum, it) => sum + it.lineTotal, 0);
    grandTotalEl.textContent = total.toFixed(2);
    updateSelectedSummary();
    // sync checkbox ให้ตรงกับ bill
    renderSearchResults(searchInput.value || "");
  }
  
  function addToBill(med) {
    const existing = billItems.find((it) => it.medicineId === med._id);
    const stock = getStockFor(med._id);
    const currentQty = existing ? existing.quantity : 0;
  
    if (currentQty + 1 > stock) {
      alert(`Not enough stock for ${med.name}. Max = ${stock}`);
      return;
    }
  
    if (existing) {
      existing.quantity += 1;
      existing.lineTotal = existing.quantity * existing.price;
    } else {
      billItems.push({
        medicineId: med._id,
        name: med.name,
        price: med.price,
        quantity: 1,
        lineTotal: med.price,
      });
    }
    renderBill();
  }
  
  function removeFromBillById(id) {
    const idx = billItems.findIndex((it) => it.medicineId === id);
    if (idx !== -1) {
      billItems.splice(idx, 1);
      renderBill();
    }
  }
  
  // ─────────────────────────────
  // SALES HISTORY (จาก mockSales)
  // ─────────────────────────────
  async function fetchSales() {
    if (mockSales.length === 0) {
      salesHistoryTbody.innerHTML =
        `<tr><td colspan="4" class="py-1 text-gray-400 text-center">No sales yet.</td></tr>`;
      return;
    }
  
    salesHistoryTbody.innerHTML = mockSales
    .map((s) => {
      const detail = s.items
        .map((it) => `${it.name} x${it.quantity}`)
        .join(", ");
  
      return `
        <tr class="border-b">
          <td class="py-2 px-2 text-left w-1/5">${new Date(s.date).toLocaleString()}</td>
          <td class="py-2 px-2 text-left w-1/5">${s.customerName}</td>
          <td class="py-2 px-2 text-right w-1/5">${s.totalAmount.toFixed(2)}</td>
          <td class="py-1 px-2 text-center w-1/5">${s.items.length}</td>
          <td class="py-2 px-2 text-left w-1/5">${detail}</td>
        </tr>
      `;
    })
    .join("");
  }
  
  // ─────────────────────────────
  // CONFIRM SALE (ใช้ mock + ลด stock mock)
  // ─────────────────────────────
  async function submitSale() {
    if (billItems.length === 0) {
      alert("No items in bill.");
      return;
    }
  
    const customer = customerNameInput.value.trim();
    if (!customer) {
      customerErrorEl.classList.remove("hidden");
      customerNameInput.classList.add("border-red-400");
      customerNameInput.focus();
      return;
    }
  
    const totalAmount = billItems.reduce((sum, it) => sum + it.lineTotal, 0);
  
    // ลด stock ใน mockMedicines
    billItems.forEach((it) => {
      const med = mockMedicines.find((m) => m._id === it.medicineId);
      if (med) {
        med.quantity -= it.quantity;
        if (med.quantity < 0) med.quantity = 0;
      }
    });
  
    // บันทึก sale ลง mockSales
    const newSale = {
      id: "sale" + (mockSales.length + 1),
      date: new Date().toISOString(),
      customerName: customer,
      totalAmount,
      items: billItems.map((it) => ({
        medicineId: it.medicineId,
        name: it.name,
        quantity: it.quantity,
        price: it.price,
      })),
    };
    mockSales.unshift(newSale);
  
    alert("Mock sale created! (not saved to DB)");
  
    // เคลียร์ฟอร์ม
    billItems = [];
    customerNameInput.value = "";
    customerErrorEl.classList.add("hidden");
    customerNameInput.classList.remove("border-red-400");
    renderBill();
    await fetchMedicines();
    await fetchSales();
  }
  
  // ─────────────────────────────
  // EVENT LISTENERS
  // ─────────────────────────────
  searchInput.addEventListener("input", (e) => {
    renderSearchResults(e.target.value);
  });
  
  // ติ๊ก checkbox เพื่อเลือก / ยกเลิกเลือกยา
  searchResults.addEventListener("change", (e) => {
    const checkbox = e.target.closest("input[data-select]");
    if (!checkbox) return;
    const id = checkbox.getAttribute("data-select");
    const med = allMedicines.find((m) => m._id === id);
    if (!med) return;
  
    if (checkbox.checked) {
      addToBill(med);
    } else {
      removeFromBillById(id);
    }
  });
  
  // เปลี่ยนจำนวนในบิล
  billItemsTbody.addEventListener("input", (e) => {
    if (!e.target.classList.contains("qty-input")) return;
  
    const idx = Number(e.target.dataset.idx);
    if (idx < 0 || idx >= billItems.length) return;
  
    let raw = e.target.value;
  
    // ผู้ใช้ลบจนเหลือว่างไว้ก่อน
    if (raw === "") {
      return; // ยังไม่อัปเดต state จนกว่าจะพิมพ์ตัวเลข
    }
  
    let val = Number(raw);
    if (isNaN(val) || val <= 0) {
      val = 1;
    }
  
    const item = billItems[idx];
    const stock = getStockFor(item.medicineId);
  
    if (val > stock) {
      alert(`Not enough stock for ${item.name}. Max = ${stock}`);
      val = stock;
    }
  
    item.quantity = val;
    item.lineTotal = item.quantity * item.price;
    e.target.value = val;
  
    renderBill();
  });
  
  // ลบรายการออกจากบิล
  billItemsTbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-remove]");
    if (!btn) return;
    const idx = Number(btn.getAttribute("data-remove"));
    billItems.splice(idx, 1);
    renderBill();
  });
  
  // พิมพ์ชื่อแล้วซ่อน error
  customerNameInput.addEventListener("input", () => {
    if (customerNameInput.value.trim()) {
      customerErrorEl.classList.add("hidden");
      customerNameInput.classList.remove("border-red-400");
    }
  });
  
  // ปุ่ม Confirm Sale
  submitSaleBtn.addEventListener("click", submitSale);
  
  // ─────────────────────────────
  // INIT
  // ─────────────────────────────
  (async function init() {
    try {
      billItems = [];
      renderBill();
      await fetchMedicines();
      await fetchSales();
    } catch (err) {
      console.error(err);
      alert("Failed to init sales page: " + err.message);
    }
  })();