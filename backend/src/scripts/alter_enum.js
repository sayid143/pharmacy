import db from '../models/index.js';

const alterEnum = async () => {
    try {
        await db.sequelize.query("ALTER TABLE Sales MODIFY COLUMN payment_method ENUM('cash', 'card', 'credit', 'bank_transfer', 'other', 'ebirr', 'ebirr_kaafi') DEFAULT 'cash'");
        console.log("Enum altered correctly.");
    } catch (e) {
        console.error("Failed to alter ENUM:", e);
        try {
            await db.sequelize.query("ALTER TABLE Sales MODIFY COLUMN payment_method VARCHAR(50) DEFAULT 'cash'");
            console.log("Converted to VARCHAR instead.");
        } catch (e2) {
            console.error("Also failed to convert to VARCHAR:", e2);
        }
    }
    process.exit(0);
};

alterEnum();
