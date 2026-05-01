import Database from "better-sqlite3";
const db = new Database("system.db");

const userId = 3; 
const idToDelete = 3281;

console.log(`Testing delete for ID: ${idToDelete}, User: ${userId}`);

const check = db.prepare("SELECT * FROM records WHERE id = ?").get(idToDelete);
console.log("Record exists in DB:", check);

const checkWithUser = db.prepare("SELECT * FROM records WHERE id = ? AND user_id = ?").get(idToDelete, userId);
console.log("Record exists for user:", checkWithUser);

const result = db.prepare("DELETE FROM records WHERE id = ? AND user_id = ?").run(idToDelete, userId);
console.log("Delete result:", result);

db.close();
