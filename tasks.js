const fs = require('fs');

app.post('/whatsapp', async (req, res) => {
  try {
    const incomingMsg = req.body.Body.toLowerCase(); // Texto del mensaje
    const from = req.body.From;                     // Número de teléfono del remitente

    let gptAnswer = '';

    if (incomingMsg.startsWith('crear tarea')) {
      const task = incomingMsg.replace('crear tarea', '').trim();
      const tasks = JSON.parse(fs.readFileSync('tasks.json', 'utf8'));
      tasks.push({ task, timestamp: new Date().toISOString() });
      fs.writeFileSync('tasks.json', JSON.stringify(tasks, null, 2));
      gptAnswer = `Tarea creada: "${task}".`;
    } else if (incomingMsg === 'ver tareas') {
      const tasks = JSON.parse(fs.readFileSync('tasks.json', 'utf8'));
      gptAnswer = tasks.length
        ? `Tus tareas:\n${tasks.map((t, i) => `${i + 1}. ${t.task}`).join('\n')}`
        : 'No tienes tareas pendientes.';
    } else {
      // Llamar a OpenAI solo si no es un comando específico
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
  } catch (error) {
    console.error('Error detectado:', error);
    res.status(500).send('Error interno');
  }
});
