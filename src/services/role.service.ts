import { Role } from "@app/repositories/mongoose/models/role.model";


export const createRole = async (name: string, permissions: string[]) => {
  return await Role.create({ name, permissions });
};

export const getRoles = async () => {
  return await Role.find();
};

export const updateRole = async (roleId: string, name: string, permissions: string[]) => {
  return await Role.findByIdAndUpdate(roleId, { name, permissions }, { new: true });
};

export const deleteRole = async (roleId: string) => {
  return await Role.findByIdAndDelete(roleId);
};
