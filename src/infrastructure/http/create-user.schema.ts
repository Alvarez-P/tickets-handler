import { z } from "zod";
import { ROLES } from "../../shared/contracts/role";

export const createUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  role: z.enum(ROLES).optional(),
  password: z.string().min(8).optional(),
});
