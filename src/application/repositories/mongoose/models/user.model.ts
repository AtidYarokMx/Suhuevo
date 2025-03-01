import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
import bcrypt from 'bcrypt'
import { AppUserModel, IUserVirtuals, type IUser } from '@app/dtos/user.dto'
import { CallbackError } from 'mongoose';

const SALT_ROUNDS = 10;

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - userName
 *         - email
 *         - password
 *         - roleId
 *       properties:
 *         id:
 *           type: string
 *           description: ID único del usuario en la base de datos.
 *           example: "64bff1e8e3fdf4b4b3f84a0a"
 *         name:
 *           type: string
 *           description: Nombre del usuario.
 *           example: "Juan Pérez"
 *         firstLastName:
 *           type: string
 *           description: Primer apellido del usuario.
 *           example: "García"
 *         secondLastName:
 *           type: string
 *           description: Segundo apellido del usuario.
 *           example: "López"
 *         roleId:
 *           type: string
 *           description: ID del rol asignado al usuario.
 *           example: "65b3d5e4f4a2b0e5d23a1f89"
 *         userName:
 *           type: string
 *           description: Nombre de usuario único para login.
 *           example: "juanperez"
 *         phone:
 *           type: string
 *           description: Número de teléfono del usuario (10 dígitos).
 *           example: "5512345678"
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico del usuario.
 *           example: "juanperez@example.com"
 *         password:
 *           type: string
 *           description: Contraseña encriptada del usuario.
 *           example: "$2b$10$EixZaYVK1fsbw1ZfbX3OXe"
 *         active:
 *           type: boolean
 *           description: Estado del usuario (activo o inactivo).
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación del usuario.
 *           example: "2025-02-27T12:34:56.789Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización del usuario.
 *           example: "2025-02-27T15:20:45.321Z"
 */

export const UserSchema = new Schema<IUser, AppUserModel, {}, {}, IUserVirtuals>({

  /* required fields */
  id: { type: String, trim: true, unique: true },
  name: { type: String, trim: true, required: true },
  firstLastName: { type: String, trim: true, default: '' },
  secondLastName: { type: String, trim: true, default: '' },
  roleId: { type: Schema.Types.ObjectId, ref: "Role", required: true },

  userName: { type: String, trim: true, unique: true, required: true },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function (v: string) {
        return /^\d{10}$/.test(v)
      },
      message: "numero de telefono invalido",
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    required: true,
    validate: {
      validator: function (v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: "Correo electrónico inválido",
    },
  },

  /* defaults */
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  active: { type: Boolean, default: true },
},
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  })

/* virtuals */
UserSchema.virtual("fullname").get(function (this: IUser) {
  return `${this.name} ${this.firstLastName} ${this.secondLastName}`.trim();
});


/* Pre-save Middleware: Hash de contraseña y actualización de timestamps */
UserSchema.pre("save", async function (next) {
  try {
    if (this.isModified("password")) {
      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

/* Método para comparar contraseñas */
UserSchema.methods.comparePassword = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};


/* Model instance */
export const UserModel = AppMainMongooseRepo.model<IUser, AppUserModel>("User", UserSchema);
