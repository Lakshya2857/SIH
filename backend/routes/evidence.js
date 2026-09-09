const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { db, logAction } = require('../database');
const { verifyToken, verifyAdmin } = require('./auth');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Multer config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Appending extension
    }
});

const upload = multer({ storage: storage });

// Get all evidence
router.get('/', verifyToken, (req, res) => {
    db.all('SELECT * FROM evidence ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(rows);
    });
});

// Upload evidence (Admin only)
router.post('/upload', verifyToken, verifyAdmin, upload.single('image'), (req, res) => {
    const { case_ref, file_name } = req.body;
    
    if (!case_ref || !file_name) {
        return res.status(400).json({ message: 'Missing case_ref or file_name' });
    }

    const image_path = req.file ? `/uploads/${req.file.filename}` : null;
    
    // Generate a hash based on file_name and timestamp
    const hash = crypto.createHash('sha256').update(file_name + Date.now().toString()).digest('hex');

    db.run(
        'INSERT INTO evidence (case_ref, file_name, hash, image_path, uploaded_by) VALUES (?, ?, ?, ?, ?)',
        [case_ref, file_name, hash, image_path, req.user.username],
        function (err) {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }
            logAction(`Uploaded encrypted evidence for ${case_ref}`, req.user.username);
            res.status(201).json({ message: 'Evidence uploaded successfully', id: this.lastID });
        }
    );
});

// Delete evidence (Admin only)
router.delete('/:id', verifyToken, verifyAdmin, (req, res) => {
    const id = req.params.id;
    
    db.get('SELECT * FROM evidence WHERE id = ?', [id], (err, ev) => {
        if (err || !ev) {
            return res.status(404).json({ message: 'Evidence not found' });
        }

        db.run('DELETE FROM evidence WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            
            // Delete file if exists
            if (ev.image_path) {
                const filePath = path.join(__dirname, '..', ev.image_path);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            
            logAction(`DELETED record: ${ev.file_name}`, req.user.username);
            res.json({ message: 'Evidence deleted successfully' });
        });
    });
});

// Get Audit Logs
router.get('/logs', verifyToken, (req, res) => {
    db.all('SELECT * FROM logs ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(rows);
    });
});

module.exports = router;
