import { IJob } from '@app/dtos/job.dto'
import { AppErrorResponse } from '@app/models/app.response'
import { JobModel } from '@app/repositories/mongoose/models/job.model'
import { customLog } from '@app/utils/util.util'
import { type ClientSession } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'


class JobService {
  /**
   * Obtiene uno o varios puestos de trabajo según los parámetros de consulta.
   * - Si se envía `ids`, devuelve solo los trabajos con esos IDs.
   * - Si no se envía `ids`, devuelve todos los trabajos activos.
   *
   * @param query {Object} - Parámetros de consulta (`ids` opcional).
   * @returns {Promise<Record<string, IJob | IJob[]>>} - Un objeto con los registros encontrados o una lista de trabajos.
   */
  async get(query: any): Promise<any> {
    if (!query.ids) {
      customLog('[JobService.get] No se enviaron IDs, devolviendo todos los trabajos.');
      return await JobModel.find({ active: true });
    }

    const ids = Array.isArray(query.ids) ? query.ids : [query.ids];
    const records = await JobModel.find({ active: true, id: { $in: ids } });

    return records.reduce((acc: Record<string, IJob>, record) => {
      acc[record.id] = record;
      return acc;
    }, {});
  }

  /**
   * Busca puestos de trabajo con filtros avanzados.
   * - `~campo`: Búsqueda por texto (expresión regular).
   * - `<campo`: Valores menores que el especificado.
   * - `>campo`: Valores mayores que el especificado.
   * - `campo=[]`: Búsqueda en un array de valores.
   *
   * @param query {Object} - Filtros de búsqueda (`limit`, `sortField`, `size`, etc.).
   * @returns {Promise<IJob[]>} - Lista de trabajos que coincidan con el filtro.
   */
  async search(query: any): Promise<any> {
    const { limit = 100, size, sortField, ...queryFields } = query
    const allowedFields: (keyof IJob)[] = ['id', 'name', 'departmentId']

    const filter: any = { active: true }
    const selection: any = size === 'small' ? {} : { active: 0, _id: 0, __v: 0 }

    for (const field in queryFields) {
      const cleanField = field.replace(/[~<>]/, '');

      if (!allowedFields.includes(cleanField as keyof IJob)) {
        throw new AppErrorResponse({ statusCode: 403, name: `Campo no permitido: ${field}` });
      }

      const value = queryFields[field]
      if (Array.isArray(value)) filter[cleanField] = { $in: value };
      else if (field.startsWith('~')) filter[cleanField] = new RegExp(escapeStringRegexp(String(value)), 'i');
      else if (field.startsWith('<')) filter[cleanField] = { ...filter[cleanField], $lt: value };
      else if (field.startsWith('>')) filter[cleanField] = { ...filter[cleanField], $gt: value };
      else filter[cleanField] = value;
    }

    return await JobModel.find(filter).select(selection).limit(limit).sort({ createdAt: 'desc' });
  }

  /**
   * Crea un nuevo puesto de trabajo en la base de datos.
   *
   * @param body {Object} - Datos del puesto a crear.
   * @param session {ClientSession} - Sesión de transacción de MongoDB.
   * @returns {Promise<{ id: string }>} - ID del puesto creado.
   */
  async create(body: any, session: ClientSession): Promise<any> {
    const id = uuidv4()
    const record = new JobModel({ ...body, id })

    customLog(`Creando puesto ${String(record.id)} (${String(record.name)})`)
    await record.save({ session })
    const { name, departmentId, active } = record

    return { id: record.id, name, departmentId, active }
  }

  /**
   * Actualiza un puesto de trabajo existente.
   * - Solo permite modificar los campos `name`, `departmentId` y `active`.
   *
   * @param body {Object} - Datos a actualizar (`id` obligatorio).
   * @param session {ClientSession} - Sesión de transacción de MongoDB.
   * @returns {Promise<{ id: string }>} - ID del puesto actualizado.
   */
  async update(body: any, session: ClientSession): Promise<{ id: string }> {
    const record = await JobModel.findOne({ id: body.id });
    if (!record) throw new AppErrorResponse({ statusCode: 404, name: 'No se encontró el puesto' });

    const allowedFields: (keyof IJob)[] = ['name', 'departmentId', 'active'];

    Object.entries(body).forEach(([key, value]) => {
      if (allowedFields.includes(key as keyof IJob)) {
        (record as Record<string, any>)[key] = value;
      }
    });

    await record.save({ validateBeforeSave: true, validateModifiedOnly: true, session });
    return { id: record.id };
  }
}

export default new JobService();
function escapeStringRegexp(arg0: string): string | RegExp {
  throw new Error('Function not implemented.')
}

