import express from "express";
import { createServer as createViteServer, loadEnv } from "vite";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("system.db");
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    mobile TEXT UNIQUE,
    email TEXT,
    pin TEXT,
    shop_name TEXT,
    dealer_commission REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    role TEXT DEFAULT 'client',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    upload_id INTEGER,
    dealer_code TEXT,
    company_code TEXT,
    cost_price REAL DEFAULT 0,
    dealer_commission REAL DEFAULT 0,
    source TEXT DEFAULT 'Manual',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(upload_id) REFERENCES uploads(id)
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    filename TEXT,
    record_count INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrations
try {
  db.prepare("ALTER TABLE records ADD COLUMN upload_id INTEGER").run();
} catch (e) { }

try {
  db.prepare("ALTER TABLE records ADD COLUMN source TEXT DEFAULT 'Manual'").run();
} catch (e) { }

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  const hashedPin = bcrypt.hashSync("123456", 10);
  db.prepare("INSERT INTO users (username, pin, role, status) VALUES (?, ?, ?, ?)").run("admin", hashedPin, "admin", "approved");
}

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware for Auth
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Forbidden" });

    // Safety check: Ensure user still exists in the database
    const dbUser = db.prepare("SELECT id FROM users WHERE id = ?").get(user.id);
    if (!dbUser) {
      return res.status(401).json({ error: "User no longer exists. Please login again." });
    }

    req.user = user;
    next();
  });
};

const logAction = (userId: number | null, action: string, details: string) => {
  db.prepare("INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)").run(userId, action, details);
};

// --- API ROUTES ---

// Auth: Sign Up
app.post("/api/auth/register", (req, res) => {
  const { username, mobile, email, pin, shopName } = req.body;
  try {
    const hashedPin = bcrypt.hashSync(pin, 10);
    const result = db.prepare("INSERT INTO users (username, mobile, email, pin, shop_name) VALUES (?, ?, ?, ?, ?)").run(username, mobile, email, hashedPin, shopName);
    logAction(Number(result.lastInsertRowid), "REGISTER", `User ${username} registered, status: pending`);
    res.json({ success: true, message: "Registration successful. Awaiting admin approval." });
  } catch (error: any) {
    res.status(400).json({ error: error.message.includes("UNIQUE") ? "Username or Mobile already exists" : "Registration failed" });
  }
});

// Auth: Login
app.post("/api/auth/login", (req, res) => {
  const { username, pin } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

  if (!user || !bcrypt.compareSync(pin, user.pin)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (user.status !== 'approved' && user.role !== 'admin') {
    return res.status(403).json({ error: `Account status: ${user.status}. Please contact admin.` });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  logAction(user.id, "LOGIN", `User ${username} logged in`);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      mobile: user.mobile,
      email: user.email,
      shopName: user.shop_name,
      dealerCommission: user.dealer_commission
    }
  });
});

// Admin: Get Users
app.get("/api/admin/users", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const users = db.prepare("SELECT id, username, mobile, email, shop_name, dealer_commission, status, created_at FROM users WHERE role = 'client' ORDER BY created_at DESC").all();
  res.json(users);
});

// Admin: Update User Status
app.post("/api/admin/users/:id/status", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const { status } = req.body;
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, req.params.id);
  logAction(req.user.id, "ADMIN_USER_STATUS", `Updated user ${req.params.id} to ${status}`);
  res.json({ success: true });
});

// Admin: Update User Details
app.put("/api/admin/users/:id", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const { username, mobile, email, shop_name, dealer_commission } = req.body;
  try {
    db.prepare("UPDATE users SET username = ?, mobile = ?, email = ?, shop_name = ?, dealer_commission = ? WHERE id = ?").run(
      username,
      mobile,
      email,
      shop_name,
      dealer_commission || 0,
      req.params.id
    );
    logAction(req.user.id, "ADMIN_USER_UPDATE", `Updated user ${req.params.id} details`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: "Username or Mobile already exists" });
  }
});

