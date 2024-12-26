const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const { OpenAIApi, Configuration } = require('openai');
const twilio = require('twilio');

require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Configurar OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Configurar Twilio
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Crear el archivo tasks.json si no existe
const tasksFile = './tasks.json';
if (!fs.existsSync(tasksFile)) {
  console.log('El archivo tasks.json no existe. Creando un nuevo archivo...');
  fs.writeFileSync(tasksFile, '[]');
}

// Endpoint que Twilio llamará
app.post('/whatsapp', async (req, res) => {
  try {
    const incomingMsg = req.body.Body.toLowerCase(); // Texto del mensaje en minúsculas
    const from = req.body.From; // Número del remitente

    console.log('Mensaje recibido:', incomingMsg);
    console.log('Número del remitente:', from);

    let gptAnswer = '';

    // Comando: Crear tarea
    if (incomingMsg.startsWith('crear tarea')) {
      const task = incomingMsg.replace('crear tarea', '').trim(); // Quitar "crear tarea"
      let tasks = [];

      try {
        const data = fs.readFileSync(tasksFile, 'utf8'); // Leer el archivo de tareas
        tasks = JSON.parse(data); // Intentar parsear el contenido
        if (!Array.isArray(tasks)) {
          console.error('El archivo tasks.json no contiene un array válido.');
          tasks = [];
        }
      } catch (err) {
        console.error('Error leyendo tasks.json:', err);
        tasks = []; // Si falla, inicializar como array vacío
      }

      tasks.push({ task, timestamp: new Date().toISOString() }); // Agregar nueva tarea

      try {
        fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2)); // Guardar en el archivo
        console.log('Tarea guardada correctamente:', tasks); // Log de las tareas guardadas
        gptAnswer = `Tarea creada: "${task}".`;
      } catch (err) {
        console.error('Error escribiendo en tasks.json:', err);
        gptAnswer = 'Hubo un problema al guardar tu tarea. Inténtalo más tarde.';
      }

    // Comando: Ver tareas
    } else if (incomingMsg === 'ver tareas') {
      let tasks = [];
      try {
        const data = fs.readFileSync(tasksFile, 'utf8'); // Leer el archivo de tareas
        tasks = JSON.parse(data); // Intentar parsear el contenido
        if (!Array.isArray(tasks)) {
          console.error('El archivo tasks.json no contiene un array válido.');
          tasks = [];
        }
      } catch (err) {
        console.error('Error leyendo tasks.json:', err);
        tasks = [];
      }

      gptAnswer = tasks.length
        ? `Tus tareas:\n${tasks.map((t, i) => `${i + 1}. ${t.task}`).join('\n')}`
        : 'No tienes tareas pendientes.';

    // Comando: ¿Qué hora es?
    } else if (incomingMsg === '¿qué hora es?' || incomingMsg === 'qué hora es') {
      const now = new Date();
      gptAnswer = `La hora actual es ${now.toLocaleTimeString()}.`;

    // Otro mensaje: delegar a OpenAI
    } else {
      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          { role: 'system', content: 'Eres un asistente virtual en WhatsApp.' },
          { role: 'user', content: incomingMsg }
        ]
      });
      gptAnswer = response.data.choices[0].message.content;
    }

    // Responder vía Twilio
    const twilioResponse = new twilio.twiml.MessagingResponse();
    twilioResponse.message(gptAnswer);
    res.set('Content-Type', 'text/xml');
    res.send(twilioResponse.toString());

    console.log('Respuesta enviada:', gptAnswer);

  } catch (error) {
    console.error('Error detectado:', error);
    res.status(500).send('Error interno');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
