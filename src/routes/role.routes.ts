import { roleController } from "@controllers/role.controller"
import { ServerRouter } from "./models/route"
import { Router } from "express";
import { validateCreateRole, validateDeleteRole, validateUpdateRole } from "src/validations/role.validation";
import { authenticateUser, authorizeRoles } from "@app/middlewares/auth.middleware";

class RoleRoutes extends ServerRouter {
  constructor() {
    super()
    this.config()
  }

  private config(): void {
    this.router = Router();

    // Rutas protegidas (solo administradores pueden acceder)
    this.router.get("/", authenticateUser, authorizeRoles("admin"), roleController.getRoles);
    this.router.post("/", authenticateUser, authorizeRoles("admin"), validateCreateRole, roleController.createRole);
    this.router.put("/:id", authenticateUser, authorizeRoles("admin"), validateUpdateRole, roleController.updateRole);
    this.router.delete("/:id", authenticateUser, authorizeRoles("admin"), validateDeleteRole, roleController.deleteRole);
  }
}