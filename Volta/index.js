const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const QRCode = require("qrcode");
const ExcelJS = require("exceljs");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // لتقديم صفحة HTML

const clients = [];
const excelFilePath = path.join(__dirname, "clients.xlsx");

// إنشاء ملف Excel إن لم يكن موجود
async function initExcelFile() {
  if (!fs.existsSync(excelFilePath)) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Clients");
    sheet.columns = [
      { header: "ID", key: "id" },
      { header: "Name", key: "name" },
      { header: "Email", key: "email" },
      { header: "Phone", key: "phone" },
    ];
    await workbook.xlsx.writeFile(excelFilePath);
  }
}

// حفظ عميل في Excel
async function saveClientToExcel(client) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelFilePath);
  const sheet = workbook.getWorksheet("Clients");
  sheet.addRow(client);
  await workbook.xlsx.writeFile(excelFilePath);
}

// توليد رقم ID عشوائي مكوّن من 4 أرقام
function generateId() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// إعداد الإيميل باستخدام Gmail + App Password
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "omar.siper2000@gmail.com", // ← استبدلها ببريدك
    pass: "cesh tfqq kelm vwax", // ← App Password (16 رمز)
  },
});

// تسجيل العميل
app.post("/register", async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: "يرجى إدخال جميع الحقول" });
  }

  const id = generateId();
  const client = { id, name, email, phone };
  clients.push(client);

  await saveClientToExcel(client);

  const link = `http://localhost:${port}/client.html?id=${id}`;
  const qrLink = `${link}&full=true`;
  const qrCode = await QRCode.toDataURL(qrLink);

  // إرسال الإيميل
  const mailOptions = {
    from: '"Volta Team" <your_email@gmail.com>',
    to: email,
    subject: "تم تسجيلك في حدث Volta ✅",
    html: `
  <p>مرحبًا ${name}،</p>
  <p>تم تسجيلك بنجاح. اضغط على الرابط التالي للدخول:</p>
  <a href="${link}">${link}</a>
  <p>أو امسح QR التالي من هاتفك:</p>
  <img src="${qrCode}" alt="QR Code" />
`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: "✅ تم التسجيل والإرسال بنجاح", id, link });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "❌ فشل إرسال الإيميل" });
  }
});

// API لاسترجاع بيانات العميل
app.get("/api/client/:id", (req, res) => {
  const client = clients.find((c) => c.id === req.params.id);
  if (client) {
    res.json(client);
  } else {
    res.status(404).json({ error: "العميل غير موجود" });
  }
});

initExcelFile().then(() => {
  app.listen(port, () => {
    console.log(`✅ الخادم يعمل على http://localhost:${port}`);
  });
});
