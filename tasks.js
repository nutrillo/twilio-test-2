if (incomingMsg.startsWith('crear tarea')) {
  const task = incomingMsg.replace('crear tarea', '').trim(); // Quitar "crear tarea"
  let tasks = [];

  try {
    // Leer el archivo tasks.json
    const data = fs.readFileSync('./data/tasks.json', 'utf8');
    tasks = JSON.parse(data); // Convertir el contenido en JSON

    // Validar que tasks es un array
    if (!Array.isArray(tasks)) {
      console.error('El archivo tasks.json no contiene un array válido.');
      tasks = [];
    }
  } catch (err) {
    console.error('Error leyendo tasks.json:', err);
    tasks = []; // Si falla, inicializar como array vacío
  }

  // Agregar nueva tarea
  tasks.push({ task, timestamp: new Date().toISOString() });

  try {
    // Guardar en el archivo tasks.json
    fs.writeFileSync('./data/tasks.json', JSON.stringify(tasks, null, 2));
    gptAnswer = `Tarea creada: "${task}".`;
  } catch (err) {
    console.error('Error escribiendo en tasks.json:', err);
    gptAnswer = 'Hubo un problema al guardar tu tarea. Inténtalo más tarde.';
  }
}

