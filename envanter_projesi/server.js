const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// Envanter verilerini okuma
app.get('/api/inventory', (req, res) => {
    fs.readFile('./data/inventory.json', (err, data) => {
        if (err) {
            return res.status(500).send('Veri okunamadı.');
        }
        res.json(JSON.parse(data));
    });
});

// Envanter ekleme
app.post('/api/inventory', (req, res) => {
    const newEntry = req.body;
    fs.readFile('./data/inventory.json', (err, data) => {
        if (err) {
            return res.status(500).send('Veri okunamadı.');
        }
        const inventory = JSON.parse(data);
        inventory.push(newEntry);
        fs.writeFile('./data/inventory.json', JSON.stringify(inventory), (err) => {
            if (err) {
                return res.status(500).send('Veri kaydedilemedi.');
            }
            res.status(201).send('Yeni envanter eklendi.');
        });
    });
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});