import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'

export interface SearchOptions {
  orgId: string
  query: string
  table: string
  columns: string[]
  limit?: number
  offset?: number
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Full-text search using pg_trgm similarity.
   * Requires GIN index on searchable columns (defined in schema migrations).
   * Returns matching row IDs ordered by similarity score.
   */
  async searchIds(options: SearchOptions): Promise<string[]> {
    const { orgId, query, table, columns, limit = 25, offset = 0 } = options

    if (!query.trim()) return []

    const tsvectorExpression = columns
      .map((col) => `coalesce(${col}::text, '')`)
      .join(" || ' ' || ")

    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
      SELECT id
      FROM "${table}"
      WHERE org_id = $1
        AND deleted_at IS NULL
        AND (${tsvectorExpression}) ILIKE $2
      ORDER BY similarity(${tsvectorExpression}, $3) DESC
      LIMIT $4 OFFSET $5
      `,
      orgId,
      `%${query}%`,
      query,
      limit,
      offset,
    )

    return rows.map((r) => r.id)
  }

  buildIlikeCondition(query: string, columns: string[]): object {
    if (!query.trim()) return {}
    return {
      OR: columns.map((col) => ({ [col]: { contains: query, mode: 'insensitive' } })),
    }
  }
}
