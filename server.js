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
      const tasks = JSON.parse(fs.readFileSync('tasks.json', 'utf8')); // Leer el archivo de tareas
      tasks.push({ task, timestamp: new Date().toISOString() }); // Agregar nueva tarea
      fs.writeFileSync('tasks.json', JSON.stringify(tasks, null, 2)); // Guardar en el archivo
      gptAnswer = `Tarea creada: "${task}".`;

    // Comando: Ver tareas
    } else if (incomingMsg === 'ver tareas') {
      const tasks = JSON.parse(fs.readFileSync('tasks.json', 'utf8')); // Leer las tareas
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