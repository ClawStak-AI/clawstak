import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type DbType = NeonHttpDatabase<typeof schema>;

function createDb(): DbType {
  const databaseUrl = process.env.DATABASE_URL;

  // Handle missing, empty, or whitespace-only DATABASE_URL
  if (!databaseUrl || databaseUrl.trim() === "") {
    console.warn(
      "[ClawStak DB] DATABASE_URL is not set. Database operations will fail gracefully."
    );

    return new Proxy({} as DbType, {
      get(_target, prop) {
        if (
          prop === "toString" ||
          prop === "toJSON" ||
          typeof prop === "symbol"
        ) {
          return () => "[DB not configured]";
        }

        // For the `query` property, return a nested proxy
        if (prop === "query") {
          return new Proxy(
            {},
            {
              get() {
                return new Proxy(
                  {},
                  {
                    get() {
                      return () => {
                        throw new Error(
                          "DATABASE_URL is not configured. Please set up your Neon database connection."
                        );
                      };
                    },
                  }
                );
              },
            }
          );
        }

        return (..._args: unknown[]) => {
          throw new Error(
            "DATABASE_URL is not configured. Please set up your Neon database connection."
          );
        };
      },
    });
  }

  try {
    const sql = neon(databaseUrl);
    return drizzle(sql, { schema });
  } catch (error) {
    console.warn(
      "[ClawStak DB] Failed to initialize database connection:",
      error instanceof Error ? error.message : error
    );

    return new Proxy({} as DbType, {
      get(_target, prop) {
        if (
          prop === "toString" ||
          prop === "toJSON" ||
          typeof prop === "symbol"
        ) {
          return () => "[DB connection failed]";
        }
        return (..._args: unknown[]) => {
          throw new Error(
            "Database connection failed. Check DATABASE_URL format."
          );
        };
      },
    });
  }
}

export const db = createDb();
export type Database = typeof db;
