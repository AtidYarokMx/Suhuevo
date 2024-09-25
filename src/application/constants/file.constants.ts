import { join } from 'path'

export const validMimetypes = ['application/pdf', 'image/png', 'image/jpeg']

export const tempDocsDir = join(__dirname, '../../../tmp/docs')
export const docsDir = join(__dirname, '../../../docs')
