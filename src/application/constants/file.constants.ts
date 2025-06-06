import { join } from "path";

export const validMimetypes = ["application/pdf", "image/png", "image/jpeg"];

export const tempDocsDir = join(__dirname, "../../../uploads/temp");
export const docsDir = join(__dirname, "../../../docs");
