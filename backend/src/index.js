const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors()); // Permite peticiones de tu frontend
app.use(express.json()); // Permite recibir datos en formato JSON

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ mensaje: '¡El backend está funcionando!' });
});

// Definir el puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});