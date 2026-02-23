#!/bin/bash

# Folder containing your original .sql files
SQL_FOLDER="./sql_supabase_migration_files"

# Folder where Supabase migrations live
MIGRATIONS_FOLDER="./supabase/migrations"

# Loop through all .sql files
for file in "$SQL_FOLDER"/*.sql; do
    if [[ -f "$file" ]]; then
        # Extract filename without extension
        base_name=$(basename "$file" .sql)

        # Create a new migration
        migration_file=$(supabase migration new "$base_name")

        # Copy SQL contents into the migration file
        cat "$file" > "$migration_file"

        echo "Created migration: $migration_file from $file"
    fi
done
