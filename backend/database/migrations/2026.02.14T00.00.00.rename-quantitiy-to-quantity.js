'use strict';

/**
 * Migration to fix typo: rename column 'quantitiy' to 'quantity' in pantry_items table
 */

async function up(knex) {
  // Check if the old typo column exists
  const hasOldColumn = await knex.schema.hasColumn('pantry_items', 'quantitiy');
  const hasNewColumn = await knex.schema.hasColumn('pantry_items', 'quantity');

  if (hasOldColumn) {
    if (hasNewColumn) {
      // Both columns exist: copy data from old to new (where new is null), then drop old
      await knex.raw(`
        UPDATE pantry_items
        SET quantity = quantitiy
        WHERE quantity IS NULL AND quantitiy IS NOT NULL
      `);
      await knex.schema.alterTable('pantry_items', (table) => {
        table.dropColumn('quantitiy');
      });
    } else {
      // Only old column exists: rename it
      await knex.schema.alterTable('pantry_items', (table) => {
        table.renameColumn('quantitiy', 'quantity');
      });
    }
  }
}

async function down(knex) {
  const hasColumn = await knex.schema.hasColumn('pantry_items', 'quantity');
  if (hasColumn) {
    await knex.schema.alterTable('pantry_items', (table) => {
      table.renameColumn('quantity', 'quantitiy');
    });
  }
}

module.exports = { up, down };
