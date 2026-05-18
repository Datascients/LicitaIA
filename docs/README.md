# Base de Conocimiento LicitaIA — Documentos

Esta carpeta contiene los documentos base que alimentan el sistema RAG de LicitaIA.
Cada documento está indexado en Pinecone con metadatos completos.

---

## DOC-01: `bases_generales_licitacion.pdf`

**Contenido:** Ley 19.886 de Bases sobre Contratos Administrativos + Reglamento Decreto 661/2024.

**Preguntas que responde:**
- ¿Qué me inhabilita para postular a una licitación pública?
- ¿Qué garantías se exigen y por qué montos?
- ¿Qué pasa si me atraso en la entrega del servicio/bien?
- ¿Qué artículo regula los requisitos de postulación?
- ¿Qué es una licitación pública vs. privada?

**Metadatos:** `fuente: ley_19886`, `tipo_documento: ley`, `fecha_vigencia: 2025-12-31`

---

## DOC-02: `requisitos_pyme_ley20416.pdf`

**Contenido:** Clasificación oficial de empresas según ventas anuales en UF, conforme a la Ley 20.416 (Estatuto PYME).

**Preguntas que responde:**
- ¿Soy PYME según la ley chilena?
- ¿Qué tamaño de empresa califica para este concurso?
- ¿Cuál es el límite de ventas para ser considerada empresa pequeña?
- ¿Qué beneficios tiene clasificarse como micro, pequeña o mediana empresa?
- ¿Cómo se calculan las ventas anuales en UF?

**Clasificación:**
- Microempresa: ventas ≤ 2.400 UF/año
- Empresa Pequeña: 2.400 – 25.000 UF/año
- Empresa Mediana: 25.000 – 100.000 UF/año
- Gran empresa: > 100.000 UF/año

**Metadatos:** `fuente: ley_20416`, `tipo_documento: ley`, `fecha_vigencia: 2025-12-31`

---

## DOC-03: `bases_tecnicas_concurso_{id}.txt`

**Contenido:** Bases específicas de cada concurso activo. Una instancia por concurso.

**Estructura estándar de cada archivo:**
1. Objeto del contrato
2. Requisitos técnicos mínimos
3. Documentos obligatorios
4. Criterios de evaluación (con ponderaciones)
5. Plazos y fechas clave
6. Penalidades específicas

**Preguntas que responde:**
- ¿Qué documentos necesito para postular a este concurso?
- ¿Cuál es el plazo de entrega del servicio?
- ¿Cómo me evalúan? ¿Qué criterios se usan?
- ¿Qué penalidades aplican si incumplo?
- ¿Hay requisitos técnicos especiales?

**Metadatos:** `tipo_documento: bases_tecnicas`, `concurso_id: {id}`, `fecha_vigencia: {fecha_cierre}`

**Archivos actuales:**
- `bases_tecnicas_concurso_001.txt` — Limpieza MINSAL RM 2025
- `bases_tecnicas_concurso_002.txt` — Equipos computacionales Municipalidad Santiago
- `bases_tecnicas_concurso_003.txt` — Consultoría transformación digital SUBDERE

---

## DOC-04: `registro_proveedores_requisitos.pdf`

**Contenido:** Instructivo oficial de inscripción en ChileProveedores.

**Preguntas que responde:**
- ¿Cómo me inscribo en ChileProveedores?
- ¿Qué documentos necesito para quedar "Hábil"?
- ¿Cuánto demora el proceso de inscripción?
- ¿Qué categorías de proveedor existen?
- ¿Cuándo debo renovar mi inscripción?

**Metadatos:** `fuente: chileproveedores`, `tipo_documento: instructivo`, `fecha_vigencia: 2025-12-31`

---

## DOC-05: `politica_inhabilitaciones.txt`

**Contenido:** Causales que impiden postular a licitaciones públicas, según Ley 19.886 Art. 4° y Decreto 661/2024.

**Preguntas que responde:**
- ¿Mis deudas previsionales me inhabilitan para postular?
- ¿Una denuncia laboral me bloquea automáticamente?
- ¿Qué pasa si tengo deudas tributarias?
- ¿Cuánto tiempo me inhabilita una condena por corrupción?
- ¿Cómo regularizo mi situación para volver a postular?

**Metadatos:** `fuente: ley_19886_art4`, `tipo_documento: politica`, `fecha_vigencia: 2025-12-31`

---

## Metadatos estándar por chunk

```json
{
  "fuente": "nombre_del_archivo",
  "tipo_documento": "bases_tecnicas|ley|instructivo|politica",
  "concurso_id": "001|null",
  "articulo": "Cláusula 5.2|Artículo 4°",
  "fecha_vigencia": "YYYY-MM-DD",
  "seccion": "penalidades|requisitos|plazos",
  "fecha_indexacion": "YYYY-MM-DD"
}
```
