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
			fecha_registro: fecha_registro,
			activa: state,
			junta_vecinal_id_junta: junta_vecinal
		}, async (error, results) => {
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
				req.session.name = results[0].nombre;
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
// Ruta para la página principal
app.get('/', (req, res) => {
	if (req.session.loggedin) {
	  // El usuario está conectado, puedes continuar con la lógica para mostrar la página principal
	  const userId = req.session.name;
	  console.log('Valor de userId:', userId);
	  connection.query('SELECT nombre FROM USER WHERE nombre = ?', [userId], (error, results) => {
		if (error) {
		  console.log(error);
		  // Manejo de errores si es necesario
		} else {
		  const userName = results[0].nombre; // Suponiendo que el nombre del usuario se encuentra en la columna 'nombre'
  
		  res.render('index', {
			userId: 'Bienvenido, ' + userId,
			login: true,
			name: 'Bienvenido, ' + userName,
			results
		  });
		}
	  });
	} else {
	  // El usuario no está conectado, puedes redirigirlo a la página de inicio de sesión o mostrar un mensaje de error
	  res.redirect('/login'); // Redirige a la página de inicio de sesión
	  // O muestra un mensaje de error
	  // res.render('error', { message: 'Debe iniciar sesión para acceder a la página principal' });
	}
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
		res.redirect('/login') // siempre se ejecutará después de que se destruya la sesión
	})
});







// Ruta para mostrar el muro de noticias
app.get('/noticias', (req, res) => {
	const articleId = req.body.articleId;

	if (req.session.loggedin) {
	  // El usuario está conectado, puedes continuar con la lógica para mostrar noticias
	  connection.query('SELECT n.id_muro, n.titulo, n.descripcion, n.fecha_public, CONCAT(u.nombre, " ", u.ap_paterno, " ", u.ap_materno) AS nombre_completo FROM noticia n JOIN USER u ON n.user_rut = u.rut ORDER BY n.fecha_public Desc', (error, noticias) => {
		if (error) {
		  console.error('Error al obtener noticias:', error);
		  // Puedes manejar el error de alguna manera adecuada
		}
		
		const userId = req.session.name;
		console.log('Valor de userId en noticias:', userId);
		connection.query('SELECT rut FROM USER WHERE nombre = ?', [userId], (error, results) => {
		  if (error) {
			console.log(error);
			// Manejo de errores si es necesario
		  } else {
			const userName = results[0].nombre;
  
			res.render('noticias', {
			  noticias,
			  userId: 'Bienvenido, ' + userId,
			  login: true,
			  name: 'Bienvenido, ' + userName,
			  results
			});
		  }
		});
	  });
	} else {
	  // El usuario no está conectado, puedes redirigirlo a la página de inicio de sesión o mostrar un mensaje de error
	  res.redirect('/login'); // Redirige a la página de inicio de sesión
	  // O muestra un mensaje de error
	  // res.render('error', { message: 'Debe iniciar sesión para acceder a las noticias' });
	}
  });
  




// Ruta para crear una nueva noticia
// Ruta para crear una nueva noticia
app.post('/noticias', (req, res) => {
	const { titulo, descripcion } = req.body;
	const fecha_registro = new Date();

	if (req.session.loggedin) {
		const username = req.session.name;
		connection.query('SELECT rut FROM USER WHERE nombre = ?', [username], (error, results) => {
			if (error) {
				console.log(error);
				res.redirect('/login');
				// Manejo de errores si es necesario
			} else {
				if (titulo && descripcion) {
					const rut = results[0].rut; // Obtén el Rut del usuario
					connection.query('INSERT INTO noticia (titulo, descripcion, fecha_public, user_rut) VALUES (?, ?, ?, ?)', [titulo, descripcion, fecha_registro, rut], (error, result) => {
						if (error) {
							console.error('Error al insertar la noticia:', error);
							// Manejo de errores si es necesario
						} else {
							res.redirect('/noticias'); // Redirigir de nuevo al muro de noticias después de agregar la noticia
						}
					});
				} else {
					// Manejo de errores si los datos del formulario son incorrectos o faltan
				}
			}
		});
	} else {
		res.redirect('/login'); // Redirigir al inicio de sesión si el usuario no está autenticado
	}
});






app.post('/editar-noticia', (req, res) => {
    // Obtén los datos enviados desde el formulario
    const articleId = req.body.articleId;
    const newTitle = req.body.titulo;
    const newContent = req.body.descripcion;
	
	console.log('articleId '+articleId)
	console.log('newTitle '+newTitle)
	console.log('newContent '+newContent)

    // Actualiza la noticia en la base de datos
    connection.query('UPDATE noticia SET titulo = ?, descripcion = ? WHERE id_muro = ?', [newTitle, newContent, articleId], (error, result) => {
        if (error) {
            console.log(error);
			console.log("no se editaron loco")
            // Manejo de errores si es necesario
        } else {
            // Notificar el éxito de la actualización
            res.redirect('/noticias');
        }
    });
});




// Ruta para actualizar una noticia
app.put('/noticias/:id', (req, res) => {
	// Lógica para actualizar una noticia en la base de datos
});

// Ruta para eliminar una noticia
app.delete('/noticias/:id', (req, res) => {
	// Lógica para eliminar una noticia de la base de datos
});








app.listen(3000, (req, res) => {
	console.log('SERVER RUNNING IN http://localhost:3000');
});