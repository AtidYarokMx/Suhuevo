import { body } from "express-validator";

export const validateLogin = [
  body("email").isEmail().withMessage("Correo inválido"),
  body("password").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),
];

export const validateResetPassword = [
  body("email").isEmail().withMessage("Correo inválido"),
];

export const validateUpdatePassword = [
  body("uuid").notEmpty().withMessage("El código de restablecimiento es obligatorio"),
  body("newPassword").isLength({ min: 6 }).withMessage("La nueva contraseña debe tener al menos 6 caracteres"),
  body("confirmNewPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Las contraseñas no coinciden");
    }
    return true;
  }),
];
