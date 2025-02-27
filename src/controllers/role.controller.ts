import { Request, Response } from "express";
import { createRole, getRoles, updateRole, deleteRole } from "../services/role.service";
import { AppControllerResponse } from "@app/models/app.response";
import { validationResult } from "express-validator";
import asyncHandler from "express-async-handler";

const handleValidationErrors = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

class RoleController {

  public createRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (handleValidationErrors(req, res)) return;

    const { name, permissions } = req.body;
    const role = await createRole(name, permissions);

    res.status(201).json({ success: true, data: role });
  });

  public getRoles = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const roles = await getRoles();
    res.json({ success: true, data: roles });
  });

  public updateRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (handleValidationErrors(req, res)) return;

    const { name, permissions } = req.body;
    const { roleId } = req.params;

    const role = await updateRole(roleId, name, permissions);
    if (!role) {
      res.status(404).json({ message: "Rol no encontrado" });
      return
    }

    res.json({ success: true, data: role });
  });

  public deleteRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { roleId } = req.params;

    const role = await deleteRole(roleId);
    if (!role) {
      res.status(404).json({ message: "Rol no encontrado" });
      return
    }

    res.json({ success: true, message: "Rol eliminado correctamente" });
  });

}

export const roleController: RoleController = new RoleController();
