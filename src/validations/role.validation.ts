import { body, param } from "express-validator";

// Validación para la creación de un rol
export const validateCreateRole = [
  body("name")
    .notEmpty()
    .withMessage("El nombre del rol es obligatorio")
    .isString()
    .withMessage("El nombre del rol debe ser una cadena de texto"),

  body("permissions")
    .isArray({ min: 1 })
    .withMessage("Los permisos deben ser un array con al menos un elemento"),
];

// Validación para actualizar un rol
export const validateUpdateRole = [
  param("id")
    .isMongoId()
    .withMessage("ID de rol inválido"),

  body("name")
    .optional()
    .notEmpty()
    .withMessage("El nombre no puede estar vacío")
    .isString()
    .withMessage("El nombre debe ser una cadena de texto"),

  body("permissions")
    .optional()
    .isArray()
    .withMessage("Los permisos deben ser un array"),
];

// Validación para eliminar un rol
export const validateDeleteRole = [
  param("id")
    .isMongoId()
    .withMessage("ID de rol inválido"),
];