// Admin: Delete User
app.delete("/api/admin/users/:id", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });

  const deleteUser = db.transaction(() => {
    db.prepare("DELETE FROM records WHERE user_id = ?").run(req.params.id);
    db.prepare("DELETE FROM logs WHERE user_id = ?").run(req.params.id);
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  });

  deleteUser();
  logAction(req.user.id, "ADMIN_USER_DELETE", `Deleted user ${req.params.id} and all associated data`);
  res.json({ success: true });
});

// Admin: Get Logs
app.get("/api/admin/logs", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const logs = db.prepare(`
    SELECT logs.*, users.username 
    FROM logs 
    LEFT JOIN users ON logs.user_id = users.id 
    ORDER BY timestamp DESC LIMIT 100
  `).all();
  res.json(logs);
});

// Admin: Update Individual User Logs
app.get("/api/admin/users/:id/logs", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const logs = db.prepare(`
    SELECT logs.*, users.username 
    FROM logs 
    LEFT JOIN users ON logs.user_id = users.id 
    WHERE logs.user_id = ?
    ORDER BY timestamp DESC LIMIT 100
  `).all(req.params.id);
  res.json(logs);
});

// Admin: Get Individual User Records
app.get("/api/admin/users/:id/records", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const records = db.prepare("SELECT * FROM records WHERE user_id = ? ORDER BY updated_at DESC").all(req.params.id);
  res.json(records);
});

// Admin: Import Individual User Records
app.post("/api/admin/users/:id/records/import", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const { records, strategy } = req.body;
  const targetUserId = req.params.id;

  const user: any = db.prepare("SELECT dealer_commission FROM users WHERE id = ?").get(targetUserId);
  const commission = user?.dealer_commission || 0;

  // Find duplicates first if no strategy
  if (!strategy) {
    const duplicates = [];
    const checkStmt = db.prepare("SELECT id, company_code FROM records WHERE user_id = ? AND company_code = ?");
    for (const record of records) {
      const existing = checkStmt.get(targetUserId, record.company_code);
      if (existing) {
        duplicates.push({ ...record, existingId: (existing as any).id });
      }
    }
    if (duplicates.length > 0) {
      return res.json({
        success: false,
        requiresDecision: true,
        duplicates: duplicates.map(d => (d as any).company_code),
        duplicateCount: duplicates.length,
        totalCount: records.length
      });
    }
  }

  const insertStmt = db.prepare("INSERT INTO records (user_id, dealer_code, company_code, cost_price, dealer_commission, source) VALUES (?, ?, ?, ?, ?, ?)");
  const updateStmt = db.prepare("UPDATE records SET dealer_code = ?, cost_price = ?, dealer_commission = ?, source = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND company_code = ?");
  const checkStmt = db.prepare("SELECT id FROM records WHERE user_id = ? AND company_code = ?");

  let imported = 0, updated = 0, skipped = 0;

  const importRecords = db.transaction((data) => {
    for (const record of data) {
      const existing = checkStmt.get(targetUserId, record.company_code);
      if (existing) {
        if (strategy === 'overwrite') {
          updateStmt.run(record.dealer_code, record.cost_price || 0, commission, 'Admin Import', targetUserId, record.company_code);
          updated++;
        } else {
          skipped++;
        }
      } else {
        insertStmt.run(targetUserId, record.dealer_code, record.company_code, record.cost_price || 0, commission, 'Admin Import');
        imported++;
      }
    }
  });

  importRecords(records);
  logAction(req.user.id, "ADMIN_USER_IMPORT", `Imported ${imported}, Updated ${updated}, Skipped ${skipped} for user ${targetUserId}`);
  res.json({ success: true, imported, updated, skipped });
});

