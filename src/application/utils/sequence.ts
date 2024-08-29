import { AppMongooseRepo } from "@app/repositories/mongoose";
import { SequenceModel } from "@app/repositories/mongoose/models/sequence.model";
import { ClientSession } from "mongoose";
import { v4 as uuidv4 } from 'uuid'

export async function consumeSequence(name: string, session: ClientSession | null = null): Promise<number> {
    if (session == null) session = await AppMongooseRepo.startSession()
    try {
      // Busca una secuencia activa con el nombre dado
      let record = await SequenceModel.findOne({ active: true, name });
  
      if (record) record.value += 1;
      else {
        const id = uuidv4()
        record = new SequenceModel({ id, name, value: 1, active: true });
      }
      
      await record.save();
  
      // Devuelve el valor actual de la secuencia
      return record.value;
    } catch (error) {
      console.error('Error al consumir la secuencia:', error);
      throw error; // Maneja el error según sea necesario
    }
  }