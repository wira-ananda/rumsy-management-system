export function sqliteD1(source) {
  const database = () => (typeof source === "function" ? source() : source);
  return {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) {
          args = values;
          return this;
        },
        async first(column) {
          const row =
            database()
              .prepare(sql)
              .get(...args) || null;
          return column ? (row?.[column] ?? null) : row;
        },
        async all() {
          return {
            success: true,
            results: database()
              .prepare(sql)
              .all(...args),
            meta: { changes: 0 },
          };
        },
        async raw(options) {
          const statement = database().prepare(sql);
          const columns = statement.columns().map((c) => c.name);
          statement.setReturnArrays(true);
          const rows = statement.all(...args);
          return options?.columnNames ? [columns, ...rows] : rows;
        },
        async run() {
          return this.runSync();
        },
        runSync() {
          const result = database()
            .prepare(sql)
            .run(...args);
          return {
            success: true,
            results: [],
            meta: {
              changes: Number(result.changes),
              last_row_id: Number(result.lastInsertRowid),
            },
          };
        },
      };
    },
    async batch(statements) {
      const db = database();
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = [];
        for (const statement of statements) result.push(statement.runSync());
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    async exec(sql) {
      database().exec(sql);
      return { count: 0, duration: 0 };
    },
  };
}