// Admin: Update Own Profile
app.put("/api/admin/profile", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const { username, email, pin } = req.body;

  try {
    if (pin) {
      const hashedPin = bcrypt.hashSync(pin, 10);
      db.prepare("UPDATE users SET username = ?, email = ?, pin = ? WHERE id = ?").run(username, email, hashedPin, req.user.id);
    } else {
      db.prepare("UPDATE users SET username = ?, email = ? WHERE id = ?").run(username, email, req.user.id);
    }
    logAction(req.user.id, "ADMIN_PROFILE_UPDATE", "Admin updated their own profile");
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Username already exists" });
  }
});

// Client: Delete Record
app.delete("/api/records/:id", authenticateToken, (req: any, res) => {
  const userId = Number(req.user.id);
  const recordId = Number(req.params.id);
  db.prepare("DELETE FROM records WHERE id = ? AND user_id = ?").run(recordId, userId);
  logAction(userId, "RECORD_DELETE", `Deleted record ${recordId}`);
  res.json({ success: true });
});

// Client: Delete Multiple Records (using POST for better body support)
app.post("/api/records/bulk-delete", authenticateToken, (req: any, res) => {
  try {
    const { ids } = req.body;
    const userId = Number(req.user.id);

    console.log(`Bulk delete requested by user ${userId}. IDs:`, ids);

    if (!Array.isArray(ids)) {
      console.error("Bulk delete failed: ids is not an array", ids);
      return res.status(400).json({ error: "Invalid data: ids must be an array" });
    }

    if (ids.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    // We'll process this in a transaction for atomicity and speed
    const deleteStmt = db.prepare("DELETE FROM records WHERE id = ? AND user_id = ?");

    let totalDeleted = 0;
    const transaction = db.transaction((idList) => {
      let count = 0;
      for (const id of idList) {
        const idNum = Number(id);
        if (isNaN(idNum)) continue;
        const result = deleteStmt.run(idNum, userId);
        count += result.changes;
      }
      return count;
    });

    totalDeleted = transaction(ids);

    console.log(`Bulk delete complete. User ${userId} specifically requested ${ids.length} IDs, ${totalDeleted} were deleted.`);
    logAction(userId, "RECORD_BULK_DELETE", `Deleted ${totalDeleted} records out of ${ids.length} requested`);

    res.json({ success: true, count: totalDeleted, requested: ids.length });
  } catch (error: any) {
    console.error("Bulk delete endpoint error:", error);
    res.status(500).json({ error: "Failed to delete records: " + error.message });
  }
});

// Client: Records
app.get("/api/records", authenticateToken, (req: any, res) => {
  const records = db.prepare(`
    SELECT records.*, uploads.filename 
    FROM records 
    LEFT JOIN uploads ON records.upload_id = uploads.id 
    WHERE records.user_id = ? 
    ORDER BY records.updated_at DESC
  `).all(req.user.id);
  res.json(records);
});

app.post("/api/records", authenticateToken, (req: any, res) => {
  const { dealerCode, companyCode, costPrice, overwrite } = req.body;
  const userId = Number(req.user.id);
  const user: any = db.prepare("SELECT dealer_commission FROM users WHERE id = ?").get(userId);
  const commission = user?.dealer_commission || 0;

  // Check for duplicate
  const existing: any = db.prepare("SELECT id FROM records WHERE user_id = ? AND company_code = ?").get(userId, companyCode);

  if (existing && !overwrite) {
    return res.json({ success: false, duplicate: true, existingId: existing.id });
  }

  if (existing && overwrite) {
    db.prepare("UPDATE records SET dealer_code = ?, cost_price = ?, dealer_commission = ?, source = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(dealerCode, costPrice || 0, commission, 'Manual', existing.id);
    logAction(userId, "RECORD_UPDATE", `Overwrote existing record: ${dealerCode}/${companyCode}`);
    return res.json({ success: true, id: existing.id, updated: true });
  }

  const result = db.prepare("INSERT INTO records (user_id, dealer_code, company_code, cost_price, dealer_commission, source) VALUES (?, ?, ?, ?, ?, ?)").run(userId, dealerCode, companyCode, costPrice || 0, commission, 'Manual');
  logAction(userId, "RECORD_ADD", `Added record: ${dealerCode}/${companyCode}`);
  res.json({ success: true, id: result.lastInsertRowid });
});

app.put("/api/records/:id", authenticateToken, (req: any, res) => {
  const { dealerCode, companyCode, costPrice } = req.body;
  const userId = Number(req.user.id);
  const recordId = Number(req.params.id);
  db.prepare("UPDATE records SET dealer_code = ?, company_code = ?, cost_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?").run(dealerCode, companyCode, costPrice || 0, recordId, userId);
  logAction(userId, "RECORD_UPDATE", `Updated record ${recordId}`);
  res.json({ success: true });
});

// Admin: Import Excel Records (can be used by users too)
app.post("/api/records/bulk-import", authenticateToken, (req: any, res) => {
  const { records, strategy, overwriteCodes, filename } = req.body; // strategy: 'skip', 'overwrite'; overwriteCodes: string[]; filename: string
  if (!Array.isArray(records)) return res.status(400).json({ error: "Invalid data format" });

  const userId = req.user.id;
  const user: any = db.prepare("SELECT dealer_commission FROM users WHERE id = ?").get(userId);
  const commission = user?.dealer_commission || 0;

  // Find duplicates first if no strategy and no overwriteCodes chosen
  if (!strategy && (!overwriteCodes || overwriteCodes.length === 0)) {
    const duplicates = [];
    const checkStmt = db.prepare("SELECT id, company_code FROM records WHERE user_id = ? AND company_code = ?");

    for (const record of records) {
      const existing = checkStmt.get(userId, record.company_code);
      if (existing) {
        duplicates.push({ ...record, existingId: (existing as any).id });
      }
    }

    if (duplicates.length > 0) {
      return res.json({
        success: false,
        requiresDecision: true,
        duplicates: duplicates.map(d => (d as any).company_code),
        duplicateCount: duplicates.length,
        totalCount: records.length
      });
    }
  }

  const insertStmt = db.prepare("INSERT INTO records (user_id, upload_id, dealer_code, company_code, cost_price, dealer_commission, source) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const updateStmt = db.prepare("UPDATE records SET upload_id = ?, dealer_code = ?, cost_price = ?, dealer_commission = ?, source = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND company_code = ?");
  const checkStmt = db.prepare("SELECT id FROM records WHERE user_id = ? AND company_code = ?");

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  try {
    const transaction = db.transaction((data, uploadId, src) => {
      for (const record of data) {
        const existing: any = checkStmt.get(userId, record.company_code);

        if (existing) {
          const shouldOverwrite = strategy === 'overwrite' || (Array.isArray(overwriteCodes) && overwriteCodes.includes(record.company_code));

          if (shouldOverwrite) {
            updateStmt.run(uploadId, record.dealer_code, record.cost_price || 0, commission, src, userId, record.company_code);
            updated++;
          } else {
            skipped++;
          }
        } else {
          insertStmt.run(userId, uploadId, record.dealer_code, record.company_code, record.cost_price || 0, commission, src);
          imported++;
        }
      }
    });

    // Create Upload Record
    const uploadResult = db.prepare("INSERT INTO uploads (user_id, filename, record_count) VALUES (?, ?, ?)").run(userId, filename || 'excel_import.xlsx', records.length);
    const uploadId = uploadResult.lastInsertRowid;

    transaction(records, uploadId, filename || 'excel_import.xlsx');
    logAction(userId, "BULK_IMPORT", `File: ${filename || 'unknown'}, Imported: ${imported}, Updated: ${updated}, Skipped: ${skipped}`);
    res.json({ success: true, imported, updated, skipped });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Client: Update Profile (Mobile & Commission)
app.put("/api/profile", authenticateToken, (req: any, res) => {
  const { mobile, dealerCommission } = req.body;
  try {
    const updateProfile = db.transaction(() => {
      if (mobile !== undefined) {
        db.prepare("UPDATE users SET mobile = ? WHERE id = ?").run(mobile, req.user.id);
        logAction(req.user.id, "PROFILE_UPDATE", `Updated mobile to ${mobile}`);
      }
      if (dealerCommission !== undefined) {
        // Update user profile
        db.prepare("UPDATE users SET dealer_commission = ? WHERE id = ?").run(dealerCommission, req.user.id);
        // Update ALL existing records with new commission as requested
        db.prepare("UPDATE records SET dealer_commission = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?").run(dealerCommission, req.user.id);
        logAction(req.user.id, "PROFILE_UPDATE", `Updated commission to ${dealerCommission}% and updated all records`);
      }
    });

    updateProfile();
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Update failed" });
  }
});

// Client: Reset PIN (Authenticated)
app.put("/api/profile/pin", authenticateToken, (req: any, res) => {
  const { oldPin, newPin } = req.body;
  const user: any = db.prepare("SELECT pin FROM users WHERE id = ?").get(req.user.id);

  if (!bcrypt.compareSync(oldPin, user.pin)) {
    return res.status(400).json({ error: "Current PIN is incorrect" });
  }

  const hashedPin = bcrypt.hashSync(newPin, 10);
  db.prepare("UPDATE users SET pin = ? WHERE id = ?").run(hashedPin, req.user.id);
  logAction(req.user.id, "PIN_RESET", "User reset their PIN");
  res.json({ success: true });
});

// Public: Request PIN Reset (Unauthenticated)
app.post("/api/auth/reset-pin-request", (req, res) => {
  const { username, mobile } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE username = ? AND mobile = ?").get(username, mobile);

  if (!user) {
    return res.status(404).json({ error: "User not found with these details" });
  }

  // In a real app, we would generate a temporary PIN or reset link and send via SMS/Email
  // For this demo, we'll simulate the "sharing" by logging it and returning success
  logAction(user.id, "PIN_RESET_REQUEST", `PIN reset requested for ${username}. Simulated send to ${user.email} and ${user.mobile}`);

  res.json({
    success: true,
    message: `A reset instruction has been sent to your registered email (${user.email}) and mobile (${user.mobile}).`
  });
});

// Client: Uploads History
app.get("/api/uploads", authenticateToken, (req: any, res) => {
  const uploads = db.prepare("SELECT * FROM uploads WHERE user_id = ? ORDER BY timestamp DESC").all(req.user.id);
  res.json(uploads);
});

// Client: Delete Upload and its records
app.delete("/api/uploads/:id", authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const uploadId = req.params.id;

  const deleteUpload = db.transaction(() => {
    const recordsDeleted = db.prepare("DELETE FROM records WHERE user_id = ? AND upload_id = ?").run(userId, uploadId);
    db.prepare("DELETE FROM uploads WHERE id = ? AND user_id = ?").run(uploadId, userId);
    return recordsDeleted.changes;
  });

  try {
    const deletedCount = deleteUpload();
    logAction(userId, "UPLOAD_DELETE", `Deleted upload ${uploadId} and ${deletedCount} associated records`);
    res.json({ success: true, deletedCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Client: Suggestions
app.get("/api/records/suggestions", authenticateToken, (req: any, res) => {
  const { q } = req.query;
  const suggestions = db.prepare(`
    SELECT DISTINCT dealer_code, company_code 
    FROM records 
    WHERE user_id = ? AND (dealer_code LIKE ? OR company_code LIKE ?)
    LIMIT 5
  `).all(req.user.id, `%${q}%`, `%${q}%`);
  res.json(suggestions);
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
    const [{ default: reactPlugin }, { default: tailwindcssPlugin }] = await Promise.all([
      import('@vitejs/plugin-react'),
      import('@tailwindcss/vite'),
    ]);

    const vite = await createViteServer({
      root: __dirname,
      server: { middlewareMode: true },
      appType: "spa",
      plugins: [reactPlugin(), tailwindcssPlugin()],
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
      },
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
