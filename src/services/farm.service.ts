/* lib */
import mongoose, { type ClientSession } from 'mongoose'
/* app models */
import { AppErrorResponse } from '@app/models/app.response'
/* models */
import { FarmModel } from '@app/repositories/mongoose/models/farm.model'
/* dtos */
import { createFarmBody, updateFarmBody } from '@app/dtos/farm.dto'
import { Types } from '@app/repositories/mongoose'
import { AppLocals } from '@app/interfaces/auth.dto'
import { customLog } from '@app/utils/util.util'


class FarmService {
  /**
   * Obtiene el siguiente `farmNumber` disponible
   */
  private async getNextFarmNumber(session: ClientSession): Promise<number> {
    customLog("📌 Buscando el último número de granja...");
    try {
      const lastFarm = await FarmModel.findOne({}, { farmNumber: 1 })
        .sort({ farmNumber: -1 })
        .session(session)
        .exec();

      const nextFarmNumber = lastFarm ? (lastFarm.farmNumber ?? 0) + 1 : 1;
      customLog(`✅ Siguiente farmNumber disponible: ${nextFarmNumber}`);
      return nextFarmNumber;
    } catch (error) {
      customLog("❌ Error en getNextFarmNumber:", error);
      throw new AppErrorResponse({
        name: "GetNextFarmNumberError",
        statusCode: 500,
        message: "Error al obtener el siguiente número de granja.",
      });
    }
  }


  async getOne(_id: string) {
    const farms = await FarmModel.findOne({ _id, active: true }).populate({
      path: "sheds",
      match: { active: true },
      populate: { path: "inventory" }
    }).exec()
    return farms
  }

