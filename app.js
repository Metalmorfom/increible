// 1 - Invocamos a Express
const express = require('express');
const app = express();

//2 - Para poder capturar los datos del formulario (sin urlencoded nos devuelve "undefined")
app.use(express.urlencoded({ extended: false }));
app.use(express.json());//además le decimos a express que vamos a usar json

//3- Invocamos a dotenv
const dotenv = require('dotenv');
dotenv.config({ path: './env/.env' });

//4 -seteamos el directorio de assets
app.use('/resources', express.static('public'));
app.use('/resources', express.static(__dirname + '/public'));

//5 - Establecemos el motor de plantillas
app.set('view engine', 'ejs');

//6 -Invocamos a bcrypt
const bcrypt = require('bcryptjs');

//7- variables de session
const session = require('express-session');
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));


// 8 - Invocamos a la conexion de la DB
const connection = require('./database/db');

//9 - establecemos las rutas
app.get('/login', (req, res) => {
	res.render('login');
})


app.get('/register', async (req, res) => {
	// Realiza una consulta para obtener las opciones de la tabla "junta_vecinal"
	connection.query('SELECT id_junta, nombre FROM junta_vecinal', (error, results) => {
	  if (error) {
		console.log(error);
	  } else {
		// Realiza otra consulta para obtener las opciones de roles (como mencionamos anteriormente)
		connection.query('SELECT id_rol, rol FROM rol', (error, rol) => {
		  if (error) {
			console.log(error);
		  } else {
			
			res.render('register', { junta_vecinal: results, rol: rol });
		  }
		});
	  }
	});
  });
  


 


//10 - Método para la REGISTRACIÓN
app.post('/register', async (req, res) => {
	const rut = req.body.rut;
	const clave = req.body.clave;
	const nombre = req.body.nombre;
	const s_nombre = req.body.s_nombre;
	const paterno = req.body.paterno;
	const materno = req.body.materno;
	const direccion = req.body.direccion;
	const correo = req.body.correo;
	const telefono = req.body.telefono;
	const profesion = req.body.profesion;
	const rol = req.body.rol;
	const fecha_expiracion = req.body.fecha_expiracion;
	const state = req.body.state;
	const fecha_registro = new Date()
	const junta_vecinal = req.body.junta_vecinal;

	let passwordHash = await bcrypt.hash(clave, 8);
	try {
	connection.query('INSERT INTO USER SET ?', {
		rut: rut,
		clave: passwordHash,
		nombre: nombre,
		s_nombre: s_nombre,
		ap_paterno: paterno,
		ap_materno: materno,
		direccion: direccion,
		correo: correo,
		telefono: telefono,
		profesion: profesion,
		rol_id_rol: rol,
		fecha_expiracion: fecha_expiracion,
		fecha_registro:fecha_registro,
		activa: state,
		junta_vecinal_id_junta: junta_vecinal
	} , async (error, results) => {
		if (error) {
			console.log(error);
		} else {
			res.render('register', {
				alert: true,
				alertTitle: "Registration",
				alertMessage: "¡Successful Registration!",
				alertIcon: 'success',
				showConfirmButton: false,
				timer: 1500,
				ruta: '', junta_vecinal: results, rol: rol
			});
		 
		}
	});

} catch (error) {
    console.log("Error al insertar en la base de datos:", error);
    // Puedes mostrar un mensaje de error al usuario o realizar otra acción de manejo de errores aquí.
  }
})

process.on('uncaughtException', (err) => {
	console.error('Error no capturado:', err);
	// Puedes realizar un registro adicional o acciones de manejo de errores aquí.
  });

//11 - Metodo para la autenticacion
app.post('/auth', async (req, res) => {
	const user = req.body.user;
	const pass = req.body.pass;
	let passwordHash = await bcrypt.hash(pass, 8);
	if (user && pass) {
		connection.query('SELECT * FROM USER WHERE rut = ?', [user], async (error, results, fields) => {
			if (results.length == 0 || !(await bcrypt.compare(pass, results[0].clave))) {
				res.render('login', {
					alert: true,
					alertTitle: "Error",
					alertMessage: "USUARIO y/o PASSWORD incorrectas",
					alertIcon: 'error',
					showConfirmButton: true,
					timer: false,
					ruta: 'login'
				});

				
				//res.send('Incorrect Username and/or Password!');				
			} else {
				//creamos una var de session y le asignamos true si INICIO SESSION       
				req.session.loggedin = true;
				req.session.name = results[0].name;
				res.render('login', {
					alert: true,
					alertTitle: "Conexión exitosa",
					alertMessage: "¡LOGIN CORRECTO!",
					alertIcon: 'success',
					showConfirmButton: false,
					timer: 1500,
					ruta: ''
				});
			}
			res.end();
		});
	} else {
		res.send('Please enter user and Password!');
		res.end();
	}
});

//12 - Método para controlar que está auth en todas las páginas
app.get('/', (req, res) => {
	if (req.session.loggedin) {
		res.render('index', {
			login: true,
			name: req.session.name
		});
	} else {
		res.render('index', {
			login: false,
			name: 'Debe iniciar sesión',
		});
	}
	res.end();
});


//función para limpiar la caché luego del logout
app.use(function (req, res, next) {
	if (!req.user)
		res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
	next();
});

//Logout
//Destruye la sesión.
app.get('/logout', function (req, res) {
	req.session.destroy(() => {
		res.redirect('/') // siempre se ejecutará después de que se destruya la sesión
	})
});


app.listen(3000, (req, res) => {
	console.log('SERVER RUNNING IN http://localhost:3000');
});