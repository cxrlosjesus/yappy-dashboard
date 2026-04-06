import { Client } from '@notionhq/client'

// Cliente singleton de Notion
export const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

export const DATABASE_ID = process.env.NOTION_DATABASE_ID!