  async getAll() {
    const farms = await FarmModel.aggregate([
      {
        $match: {
          active: true
        }
      },
      {
        $lookup: {
          from: "sheds",
          localField: "_id",
          foreignField: "farm",
          as: "sheds"
        }
      },
      {
        $unwind: {
          path: "$sheds",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "inventories",
          localField: "sheds._id",
          foreignField: "shed",
          as: "inventory"
        }
      },
      {
        $unwind: {
          path: "$inventory",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            farm: "$_id"
          },
          initialChickenTotal: {
            $sum: {
              $ifNull: ["$sheds.initialChicken", 0]
            }
          },
          mortality: {
            $sum: {
              $ifNull: ["$inventory.mortality", 0]
            }
          },
          water: {
            $sum: {
              $ifNull: ["$inventory.water", 0]
            }
          },
          food: {
            $sum: {
              $ifNull: ["$inventory.food", 0]
            }
          },
          original: {
            $push: "$$ROOT"
          }
        }
      },
      {
        $addFields: {
          summary: {
            food: "$food",
            water: "$water",
            mortality: "$mortality",
            initialChickenTotal: "$initialChickenTotal",
            totalChicken: {
              $subtract: [
                "$initialChickenTotal",
                "$mortality"
              ]
            }
          }
        }
      },
      {
        $project: {
          summary: 1,
          original: {
            $arrayElemAt: ["$original", 0]
          }
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$original",
              {
                summary: "$summary"
              }
            ]
          }
        }
      },
      {
        $project: {
          sheds: 0,
          inventory: 0
        }
      }
    ]).exec()
    return farms
  }

  async getOneWithSheds(_id: string) {
    const farms = await FarmModel.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(_id),
          active: true // Consideramos solo granjas activas
        }
      },
      {
        $lookup: {
          from: "sheds",
          localField: "_id",
          foreignField: "farm",
          as: "sheds"
        }
      },
      {
        $lookup: {
          from: "inventories",
          localField: "sheds._id",
          foreignField: "shed",
          as: "inventories"
        }
      },
      {
        $addFields: {
          // Calculamos el summary global de la granja
          summary: {
            initialChickenTotal: {
              $sum: "$sheds.initialChicken"
            },
            mortality: {
              $sum: "$inventories.mortality"
            },
            water: {
              $sum: "$inventories.water"
            },
            food: {
              $sum: "$inventories.food"
            },
            totalChicken: {
              $subtract: [
                { $sum: "$sheds.initialChicken" },
                { $sum: "$inventories.mortality" }
              ]
            }
          },
          // Agregamos un summary a cada shed
          sheds: {
            $map: {
              input: "$sheds",
              as: "shed",
              in: {
                $mergeObjects: [
                  "$$shed",
                  {
                    summary: {
                      initialChicken: "$$shed.initialChicken",
                      mortality: {
                        $sum: {
                          $map: {
                            input: {
                              $filter: {
                                input: "$inventories",
                                as: "inventory",
                                cond: { $eq: ["$$inventory.shed", "$$shed._id"] }
                              }
                            },
                            as: "inv",
                            in: "$$inv.mortality"
                          }
                        }
                      },
                      water: {
                        $sum: {
                          $map: {
                            input: {
                              $filter: {
                                input: "$inventories",
                                as: "inventory",
                                cond: { $eq: ["$$inventory.shed", "$$shed._id"] }
                              }
                            },
                            as: "inv",
                            in: "$$inv.water"
                          }
                        }
                      },
                      food: {
                        $sum: {
                          $map: {
                            input: {
                              $filter: {
                                input: "$inventories",
                                as: "inventory",
                                cond: { $eq: ["$$inventory.shed", "$$shed._id"] }
                              }
                            },
                            as: "inv",
                            in: "$$inv.food"
                          }
                        }
                      },
                      totalChicken: {
                        $subtract: [
                          "$$shed.initialChicken",
                          {
                            $sum: {
                              $map: {
                                input: {
                                  $filter: {
                                    input: "$inventories",
                                    as: "inventory",
                                    cond: { $eq: ["$$inventory.shed", "$$shed._id"] }
                                  }
                                },
                                as: "inv",
                                in: "$$inv.mortality"
                              }
                            }
                          }
                        ]
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          inventories: 0 // Excluimos los inventarios del resultado final
        }
      }
    ]).exec()

    if (farms.length <= 0)
      throw new AppErrorResponse({ name: "Farm Not Found", statusCode: 404, code: "FarmNotFound", description: "No se encontró la granja solicitada", message: "No se encontró la granja solicitada" })

    return farms[0]
  }

  async getAllWithSheds() {
    const farm = await FarmModel.aggregate([
      {
        $match: {
          active: true // Consideramos solo granjas activas
        }
      },
      {
        $lookup: {
          from: "sheds",
          localField: "_id",
          foreignField: "farm",
          as: "sheds"
        }
      },
      {
        $lookup: {
          from: "inventories",
          localField: "sheds._id",
          foreignField: "shed",
          as: "inventories"
        }
      },
      {
        $addFields: {
          // Calculamos el summary global de la granja
          summary: {
            initialChickenTotal: {
              $sum: "$sheds.initialChicken"
            },
            mortality: {
              $sum: "$inventories.mortality"
            },
            water: {
              $sum: "$inventories.water"
            },
            food: {
              $sum: "$inventories.food"
            },
            totalChicken: {
              $subtract: [
                { $sum: "$sheds.initialChicken" },
                { $sum: "$inventories.mortality" }
              ]
            }
          },
          // Agregamos un summary a cada shed
          sheds: {
            $map: {
              input: "$sheds",
              as: "shed",
              in: {
                $mergeObjects: [
                  "$$shed",
                  {
                    summary: {
                      initialChicken: "$$shed.initialChicken",
                      mortality: {
                        $sum: {
                          $map: {
                            input: {
                              $filter: {
                                input: "$inventories",
                                as: "inventory",
                                cond: { $eq: ["$$inventory.shed", "$$shed._id"] }
                              }
                            },
                            as: "inv",
                            in: "$$inv.mortality"
                          }
                        }
                      },
                      water: {
                        $sum: {
                          $map: {
                            input: {
                              $filter: {
                                input: "$inventories",
                                as: "inventory",
                                cond: { $eq: ["$$inventory.shed", "$$shed._id"] }
                              }
                            },
                            as: "inv",
                            in: "$$inv.water"
                          }
                        }
                      },
                      food: {
                        $sum: {
                          $map: {
                            input: {
                              $filter: {
                                input: "$inventories",
                                as: "inventory",
                                cond: { $eq: ["$$inventory.shed", "$$shed._id"] }
                              }
                            },
                            as: "inv",
                            in: "$$inv.food"
                          }
                        }
                      },
                      totalChicken: {
                        $subtract: [
                          "$$shed.initialChicken",
                          {
                            $sum: {
                              $map: {
                                input: {
                                  $filter: {
                                    input: "$inventories",
                                    as: "inventory",
                                    cond: { $eq: ["$$inventory.shed", "$$shed._id"] }
                                  }
                                },
                                as: "inv",
                                in: "$$inv.mortality"
                              }
                            }
                          }
                        ]
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          inventories: 0 // Excluimos los inventarios del resultado final
        }
      }
    ]).exec()
    return farm
  }

  /**
   * Crea una nueva granja con `farmNumber` único
   */
  async create(body: any, session: ClientSession, locals: AppLocals) {
    session.startTransaction();

    try {
      const user = locals.user._id;

      const farmNumber = body.farmNumber || (await this.getNextFarmNumber(session));
      const exists = await FarmModel.findOne({ farmNumber }).session(session).exec();
      if (exists) {
        throw new AppErrorResponse({ name: "FarmNumberInUseError", statusCode: 400, message: `El número de granja ${farmNumber} ya está en uso.` });
      }

      customLog("📌 [Service] Creando nueva granja...");
      const farm = new FarmModel({ ...body, farmNumber, createdBy: user, lastUpdateBy: user });
      const saved = await farm.save({ validateBeforeSave: true, session });

      customLog("✅ [Service] Granja creada exitosamente:", saved);

      await session.commitTransaction();
      session.endSession();
      return saved.toJSON();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      customLog("❌ [Service] Error al crear la granja:", error);
      throw error;
    }
  }

  async update(_id: string, body: updateFarmBody, session: ClientSession, locals: AppLocals) {
    const farm = await FarmModel.findOne({ _id, active: true }, null, { session }).exec()
    if (farm == null) throw new AppErrorResponse({ statusCode: 404, name: "Granja no encontrada", description: "La granja ingresada es inexistente en el sistema o fue eliminada" })
    const user = locals.user._id
    farm.set({ ...body, lastUpdateBy: user })
    const updated = await farm.save({ validateBeforeSave: true, session })
    return updated
  }
}

const farmService: FarmService = new FarmService()
export default farmService
