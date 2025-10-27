const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a la base de datos para Railway
const getDbConfig = () => {
  if (process.env.DATABASE_URL) {
    // Para Railway con DATABASE_URL
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1),
      ssl: { rejectUnauthorized: false },
      port: url.port || 3306
    };
  } else {
    // Para desarrollo local
    return {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'justificantes_db'
    };
  }
};

// Crear tabla si no existe
async function createTable() {
  try {
    const connection = await mysql.createConnection(getDbConfig());
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS justificantes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        matricula VARCHAR(100) NOT NULL,
        fecha DATE NOT NULL,
        motivo TEXT NOT NULL,
        carrera VARCHAR(255),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla verificada/creada correctamente');
    await connection.end();
  } catch (error) {
    console.error('Error creando tabla:', error);
  }
}

// Routes
app.get('/api/justificantes', async (req, res) => {
  try {
    const connection = await mysql.createConnection(getDbConfig());
    const [rows] = await connection.execute('SELECT * FROM justificantes ORDER BY fecha_creacion DESC');
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo justificantes:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/justificantes', async (req, res) => {
  try {
    const { nombre, matricula, fecha, motivo, carrera } = req.body;
    
    if (!nombre || !matricula || !fecha || !motivo) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const connection = await mysql.createConnection(getDbConfig());
    const [result] = await connection.execute(
      'INSERT INTO justificantes (nombre, matricula, fecha, motivo, carrera) VALUES (?, ?, ?, ?, ?)',
      [nombre, matricula, fecha, motivo, carrera]
    );
    await connection.end();

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Justificante creado correctamente'
    });
  } catch (error) {
    console.error('Error creando justificante:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Backend de Justificantes funcionando!' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  createTable();
});