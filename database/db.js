const mysql = require('mysql2');

let connection; // Cambia la variable de conexión a "let" para poder reconectar
const maxConnectionRetries = 3; // Número máximo de intentos de reconexión
let connectionRetries = 0;

// Función para conectar a la base de datos
function connectDatabase() {
  connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE,
  });

  // Conecta a la base de datos y maneja errores de conexión
  connection.connect((error) => {
    if (error) {
      console.error('Error de conexión a la base de datos:', error);
      if (connectionRetries < maxConnectionRetries) {
        // Intenta reconectar solo si no se ha alcanzado el límite de reintentos
        console.log(`Intentando reconexión (#${connectionRetries + 1})...`);
        connectionRetries++;
        setTimeout(connectDatabase, 2000); // Espera 2 segundos antes de intentar reconectar
      } else {
        console.error('Se alcanzó el límite de reintentos de conexión.');
        // Puedes implementar otras acciones de manejo de errores aquí.
      }
    } else {
      console.log('¡Conectado a la Base de Datos!');
      console.log('DB_HOST:', process.env.DB_HOST);
      console.log('DB_USER:', process.env.DB_USER);
      console.log('DB_PASS:', process.env.DB_PASS);
      console.log('DB_DATABASE:', process.env.DB_DATABASE);
      connectionRetries = 0; // Restablece los reintentos después de una conexión exitosa
    }
  });

  // Manejo de errores de la conexión a la base de datos
  connection.on('error', (err) => {
    console.error('Error de conexión a la base de datos:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      // Reconectar
      if (connectionRetries < maxConnectionRetries) {
        console.log('Intentando reconectar a la base de datos (#' + connectionRetries + 1 + ')...');
        connectionRetries++;
        setTimeout(connectDatabase, 2000); // Espera 2 segundos antes de intentar reconectar
      } else {
        console.error('Se alcanzó el límite de reintentos de conexión.');
        // Puedes implementar otras acciones de manejo de errores aquí.
      }
    } else {
      // Otros tipos de errores que pueden requerir un manejo específico
      console.error('Intento de reconexión fallido. Error:', err);
    }
  });
}

// Inicialmente, intenta conectar a la base de datos
connectDatabase();

module.exports = connection;
