# Kế Hoạch Hoá

Web app tĩnh (HTML/CSS/JS, không cần build) để lập lịch trình, quản lý ngân sách chuyến đi, lưu ảnh hoá đơn công tác phí và đánh dấu 34 tỉnh/thành đã đến.

## Chạy thử
Mở thư mục này bằng bất kỳ static server nào (ví dụ `node ../.claude/serve.js` rồi vào `http://localhost:5173/app/`).

## Triển khai
Chỉ cần phục vụ nguyên thư mục này như file tĩnh: `index.html`, `app.css`, `app.js`, `provinces.js`, `map-data.js`, `manifest.webmanifest`, `icon.svg`, `icon-180.png`.
App gọi `https://open.er-api.com/v6/latest/USD` từ trình duyệt để lấy tỷ giá, nên Content-Security-Policy (nếu có) phải cho phép `connect-src https://open.er-api.com`.

## Dữ liệu
- Chuyến đi, chi tiêu, địa danh: `localStorage` (khoá `soChuyenDi.v1`). Ảnh hoá đơn: IndexedDB `soChuyenDi`. Mọi thứ chỉ nằm trên thiết bị của người dùng.
- Ranh giới tỉnh: [ThangLeQuoc/vietnamese-provinces-database](https://github.com/ThangLeQuoc/vietnamese-provinces-database) (MIT), đơn giản hoá bằng `../tools/build-map.js`.
- Danh sách tỉnh hợp nhất theo NQ 202/2025/QH15; Quảng Ninh (NQ 36/2026/QH16) và Bắc Ninh (NQ 39/2026/QH16) là thành phố trực thuộc TW từ tháng 9/2026.
- Tỷ giá: [Rates By Exchange Rate API](https://www.exchangerate-api.com), cập nhật mỗi ngày một lần.
