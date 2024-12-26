// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { OpenAIApi, Configuration } = require('openai');
const twilio = require('twilio');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Configurar OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, // 
});
const openai = new OpenAIApi(configuration);

// Configurar Twilio
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Endpoint que Twilio llamará (Webhook)
app.post('/whatsapp', async (req, res) => {
  try {
    const incomingMsg = req.body.Body; // Texto del mensaje
    const from = req.body.From;        // Número de teléfono del remitente

    // Llamar a la API de OpenAI (ChatGPT)
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: 'system', content: 'Eres un asistente virtual en WhatsApp.' },
        { role: 'user', content: incomingMsg }
      ]
    });

    const gptAnswer = response.data.choices[0].message.content;

    // Responder vía Twilio
    const twilioResponse = new twilio.twiml.MessagingResponse();
    twilioResponse.message(gptAnswer);

    res.set('Content-Type', 'text/xml');
    res.send(twilioResponse.toString());

  } catch (error) {
    console.error(error);
    res.status(500).send('Error interno');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
