Necesito un chatbot que me permita:
+ Autenticacion por VTI (ver TECHNICAL_REQUIREMENTS.md para detalles del flujo). Esto es importante para obtener el rut (sin digito verificador). no puedo ver nada si no estoy autenticado.
+ listar todos los servicios disponibles en el DCC (departamneto de ciencias de la computacion). Esto requirere hacer fetch o mantener de todos las paginas web y que hace cada cosa. ASumir que existe endpoint con esta info
+ Tool de reserva de salas (ya especificare mas adelante los endpoints). Para todas estas funcionalidades se requiere ingresar el RUT sin dv tambien:
  - Consulta de disponibilidad: bloques libres por rango de fechas, con filtro opcional por sala.
  - Creación de reserva: sala, fecha, hora inicio/término, categoría de uso, descripción, tipo de repetición.
+ Tool de academic assistant for a professor using Academic Track (a-track.dcc.uchile.cl). Mira foo.mts para mas info ya que se hizo una prueba de conceptos con la API de a-track pero ahora se puede hacer la query por RUT sin digito verificador en ves de por PROFESSOR_ID. Funcionalidades:
  - List all students of the professor, including their last meeting date and pending deadlines
  - Register a meeting with a student. Use the student name (or partial name). If ambiguous, returns candidates to ask the user.
  - mas cosas a futuro
+ Otros servicios a futuro